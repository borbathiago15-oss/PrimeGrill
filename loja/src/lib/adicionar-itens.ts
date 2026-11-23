import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { comEstoqueReal, travarSaldo } from "@/lib/estoque";
import { calcularPedido, type ProdutoParaCalculo } from "@/modules/pedidos/calculo";

const { pedidos, pedidoItens, pedidoEventos, produtos } = schema;

/** Estados em que ainda dá para acrescentar itens (antes de o pagamento ser conferido). */
export function aceitaAdicionar(p: { status: string; pagamentoStatus: string }) {
  return ["NOVO", "EM_SEPARACAO", "AGUARDANDO_CLIENTE"].includes(p.status) || (p.status === "CONFIRMADO" && p.pagamentoStatus !== "PAGO");
}

export type ResultadoAdicionar = { ok: true; resumo: string; voltouParaSeparacao: boolean; pedidoId: number } | { ok: false; erro: string };

/**
 * Acrescenta itens a um pedido aberto (pedido do cliente pelo link, ou atendente no painel).
 * - Mesmo produto já no pedido: soma a quantidade; o que já foi separado continua separado.
 * - Se o pedido já tinha sido pesado, volta para "Em separação" para pesar só as peças novas;
 *   o Pix/link de pagamento antigo é descartado (o valor vai mudar).
 */
export async function adicionarItens(filtro: { id: number } | { codigo: string }, novos: { produtoId: number; quantidade: number }[], quem: { autor: string; nota: string }): Promise<ResultadoAdicionar> {
  const itensValidos = novos.filter((i) => Number.isInteger(i.produtoId) && Number.isInteger(i.quantidade) && i.quantidade > 0);
  if (!itensValidos.length) return { ok: false, erro: "Escolha pelo menos um produto." };
  const banco = await db();
  const ids = [...new Set(itensValidos.map((i) => i.produtoId))];
  const linhas = await comEstoqueReal(banco, await banco.select().from(produtos).where(inArray(produtos.id, ids)));
  const calc = calcularPedido(itensValidos, new Map<number, ProdutoParaCalculo>(linhas.map((p) => [p.id, p])), "RETIRADA", null);
  if (!calc.ok) return calc;

  return banco.transaction(async (tx) => {
    const cond = "id" in filtro ? eq(pedidos.id, filtro.id) : eq(pedidos.codigo, filtro.codigo);
    const [ped] = await tx.select().from(pedidos).where(cond).for("update");
    if (!ped) return { ok: false as const, erro: "Pedido não encontrado." };
    if (!aceitaAdicionar(ped)) return { ok: false as const, erro: ped.pagamentoStatus === "PAGO" ? "Este pedido já foi pago. Faça um pedido novo para os itens extras." : "Este pedido não aceita mais itens." };

    // Estoque: revalida com os saldos travados (mesma regra da loja online).
    const controlados = linhas.filter((p) => p.controlaEstoque).map((p) => p.id).sort((a, b) => a - b);
    for (const id of controlados) await travarSaldo(tx, id);
    if (controlados.length) {
      const agora = await comEstoqueReal(tx, linhas.filter((p) => p.controlaEstoque));
      for (const p of agora) {
        const pedido = itensValidos.filter((i) => i.produtoId === p.id).reduce((s, i) => s + i.quantidade, 0);
        if ((p.quantidadeDisponivel ?? 0) < pedido) return { ok: false as const, erro: `${p.nome}: só há ${p.quantidadeDisponivel ?? 0} disponível(is).` };
      }
    }

    const existentes = await tx.select().from(pedidoItens).where(eq(pedidoItens.pedidoId, ped.id));
    const partes: string[] = [];
    for (const n of calc.itens) {
      const ja = existentes.find((e) => e.produtoId === n.produtoId);
      if (ja) {
        const q = ja.quantidade + n.quantidade;
        await tx
          .update(pedidoItens)
          .set({ quantidade: q, valorCentavos: n.valorCentavos === null ? null : Math.round((n.valorCentavos / n.quantidade) * q) })
          .where(eq(pedidoItens.id, ja.id));
      } else await tx.insert(pedidoItens).values({ pedidoId: ped.id, ...n });
      partes.push(`${n.quantidade}x ${n.nome}`);
    }

    const jaPesado = ped.baixaEstoque;
    const resumo = partes.join(", ");
    await tx
      .update(pedidos)
      .set({
        subtotalEstimadoCentavos: ped.subtotalEstimadoCentavos + calc.subtotalCentavos,
        totalEstimadoCentavos: ped.totalEstimadoCentavos + calc.subtotalCentavos,
        temItemPesado: ped.temItemPesado || calc.temItemPesado,
        ...(jaPesado
          ? { status: "EM_SEPARACAO" as const, totalFinalCentavos: null, pixCodigo: null, pixQrUrl: null, linkCartao: null, alteracaoCliente: `Itens acrescentados: ${resumo}. Separe e pese só o que é novo.` }
          : {}),
        atualizadoEm: new Date(),
      })
      .where(eq(pedidos.id, ped.id));
    await tx.insert(pedidoEventos).values({ pedidoId: ped.id, status: jaPesado ? "EM_SEPARACAO" : ped.status, nota: `${quem.nota}: ${resumo}`, autor: quem.autor });
    return { ok: true as const, resumo, voltouParaSeparacao: jaPesado, pedidoId: ped.id };
  });
}
