"use server";

import { exigirPermissao } from "@/lib/admin";
import { gravarMensagem, lerMensagens, type MensagemChat } from "@/lib/chat";

/** Atendente lê o chat do pedido; as mensagens do cliente passam a contar como lidas. */
export async function lerChatLoja(pedidoId: number, depoisDe: number): Promise<MensagemChat[]> {
  await exigirPermissao("pedidos");
  return lerMensagens(Number(pedidoId), Number(depoisDe) || 0, true);
}

export async function enviarChatLoja(pedidoId: number, texto: string): Promise<{ erro?: string }> {
  const autor = await exigirPermissao("pedidos");
  return gravarMensagem(Number(pedidoId), "LOJA", String(texto ?? ""), autor);
}
