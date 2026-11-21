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
