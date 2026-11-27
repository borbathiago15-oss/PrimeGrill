"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { gravarDoFormulario, lerMensagens, type MensagemChat } from "@/lib/chat";

async function pedidoPorCodigo(codigo: string) {
  if (!/^PG-[A-Z0-9]{6}$/.test(codigo)) return null;
  const [p] = await (await db()).select({ id: schema.pedidos.id, status: schema.pedidos.status, anonimizadoEm: schema.pedidos.anonimizadoEm }).from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  return p ?? null;
}

/** Cliente lê o chat do próprio pedido (o código do pedido é a chave de acesso, como no link). */
export async function lerChatCliente(codigo: string, depoisDe: number): Promise<MensagemChat[]> {
  const p = await pedidoPorCodigo(codigo);
  if (!p) return [];
  return lerMensagens(p.id, Number(depoisDe) || 0, false);
}

export async function enviarChatCliente(codigo: string, form: FormData): Promise<{ erro?: string }> {
  const p = await pedidoPorCodigo(codigo);
  if (!p) return { erro: "Pedido não encontrado." };
  // Depois de concluído ou cancelado o chat continua aberto (reclamação, dúvida, troca); só some se os dados foram apagados (LGPD).
  if (p.anonimizadoEm) return { erro: "Pedido não encontrado." };
  return gravarDoFormulario(p.id, "CLIENTE", form, null);
}
