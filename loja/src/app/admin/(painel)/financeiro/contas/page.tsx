import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { formatarReais } from "@/modules/dinheiro";
import { CATEGORIAS_DESPESA, diaRecife, formatarDia, periodo, ROTULO_FORMA_FIN, somarDias, type FormaFin } from "@/modules/financeiro/financeiro";
import { AbasFinanceiro, FiltroPeriodo } from "../abas";
import { cancelarDespesa } from "../acoes";
import { FormContaNota, FormNovaDespesa, FormPagar } from "../forms";

export const dynamic = "force-dynamic";
const { lancamentos, notasEntrada, fornecedores } = schema;
const cat = (c: string) => CATEGORIAS_DESPESA[c as keyof typeof CATEGORIAS_DESPESA] ?? c;

export default async function ContasAPagar({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  await exigirPermissao("financeiro");
  const sp = await searchParams;
  const { de, ate } = periodo(sp.de, sp.ate);
  const hoje = diaRecife();
  const banco = await db();
  const [abertas, pagas, notasSemConta, forns] = await Promise.all([
    banco.select().from(lancamentos).where(and(eq(lancamentos.tipo, "DESPESA"), eq(lancamentos.status, "ABERTO"))).orderBy(asc(lancamentos.vencimento)),
    banco
      .select()
      .from(lancamentos)
      .where(and(eq(lancamentos.tipo, "DESPESA"), eq(lancamentos.status, "QUITADO"), gte(lancamentos.quitadoEm, de), lte(lancamentos.quitadoEm, ate)))
      .orderBy(desc(lancamentos.quitadoEm)),
    banco
      .select({ id: notasEntrada.id, numero: notasEntrada.numero, emissao: notasEntrada.emissao, valor: notasEntrada.valorTotalCentavos, fornecedor: fornecedores.nome })
      .from(notasEntrada)
      .innerJoin(fornecedores, eq(fornecedores.id, notasEntrada.fornecedorId))
      .leftJoin(lancamentos, eq(lancamentos.notaId, notasEntrada.id))
      .where(and(inArray(notasEntrada.status, ["RECEBIDA", "RECEBIDA_DIVERGENCIA"]), isNull(lancamentos.id)))
      .orderBy(desc(notasEntrada.id))
      .limit(30),
    banco.select({ id: fornecedores.id, nome: fornecedores.nome }).from(fornecedores).orderBy(asc(fornecedores.nome)),
  ]);
  const total = (l: { valorCentavos: number }[]) => formatarReais(l.reduce((s, x) => s + x.valorCentavos, 0));
  const vencidas = abertas.filter((l) => (l.vencimento ?? "") < hoje);

  return (
    <>
      <div className="topo">
        <h1>Contas a pagar</h1>
        <span className="rotulo">
          {abertas.length} em aberto · {total(abertas)}
          {vencidas.length ? ` · ${vencidas.length} vencidas` : ""}
        </span>
      </div>
      <div className="cont">
        <AbasFinanceiro atual="/admin/financeiro/contas" />
        <FormNovaDespesa categorias={Object.entries(CATEGORIAS_DESPESA)} fornecedores={forns} hoje={hoje} />

        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Em aberto</h2>
          </div>
          {abertas.length ? (
            <table>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Conta</th>
                  <th>Categoria</th>
                  <th className="n">Valor</th>
                  <th>Pagar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {abertas.map((l) => {
                  const v = l.vencimento ?? "";
                  return (
                    <tr key={l.id}>
                      <td className={`num ${v < hoje ? "vencida" : ""}`}>
                        {formatarDia(l.vencimento)}
                        {v < hoje ? " · vencida" : v === hoje ? " · hoje" : v <= somarDias(hoje, 3) ? " · em breve" : ""}
                      </td>
                      <td>{l.descricao}</td>
                      <td>{cat(l.categoria)}</td>
                      <td className="n">
                        <b>{formatarReais(l.valorCentavos)}</b>
                      </td>
                      <td>
                        <FormPagar id={l.id} hoje={hoje} formaSugerida={l.forma} />
                      </td>
                      <td>
                        <form action={cancelarDespesa}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className="btn btn-pq" title="Lançada por engano">
                            Cancelar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: 18, color: "var(--texto-2)" }}>Nenhuma conta em aberto.</p>
          )}
        </div>

        {notasSemConta.length > 0 && (
          <div className="cartao tabela-rolar">
            <div className="cartao-h">
              <h2>Notas de entrada sem conta a pagar</h2>
              <span className="rotulo">informe o vencimento do boleto</span>
            </div>
            <table>
              <tbody>
                {notasSemConta.map((n) => (
                  <tr key={n.id}>
                    <td>
                      NF {n.numero} · {n.fornecedor}
                    </td>
                    <td className="num">emitida {formatarDia(n.emissao.slice(0, 10))}</td>
                    <td className="n">{formatarReais(n.valor)}</td>
                    <td>
                      <FormContaNota notaId={n.id} sugestao={n.emissao.slice(0, 10) < hoje ? hoje : n.emissao.slice(0, 10)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Pagas no período · {total(pagas)}</h2>
            <FiltroPeriodo de={de} ate={ate} />
          </div>
          {pagas.length ? (
            <table>
              <thead>
                <tr>
                  <th>Pago em</th>
                  <th>Conta</th>
                  <th>Categoria</th>
                  <th>Forma</th>
                  <th className="n">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pagas.map((l) => (
                  <tr key={l.id}>
                    <td className="num">{formatarDia(l.quitadoEm)}</td>
                    <td>{l.descricao}</td>
                    <td>{cat(l.categoria)}</td>
                    <td>{ROTULO_FORMA_FIN[l.forma as FormaFin] ?? l.forma ?? "—"}</td>
                    <td className="n">{formatarReais(l.valorCentavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: 18, color: "var(--texto-2)" }}>Nenhuma despesa paga neste período.</p>
          )}
        </div>
      </div>
    </>
  );
}
