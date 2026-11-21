/**
 * Catálogo inicial a partir dos encartes publicados em setembro/2026
 * ("Nossas Carnes Premium" e "Os Essenciais do Churrasco").
 * Preços e disponibilidade DEVEM ser revisados no painel antes de abrir a loja.
 * Peso médio das peças fica em branco: a vitrine mostra só o R$/kg até ser cadastrado.
 */
import { eq } from "drizzle-orm";
import { criarDb, migrar } from "../src/db/criar";
import { categorias, configuracoes, produtos } from "../src/db/schema";
import { CONFIG_PADRAO } from "../src/modules/loja/horario";

const CATS = [
  ["bovinos", "Bovinos"],
  ["suinos", "Suínos"],
  ["aves", "Aves"],
  ["cordeiro", "Cordeiro"],
  ["kits", "Kits para Churrasco"],
  ["temperos", "Temperos e Acompanhamentos"],
  ["carvao", "Carvão e Acessórios"],
] as const;

type Seed = { slug: string; nome: string; cat: string; tipo: "PECA" | "PACOTE"; preco: number; peso?: string; foto: string; desc?: string };

const ITENS: Seed[] = [
  { slug: "picanha-argentina-campos-del-plata", nome: "Picanha Argentina Campos Del Plata", cat: "bovinos", tipo: "PECA", preco: 11940, foto: "picanha-argentina-campos-del-plata" },
  { slug: "picanha-uruguaia-las-piedras", nome: "Picanha Uruguaia Las Piedras", cat: "bovinos", tipo: "PECA", preco: 11040, foto: "picanha-uruguaia-las-piedras" },
  { slug: "picanha-argentina-fb-meats", nome: "Picanha Argentina FB Meats", cat: "bovinos", tipo: "PECA", preco: 11040, foto: "picanha-argentina-fb-meats" },
  { slug: "picanha-uruguaia-pul", nome: "Picanha Uruguaia PUL", cat: "bovinos", tipo: "PECA", preco: 11010, foto: "picanha-uruguaia-pul" },
  { slug: "picanha-nacional-pul", nome: "Picanha Nacional PUL", cat: "bovinos", tipo: "PECA", preco: 6580, foto: "picanha-nacional-pul" },
  { slug: "maminha-argentina-arrebeef", nome: "Maminha Argentina Arrebeef", cat: "bovinos", tipo: "PECA", preco: 8970, foto: "maminha-argentina-arrebeef" },
  { slug: "maminha-argentina-fb-meats", nome: "Maminha Argentina FB Meats", cat: "bovinos", tipo: "PECA", preco: 8960, foto: "maminha-argentina-fb-meats" },
  { slug: "maminha-uruguaia-tacuarembo", nome: "Maminha Uruguaia Tacuarembó", cat: "bovinos", tipo: "PECA", preco: 8720, foto: "maminha-uruguaia-tacuarembo" },
  { slug: "maminha-paraguaia-victoria", nome: "Maminha Paraguaia Victória", cat: "bovinos", tipo: "PECA", preco: 7660, foto: "maminha-paraguaia-victoria" },
  { slug: "denver-uruguaio-las-piedras", nome: "Denver Uruguaio Las Piedras", cat: "bovinos", tipo: "PECA", preco: 9440, foto: "denver-uruguaio-las-piedras" },
  { slug: "paleta-cordeiro-uruguaia-las-piedras", nome: "Paleta de Cordeiro Uruguaia Las Piedras", cat: "cordeiro", tipo: "PECA", preco: 7140, foto: "paleta-cordeiro-uruguaia-las-piedras" },
  { slug: "costela-suina-perdigao-na-brasa", nome: "Costela Suína Perdigão Na Brasa", cat: "suinos", tipo: "PACOTE", preco: 2690, foto: "costela-suina-perdigao-na-brasa" },
  { slug: "costela-suina-temperada-perdigao", nome: "Costela Suína Temperada Perdigão Na Brasa", cat: "suinos", tipo: "PACOTE", preco: 2515, foto: "costela-suina-temperada-perdigao" },
  { slug: "linguica-toscana-perdigao-700g", nome: "Linguiça Toscana Perdigão Na Brasa", cat: "suinos", tipo: "PACOTE", preco: 1995, peso: "700 g", foto: "linguica-toscana-perdigao" },
  { slug: "linguica-pernil-perdigao-700g", nome: "Linguiça de Pernil Perdigão Na Brasa", cat: "suinos", tipo: "PACOTE", preco: 2220, peso: "700 g", foto: "linguica-pernil-perdigao" },
  { slug: "linguica-frango-perdigao-700g", nome: "Linguiça de Frango Perdigão Na Brasa", cat: "aves", tipo: "PACOTE", preco: 1895, peso: "700 g", foto: "linguica-frango-perdigao" },
  { slug: "tulipa-frango-temperada-800g", nome: "Tulipa de Frango Temperada Na Brasa", cat: "aves", tipo: "PACOTE", preco: 3390, peso: "800 g", foto: "tulipa-frango-temperada" },
  { slug: "coxinha-asa-levemente-apimentada-natto-600g", nome: "Coxinha da Asa Levemente Apimentada Natto", cat: "aves", tipo: "PACOTE", preco: 1490, peso: "600 g", foto: "coxinha-asa-natto" },
  { slug: "meio-das-asas-barbecue-natto-600g", nome: "Meio das Asas Barbecue Natto", cat: "aves", tipo: "PACOTE", preco: 1490, peso: "600 g", foto: "meio-das-asas-barbecue-natto" },
  { slug: "sobrecoxa-desossada-chimichurri-natto-600g", nome: "Sobrecoxa Desossada Chimichurri Natto", cat: "aves", tipo: "PACOTE", preco: 1390, peso: "600 g", foto: "sobrecoxa-chimichurri-natto" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  const db = await criarDb(url);
  await migrar(db, url);

  const existentes = await db.select().from(categorias);
  if (existentes.length === 0) await db.insert(categorias).values(CATS.map(([slug, nome], ordem) => ({ slug, nome, ordem })));
  const cats = new Map((await db.select().from(categorias)).map((c) => [c.slug, c.id]));

  let novos = 0;
  for (const [ordem, i] of ITENS.entries()) {
    const ja = await db.select({ id: produtos.id }).from(produtos).where(eq(produtos.slug, i.slug));
    if (ja.length) continue;
    await db.insert(produtos).values({
      slug: i.slug,
      nome: i.nome,
      descricao: i.desc ?? "",
      categoriaId: cats.get(i.cat)!,
      tipoVenda: i.tipo,
      precoCentavos: i.preco,
      pesoNominal: i.peso ?? null,
      fotoUrl: `/produtos/${i.foto}.webp`,
      ordem,
    });
    novos++;
  }

  const cfg = await db.select().from(configuracoes);
  if (cfg.length === 0) await db.insert(configuracoes).values({ id: 1, dados: CONFIG_PADRAO });

  console.log(`Seed concluído: ${novos} produtos novos.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
