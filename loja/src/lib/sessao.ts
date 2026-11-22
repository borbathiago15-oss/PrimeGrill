import { jwtVerify, SignJWT } from "jose";

export const COOKIE = "pg_admin";
const DURACAO_S = 60 * 60 * 12;
const PAPEIS_VALIDOS = ["DONO", "GERENTE", "ATENDENTE"];

function chave(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres");
  return new TextEncoder().encode(s);
}

/** uid 0 = acesso principal (dono configurado nas variáveis da Vercel). */
export type DadosSessao = { email: string; uid: number; sv: number };

export async function criarToken(d: DadosSessao & { papel: string }): Promise<string> {
  return new SignJWT({ sub: d.email, uid: d.uid, sv: d.sv, papel: d.papel })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_S}s`)
    .sign(chave());
}

/** Só confere assinatura e validade (serve no middleware). Ativo/papel atual são checados no banco. */
export async function validarToken(token: string | undefined): Promise<DadosSessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.uid !== "number" || typeof payload.sv !== "number") return null;
    if (!PAPEIS_VALIDOS.includes(String(payload.papel))) return null;
    return { email: payload.sub, uid: payload.uid, sv: payload.sv };
  } catch {
    return null;
  }
}

export const OPCOES_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACAO_S,
};
