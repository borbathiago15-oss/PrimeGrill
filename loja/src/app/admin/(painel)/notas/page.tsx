import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { FormManual, FormXml } from "./forms";
import { db, schema } from "@/db";
import { formatarReais } from "@/modules/dinheiro";
import { dataBr as data, ROTULO_NOTA } from "./rotulos";

export const dynamic = "force-dynamic";

export default async function Notas() {
  const banco = await db();
  const { notasEntrada, fornecedores, notaItens } = schema;
  const lista = await banco
    .select({ n: notasEntrada, f: fornecedores.nome, itens: sql<number>`(select count(*)::int from ${notaItens} where ${notaItens.notaId} = ${notasEntrada.id})` })
    .from(notasEntrada)
    .innerJoin(fornecedores, eq(notasEntrada.fornecedorId, fornecedores.id))
    .orderBy(desc(notasEntrada.criadoEm))
    .limit(100);
  const pendentes = lista.filter((l) => l.n.status === "PENDENTE").length;
  return (
    <>
      <div className="topo">
        <h1>Notas fiscais de entrada</h1>
        <span className="rotulo">Recebimento</span>
      </div>
      <div className="cont">
        <div className="cartao" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", flexWrap: "wrap" }}>
          <span className="chip ne">SEFAZ automático</span>
          <span style={{ color: "var(--texto-2)", fontSize: 13 }}>
            Disponível quando o certificado digital A1 da empresa for configurado. Até lá, envie o XML ou digite a nota.
          </span>
        </div>
        <div className="cards2">
          <FormXml />
          <FormManual />
        </div>
        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Notas</h2>
            <span className="chip ouro">{pendentes} pendente(s)</span>
          </div>
          {lista.length === 0 ? (
            <p style={{ padding: 20, color: "var(--texto-2)" }}>Nenhuma nota lançada ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Nota</th>
                  <th>Emissão</th>
                  <th className="n">Itens</th>
                  <th className="n">Valor</th>
                  <th>Origem</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(({ n, f, itens }) => (
                  <tr key={n.id} className="link">
                    <td>
                      <Link href={`/admin/notas/${n.id}`} style={{ fontWeight: 600 }}>
                        {f}
                      </Link>
                    </td>
                    <td className="num">
                      NF-e {n.numero}
                      {n.serie ? ` · série ${n.serie}` : ""}
                    </td>
                    <td className="num">{data(n.emissao)}</td>
                    <td className="n">{itens}</td>
                    <td className="n">{formatarReais(n.valorTotalCentavos)}</td>
                    <td>
                      <span className="chip ne">{n.origem === "XML" ? "XML" : n.origem === "MANUAL" ? "Digitada" : n.origem}</span>
                    </td>
                    <td>
                      <span className={`chip ${ROTULO_NOTA[n.status].c}`}>
                        <i />
                        {ROTULO_NOTA[n.status].t}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
