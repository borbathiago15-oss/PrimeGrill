import Link from "next/link";
import { and, asc, desc, eq, gte, isNotNull, isNull, lte, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { configLoja } from "@/lib/dados";
import { formatarReais, formatarValor } from "@/modules/dinheiro";
import { bpsParaPercentual, diaRecife, formatarDia, periodo, ROTULO_FORMA_FIN, type FormaFin } from "@/modules/financeiro/financeiro";
import { AbasFinanceiro, FiltroPeriodo } from "../abas";
import { conciliar, desfazerConciliacao } from "../acoes";
import { FormAjustarTaxa, FormTaxas } from "../forms";

export const dynamic = "force-dynamic";
const { lancamentos, pedidos } = schema;
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Recebimentos({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string; ver?: string }> }) {
  await exigirPermissao("financeiro");
  const sp = await searchParams;
  const { de, ate } = periodo(sp.de, sp.ate);
  const hoje = diaRecife();
  const banco = await db();
  const cfg = (await configLoja()).financeiro;
  const base = and(eq(lancamentos.tipo, "RECEITA"), ne(lancamentos.status, "CANCELADO"));
  const [pendentes, conferidos] = await Promise.all([
    banco
      .select({ l: lancamentos, pedidoId: pedidos.id })
      .from(lancamentos)
      .leftJoin(pedidos, eq(pedidos.id, lancamentos.pedidoId))
      .where(and(base, isNull(lancamentos.conciliadoEm), ne(lancamentos.forma, "DINHEIRO"), ne(lancamentos.forma, "NAO_INFORMADO")))
      .orderBy(asc(lancamentos.previstoEm), asc(lancamentos.id)),
    banco
      .select({ l: lancamentos, pedidoId: pedidos.id })
      .from(lancamentos)
      .leftJoin(pedidos, eq(pedidos.id, lancamentos.pedidoId))
      .where(and(base, isNotNull(lancamentos.conciliadoEm), gte(lancamentos.quitadoEm, de), lte(lancamentos.quitadoEm, ate)))
      .orderBy(desc(lancamentos.conciliadoEm))
      .limit(200),
  ]);
  const jaCairam = pendentes.filter((x) => (x.l.previstoEm ?? "") <= hoje);
  const aCair = pendentes.filter((x) => (x.l.previstoEm ?? "") > hoje);

  const tabela = (lista: typeof pendentes, marcar: boolean) => (
    <table>
      <thead>
        <tr>
          {marcar && <th style={{ width: 32 }}></th>}
          <th>Recebimento</th>
          <th>Forma</th>
          <th>Recebido em</th>
          <th>Cai em</th>
          <th className="n">Bruto</th>
          <th className="n">Taxa</th>
          <th className="n">Líquido</th>
          {marcar && <th></th>}
        </tr>
      </thead>
      <tbody>
        {lista.map(({ l, pedidoId }) => (
          <tr key={l.id}>
            {marcar && (
              <td>
                <input type="checkbox" name="id" value={l.id} form="form-conciliar" aria-label={`Conferido: ${l.descricao}`} />
              </td>
            )}
            <td>{pedidoId ? <Link href={`/admin/pedidos/${pedidoId}`}>{l.descricao}</Link> : l.descricao}</td>
            <td>{ROTULO_FORMA_FIN[l.forma as FormaFin] ?? l.forma}</td>
            <td className="num">{formatarDia(l.quitadoEm)}</td>
            <td className={`num ${marcar && (l.previstoEm ?? "") < hoje ? "vencida" : ""}`}>{formatarDia(l.previstoEm)}</td>
            <td className="n">{formatarReais(l.valorCentavos)}</td>
            <td className="n">{formatarReais(l.taxaCentavos)}</td>
            <td className="n">
              <b>{formatarReais(l.valorCentavos - l.taxaCentavos)}</b>
            </td>
            {marcar ? (
              <td>
                <FormAjustarTaxa id={l.id} liquido={formatarValor(l.valorCentavos - l.taxaCentavos)} />
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <div className="topo">
        <h1>Recebimentos e conciliação</h1>
        <span className="rotulo">{pendentes.length} para conferir no extrato</span>
      </div>
      <div className="cont">
        <AbasFinanceiro atual="/admin/financeiro/recebimentos" />
        <p style={{ fontSize: 14, color: "var(--texto-2)", maxWidth: 860 }}>
          Cada pedido pago vira um recebimento aqui. Abra o extrato do banco/maquininha e marque o que já caiu. Se caiu um valor diferente (taxa real), use “Caiu outro valor?”. Dinheiro é conferido no fechamento do caixa.
        </p>

        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Já deviam ter caído ({jaCairam.length})</h2>
            <form id="form-conciliar" action={conciliar}>
              <button className="btn btn-pri btn-pq">Marcar selecionados como conferidos</button>
            </form>
          </div>
          {jaCairam.length ? tabela(jaCairam, true) : <p style={{ padding: 18, color: "var(--texto-2)" }}>Tudo conferido. 👌</p>}
        </div>

        {aCair.length > 0 && (
          <div className="cartao tabela-rolar">
            <div className="cartao-h">
              <h2>Cartão ainda a cair ({aCair.length})</h2>
              <span className="rotulo">{formatarReais(aCair.reduce((s, x) => s + x.l.valorCentavos - x.l.taxaCentavos, 0))} líquido</span>
            </div>
            {tabela(aCair, true)}
          </div>
        )}

        <FormTaxas
          v={{
            taxaPix: bpsParaPercentual(cfg.taxaPixBps),
            taxaDebito: bpsParaPercentual(cfg.taxaDebitoBps),
            taxaCredito: bpsParaPercentual(cfg.taxaCreditoBps),
            taxaLink: bpsParaPercentual(cfg.taxaLinkBps),
            prazoDebito: String(cfg.prazoDebitoDias),
            prazoCredito: String(cfg.prazoCreditoDias),
            prazoLink: String(cfg.prazoLinkDias),
          }}
        />

        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Conferidos no período</h2>
            <FiltroPeriodo de={de} ate={ate} />
          </div>
          {conferidos.length ? (
            <table>
              <thead>
                <tr>
                  <th>Recebimento</th>
                  <th>Forma</th>
                  <th className="n">Líquido</th>
                  <th>Conferido</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {conferidos.map(({ l, pedidoId }) => (
                  <tr key={l.id}>
                    <td>{pedidoId ? <Link href={`/admin/pedidos/${pedidoId}`}>{l.descricao}</Link> : l.descricao}</td>
                    <td>{ROTULO_FORMA_FIN[l.forma as FormaFin] ?? l.forma}</td>
                    <td className="n">{formatarReais(l.valorCentavos - l.taxaCentavos)}</td>
                    <td className="num">
                      {l.conciliadoEm ? hora.format(l.conciliadoEm) : ""} · {l.conciliadoPor}
                    </td>
                    <td>
                      <form action={desfazerConciliacao}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="btn btn-pq">Desfazer</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: 18, color: "var(--texto-2)" }}>Nada conferido neste período.</p>
          )}
        </div>
      </div>
    </>
  );
}
