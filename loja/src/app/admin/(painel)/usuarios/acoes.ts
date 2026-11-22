"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/db";
import { PAPEIS } from "@/db/schema";
import { exigirPermissao, exigirUsuario, gerarHash } from "@/lib/admin";
import { COOKIE, criarToken, OPCOES_COOKIE } from "@/lib/sessao";
import { problemaNaSenha } from "@/modules/usuarios/permissoes";

export type EstadoUsuario = { erro?: string; ok?: string };
const { usuarios } = schema;

/** Dono cadastra alguém da equipe com uma senha provisória (a pessoa cria a própria no primeiro acesso). */
export async function criarUsuario(_: EstadoUsuario, form: FormData): Promise<EstadoUsuario> {
  const autor = await exigirPermissao("usuarios");
  const dados = z
    .object({ nome: z.string().trim().min(2).max(60), email: z.string().trim().toLowerCase().email().max(120), papel: z.enum(PAPEIS), senha: z.string() })
    .safeParse({ nome: form.get("nome"), email: form.get("email"), papel: form.get("papel"), senha: form.get("senha") });
  if (!dados.success) return { erro: "Confira nome, e-mail e papel." };
  const { nome, email, papel, senha } = dados.data;
  const problema = problemaNaSenha(senha, email);
  if (problema) return { erro: problema };
  if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) return { erro: "Esse e-mail já é o acesso principal do dono." };
  const banco = await db();
  const [existe] = await banco.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
  if (existe) return { erro: "Já existe um usuário com esse e-mail." };
  await banco.insert(usuarios).values({ nome, email, papel, senhaHash: await gerarHash(senha), deveTrocarSenha: true, criadoPor: autor });
  revalidatePath("/admin/usuarios");
  return { ok: `${nome} cadastrado. Passe a senha provisória pessoalmente; no primeiro acesso o sistema pede uma senha nova.` };
}

/** Troca papel, desativa/reativa ou define nova senha provisória. Toda mudança derruba as sessões abertas da pessoa. */
export async function alterarUsuario(_: EstadoUsuario, form: FormData): Promise<EstadoUsuario> {
  const autor = await exigirPermissao("usuarios");
  const eu = await exigirUsuario();
  const id = Number(form.get("id"));
  const acao = String(form.get("acao"));
  const banco = await db();
  const [u] = await banco.select().from(usuarios).where(eq(usuarios.id, id));
  if (!u) return { erro: "Usuário não encontrado." };
  if (u.id === eu.id && acao !== "senha") return { erro: "Você não pode alterar o seu próprio papel ou se desativar." };
  const derrubar = { sessaoVersao: sql`${usuarios.sessaoVersao} + 1` };

  if (acao === "papel") {
    const papel = z.enum(PAPEIS).safeParse(form.get("papel"));
    if (!papel.success) return { erro: "Papel inválido." };
    await banco.update(usuarios).set({ papel: papel.data, ...derrubar }).where(eq(usuarios.id, id));
    revalidatePath("/admin/usuarios");
    return { ok: `Papel de ${u.nome} alterado.` };
  }
  if (acao === "desativar" || acao === "reativar") {
    await banco.update(usuarios).set({ ativo: acao === "reativar", ...derrubar }).where(eq(usuarios.id, id));
    revalidatePath("/admin/usuarios");
    return { ok: acao === "desativar" ? `${u.nome} não consegue mais entrar no painel.` : `${u.nome} pode entrar de novo.` };
  }
  if (acao === "senha") {
    const senha = String(form.get("senha") ?? "");
    const problema = problemaNaSenha(senha, u.email);
    if (problema) return { erro: problema };
    await banco.update(usuarios).set({ senhaHash: await gerarHash(senha), deveTrocarSenha: true, ...derrubar }).where(eq(usuarios.id, id));
    revalidatePath("/admin/usuarios");
    return { ok: `Senha provisória de ${u.nome} definida por ${autor}. No próximo acesso ela cria uma nova.` };
  }
  return { erro: "Ação inválida." };
}

/** A própria pessoa troca a senha (obrigatório no primeiro acesso). */
export async function trocarMinhaSenha(_: EstadoUsuario, form: FormData): Promise<EstadoUsuario> {
  const eu = await exigirUsuario();
  if (eu.principal) return { erro: "O acesso principal usa a senha das variáveis da Vercel; troque por lá." };
  const atual = String(form.get("atual") ?? "");
  const nova = String(form.get("nova") ?? "");
  const conf = String(form.get("confirmacao") ?? "");
  const banco = await db();
  const [u] = await banco.select().from(usuarios).where(eq(usuarios.id, eu.id));
  if (!u || !(await bcrypt.compare(atual, u.senhaHash))) return { erro: "Senha atual incorreta." };
  if (nova !== conf) return { erro: "A confirmação não bate com a nova senha." };
  if (nova === atual) return { erro: "A nova senha precisa ser diferente da atual." };
  const problema = problemaNaSenha(nova, u.email);
  if (problema) return { erro: problema };
  const [r] = await banco
    .update(usuarios)
    .set({ senhaHash: await gerarHash(nova), deveTrocarSenha: false, sessaoVersao: sql`${usuarios.sessaoVersao} + 1` })
    .where(eq(usuarios.id, eu.id))
    .returning({ sv: usuarios.sessaoVersao, papel: usuarios.papel });
  // Renova a sessão deste aparelho; as de outros aparelhos caem.
  (await cookies()).set(COOKIE, await criarToken({ email: u.email, uid: u.id, sv: r.sv, papel: r.papel }), OPCOES_COOKIE);
  revalidatePath("/admin", "layout");
  return { ok: "Senha alterada." };
}
