import "server-only";
import { and, asc, eq, gt, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type MensagemChat = { id: number; de: "CLIENTE" | "LOJA"; texto: string; quando: string; autor: string | null };

const { pedidoMensagens } = schema;
export const LIMITE_TEXTO = 500;

export async function lerMensagens(pedidoId: number, depoisDe: number, marcarLidaPelaLoja: boolean): Promise<MensagemChat[]> {
  const banco = await db();
  const lista = await banco
    .select()
    .from(pedidoMensagens)
    .where(and(eq(pedidoMensagens.pedidoId, pedidoId), gt(pedidoMensagens.id, depoisDe)))
    .orderBy(asc(pedidoMensagens.id))
    .limit(200);
  if (marcarLidaPelaLoja && lista.some((m) => m.de === "CLIENTE" && !m.lidaPelaLoja))
    await banco.update(pedidoMensagens).set({ lidaPelaLoja: true }).where(and(eq(pedidoMensagens.pedidoId, pedidoId), eq(pedidoMensagens.de, "CLIENTE")));
  return lista.map((m) => ({ id: m.id, de: m.de, texto: m.texto, quando: m.criadoEm.toISOString(), autor: m.de === "LOJA" ? (m.autor?.split("@")[0] ?? null) : null }));
}

export async function gravarMensagem(pedidoId: number, de: "CLIENTE" | "LOJA", textoBruto: string, autor: string | null): Promise<{ erro?: string }> {
  const texto = textoBruto.replace(/\s+\n/g, "\n").trim().slice(0, LIMITE_TEXTO);
  if (!texto) return { erro: "Escreva a mensagem." };
  const banco = await db();
  if (de === "CLIENTE") {
    // Freio contra abuso: até 15 mensagens do cliente a cada 10 minutos por pedido.
    const [{ n }] = await banco
      .select({ n: sql<number>`count(*)::int` })
      .from(pedidoMensagens)
      .where(and(eq(pedidoMensagens.pedidoId, pedidoId), eq(pedidoMensagens.de, "CLIENTE"), gte(pedidoMensagens.criadoEm, new Date(Date.now() - 10 * 60_000))));
    if (n >= 15) return { erro: "Muitas mensagens seguidas. Aguarde a resposta da loja." };
  }
  await banco.insert(pedidoMensagens).values({ pedidoId, de, texto, autor, lidaPelaLoja: de === "LOJA" });
  return {};
}

/** Pedidos com mensagem do cliente ainda não lida pela loja (para o aviso na lista). */
export async function pedidosComMensagemNova(): Promise<Set<number>> {
  const banco = await db();
  const r = await banco.selectDistinct({ id: pedidoMensagens.pedidoId }).from(pedidoMensagens).where(and(eq(pedidoMensagens.de, "CLIENTE"), eq(pedidoMensagens.lidaPelaLoja, false)));
  return new Set(r.map((x) => x.id));
}
