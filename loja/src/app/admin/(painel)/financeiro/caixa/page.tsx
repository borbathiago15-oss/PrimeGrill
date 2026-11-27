import Link from "next/link";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao, exigirUsuario } from "@/lib/admin";
import { caixaAberto } from "@/lib/financeiro";
import { formatarReais, formatarValor } from "@/modules/dinheiro";
import { CATEGORIAS_DESPESA, esperadoNoCaixa } from "@/modules/financeiro/financeiro";
import { pode } from "@/modules/usuarios/permissoes";
import { AbasFinanceiro } from "../abas";
import { FormAbrirCaixa, FormFecharCaixa, FormMovimento } from "../forms";

export const dynamic = "force-dynamic";
const { caixas, caixaMovimentos, lancamentos, pedidos } = schema;
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Caixa() {
  await exigirPermissao("caixa");
  const u = await exigirUsuario();
  const banco = await db();
  const [aberto, historico] = await Promise.all([
    caixaAberto(banco),
    banco.select().from(caixas).where(isNotNull(caixas.fechadoEm)).orderBy(desc(caixas.fechadoEm)).limit(15),
  ]);
  const [movs, lancs] = aberto
    ? await Promise.all([
        banco.select().from(caixaMovimentos).where(eq(caixaMovimentos.caixaId, aberto.id)).orderBy(asc(caixaMovimentos.criadoEm)),
        banco
          .select({ l: lancamentos, codigo: pedidos.codigo, pedidoId: pedidos.id })
          .from(lancamentos)
          .leftJoin(pedidos, eq(pedidos.id, lancamentos.pedidoId))
          .where(and(eq(lancamentos.caixaId, aberto.id), eq(lancamentos.forma, "DINHEIRO")))
          .orderBy(asc(lancamentos.criadoEm)),
      ])
    : [[], []];
  const esperado = aberto ? esperadoNoCaixa(aberto.trocoCentavos, movs, lancs.map((x) => x.l)) : 0;

  // Linha do tempo do caixa aberto.
  const linhas = aberto
    ? [
        { quando: aberto.abertoEm, texto: `Abertura (troco) · ${aberto.abertoPor}`, valor: aberto.trocoCentavos, link: null as string | null },
        ...movs.map((m) => ({ quando: m.criadoEm, texto: `${m.tipo === "SANGRIA" ? "Retirada" : "Reforço"}: ${m.motivo} · ${m.autor}`, valor: m.tipo === "SANGRIA" ? -m.valorCentavos : m.valorCentavos, link: null })),
        ...lancs
          .filter((x) => x.l.status !== "CANCELADO")
          .map((x) => ({
            quando: x.l.criadoEm,
            texto: x.l.tipo === "RECEITA" ? `Venda em dinheiro · ${x.l.descricao}` : `Despesa paga · ${x.l.descricao} (${CATEGORIAS_DESPESA[x.l.categoria as keyof typeof CATEGORIAS_DESPESA] ?? x.l.categoria})`,
            valor: x.l.tipo === "RECEITA" ? x.l.valorCentavos : -x.l.valorCentavos,
            link: x.pedidoId ? `/admin/pedidos/${x.pedidoId}` : null,
          })),
      ].sort((a, b) => a.quando.getTime() - b.quando.getTime())
    : [];

  return (
    <>
      <div className="topo">
        <h1>Caixa</h1>
        <span className="rotulo">{aberto ? `Aberto desde ${hora.format(aberto.abertoEm)}` : "Fechado"}</span>
      </div>
      <div className="cont">
        {pode(u.papel, "financeiro") && <AbasFinanceiro atual="/admin/financeiro/caixa" />}
        <p style={{ fontSize: 14, color: "var(--texto-2)", maxWidth: 860 }}>
          O caixa controla o dinheiro da gaveta. Pedidos pagos em dinheiro na entrega/retirada entram sozinhos no caixa aberto. Pix e cartão vão para a conciliação do financeiro.
        </p>

        {!aberto ? (
          <FormAbrirCaixa />
        ) : (
          <>
            <div className="kpis">
              <div className="cartao kpi">
                <span className="rotulo">Deve ter na gaveta</span>
                <b>{formatarReais(esperado)}</b>
                <small>troco + vendas em dinheiro + reforços − retiradas − despesas</small>
              </div>
              <div className="cartao kpi">
                <span className="rotulo">Vendas em dinheiro</span>
                <b>{formatarReais(lancs.filter((x) => x.l.tipo === "RECEITA" && x.l.status !== "CANCELADO").reduce((s, x) => s + x.l.valorCentavos, 0))}</b>
                <small>{lancs.filter((x) => x.l.tipo === "RECEITA" && x.l.status !== "CANCELADO").length} pedidos</small>
              </div>
            </div>

            <div className="cartao tabela-rolar">
              <div className="cartao-h">
                <h2>Movimento do caixa</h2>
              </div>
              <table>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i}>
                      <td className="num">{hora.format(l.quando)}</td>
                      <td>{l.link ? <Link href={l.link}>{l.texto}</Link> : l.texto}</td>
                      <td className="n" style={{ color: l.valor < 0 ? "var(--erro)" : undefined }}>
                        {formatarReais(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cartao">
              <div className="cartao-h">
                <h2>Retirada ou reforço de troco</h2>
              </div>
              <FormMovimento />
            </div>

            <div className="cartao">
              <div className="cartao-h">
                <h2>Fechar o caixa</h2>
                <span className="rotulo">esperado {formatarReais(esperado)}</span>
              </div>
              <FormFecharCaixa esperado={formatarValor(esperado)} />
            </div>
          </>
        )}

        {historico.length > 0 && (
          <div className="cartao tabela-rolar">
            <div className="cartao-h">
              <h2>Caixas fechados</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Aberto</th>
                  <th>Fechado</th>
                  <th className="n">Esperado</th>
                  <th className="n">Contado</th>
                  <th className="n">Diferença</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((c) => {
                  const dif = (c.contadoCentavos ?? 0) - (c.esperadoCentavos ?? 0);
                  return (
                    <tr key={c.id}>
                      <td className="num">
                        {hora.format(c.abertoEm)} · {c.abertoPor}
                      </td>
                      <td className="num">
                        {c.fechadoEm ? hora.format(c.fechadoEm) : ""} · {c.fechadoPor}
                      </td>
                      <td className="n">{formatarReais(c.esperadoCentavos ?? 0)}</td>
                      <td className="n">{formatarReais(c.contadoCentavos ?? 0)}</td>
                      <td className="n">{dif === 0 ? <span className="chip ok">ok</span> : <span className={`chip ${dif < 0 ? "er" : "at"}`}>{formatarReais(dif)}</span>}</td>
                      <td>{c.observacao}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
