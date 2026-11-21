import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { FormProduto } from "./form";
import { db, schema } from "@/db";
import { formatarValor } from "@/modules/dinheiro";

export const dynamic = "force-dynamic";

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banco = await db();
  const cats = await banco.select().from(schema.categorias).orderBy(asc(schema.categorias.ordem));
  let p: typeof schema.produtos.$inferSelect | undefined;
  if (id !== "novo") {
    [p] = await banco.select().from(schema.produtos).where(eq(schema.produtos.id, Number(id)));
    if (!p) notFound();
  }
  return (
    <>
      <div className="topo">
        <h1>{p ? p.nome : "Novo produto"}</h1>
        <div className="esp" />
        <Link href="/admin/produtos" className="btn btn-pq">
          ‹ Produtos
        </Link>
      </div>
      <div className="cont">
        <FormProduto
          categorias={cats.map((c) => ({ id: c.id, nome: c.nome }))}
          inicial={
            p
              ? {
                  id: p.id,
                  nome: p.nome,
                  descricao: p.descricao,
                  categoriaId: p.categoriaId,
                  tipoVenda: p.tipoVenda,
                  preco: formatarValor(p.precoCentavos),
                  pesoMedio: p.pesoMedioGramas ? (p.pesoMedioGramas / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3 }) : "",
                  pesoNominal: p.pesoNominal ?? "",
                  quantidade: p.quantidadeDisponivel?.toString() ?? "",
                  ativo: p.ativo,
                  disponivel: p.disponivel,
                  destaque: p.destaque,
                  fotoUrl: p.fotoUrl,
                }
              : null
          }
        />
      </div>
    </>
  );
}
