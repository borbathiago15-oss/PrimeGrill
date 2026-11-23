import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { listarInscritos } from "@/lib/promocoes";
import { formatarCelular } from "@/modules/pedidos/whatsapp";
import { revogarPainel } from "./acoes";
import { FormAceite, FormCampanha } from "./forms";

export const dynamic = "force-dynamic";
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "2-digit" });
const ORIGEM: Record<string, string> = { CHECKOUT: "no pedido", SITE: "no site", PAINEL: "pela loja" };

export default async function Promocoes() {
  await exigirPermissao("promocoes");
  const banco = await db();
  const [inscritos, folders, lista] = await Promise.all([
    listarInscritos(),
    banco.select({ id: schema.folders.id, titulo: schema.folders.titulo, versao: schema.folders.versao, formato: schema.folders.formato }).from(schema.folders).orderBy(desc(schema.folders.criadoEm)).limit(20),
    banco.select().from(schema.campanhas).orderBy(desc(schema.campanhas.criadoEm)).limit(20),
  ]);
  const ativos = inscritos.filter((i) => !i.revogadoEm);

  return (
    <>
      <div className="topo">
        <h1>Promoções</h1>
        <span className="rotulo">
          {ativos.length} aceitam receber · {inscritos.length - ativos.length} saíram
        </span>
      </div>
      <div className="cont">
        <p style={{ fontSize: 14, color: "var(--texto-2)", maxWidth: 860 }}>
          Só entra aqui quem aceitou receber promoções: no pedido (caixa própria, desmarcada), no cadastro do site ou registrado pela loja quando o cliente pediu. Toda mensagem leva o link para sair da lista — exigência da LGPD.
        </p>
        <FormCampanha folders={folders} />
        {lista.length > 0 && (
          <div className="cartao tabela-rolar">
            <div className="cartao-h">
              <h2>Campanhas</h2>
            </div>
            <table>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.titulo}</b>
                    </td>
                    <td className="num">{data.format(c.criadoEm)}</td>
                    <td>{c.criadoPor}</td>
                    <td>
                      <Link href={`/admin/promocoes/${c.id}`} className="btn btn-pq">
                        Abrir envio
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <FormAceite />
        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Quem aceitou receber</h2>
          </div>
          {inscritos.length === 0 ? (
            <p style={{ padding: 20, color: "var(--texto-2)" }}>Ninguém ainda. O cadastro aparece no rodapé do cardápio e no fim do pedido.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Aceitou</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inscritos.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <b>{i.nome}</b>
                      <br />
                      <small style={{ color: "var(--texto-2)" }}>{formatarCelular(i.celular)}</small>
                    </td>
                    <td>
                      {data.format(i.aceitouEm)} {ORIGEM[i.origem]}
                      {i.registradoPor && <small style={{ color: "var(--texto-2)" }}> · anotado por {i.registradoPor}</small>}
                    </td>
                    <td>{i.revogadoEm ? <span className="chip ne">Saiu em {data.format(i.revogadoEm)}</span> : <span className="chip ok">Recebe</span>}</td>
                    <td>
                      {!i.revogadoEm && (
                        <form action={revogarPainel}>
                          <input type="hidden" name="id" value={i.id} />
                          <button className="btn btn-pq" title="O cliente pediu para sair (ex.: respondeu SAIR)">
                            Tirar da lista
                          </button>
                        </form>
                      )}
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
