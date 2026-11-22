import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Papel } from "@/db/schema";
import { pode, type Permissao } from "@/modules/usuarios/permissoes";
import { COOKIE, validarToken } from "./sessao";

export type UsuarioLogado = { id: number; email: string; nome: string; papel: Papel; principal: boolean; deveTrocarSenha: boolean };

/** Usuário da sessão, conferido no banco a cada requisição (desativado ou senha trocada = sessão cai). */
export const usuarioAtual = cache(async (): Promise<UsuarioLogado | null> => {
  const jar = await cookies();
  const s = await validarToken(jar.get(COOKIE)?.value);
  if (!s) return null;
  if (s.uid === 0) {
    const e = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!e || e !== s.email) return null;
    return { id: 0, email: e, nome: "Dono (acesso principal)", papel: "DONO", principal: true, deveTrocarSenha: false };
  }
  const banco = await db();
  const [u] = await banco.select().from(schema.usuarios).where(eq(schema.usuarios.id, s.uid));
  if (!u || !u.ativo || u.sessaoVersao !== s.sv || u.email !== s.email) return null;
  return { id: u.id, email: u.email, nome: u.nome, papel: u.papel, principal: false, deveTrocarSenha: u.deveTrocarSenha };
});

export async function exigirUsuario(): Promise<UsuarioLogado> {
  const u = await usuarioAtual();
  if (!u) redirect("/admin/login");
  return u;
}

/** Garante sessão válida dentro de server actions e páginas. Devolve o autor para o histórico. */
export async function exigirAdmin(): Promise<string> {
  return (await exigirUsuario()).email;
}

/** Garante que o papel do usuário permite a ação; senão volta para os pedidos. */
export async function exigirPermissao(p: Permissao): Promise<string> {
  const u = await exigirUsuario();
  if (!pode(u.papel, p)) redirect("/admin?sem-permissao=1");
  return u.email;
}

function hash(v: string) {
  return createHash("sha256").update(v, "utf8").digest();
}

/** Acesso principal (variáveis da Vercel): continua valendo como acesso de recuperação do dono. */
export function credenciaisPrincipais(email: string, senha: string): boolean {
  const e = process.env.ADMIN_EMAIL;
  const s = process.env.ADMIN_PASSWORD;
  if (!e || !s || s.length < 12) return false;
  const okEmail = timingSafeEqual(hash(email.trim().toLowerCase()), hash(e.trim().toLowerCase()));
  const okSenha = timingSafeEqual(hash(senha), hash(s));
  return okEmail && okSenha;
}

// Hash fixo para gastar o mesmo tempo quando o e-mail não existe (não revela quais e-mails têm conta).
let hashFalso: Promise<string> | null = null;
const HASH_FALSO = () => (hashFalso ??= bcrypt.hash(crypto.randomUUID(), 12));

/** Confere login: primeiro usuários cadastrados, depois o acesso principal. */
export async function autenticar(emailBruto: string, senha: string) {
  const email = emailBruto.trim().toLowerCase();
  const banco = await db();
  const [u] = await banco.select().from(schema.usuarios).where(eq(schema.usuarios.email, email));
  const ok = await bcrypt.compare(senha, u?.senhaHash ?? (await HASH_FALSO()));
  if (u && ok) {
    if (!u.ativo) return null;
    await banco.update(schema.usuarios).set({ ultimoAcesso: new Date() }).where(eq(schema.usuarios.id, u.id));
    return { email: u.email, uid: u.id, sv: u.sessaoVersao, papel: u.papel };
  }
  if (credenciaisPrincipais(email, senha)) return { email, uid: 0, sv: 0, papel: "DONO" as Papel };
  return null;
}

export const gerarHash = (senha: string) => bcrypt.hash(senha, 12);

/** Lista o que falta na configuração do acesso principal (nunca expõe valores, só a regra não atendida). */
export function pendenciasAdmin(): string[] {
  const p: string[] = [];
  const email = process.env.ADMIN_EMAIL?.trim() ?? "";
  const senha = process.env.ADMIN_PASSWORD ?? "";
  if (!email) p.push("ADMIN_EMAIL não encontrado");
  else if (!email.includes("@")) p.push("ADMIN_EMAIL não parece um e-mail");
  if (!senha) p.push("ADMIN_PASSWORD não encontrado");
  else if (senha.length < 12) p.push("ADMIN_PASSWORD tem menos de 12 caracteres");
  if ((process.env.SESSION_SECRET?.length ?? 0) < 32) p.push("SESSION_SECRET ausente ou curto");
  return p;
}

export function adminConfigurado(): boolean {
  return pendenciasAdmin().length === 0;
}
