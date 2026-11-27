import "server-only";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { pedidos, pedidoEventos, pedidoItens } = schema;

/**
 * Impressão digital do que o cliente vê no link do pedido (status, valor, Pix, link do cartão, itens…).
 * Muda sempre que a loja mexe no pedido; a página compara e se atualiza sozinha.
 */
export async function versaoPedido(codigo: string): Promise<string | null> {
  const banco = await db();
  const [p] = await banco
    .select({
      id: pedidos.id,
      status: pedidos.status,
      pag: pedidos.pagamentoStatus,
      forma: pedidos.formaPagamento,
      total: pedidos.totalFinalCentavos,
      pix: pedidos.pixCodigo,
      qr: pedidos.pixQrUrl,
      link: pedidos.linkCartao,
      alt: pedidos.alteracaoCliente,
      motivo: pedidos.motivoCancelamento,
      frete: pedidos.freteCentavos,
      em: pedidos.atualizadoEm,
    })
    .from(pedidos)
    .where(eq(pedidos.codigo, codigo));
  if (!p) return null;
  const [[ev], [it]] = await Promise.all([
    banco.select({ n: sql<number>`count(*)` }).from(pedidoEventos).where(eq(pedidoEventos.pedidoId, p.id)),
    banco.select({ n: sql<number>`coalesce(sum(${pedidoItens.quantidade} * 1000 + ${pedidoItens.separados}), 0)` }).from(pedidoItens).where(eq(pedidoItens.pedidoId, p.id)),
  ]);
  const base = [p.status, p.pag, p.forma, p.total, p.pix, p.qr, p.link, p.alt, p.motivo, p.frete, p.em?.getTime(), ev?.n, it?.n].join("|");
  return createHash("sha1").update(base).digest("hex").slice(0, 16);
}
