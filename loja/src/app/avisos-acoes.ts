"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { chavesPush, inscrever, inscricaoValida } from "@/lib/push";

/** Chave pública do push (o navegador precisa dela para se inscrever). */
export async function chavePublicaPush(): Promise<string> {
  return (await chavesPush()).publica;
}

/** Cliente ativa avisos do próprio pedido (o código do pedido é a chave, como no link). */
export async function ativarAvisosCliente(codigo: string, sub: unknown): Promise<{ erro?: string }> {
  if (!/^PG-[A-Z0-9]{6}$/.test(codigo) || !inscricaoValida(sub)) return { erro: "Não foi possível ativar os avisos." };
  const [p] = await (await db()).select({ id: schema.pedidos.id }).from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  if (!p) return { erro: "Pedido não encontrado." };
  await inscrever(sub, "CLIENTE", { pedidoId: p.id });
  return {};
}

/** Equipe ativa avisos da loja neste aparelho (novo pedido, mensagem, pagamento). */
export async function ativarAvisosLoja(sub: unknown): Promise<{ erro?: string }> {
  const usuario = await exigirPermissao("pedidos");
  if (!inscricaoValida(sub)) return { erro: "Não foi possível ativar os avisos." };
  await inscrever(sub, "LOJA", { usuario });
  return {};
}
