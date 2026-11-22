import { exigirPermissao } from "@/lib/admin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Conferencia } from "./conferencia";
import { FormItem } from "../forms";
import { recusarNota, removerItem } from "../acoes";
import { dataBr, ROTULO_NOTA } from "../rotulos";
import { db, schema } from "@/db";
import { formatarReais } from "@/modules/dinheiro";

export const dynamic = "force-dynamic";

export default async function Nota({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ confirmada?: string }> }) {
  await exigirPermissao("notas");
  const { id } = await params;
  const { confirmada } = await searchParams;
  const banco = await db();
  const { notasEntrada, notaItens, fornecedores, produtos, vinculosFornecedor } = schema;
  const [linha] = await banco.select({ n: notasEntrada, f: fornecedores }).from(notasEntrada).innerJoin(fornecedores, eq(notasEntrada.fornecedorId, fornecedores.id)).where(eq(notasEntrada.id, Number(id)));
  if (!linha) notFound();
  const { n, f } = linha;
  const itens = await banco.select().from(notaItens).where(eq(notaItens.notaId, n.id)).orderBy(asc(notaItens.id));
  const prods = await banco.select({ id: produtos.id, nome: produtos.nome, tipoVenda: produtos.tipoVenda, pesoNominal: produtos.pesoNominal }).from(produtos).orderBy(asc(produtos.nome));
  const vinc = await banco.select().from(vinculosFornecedor).where(eq(vinculosFornecedor.fornecedorId, f.id));
  const porCaixa = new Map(vinc.map((v) => [v.codigoFornecedor, v.unidadesPorCaixa]));
  const pendente = n.status === "PENDENTE";
  const st = ROTULO_NOTA[n.status];

  return (
    <>
      <div className="topo">
        <h1>Nota {n.numero}</h1>
        <span className={`chip ${st.c}`}>
          <i />
          {st.t}
        </span>
        <div className="esp" />
        <Link href="/admin/notas" className="btn btn-pq">
          ‹ Notas
        </Link>
      </div>
      <div className="cont">
        {confirmada && <p className="msg-ok">Entrada confirmada: o estoque foi atualizado só com o que foi aceito e o custo médio foi recalculado.</p>}
        <div className="cartao">
          <dl className="kv">
            <dt>Fornecedor</dt>
            <dd>
              {f.nome} · CNPJ {f.cnpj}
            </dd>
            <dt>Emissão</dt>
            <dd>{dataBr(n.emissao)}</dd>
            <dt>Valor da nota</dt>
            <dd className="num">{formatarReais(n.valorTotalCentavos)}</dd>
            <dt>Origem</dt>
            <dd>{n.origem === "XML" ? "XML do fornecedor (arquivo guardado)" : `Digitada — ${n.motivoManual}`}</dd>
            {n.chave && (
              <>
                <dt>Chave</dt>
                <dd className="num" style={{ fontSize: 12.5 }}>
                  {n.chave.replace(/(\d{4})/g, "$1 ").trim()}
                </dd>
              </>
            )}
            {n.confirmadoPor && (
              <>
                <dt>{n.status === "RECUSADA" ? "Recusada por" : "Confirmada por"}</dt>
                <dd>{n.confirmadoPor}</dd>
              </>
            )}
          </dl>
        </div>

        {pendente && n.origem === "MANUAL" && (
          <div className="cartao">
            <div className="cartao-h">
              <h2>Itens digitados</h2>
              <span className="rotulo">{itens.length} item(ns)</span>
            </div>
            {itens.length > 0 && (
              <table>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.id}>
                      <td>{i.descricao}</td>
                      <td className="n">
                        {(i.quantidadeMil / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {i.unidade}
                      </td>
                      <td className="n">{formatarReais(i.valorTotalCentavos)}</td>
                      <td className="n">
                        <form action={removerItem}>
                          <input type="hidden" name="notaId" value={n.id} />
                          <input type="hidden" name="itemId" value={i.id} />
                          <button className="btn btn-pq btn-perigo">Remover</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <FormItem notaId={n.id} produtos={prods.map((p) => ({ id: p.id, nome: p.nome }))} />
          </div>
        )}

        {itens.length > 0 && (
          <Conferencia
            notaId={n.id}
            pendente={pendente}
            produtos={prods.map((p) => ({ id: p.id, nome: p.nome + (p.pesoNominal ? ` ${p.pesoNominal}` : ""), tipoVenda: p.tipoVenda }))}
            itens={itens.map((i) => ({
              id: i.id,
              descricao: i.descricao,
              codigo: i.codigoFornecedor,
              unidade: i.unidade,
              quantidadeMil: i.quantidadeMil,
              valorTotalCentavos: i.valorTotalCentavos,
              produtoId: i.produtoId,
              aceitoMil: i.aceitoMil,
              divergencia: i.divergencia,
              divergenciaNota: i.divergenciaNota,
              gramas: i.gramas,
              pecas: i.pecas,
              unidades: i.unidades,
              unidadesPorCaixa: porCaixa.get(i.codigoFornecedor) ?? null,
            }))}
          />
        )}

        {pendente && (
          <form action={recusarNota} className="cartao" style={{ display: "flex", gap: 12, alignItems: "end", padding: "14px 18px", flexWrap: "wrap" }}>
            <input type="hidden" name="notaId" value={n.id} />
            <div className="f" style={{ flex: 1, minWidth: 260 }}>
              <label htmlFor="motivoRecusa">Recusar a nota inteira (mercadoria devolvida)</label>
              <input id="motivoRecusa" name="motivo" placeholder="Motivo da recusa" required maxLength={200} />
            </div>
            <button className="btn btn-perigo">Recusar nota</button>
          </form>
        )}
      </div>
    </>
  );
}
