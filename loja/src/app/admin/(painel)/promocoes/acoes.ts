"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { registrarAceite } from "@/lib/promocoes";
import { normalizarCelular } from "@/modules/pedidos/whatsapp";

export type EstadoPromo = { erro?: string; ok?: string };
const { inscritosPromocoes, campanhas, campanhaEnvios } = schema;

/** Cliente disse (no balcão/WhatsApp) que quer receber: o atendente registra, e fica gravado quem registrou. */
export async function registrarAceitePainel(_: EstadoPromo, form: FormData): Promise<EstadoPromo> {
  const autor = await exigirPermissao("promocoes");
  const nome = String(form.get("nome") ?? "").trim();
  const celular = normalizarCelular(String(form.get("celular") ?? ""));
  if (nome.length < 2) return { erro: "Informe o nome." };
  if (!celular) return { erro: "Celular inválido (com DDD)." };
  if (form.get("confirmo") !== "on") return { erro: "Confirme que o cliente pediu para receber." };
  await registrarAceite({ celular, nome, origem: "PAINEL", registradoPor: autor });
  revalidatePath("/admin/promocoes");
  return { ok: `${nome} cadastrado para receber promoções.` };
}

/** Cliente pediu para sair (ex.: respondeu "SAIR" no WhatsApp). */
export async function revogarPainel(form: FormData) {
  await exigirPermissao("promocoes");
  await (await db()).update(inscritosPromocoes).set({ revogadoEm: new Date() }).where(eq(inscritosPromocoes.id, Number(form.get("id"))));
  revalidatePath("/admin/promocoes");
}

export async function criarCampanha(_: EstadoPromo, form: FormData): Promise<EstadoPromo> {
  const autor = await exigirPermissao("promocoes");
  const v = z
    .object({ titulo: z.string().trim().min(3, "Dê um nome à campanha.").max(60), mensagem: z.string().trim().min(10, "Escreva a mensagem.").max(700), folderId: z.coerce.number().int().optional() })
    .safeParse({ titulo: form.get("titulo"), mensagem: form.get("mensagem"), folderId: form.get("folderId") || undefined });
  if (!v.success) return { erro: v.error.issues[0]?.message };
  const [c] = await (await db())
    .insert(campanhas)
    .values({ titulo: v.data.titulo, mensagem: v.data.mensagem, folderId: v.data.folderId ?? null, criadoPor: autor })
    .returning({ id: campanhas.id });
  redirect(`/admin/promocoes/${c.id}`);
}

/** Marca o envio para não mandar duas vezes a mesma campanha para a mesma pessoa. */
export async function marcarEnviado(campanhaId: number, inscritoId: number): Promise<void> {
  const autor = await exigirPermissao("promocoes");
  await (await db()).insert(campanhaEnvios).values({ campanhaId: Number(campanhaId), inscritoId: Number(inscritoId), autor }).onConflictDoNothing();
  revalidatePath(`/admin/promocoes/${campanhaId}`);
}
