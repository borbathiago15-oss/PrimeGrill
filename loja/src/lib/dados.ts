import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONFIG_PADRAO } from "@/modules/loja/horario";
import { comEstoqueReal } from "@/lib/estoque";
import type { ConfigLoja } from "@/db/schema";

const { produtos, categorias, configuracoes } = schema;

export type ProdutoVitrine = typeof produtos.$inferSelect & { categoriaNome: string; categoriaSlug: string };

export async function catalogoPublico(): Promise<{ categoria: { slug: string; nome: string }; itens: ProdutoVitrine[] }[]> {
  const d = await db();
  const linhas = await d
    .select({ p: produtos, c: categorias })
    .from(produtos)
    .innerJoin(categorias, eq(produtos.categoriaId, categorias.id))
    .where(eq(produtos.ativo, true))
    .orderBy(asc(categorias.ordem), asc(produtos.ordem), asc(produtos.nome));
  const reais = await comEstoqueReal(d, linhas.map((l) => l.p));
  const grupos = new Map<string, { categoria: { slug: string; nome: string }; itens: ProdutoVitrine[] }>();
  for (const [i, { c }] of linhas.entries()) {
    const p = reais[i];
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
  if (!r) return null;
  const [p] = await comEstoqueReal(d, [r.p]);
  return { ...p, categoriaNome: r.c.nome, categoriaSlug: r.c.slug };
}

export async function configLoja(): Promise<ConfigLoja> {
  const d = await db();
  const [c] = await d.select().from(configuracoes).where(eq(configuracoes.id, 1));
  const dados = (c?.dados ?? {}) as Partial<ConfigLoja>;
  return { ...CONFIG_PADRAO, ...dados, entrega: { ...CONFIG_PADRAO.entrega, ...(dados.entrega ?? {}) } };
}
