"use server";

import { randomInt } from "node:crypto";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { configLoja } from "@/lib/dados";
import { calcularFrete } from "@/lib/geo";
import { calcularPedido, type ProdutoParaCalculo } from "@/modules/pedidos/calculo";
import { formatarCelular, normalizarCelular } from "@/modules/pedidos/whatsapp";

const entrada = z.object({
  itens: z.array(z.object({ produtoId: z.number().int().positive(), quantidade: z.number().int() })).min(1).max(40),
  modo: z.enum(["ENTREGA", "RETIRADA"]),
  nome: z.string().trim().min(2, "Informe seu nome.").max(80),
  celular: z.string().trim().max(25),
  cep: z.string().trim().max(9).optional().default(""),
  endereco: z.string().trim().max(120).optional().default(""),
  numero: z.string().trim().max(15).optional().default(""),
  complemento: z.string().trim().max(60).optional().default(""),
  bairro: z.string().trim().max(60).optional().default(""),
  observacao: z.string().trim().max(180).optional().default(""),
  consentimento: z.literal(true, { errorMap: () => ({ message: "É preciso aceitar o uso dos dados para o pedido." }) }),
  optin: z.boolean(),
  site: z.string().max(0).optional(), // campo-isca contra robôs
});

export type ResultadoPedido = { ok: true; codigo: string } | { ok: false; erro: string };

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function novoCodigo() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `PG-${s}`;
}

export async function criarPedido(dados: unknown): Promise<ResultadoPedido> {
  const v = entrada.safeParse(dados);
  if (!v.success) return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  const d = v.data;
  if (d.site) return { ok: false, erro: "Não foi possível enviar." };
  const celular = normalizarCelular(d.celular);
  if (!celular) return { ok: false, erro: "Informe um celular com DDD, ex.: (81) 99999-9999." };
  if (d.modo === "ENTREGA" && (!d.endereco || !d.numero)) return { ok: false, erro: "Informe endereço e número para entrega." };

  const banco = await db();
  const { produtos, pedidos, pedidoItens, pedidoEventos } = schema;
  const ids = [...new Set(d.itens.map((i) => i.produtoId))];
  const linhas = await banco.select().from(produtos).where(inArray(produtos.id, ids));
  const mapa = new Map<number, ProdutoParaCalculo>(linhas.map((p) => [p.id, p]));

  let zona: { taxaCentavos: number; pedidoMinimoCentavos: number } | null = null;
  let distanciaMetros: number | null = null;
  let freteACombinar = false;
  let bairro = d.bairro;
  let cidade = "";
  if (d.modo === "ENTREGA") {
    const config = await configLoja();
    const f = await calcularFrete(config.entrega, d.cep, d.numero);
    if (f.tipo === "indisponivel") return { ok: false, erro: "Entrega indisponível no momento. Escolha retirada na loja." };
    if (f.tipo === "cep_invalido") return { ok: false, erro: "CEP não encontrado. Confira o número." };
    if (f.tipo === "fora") return { ok: false, erro: "Seu endereço está fora da nossa área de entrega. Escolha retirada na loja." };
    if (f.tipo === "ok") {
      zona = f.faixa;
      distanciaMetros = f.distanciaMetros;
      bairro = bairro || f.endereco.bairro;
      cidade = f.endereco.cidade;
    } else {
      // CEP sem localização no mapa: o pedido segue e o frete é confirmado pelo WhatsApp (PG-P-001).
      zona = { taxaCentavos: 0, pedidoMinimoCentavos: 0 };
      freteACombinar = true;
      bairro = bairro || f.endereco?.bairro || "";
      cidade = f.endereco?.cidade ?? "";
    }
    if (!bairro) return { ok: false, erro: "Informe o bairro." };
  }

  const calc = calcularPedido(d.itens, mapa, d.modo, zona);
  if (!calc.ok) return calc;

  const codigo = novoCodigo();
  await banco.transaction(async (tx) => {
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
      })
      .returning({ id: pedidos.id });
    await tx.insert(pedidoItens).values(calc.itens.map((i) => ({ pedidoId: p.id, ...i })));
    await tx.insert(pedidoEventos).values({ pedidoId: p.id, status: "NOVO", nota: "Pedido feito pela loja online", autor: "cliente" });
  });
  return { ok: true, codigo };
}
