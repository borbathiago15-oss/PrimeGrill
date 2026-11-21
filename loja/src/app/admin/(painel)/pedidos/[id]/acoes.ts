"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/admin";
import { registrarMovimento, travarSaldo } from "@/lib/estoque";
import { kgParaGramas, reaisParaCentavos, valorPorPeso } from "@/modules/dinheiro";
import { custoMedio } from "@/modules/estoque/saldo";

export type EstadoSeparacao = { erro?: string; ok?: string };

const { pedidos, pedidoItens, pedidoEventos, pedidoPesagens, produtos } = schema;

/**
 * PES-001 (versão manual): registra o peso real de cada peça, calcula o valor final,
 * dá baixa no estoque e coloca o pedido em "Aguardando cliente".
 */
export async function confirmarSeparacao(_: EstadoSeparacao, form: FormData): Promise<EstadoSeparacao> {
  const autor = await exigirAdmin();
  const pedidoId = Number(form.get("pedidoId"));
  const banco = await db();
  const [ped] = await banco.select().from(pedidos).where(eq(pedidos.id, pedidoId));
  if (!ped) return { erro: "Pedido não encontrado." };
  if (ped.baixaEstoque) return { erro: "Este pedido já foi separado e pesado." };
  if (ped.status === "CANCELADO" || ped.status === "CONCLUIDO") return { erro: "Pedido encerrado." };
  const itens = await banco.select().from(pedidoItens).where(eq(pedidoItens.pedidoId, pedidoId));
  const prods = new Map((await banco.select().from(produtos).where(inArray(produtos.id, itens.map((i) => i.produtoId)))).map((p) => [p.id, p]));

  const pesos = new Map<string, number>();
  for (const i of itens.filter((x) => x.tipoVenda === "PECA"))
    for (let n = 0; n < i.quantidade; n++) {
      const g = kgParaGramas(String(form.get(`peso-${i.id}-${n}`) ?? ""));
      if (!g || g < 50 || g > 30_000) return { erro: `${i.nome}${i.quantidade > 1 ? ` (peça ${n + 1})` : ""}: peso inválido.` };
      pesos.set(`${i.id}-${n}`, g);
    }
  let frete = ped.freteCentavos;
  if (ped.freteACombinar) {
    const f = reaisParaCentavos(String(form.get("frete") ?? ""));
    if (f === null) return { erro: "Informe o frete combinado com o cliente." };
    frete = f;
  }

  const erro = await banco.transaction(async (tx) => {
    let total = 0;
    for (const i of itens) {
      const p = prods.get(i.produtoId);
      if (i.tipoVenda === "PECA") {
        for (let n = 0; n < i.quantidade; n++) {
          const g = pesos.get(`${i.id}-${n}`)!;
          const valor = valorPorPeso(g, i.precoCentavos);
          total += valor;
          await tx.insert(pedidoPesagens).values({ pedidoId, itemId: i.id, peca: n + 1, gramas: g, valorCentavos: valor, manual: true, autor });
          if (p?.controlaEstoque) {
            const s = await travarSaldo(tx, p.id);
            if (s.pecas < 1) return `${p.nome}: não há peças no estoque. Dê entrada na nota ou faça um ajuste antes.`;
            if (g > s.gramas) {
              // EST-001-R2: aceita a saída e registra a diferença de pesagem.
              const cm = custoMedio(s, "PECA") ?? 0;
              await registrarMovimento(tx, { produtoId: p.id, tipoVenda: "PECA", tipo: "AJUSTE_ENTRADA", sentido: "entrada", quantidade: { gramas: g - s.gramas }, valorCentavos: Math.round((cm * (g - s.gramas)) / 1000), origem: "PEDIDO", origemId: pedidoId, motivo: `Diferença de pesagem · ${ped.codigo}`, autor });
            }
            await registrarMovimento(tx, { produtoId: p.id, tipoVenda: "PECA", tipo: "SAIDA_PEDIDO", sentido: "saida", quantidade: { gramas: g, pecas: 1 }, origem: "PEDIDO", origemId: pedidoId, motivo: `Pedido ${ped.codigo}`, autor });
          }
        }
      } else {
        total += i.precoCentavos * i.quantidade;
        if (p?.controlaEstoque) {
          const s = await travarSaldo(tx, p.id);
          if (s.unidades < i.quantidade) return `${p.nome}: estoque insuficiente (${s.unidades} un).`;
          await registrarMovimento(tx, { produtoId: p.id, tipoVenda: "PACOTE", tipo: "SAIDA_PEDIDO", sentido: "saida", quantidade: { unidades: i.quantidade }, origem: "PEDIDO", origemId: pedidoId, motivo: `Pedido ${ped.codigo}`, autor });
        }
      }
    }
    await tx
      .update(pedidos)
      .set({ baixaEstoque: true, totalFinalCentavos: total + frete, freteCentavos: frete, status: "AGUARDANDO_CLIENTE", atualizadoEm: new Date() })
      .where(eq(pedidos.id, pedidoId));
    await tx.insert(pedidoEventos).values({ pedidoId, status: "AGUARDANDO_CLIENTE", nota: "Separado e pesado; estoque baixado", autor });
    return null;
  });
  if (erro) return { erro };
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/", "layout");
  return { ok: "Separação registrada e estoque baixado. Envie o valor final ao cliente." };
}

/* ---------------- Fluxo guiado do pedido ---------------- */

type Status = (typeof pedidos.$inferSelect)["status"];

async function registrar(pedidoId: number, set: Partial<typeof pedidos.$inferInsert>, status: Status, nota: string, autor: string, de: Status[]) {
  const banco = await db();
  const ok = await banco.transaction(async (tx) => {
    const r = await tx
      .update(pedidos)
      .set({ ...set, atualizadoEm: new Date() })
      .where(and(eq(pedidos.id, pedidoId), inArray(pedidos.status, de)))
      .returning({ id: pedidos.id });
    if (!r[0]) return false;
    await tx.insert(pedidoEventos).values({ pedidoId, status, nota, autor });
    return true;
  });
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin");
  return ok;
}

/** Passo 1: atendente aceita o pedido e começa a separar. */
export async function aceitarPedido(form: FormData) {
  const autor = await exigirAdmin();
  await registrar(Number(form.get("pedidoId")), { status: "EM_SEPARACAO" }, "EM_SEPARACAO", "Pedido aceito; separação iniciada", autor, ["NOVO"]);
}

/** Alternativa manual (PG-P-001): o cliente respondeu pelo WhatsApp e o atendente registra a forma de pagamento. */
export async function registrarFormaPeloAtendente(form: FormData) {
  const autor = await exigirAdmin();
  const forma = String(form.get("forma"));
  if (forma !== "PIX" && forma !== "CARTAO_LINK" && forma !== "NA_ENTREGA") return;
  await registrar(Number(form.get("pedidoId")), { status: "CONFIRMADO", formaPagamento: forma }, "CONFIRMADO", "Cliente confirmou pelo WhatsApp · forma registrada pelo atendente", autor, ["AGUARDANDO_CLIENTE", "CONFIRMADO"]);
}

/** Atendente cola o link de pagamento do cartão gerado na maquininha/banco. */
export async function salvarLinkCartao(_: EstadoSeparacao, form: FormData): Promise<EstadoSeparacao> {
  const autor = await exigirAdmin();
  const link = String(form.get("link") ?? "").trim();
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return { erro: "Cole o link completo, começando com https://" };
  }
  if (url.protocol !== "https:" || link.length > 500) return { erro: "O link do cartão precisa começar com https://" };
  const ok = await registrar(Number(form.get("pedidoId")), { linkCartao: url.toString(), formaPagamento: "CARTAO_LINK" }, "CONFIRMADO", "Link do cartão anexado ao pedido", autor, ["CONFIRMADO"]);
  return ok ? { ok: "Link salvo: ele já aparece para o cliente no link do pedido." } : { erro: "O pedido precisa estar confirmado pelo cliente." };
}

/** Loja conferiu o recebimento (extrato do Pix, maquininha ou dinheiro). */
export async function marcarPago(form: FormData) {
  const autor = await exigirAdmin();
  await registrar(Number(form.get("pedidoId")), { pagamentoStatus: "PAGO", pagoEm: new Date() }, "CONFIRMADO", "Pagamento conferido e recebido", autor, ["CONFIRMADO"]);
}

/** Último passo: entregue (ou retirado). Pagamento na entrega é dado como recebido aqui. */
export async function concluirPedido(form: FormData) {
  const autor = await exigirAdmin();
  const id = Number(form.get("pedidoId"));
  const banco = await db();
  const [p] = await banco.select().from(pedidos).where(eq(pedidos.id, id));
  if (!p || p.status !== "CONFIRMADO") return;
  const recebeAgora = p.pagamentoStatus !== "PAGO";
  await registrar(
    id,
    { status: "CONCLUIDO", ...(recebeAgora ? { pagamentoStatus: "PAGO" as const, pagoEm: new Date() } : {}) },
    "CONCLUIDO",
    `${p.modo === "ENTREGA" ? "Entregue" : "Retirado"}${recebeAgora ? " · pagamento recebido na entrega" : ""}`,
    autor,
    ["CONFIRMADO"],
  );
}
