import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, validarToken } from "./sessao";

/** Garante sessão de administrador dentro de server actions e páginas (defesa além do middleware). */
export async function exigirAdmin(): Promise<string> {
  const jar = await cookies();
  const usuario = await validarToken(jar.get(COOKIE)?.value);
  if (!usuario) redirect("/admin/login");
  return usuario;
}

function hash(v: string) {
  return createHash("sha256").update(v, "utf8").digest();
}

export function credenciaisValidas(email: string, senha: string): boolean {
  const e = process.env.ADMIN_EMAIL;
  const s = process.env.ADMIN_PASSWORD;
  if (!e || !s || s.length < 12) return false;
  const okEmail = timingSafeEqual(hash(email.trim().toLowerCase()), hash(e.trim().toLowerCase()));
  const okSenha = timingSafeEqual(hash(senha), hash(s));
  return okEmail && okSenha;
}

/** Lista o que falta na configuração do acesso (nunca expõe valores, só a regra não atendida). */
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
