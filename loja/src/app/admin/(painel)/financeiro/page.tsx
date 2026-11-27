import Link from "next/link";
import { and, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { cmvNoPeriodo } from "@/lib/financeiro";
import { formatarReais } from "@/modules/dinheiro";
import { CATEGORIAS_DESPESA, diaRecife, formatarDia, periodo, resumir, ROTULO_FORMA_FIN, somarDias, type FormaFin } from "@/modules/financeiro/financeiro";
import { AbasFinanceiro, FiltroPeriodo } from "./abas";

export const dynamic = "force-dynamic";
const { lancamentos, pedidos } = schema;

export default async function Financeiro({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  await exigirPermissao("financeiro");
  const sp = await searchParams;
  const { de, ate } = periodo(sp.de, sp.ate);
  const hoje = diaRecife();
  const banco = await db();
  const [noPeriodo, cmv, aReceberPedidos, cartoes, aPagar] = await Promise.all([
    banco.select().from(lancamentos).where(and(gte(lancamentos.quitadoEm, de), lte(lancamentos.quitadoEm, ate))),
    cmvNoPeriodo(banco, de, ate),
    banco
      .select({ n: sql<number>`count(*)`, v: sql<number>`coalesce(sum(coalesce(${pedidos.totalFinalCentavos}, ${pedidos.totalEstimadoCentavos})), 0)` })
      .from(pedidos)
      .where(and(eq(pedidos.status, "CONFIRMADO"), ne(pedidos.pagamentoStatus, "PAGO"))),
    banco
      .select()
      .from(lancamentos)
      .where(and(eq(lancamentos.tipo, "RECEITA"), eq(lancamentos.status, "QUITADO"), isNull(lancamentos.conciliadoEm), sql`${lancamentos.forma} in ('CARTAO_DEBITO','CARTAO_CREDITO','CARTAO_LINK','PIX')`)),
    banco.select().from(lancamentos).where(and(eq(lancamentos.tipo, "DESPESA"), eq(lancamentos.status, "ABERTO"))),
  ]);
  const r = resumir(noPeriodo, cmv);
  const aCair = cartoes.filter((l) => (l.previstoEm ?? "") > hoje);
  const conferir = cartoes.filter((l) => (l.previstoEm ?? "") <= hoje);
  const soma = (l: { valorCentavos: number; taxaCentavos?: number }[]) => l.reduce((s, x) => s + x.valorCentavos - (x.taxaCentavos ?? 0), 0);
  const vencidas = aPagar.filter((l) => (l.vencimento ?? "") < hoje);
  const semana = aPagar.filter((l) => (l.vencimento ?? "") >= hoje && (l.vencimento ?? "") <= somarDias(hoje, 7));

  return (
    <>
      <div className="topo">
        <h1>Financeiro</h1>
        <span className="rotulo">
          {formatarDia(de)} a {formatarDia(ate)}
        </span>
        <span className="esp" />
        <a className="btn btn-pq" href={`/admin/financeiro/csv?de=${de}&ate=${ate}`}>
          Baixar planilha (CSV) para o contador
        </a>
      </div>
      <div className="cont">
        <AbasFinanceiro atual="/admin/financeiro" />
        <FiltroPeriodo de={de} ate={ate} />

        <div className="kpis">
          <div className="cartao kpi">
            <span className="rotulo">Recebido (bruto)</span>
            <b>{formatarReais(r.bruto)}</b>
            <small>
              {r.pedidos} pedidos · ticket médio {formatarReais(r.ticketMedio)}
            </small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Taxas de maquininha/banco</span>
            <b>{formatarReais(r.taxas)}</b>
            <small>líquido {formatarReais(r.liquido)}</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Despesas pagas</span>
            <b>{formatarReais(r.despesas)}</b>
            <small>CMV {formatarReais(r.cmv)}</small>
          </div>
          <div className={`cartao kpi ${r.resultado >= 0 ? "pos" : "neg"}`}>
            <span className="rotulo">Resultado do período</span>
            <b>{formatarReais(r.resultado)}</b>
            <small>líquido − CMV − despesas</small>
          </div>
        </div>

        <div className="kpis">
          <div className="cartao kpi">
            <span className="rotulo">A receber de clientes</span>
            <b>{formatarReais(Number(aReceberPedidos[0]?.v ?? 0))}</b>
            <small>{Number(aReceberPedidos[0]?.n ?? 0)} pedidos confirmados aguardando pagamento</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Cartão a cair na conta</span>
            <b>{formatarReais(soma(aCair))}</b>
            <small>{aCair.length} recebimentos (líquido)</small>
          </div>
          <Link href="/admin/financeiro/recebimentos" className={`cartao kpi ${conferir.length ? "neg" : ""}`}>
            <span className="rotulo">Conferir no extrato</span>
            <b>{conferir.length}</b>
            <small>{formatarReais(soma(conferir))} já deviam ter caído</small>
          </Link>
          <Link href="/admin/financeiro/contas" className={`cartao kpi ${vencidas.length ? "neg" : ""}`}>
            <span className="rotulo">Contas a pagar</span>
            <b>{formatarReais(soma(aPagar))}</b>
            <small>
              {vencidas.length ? `${vencidas.length} vencidas · ` : ""}
              {formatarReais(soma(semana))} nos próximos 7 dias
            </small>
          </Link>
        </div>

        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Resultado do período</h2>
            <small style={{ color: "var(--texto-2)" }}>pelo que entrou e saiu de fato (regime de caixa)</small>
          </div>
          <table className="fin-dre">
            <tbody>
              <tr>
                <td>Recebimentos de vendas e outras receitas</td>
                <td className="n">{formatarReais(r.bruto)}</td>
              </tr>
              <tr>
                <td>(−) Taxas de maquininha e banco</td>
                <td className="n">{formatarReais(r.taxas ? -r.taxas : 0)}</td>
              </tr>
              <tr className="total">
                <td>Receita líquida</td>
                <td className="n">{formatarReais(r.liquido)}</td>
              </tr>
              <tr>
                <td>(−) Custo das mercadorias que saíram nos pedidos (CMV, custo médio do estoque)</td>
                <td className="n">{formatarReais(r.cmv ? -r.cmv : 0)}</td>
              </tr>
              {r.porCategoria.map(([c, v]) => (
                <tr key={c}>
                  <td>(−) {CATEGORIAS_DESPESA[c as keyof typeof CATEGORIAS_DESPESA] ?? c}</td>
                  <td className="n">{formatarReais(-v)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Resultado</td>
                <td className="n">{formatarReais(r.resultado)}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ padding: "0 18px 14px", fontSize: 13, color: "var(--texto-2)" }}>
            O CMV só considera produtos com controle de estoque e custo vindo das notas de entrada. Se você paga as notas de mercadoria como contas a pagar, elas aparecem em “Fornecedor”: compare com o CMV para ver o que virou estoque.
          </p>
        </div>

        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Recebido por forma de pagamento</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Forma</th>
                <th className="n">Recebimentos</th>
                <th className="n">Bruto</th>
                <th className="n">Taxas</th>
                <th className="n">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {r.porForma.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--texto-2)" }}>
                    Nenhum recebimento no período.
                  </td>
                </tr>
              )}
              {r.porForma.map(([f, v]) => (
                <tr key={f}>
                  <td>{ROTULO_FORMA_FIN[f as FormaFin] ?? f}</td>
                  <td className="n">{v.qtd}</td>
                  <td className="n">{formatarReais(v.bruto)}</td>
                  <td className="n">{formatarReais(v.taxas)}</td>
                  <td className="n">{formatarReais(v.bruto - v.taxas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
