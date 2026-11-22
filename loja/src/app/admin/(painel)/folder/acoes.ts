"use server";

import { desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { comEstoqueReal } from "@/lib/estoque";
import { TAMANHO, validarProdutos } from "@/modules/folder/folder";

export type EstadoFolder = { erro?: string; fora?: { nome: string; motivo: string }[] };
const { folders, produtos } = schema;

const Campos = z.object({
  formato: z.enum(["ENCARTE", "FEED", "STORY"]),
  titulo: z.string().trim().min(3, "Informe o título.").max(40, "Título com no máximo 40 letras."),
  destaque: z.coerce.number().int().min(0).max(3),
  subtitulo: z.string().trim().max(60),
  secao: z.string().trim().min(2).max(24),
  frase: z.string().trim().max(70),
  validadeDe: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  validadeAte: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
});

/** Monta os itens a partir do cadastro (STU-002-R1: nada é digitado no folder), na ordem escolhida. */
async function itensDoCadastro(ids: number[]) {
  const banco = await db();
  const lista = await comEstoqueReal(banco, await banco.select().from(produtos).where(inArray(produtos.id, ids)));
  const ordem = new Map(ids.map((id, i) => [id, i]));
  lista.sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0));
  return validarProdutos(lista);
}

export async function criarFolder(_: EstadoFolder, form: FormData): Promise<EstadoFolder> {
  const autor = await exigirPermissao("folder");
  const v = Campos.safeParse(Object.fromEntries(["formato", "titulo", "destaque", "subtitulo", "secao", "frase", "validadeDe", "validadeAte"].map((k) => [k, form.get(k) ?? ""])));
  if (!v.success) return { erro: v.error.issues[0]?.message ?? "Confira os campos." };
  const d = v.data;
  if (d.validadeDe && d.validadeAte && d.validadeDe > d.validadeAte) return { erro: "A validade termina antes de começar." };
  const ids = form
    .getAll("ordem")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return { erro: "Escolha pelo menos um produto." };
  const max = TAMANHO[d.formato].max;
  if (ids.length > max) return { erro: `Esse formato leva no máximo ${max} produtos.` };
  const { ok, fora } = await itensDoCadastro(ids);
  if (!ok.length) return { erro: "Nenhum produto escolhido pode entrar no folder.", fora };
  const banco = await db();
  const [f] = await banco
    .insert(folders)
    .values({ ...d, validadeDe: d.validadeDe || null, validadeAte: d.validadeAte || null, itens: ok, criadoPor: autor })
    .returning({ id: folders.id });
  await banco.update(folders).set({ grupo: f.id }).where(eq(folders.id, f.id));
  revalidatePath("/admin/folder");
  redirect(`/admin/folder/${f.id}${fora.length ? `?fora=${encodeURIComponent(JSON.stringify(fora).slice(0, 1500))}` : ""}`);
}

/** STU-002-R3: regerar cria nova versão com os dados atuais; a anterior fica no histórico. */
export async function regerarFolder(form: FormData) {
  const autor = await exigirPermissao("folder");
  const id = Number(form.get("id"));
  const banco = await db();
  const [f] = await banco.select().from(folders).where(eq(folders.id, id));
  if (!f) return;
  const grupo = f.grupo ?? f.id;
  const [ultima] = await banco.select({ versao: folders.versao }).from(folders).where(eq(folders.grupo, grupo)).orderBy(desc(folders.versao)).limit(1);
  const { ok, fora } = await itensDoCadastro(f.itens.map((i) => i.id));
  if (!ok.length) redirect(`/admin/folder/${id}?erro=vazio`);
  const [novo] = await banco
    .insert(folders)
    .values({ grupo, versao: (ultima?.versao ?? f.versao) + 1, formato: f.formato, titulo: f.titulo, destaque: f.destaque, subtitulo: f.subtitulo, secao: f.secao, frase: f.frase, validadeDe: f.validadeDe, validadeAte: f.validadeAte, itens: ok, criadoPor: autor })
    .returning({ id: folders.id });
  revalidatePath("/admin/folder");
  redirect(`/admin/folder/${novo.id}${fora.length ? `?fora=${encodeURIComponent(JSON.stringify(fora).slice(0, 1500))}` : ""}`);
}
