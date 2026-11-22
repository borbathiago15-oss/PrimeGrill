import "server-only";
import { and, eq, inArray } from "drizzle-orm";
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
    // Devolve o saldo líquido por produto (saídas menos o que já voltou em alterações do cliente).
    const movs = await tx
      .select()
      .from(movimentacoes)
      .where(and(eq(movimentacoes.origem, "PEDIDO"), eq(movimentacoes.origemId, pedidoId), inArray(movimentacoes.tipo, ["SAIDA_PEDIDO", "ESTORNO_PEDIDO"])));
    const liquido = new Map<number, { gramas: number; pecas: number; unidades: number; valor: number }>();
    for (const m of movs) {
      const l = liquido.get(m.produtoId) ?? { gramas: 0, pecas: 0, unidades: 0, valor: 0 };
      l.gramas += m.gramas;
      l.pecas += m.pecas;
      l.unidades += m.unidades;
      l.valor += m.valorCentavos;
      liquido.set(m.produtoId, l);
    }
    for (const [produtoId, l] of liquido) {
      if (l.gramas >= 0 && l.pecas >= 0 && l.unidades >= 0) continue;
      const [p] = await tx.select().from(produtos).where(eq(produtos.id, produtoId));
      await registrarMovimento(tx, {
        produtoId,
        tipoVenda: p.tipoVenda,
        tipo: "ESTORNO_PEDIDO",
        sentido: "entrada",
        quantidade: { gramas: Math.max(0, -l.gramas), pecas: Math.max(0, -l.pecas), unidades: Math.max(0, -l.unidades) },
        valorCentavos: Math.max(0, -l.valor),
        origem: "PEDIDO",
        origemId: pedidoId,
        motivo: `Estorno · ${ped.codigo} cancelado`,
        autor,
      });
    }
    await tx.update(pedidos).set({ baixaEstoque: false }).where(eq(pedidos.id, pedidoId));
  });
}
