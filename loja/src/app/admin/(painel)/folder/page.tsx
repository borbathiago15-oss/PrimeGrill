import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { comEstoqueReal } from "@/lib/estoque";
import { TAMANHO, validarProdutos } from "@/modules/folder/folder";
import { FormNovoFolder } from "./form";

export const dynamic = "force-dynamic";
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Folders() {
  await exigirPermissao("folder");
  const banco = await db();
  const { produtos, categorias, folders } = schema;
  const linhas = await banco.select({ p: produtos, cat: categorias.nome }).from(produtos).innerJoin(categorias, eq(produtos.categoriaId, categorias.id)).orderBy(asc(categorias.ordem), asc(produtos.ordem), asc(produtos.nome));
  const reais = await comEstoqueReal(banco, linhas.map((l) => l.p));
  const historico = await banco.select().from(folders).orderBy(desc(folders.criadoEm)).limit(30);
  const ultimas = new Map<number, number>();
  for (const f of historico) if (!ultimas.has(f.grupo ?? f.id)) ultimas.set(f.grupo ?? f.id, f.id);

  return (
    <>
      <div className="topo">
        <h1>Folder automático</h1>
        <span className="rotulo">PDF e imagem a partir do cadastro</span>
      </div>
      <div className="cont">
        <p style={{ fontSize: 14, color: "var(--texto-2)", maxWidth: 820 }}>
          Nome, foto e preço vêm do cadastro de produtos: nada é digitado no folder. Produto sem preço, sem foto, sem estoque ou indisponível fica de fora com o motivo. Se o preço mudar depois, o folder avisa que está desatualizado.
        </p>
        <FormNovoFolder
          produtos={reais.map((p) => {
            const v = validarProdutos([p]);
            return { id: p.id, nome: p.nome + (p.pesoNominal ? ` ${p.pesoNominal}` : ""), categoria: linhas.find((l) => l.p.id === p.id)?.cat ?? "", tipoVenda: p.tipoVenda, precoCentavos: p.precoCentavos, problema: v.fora[0]?.motivo ?? null, destaque: p.destaque };
          })}
        />
        {historico.length > 0 && (
          <div className="cartao tabela-rolar">
            <table>
              <thead>
                <tr>
                  <th>Folder</th>
                  <th>Formato</th>
                  <th className="n">Produtos</th>
                  <th>Feito por</th>
                  <th>Quando</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {historico.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <b>{f.titulo}</b> <small style={{ color: "var(--texto-2)" }}>v{f.versao}{ultimas.get(f.grupo ?? f.id) !== f.id ? " (antiga)" : ""}</small>
                    </td>
                    <td>{TAMANHO[f.formato].rotulo.split(" (")[0]}</td>
                    <td className="n">{f.itens.length}</td>
                    <td>{f.criadoPor}</td>
                    <td className="num">{hora.format(f.criadoEm)}</td>
                    <td>
                      <Link href={`/admin/folder/${f.id}`} className="btn btn-pq">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
