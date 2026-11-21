import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { alternarDisponivel } from "../acoes";
import { db, schema } from "@/db";
import { formatarKg, formatarValor } from "@/modules/dinheiro";

export const dynamic = "force-dynamic";

export default async function Produtos({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const { salvo } = await searchParams;
  const banco = await db();
  const { produtos, categorias } = schema;
  const lista = await banco
    .select({ p: produtos, cat: categorias.nome })
    .from(produtos)
    .innerJoin(categorias, eq(produtos.categoriaId, categorias.id))
    .orderBy(asc(categorias.ordem), asc(produtos.ordem), asc(produtos.nome));
  const semPeso = lista.filter(({ p }) => p.tipoVenda === "PECA" && !p.pesoMedioGramas).length;

  return (
    <>
      <div className="topo">
        <h1>Produtos e preços</h1>
        <span className="rotulo">{lista.length} produtos</span>
        <div className="esp" />
        <Link href="/admin/produtos/novo" className="btn btn-pri">
          + Novo produto
        </Link>
      </div>
      <div className="cont">
        {salvo && <p className="msg-ok">Produto salvo. A loja já mostra a alteração.</p>}
        {semPeso > 0 && (
          <p className="msg-erro" style={{ color: "var(--atencao)", background: "#FBF1E4", borderColor: "#EFD7B8" }}>
            {semPeso} peça(s) inteira(s) sem peso médio: a loja mostra só o R$/kg, sem valor aproximado.
          </p>
        )}
        <div className="cartao tabela-rolar">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo de venda</th>
                <th className="n">Preço</th>
                <th className="n">Peso médio</th>
                <th className="n">Qtd.</th>
                <th>Na loja</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map(({ p, cat }) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/produtos/${p.id}`} className="prod-l">
                      {p.fotoUrl ? <img src={p.fotoUrl} alt="" /> : <span className="sem" />}
                      <span>
                        <b>{p.nome}</b>
                        <small>
                          {cat}
                          {p.pesoNominal ? ` · ${p.pesoNominal}` : ""}
                        </small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="chip ne">{p.tipoVenda === "PECA" ? "Peça inteira" : "Pacote"}</span>
                  </td>
                  <td className="n">R$ {formatarValor(p.precoCentavos)}{p.tipoVenda === "PECA" ? "/kg" : ""}</td>
                  <td className="n">{p.tipoVenda === "PECA" ? (p.pesoMedioGramas ? formatarKg(p.pesoMedioGramas) : "—") : ""}</td>
                  <td className="n">{p.quantidadeDisponivel ?? "—"}</td>
                  <td>
                    {!p.ativo ? (
                      <span className="chip ne">Oculto</span>
                    ) : p.disponivel ? (
                      <span className="chip ok">
                        <i />
                        Disponível
                      </span>
                    ) : (
                      <span className="chip er">
                        <i />
                        Indisponível
                      </span>
                    )}
                  </td>
                  <td className="n">
                    <form action={alternarDisponivel} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn btn-pq">{p.disponivel ? "Marcar indisponível" : "Marcar disponível"}</button>
                    </form>{" "}
                    <Link href={`/admin/produtos/${p.id}`} className="btn btn-pq">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
