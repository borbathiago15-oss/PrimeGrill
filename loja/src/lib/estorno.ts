import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { registrarMovimento } from "@/lib/estoque";

const { pedidos, produtos } = schema;

/** Cancelamento depois da baixa: devolve ao estoque exatamente o que saiu (estorno). */
export async function estornarPedido(pedidoId: number, autor: string) {
  const banco = await db();
  const { movimentacoes } = schema;
  await banco.transaction(async (tx) => {
    const [ped] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId));
    if (!ped?.baixaEstoque) return;
    const saidas = await tx.select().from(movimentacoes).where(and(eq(movimentacoes.origem, "PEDIDO"), eq(movimentacoes.origemId, pedidoId), eq(movimentacoes.tipo, "SAIDA_PEDIDO")));
    for (const m of saidas) {
      const [p] = await tx.select().from(produtos).where(eq(produtos.id, m.produtoId));
      await registrarMovimento(tx, {
        produtoId: m.produtoId,
        tipoVenda: p.tipoVenda,
        tipo: "ESTORNO_PEDIDO",
        sentido: "entrada",
        quantidade: { gramas: Math.abs(m.gramas), pecas: Math.abs(m.pecas), unidades: Math.abs(m.unidades) },
        valorCentavos: Math.abs(m.valorCentavos),
        origem: "PEDIDO",
        origemId: pedidoId,
        motivo: `Estorno · ${ped.codigo} cancelado`,
        autor,
      });
    }
    await tx.update(pedidos).set({ baixaEstoque: false }).where(eq(pedidos.id, pedidoId));
  });
}
