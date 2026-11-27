import "server-only";
import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { schema } from "@/db";
import type { Db } from "@/db/criar";
import type { Tx } from "@/lib/estoque";
import { diaRecife, prazoDaForma, somarDias, taxaDaForma, type ConfigFinanceiro, type FormaFin } from "@/modules/financeiro/financeiro";

const { lancamentos, caixas, pedidos, movimentacoes } = schema;

/** Caixa aberto agora (só um por vez). */
export async function caixaAberto(banco: Db | Tx) {
  const [c] = await banco.select().from(caixas).where(isNull(caixas.fechadoEm)).orderBy(desc(caixas.abertoEm)).limit(1);
  return c ?? null;
}

/**
 * `cfg` vem lido antes da transação: dentro dela, só o `tx` pode ir ao banco (no PGlite, outra conexão trava).
 * Receita do pedido no momento em que a loja dá baixa no pagamento.
 * Um lançamento por pedido: se já existir (ex.: cancelado e reaberto), é atualizado.
 */
export async function registrarRecebimentoPedido(tx: Tx, pedidoId: number, forma: FormaFin, autor: string, cfg: ConfigFinanceiro) {
  const [p] = await tx.select({ codigo: pedidos.codigo, final: pedidos.totalFinalCentavos, estimado: pedidos.totalEstimadoCentavos }).from(pedidos).where(eq(pedidos.id, pedidoId));
  if (!p) return;
  const valor = p.final ?? p.estimado;
  const hoje = diaRecife();
  const caixa = forma === "DINHEIRO" ? await caixaAberto(tx) : null;
  const dados = {
    tipo: "RECEITA" as const,
    categoria: "VENDA",
    descricao: `Pedido ${p.codigo}`,
    valorCentavos: valor,
    taxaCentavos: taxaDaForma(cfg, forma, valor),
    forma,
    status: "QUITADO" as const,
    vencimento: hoje,
    quitadoEm: hoje,
    previstoEm: somarDias(hoje, prazoDaForma(cfg, forma)),
    conciliadoEm: null,
    conciliadoPor: null,
    caixaId: caixa?.id ?? null,
    observacao: forma === "DINHEIRO" && !caixa ? "Recebido em dinheiro sem caixa aberto" : "",
    autor,
  };
  await tx.insert(lancamentos).values({ ...dados, pedidoId }).onConflictDoUpdate({ target: lancamentos.pedidoId, set: dados });
}

/** Pedido pago que foi cancelado: a receita deixa de contar (estorno ao cliente é feito fora do sistema). */
export async function cancelarRecebimentoPedido(tx: Tx, pedidoId: number, autor: string) {
  await tx
    .update(lancamentos)
    .set({ status: "CANCELADO", observacao: sql`trim(${lancamentos.observacao} || ' · Pedido cancelado por ' || ${autor})` })
    .where(and(eq(lancamentos.pedidoId, pedidoId), inArray(lancamentos.status, ["ABERTO", "QUITADO"])));
}

/** Custo das mercadorias vendidas no período: saídas para pedidos menos estornos (custo médio do estoque). */
export async function cmvNoPeriodo(banco: Db, de: string, ate: string): Promise<number> {
  const inicio = new Date(`${de}T00:00:00-03:00`);
  const fim = new Date(`${somarDias(ate, 1)}T00:00:00-03:00`);
  const [r] = await banco
    .select({ v: sql<number>`coalesce(sum(${movimentacoes.valorCentavos}), 0)` })
    .from(movimentacoes)
    .where(and(eq(movimentacoes.origem, "PEDIDO"), inArray(movimentacoes.tipo, ["SAIDA_PEDIDO", "ESTORNO_PEDIDO"]), gte(movimentacoes.criadoEm, inicio), lt(movimentacoes.criadoEm, fim)));
  return -Number(r?.v ?? 0);
}
