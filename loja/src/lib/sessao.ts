import { jwtVerify, SignJWT } from "jose";

export const COOKIE = "pg_admin";
const DURACAO_S = 60 * 60 * 12;

function chave(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres");
  return new TextEncoder().encode(s);
}

export async function criarToken(email: string): Promise<string> {
  return new SignJWT({ sub: email, papel: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_S}s`)
    .sign(chave());
}

export async function validarToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    return payload.papel === "admin" && typeof payload.sub === "string" ? payload.sub : null;
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
