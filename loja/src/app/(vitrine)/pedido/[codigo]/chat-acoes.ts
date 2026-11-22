"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { gravarMensagem, lerMensagens, type MensagemChat } from "@/lib/chat";

async function pedidoPorCodigo(codigo: string) {
  if (!/^PG-[A-Z0-9]{6}$/.test(codigo)) return null;
  const [p] = await (await db()).select({ id: schema.pedidos.id, status: schema.pedidos.status }).from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  return p ?? null;
}

/** Cliente lê o chat do próprio pedido (o código do pedido é a chave de acesso, como no link). */
export async function lerChatCliente(codigo: string, depoisDe: number): Promise<MensagemChat[]> {
  const p = await pedidoPorCodigo(codigo);
  if (!p) return [];
  return lerMensagens(p.id, Number(depoisDe) || 0, false);
}

export async function enviarChatCliente(codigo: string, texto: string): Promise<{ erro?: string }> {
  const p = await pedidoPorCodigo(codigo);
  if (!p) return { erro: "Pedido não encontrado." };
  if (p.status === "CANCELADO") return { erro: "Este pedido foi cancelado. Fale com a loja pelo WhatsApp." };
  return gravarMensagem(p.id, "CLIENTE", String(texto ?? ""), null);
}
