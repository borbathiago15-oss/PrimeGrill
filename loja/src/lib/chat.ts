import "server-only";
import { and, asc, eq, gt, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type MensagemChat = { id: number; de: "CLIENTE" | "LOJA"; texto: string; quando: string; autor: string | null; anexo: { url: string; tipo: "imagem" | "pdf"; nome: string } | null };

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
  return lista.map((m) => ({ id: m.id, de: m.de, texto: m.texto, quando: m.criadoEm.toISOString(), autor: m.de === "LOJA" ? (m.autor?.split("@")[0] ?? null) : null, anexo: m.anexoUrl && m.anexoTipo ? { url: m.anexoUrl, tipo: m.anexoTipo, nome: m.anexoNome ?? "anexo" } : null }));
}

/** Lê texto e anexo do formulário do chat e grava a mensagem. */
export async function gravarDoFormulario(pedidoId: number, de: "CLIENTE" | "LOJA", form: FormData, autor: string | null): Promise<{ erro?: string }> {
  const arquivo = form.get("anexo");
  let anexo: { url: string; tipo: "imagem" | "pdf"; nome: string } | null = null;
  if (arquivo instanceof File && arquivo.size > 0) {
    const { salvarAnexo } = await import("@/lib/arquivos");
    const r = await salvarAnexo(arquivo);
    if (!r.ok) return { erro: r.erro };
    anexo = { url: r.url, tipo: r.tipo, nome: r.nome };
  }
  return gravarMensagem(pedidoId, de, String(form.get("texto") ?? ""), autor, anexo);
}

export async function gravarMensagem(pedidoId: number, de: "CLIENTE" | "LOJA", textoBruto: string, autor: string | null, anexo: { url: string; tipo: "imagem" | "pdf"; nome: string } | null = null): Promise<{ erro?: string }> {
  const texto = textoBruto.replace(/\s+\n/g, "\n").trim().slice(0, LIMITE_TEXTO);
  if (!texto && !anexo) return { erro: "Escreva a mensagem ou anexe um arquivo." };
  const banco = await db();
  if (de === "CLIENTE") {
    // Freio contra abuso: até 15 mensagens do cliente a cada 10 minutos por pedido.
    const [{ n }] = await banco
      .select({ n: sql<number>`count(*)::int` })
      .from(pedidoMensagens)
      .where(and(eq(pedidoMensagens.pedidoId, pedidoId), eq(pedidoMensagens.de, "CLIENTE"), gte(pedidoMensagens.criadoEm, new Date(Date.now() - 10 * 60_000))));
    if (n >= 15) return { erro: "Muitas mensagens seguidas. Aguarde a resposta da loja." };
  }
  await banco.insert(pedidoMensagens).values({ pedidoId, de, texto, autor, lidaPelaLoja: de === "LOJA", anexoUrl: anexo?.url ?? null, anexoTipo: anexo?.tipo ?? null, anexoNome: anexo?.nome ?? null });
  const previa = texto ? texto.slice(0, 120) : anexo?.tipo === "pdf" ? "📄 PDF enviado" : "🖼️ Foto enviada";
  const { avisarCliente, avisarLoja } = await import("@/lib/push");
  if (de === "CLIENTE") avisarLoja(pedidoId, (x) => ({ titulo: `💬 ${x.cliente} (${x.codigo})`, corpo: previa }));
  else avisarCliente(pedidoId, (c) => ({ titulo: "💬 Prime Grill respondeu", corpo: `${c}: ${previa}` }));
  return {};
}

/** Pedidos com mensagem do cliente ainda não lida pela loja (para o aviso na lista). */
export async function pedidosComMensagemNova(): Promise<Set<number>> {
  const banco = await db();
  const r = await banco.selectDistinct({ id: pedidoMensagens.pedidoId }).from(pedidoMensagens).where(and(eq(pedidoMensagens.de, "CLIENTE"), eq(pedidoMensagens.lidaPelaLoja, false)));
  return new Set(r.map((x) => x.id));
}
