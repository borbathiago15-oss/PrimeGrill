import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { digitosCelular } from "@/modules/clientes/clientes";

const { inscritosPromocoes } = schema;

/**
 * Registra (ou renova) o consentimento para receber promoções. Um cadastro por celular.
 * Quem tinha se descadastrado e aceitou de novo volta a receber, com a nova data de aceite.
 */
export async function registrarAceite(p: { celular: string; nome: string; origem: "CHECKOUT" | "SITE" | "PAINEL"; registradoPor?: string }) {
  const celular = digitosCelular(p.celular);
  if (!/^\d{10,11}$/.test(celular)) return;
  const nome = p.nome.trim().slice(0, 80) || "Cliente";
  const banco = await db();
  const [ja] = await banco.select().from(inscritosPromocoes).where(eq(inscritosPromocoes.celular, celular));
  if (ja) {
    await banco
      .update(inscritosPromocoes)
      .set({ nome, ...(ja.revogadoEm ? { revogadoEm: null, aceitouEm: new Date(), origem: p.origem, registradoPor: p.registradoPor ?? null } : {}) })
      .where(eq(inscritosPromocoes.id, ja.id));
    return;
  }
  await banco.insert(inscritosPromocoes).values({ celular, nome, origem: p.origem, registradoPor: p.registradoPor ?? null, token: randomBytes(16).toString("base64url") });
}

/** Descadastro pelo link da mensagem. Devolve false se o link não existe. */
export async function revogarPorToken(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return false;
  const banco = await db();
  const [i] = await banco.select({ id: inscritosPromocoes.id }).from(inscritosPromocoes).where(eq(inscritosPromocoes.token, token));
  if (!i) return false;
  await banco.update(inscritosPromocoes).set({ revogadoEm: new Date() }).where(and(eq(inscritosPromocoes.id, i.id), isNull(inscritosPromocoes.revogadoEm)));
  return true;
}

export async function inscritoPorToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  const [i] = await (await db()).select().from(inscritosPromocoes).where(eq(inscritosPromocoes.token, token));
  return i ?? null;
}

export async function listarInscritos() {
  return (await db()).select().from(inscritosPromocoes).orderBy(desc(inscritosPromocoes.aceitouEm));
}
