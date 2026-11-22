"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { FORMAS_PAGAMENTO } from "@/db/schema";
import { configLoja } from "@/lib/dados";
import { formasAceitas, ROTULO_FORMA } from "@/lib/pagamento";

const { pedidos, pedidoEventos } = schema;
const Codigo = z.string().regex(/^PG-[A-Z0-9]{6}$/);

export type EstadoCliente = { erro?: string };

/** Cliente confirma o valor final e escolhe como pagar (só vale enquanto o pedido aguarda o cliente). */
export async function escolherPagamento(_: EstadoCliente, form: FormData): Promise<EstadoCliente> {
  const codigo = Codigo.safeParse(form.get("codigo"));
  const forma = z.enum(FORMAS_PAGAMENTO).safeParse(form.get("forma"));
  if (!codigo.success || !forma.success) return { erro: "Escolha uma forma de pagamento." };
  const config = await configLoja();
  if (!formasAceitas(config.pagamento).includes(forma.data)) return { erro: "Essa forma de pagamento não está disponível." };
  const banco = await db();
  const ok = await banco.transaction(async (tx) => {
    const r = await tx
      .update(pedidos)
      .set({ formaPagamento: forma.data, status: "CONFIRMADO", atualizadoEm: new Date() })
      .where(and(eq(pedidos.codigo, codigo.data), eq(pedidos.status, "AGUARDANDO_CLIENTE")))
      .returning({ id: pedidos.id });
    if (!r[0]) return false;
    await tx.insert(pedidoEventos).values({ pedidoId: r[0].id, status: "CONFIRMADO", nota: `Cliente confirmou o valor · ${ROTULO_FORMA[forma.data]}`, autor: "cliente (link do pedido)" });
    return true;
  });
  if (!ok) return { erro: "Este pedido não está mais aguardando confirmação. Atualize a página." };
  revalidatePath(`/pedido/${codigo.data}`);
  return {};
}

/** Cliente avisa que já pagou (Pix ou cartão). A loja ainda confere e marca como pago. */
export async function avisarPagamento(_: EstadoCliente, form: FormData): Promise<EstadoCliente> {
  const codigo = Codigo.safeParse(form.get("codigo"));
  if (!codigo.success) return { erro: "Pedido inválido." };
  const banco = await db();
  const ok = await banco.transaction(async (tx) => {
    const r = await tx
      .update(pedidos)
      .set({ pagamentoStatus: "INFORMADO", atualizadoEm: new Date() })
      .where(and(eq(pedidos.codigo, codigo.data), eq(pedidos.status, "CONFIRMADO"), eq(pedidos.pagamentoStatus, "PENDENTE")))
      .returning({ id: pedidos.id });
    if (!r[0]) return false;
    await tx.insert(pedidoEventos).values({ pedidoId: r[0].id, status: "CONFIRMADO", nota: "Cliente avisou que pagou — conferir", autor: "cliente (link do pedido)" });
    return true;
  });
  if (!ok) return { erro: "Não foi possível registrar. Atualize a página." };
  revalidatePath(`/pedido/${codigo.data}`);
  return {};
}

/**
 * Depois de ver o valor final, o cliente pode tirar peças ou diminuir pacotes.
 * O que sai do pedido volta ao estoque na hora; o pedido volta para a loja revisar e reenviar o novo total.
 */
export async function alterarPedidoCliente(_: EstadoCliente, form: FormData): Promise<EstadoCliente> {
  const codigo = Codigo.safeParse(form.get("codigo"));
  if (!codigo.success) return { erro: "Pedido inválido." };
  const { pedidoItens, pedidoPesagens, movimentacoes, produtos } = schema;
  const { registrarMovimento } = await import("@/lib/estoque");
  const { formatarKg, formatarReais } = await import("@/modules/dinheiro");
  const banco = await db();
  const r = await banco.transaction(async (tx) => {
    const [ped] = await tx.select().from(pedidos).where(and(eq(pedidos.codigo, codigo.data), eq(pedidos.status, "AGUARDANDO_CLIENTE"))).for("update");
    if (!ped) return { erro: "Este pedido não pode mais ser alterado por aqui. Fale com a loja no WhatsApp." };
    const itens = await tx.select().from(pedidoItens).where(eq(pedidoItens.pedidoId, ped.id));
    const pesagens = await tx.select().from(pedidoPesagens).where(eq(pedidoPesagens.pedidoId, ped.id));
    const saidas = await tx.select().from(movimentacoes).where(and(eq(movimentacoes.origem, "PEDIDO"), eq(movimentacoes.origemId, ped.id), eq(movimentacoes.tipo, "SAIDA_PEDIDO")));
    const usadas = new Set<number>();
    const mudancas: string[] = [];

    const devolver = async (produtoId: number, tipoVenda: "PECA" | "PACOTE", q: { gramas?: number; pecas?: number; unidades?: number }) => {
      if (!ped.baixaEstoque) return;
      const [p] = await tx.select().from(produtos).where(eq(produtos.id, produtoId));
      if (!p?.controlaEstoque) return;
      let valor = 0;
      if (tipoVenda === "PECA") {
        const m = saidas.find((x) => x.produtoId === produtoId && !usadas.has(x.id) && -x.gramas === q.gramas);
        if (m) {
          usadas.add(m.id);
          valor = -m.valorCentavos;
        }
      } else {
        const m = saidas.find((x) => x.produtoId === produtoId);
        if (m && m.unidades) valor = Math.round((-m.valorCentavos * (q.unidades ?? 0)) / -m.unidades);
      }
      await registrarMovimento(tx, { produtoId, tipoVenda, tipo: "ESTORNO_PEDIDO", sentido: "entrada", quantidade: q, valorCentavos: valor, origem: "PEDIDO", origemId: ped.id, motivo: `Cliente retirou do pedido ${ped.codigo}`, autor: "cliente (link do pedido)" });
    };

    for (const ps of pesagens) {
      if (form.get(`remover-${ps.id}`) !== "on") continue;
      const item = itens.find((i) => i.id === ps.itemId);
      if (!item) continue;
      await devolver(item.produtoId, "PECA", { gramas: ps.gramas, pecas: 1 });
      await tx.delete(pedidoPesagens).where(eq(pedidoPesagens.id, ps.id));
      item.quantidade -= 1;
      mudancas.push(`tirou ${item.nome} (${formatarKg(ps.gramas)})`);
    }
    for (const item of itens.filter((i) => i.tipoVenda === "PACOTE")) {
      const v = form.get(`qtd-${item.id}`);
      if (v === null) continue;
      const nova = Number(v);
      if (!Number.isInteger(nova) || nova < 0 || nova >= item.quantidade) continue;
      await devolver(item.produtoId, "PACOTE", { unidades: item.quantidade - nova });
      mudancas.push(nova === 0 ? `tirou ${item.nome}` : `${item.nome}: ${item.quantidade} → ${nova}`);
      item.quantidade = nova;
    }
    // Erros aqui desfazem tudo (rollback): nada volta ao estoque pela metade.
    if (!mudancas.length) throw new ErroCliente("Marque o que você quer tirar do pedido.");
    if (itens.every((i) => i.quantidade <= 0)) throw new ErroCliente("Para desistir do pedido inteiro, fale com a loja no WhatsApp.");

    for (const i of itens) {
      if (i.quantidade <= 0) await tx.delete(pedidoItens).where(eq(pedidoItens.id, i.id));
      else await tx.update(pedidoItens).set({ quantidade: i.quantidade, valorCentavos: i.tipoVenda === "PACOTE" ? i.precoCentavos * i.quantidade : i.valorCentavos }).where(eq(pedidoItens.id, i.id));
    }
    const restantes = await tx.select().from(pedidoPesagens).where(eq(pedidoPesagens.pedidoId, ped.id));
    const total = restantes.reduce((s, x) => s + x.valorCentavos, 0) + itens.filter((i) => i.tipoVenda === "PACOTE" && i.quantidade > 0).reduce((s, i) => s + i.precoCentavos * i.quantidade, 0) + ped.freteCentavos;
    const nota = `Cliente alterou: ${mudancas.join("; ")}. Novo total ${formatarReais(total)}.`;
    await tx.update(pedidos).set({ status: "EM_SEPARACAO", totalFinalCentavos: total, alteracaoCliente: nota, atualizadoEm: new Date() }).where(eq(pedidos.id, ped.id));
    await tx.insert(pedidoEventos).values({ pedidoId: ped.id, status: "EM_SEPARACAO", nota, autor: "cliente (link do pedido)" });
    return {} as EstadoCliente;
  }).catch((e: unknown) => {
    if (e instanceof ErroCliente) return { erro: e.message };
    throw e;
  });
  if (r.erro) return r;
  revalidatePath(`/pedido/${codigo.data}`);
  return {};
}

class ErroCliente extends Error {}
