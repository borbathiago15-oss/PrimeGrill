import "server-only";
import { randomInt } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { configLoja } from "@/lib/dados";
import { calcularFrete } from "@/lib/geo";
import { comEstoqueReal, travarSaldo } from "@/lib/estoque";
import { calcularPedido, type ProdutoParaCalculo } from "@/modules/pedidos/calculo";
import { formatarCelular } from "@/modules/pedidos/whatsapp";

export type DadosPedido = {
  itens: { produtoId: number; quantidade: number }[];
  modo: "ENTREGA" | "RETIRADA";
  nome: string;
  celular: string; // já normalizado (só dígitos com DDD)
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  observacao: string;
  optin: boolean;
};

export type OpcoesPedido = {
  origem: "LOJA_ONLINE" | "WHATSAPP" | "BALCAO";
  autor: string;
  nota: string;
  /** Painel: endereço fora da área ou não localizado não bloqueia; o frete fica a combinar (PG-P-001). */
  freteFlexivel: boolean;
  /** Painel: frete digitado pelo atendente (sobrepõe o cálculo por distância). */
  freteManualCentavos?: number | null;
  /** Idioma do cliente (loja online); pedidos do painel ficam em português. */
  idioma?: "pt" | "en" | "es";
};

export type ResultadoPedido = { ok: true; codigo: string; id: number } | { ok: false; erro: string };

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function novoCodigo() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `PG-${s}`;
}

/** Registra um pedido (loja online ou lançado no painel) com a mesma regra de preço, frete e estoque. */
export async function registrarPedido(d: DadosPedido, o: OpcoesPedido): Promise<ResultadoPedido> {
  const celular = d.celular;
  const banco = await db();
  const { produtos, pedidos, pedidoItens, pedidoEventos } = schema;
  const ids = [...new Set(d.itens.map((i) => i.produtoId))];
  const linhas = await comEstoqueReal(banco, await banco.select().from(produtos).where(inArray(produtos.id, ids)));
  const mapa = new Map<number, ProdutoParaCalculo>(linhas.map((p) => [p.id, p]));

  let zona: { taxaCentavos: number; pedidoMinimoCentavos: number } | null = null;
  let distanciaMetros: number | null = null;
  let freteACombinar = false;
  let bairro = d.bairro;
  let cidade = "";
  if (d.modo === "ENTREGA") {
    const config = await configLoja();
    const f = await calcularFrete(config.entrega, d.cep, d.numero);
    if (!o.freteFlexivel && f.tipo === "indisponivel") return { ok: false, erro: "Entrega indisponível no momento. Escolha retirada na loja." };
    if (!o.freteFlexivel && f.tipo === "cep_invalido") return { ok: false, erro: "CEP não encontrado. Confira o número." };
    if (!o.freteFlexivel && f.tipo === "fora") return { ok: false, erro: "Seu endereço está fora da nossa área de entrega. Escolha retirada na loja." };
    if (o.freteManualCentavos != null) {
      zona = { taxaCentavos: o.freteManualCentavos, pedidoMinimoCentavos: 0 };
      if (f.tipo === "ok") distanciaMetros = f.distanciaMetros;
      const e = f.tipo === "ok" || f.tipo === "a_combinar" ? f.endereco : null;
      bairro = bairro || e?.bairro || "";
      cidade = e?.cidade ?? "";
    } else if (f.tipo === "ok") {
      zona = f.faixa;
      distanciaMetros = f.distanciaMetros;
      bairro = bairro || f.endereco.bairro;
      cidade = f.endereco.cidade;
    } else {
      // CEP sem localização (ou, no painel, fora da área) no mapa: o pedido segue e o frete é confirmado pelo WhatsApp (PG-P-001).
      zona = { taxaCentavos: 0, pedidoMinimoCentavos: 0 };
      freteACombinar = true;
      const e = "endereco" in f ? f.endereco : null;
      bairro = bairro || e?.bairro || "";
      cidade = e?.cidade ?? "";
    }
    if (!bairro) return { ok: false, erro: "Informe o bairro." };
  }

  const calc = calcularPedido(d.itens, mapa, d.modo, zona);
  if (!calc.ok) return calc;

  const codigo = novoCodigo();
  const r = await banco.transaction(async (tx) => {
    // Revalida o estoque com os saldos travados: dois clientes não levam a última peça (EST-001 §5).
    const controlados = linhas.filter((p) => p.controlaEstoque).map((p) => p.id).sort((a, b) => a - b);
    for (const id of controlados) await travarSaldo(tx, id);
    if (controlados.length) {
      const agora = await comEstoqueReal(tx, linhas.filter((p) => p.controlaEstoque));
      for (const p of agora) {
        const pedido = d.itens.filter((i) => i.produtoId === p.id).reduce((s, i) => s + i.quantidade, 0);
        if ((p.quantidadeDisponivel ?? 0) < pedido) return p.nome;
      }
    }
    const [p] = await tx
      .insert(pedidos)
      .values({
        codigo,
        modo: d.modo,
        clienteNome: d.nome,
        clienteCelular: formatarCelular(celular),
        cep: d.modo === "ENTREGA" ? d.cep || null : null,
        endereco: d.modo === "ENTREGA" ? d.endereco : null,
        numero: d.modo === "ENTREGA" ? d.numero : null,
        complemento: d.modo === "ENTREGA" ? d.complemento || null : null,
        bairro: d.modo === "ENTREGA" ? bairro : null,
        cidade: d.modo === "ENTREGA" ? cidade || null : null,
        distanciaMetros,
        freteACombinar,
        freteCentavos: calc.freteCentavos,
        subtotalEstimadoCentavos: calc.subtotalCentavos,
        totalEstimadoCentavos: calc.totalCentavos,
        temItemPesado: calc.temItemPesado,
        observacao: d.observacao,
        consentimentoLgpd: true,
        optinWhatsapp: d.optin,
        origem: o.origem,
        idioma: o.idioma ?? "pt",
      })
      .returning({ id: pedidos.id });
    await tx.insert(pedidoItens).values(calc.itens.map((i) => ({ pedidoId: p.id, ...i })));
    await tx.insert(pedidoEventos).values({ pedidoId: p.id, status: "NOVO", nota: o.nota, autor: o.autor });
    return p.id;
  });
  if (typeof r === "string") return { ok: false, erro: `${r} acabou de esgotar. Ajuste os itens.` };
  if (o.origem === "LOJA_ONLINE") {
    const { avisarLoja } = await import("@/lib/push");
    avisarLoja(r, (x) => ({ titulo: `Novo pedido ${x.codigo}`, corpo: `${x.cliente} · ${d.modo === "ENTREGA" ? "entrega" : "retirada"}. Toque para aceitar.` }));
  }
  return { ok: true, codigo, id: r };
}
