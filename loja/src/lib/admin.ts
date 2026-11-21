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

export function adminConfigurado(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 12 && (process.env.SESSION_SECRET?.length ?? 0) >= 32);
}
