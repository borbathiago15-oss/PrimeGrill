import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG_PADRAO } from "@/modules/loja/horario";
import type { ConfigLoja } from "@/db/schema";

const { produtos, categorias, configuracoes, zonasEntrega } = schema;

export type ProdutoVitrine = typeof produtos.$inferSelect & { categoriaNome: string; categoriaSlug: string };

export async function catalogoPublico(): Promise<{ categoria: { slug: string; nome: string }; itens: ProdutoVitrine[] }[]> {
  const d = await db();
  const linhas = await d
    .select({ p: produtos, c: categorias })
    .from(produtos)
    .innerJoin(categorias, eq(produtos.categoriaId, categorias.id))
    .where(eq(produtos.ativo, true))
    .orderBy(asc(categorias.ordem), asc(produtos.ordem), asc(produtos.nome));
  const grupos = new Map<string, { categoria: { slug: string; nome: string }; itens: ProdutoVitrine[] }>();
  for (const { p, c } of linhas) {
    if (!grupos.has(c.slug)) grupos.set(c.slug, { categoria: { slug: c.slug, nome: c.nome }, itens: [] });
    grupos.get(c.slug)!.itens.push({ ...p, categoriaNome: c.nome, categoriaSlug: c.slug });
  }
  return [...grupos.values()];
}

export async function produtoPublico(slug: string): Promise<ProdutoVitrine | null> {
  const d = await db();
  const [r] = await d
    .select({ p: produtos, c: categorias })
    .from(produtos)
    .innerJoin(categorias, eq(produtos.categoriaId, categorias.id))
    .where(and(eq(produtos.slug, slug), eq(produtos.ativo, true)));
  return r ? { ...r.p, categoriaNome: r.c.nome, categoriaSlug: r.c.slug } : null;
}

export async function configLoja(): Promise<ConfigLoja> {
  const d = await db();
  const [c] = await d.select().from(configuracoes).where(eq(configuracoes.id, 1));
  return { ...CONFIG_PADRAO, ...(c?.dados ?? {}) };
}

export async function zonasAtivas() {
  const d = await db();
  return d.select().from(zonasEntrega).where(eq(zonasEntrega.ativo, true)).orderBy(asc(zonasEntrega.bairro));
}
