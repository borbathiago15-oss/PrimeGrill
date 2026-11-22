import { usuarioAtual } from "@/lib/admin";
import { pode } from "@/modules/usuarios/permissoes";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { FormAjuste, FormQuebra } from "./forms";
import { db, schema } from "@/db";
import { reservasPorProduto, saldosPorProduto } from "@/lib/estoque";
import { formatarKg, formatarReais } from "@/modules/dinheiro";
import { custoMedio, disponivel, pendenteDeFechamento, SALDO_ZERO } from "@/modules/estoque/saldo";

export const dynamic = "force-dynamic";
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const TIPO: Record<string, string> = {
  ENTRADA_NOTA: "Entrada por nota",
  SAIDA_PEDIDO: "Saída por pedido",
  ESTORNO_PEDIDO: "Estorno de pedido",
  AJUSTE_ENTRADA: "Ajuste (entrada)",
  AJUSTE_SAIDA: "Ajuste (saída)",
  QUEBRA: "Quebra",
};

export default async function ProdutoEstoque({ params }: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  const podeAjustar = !!eu && pode(eu.papel, "estoqueAjustar");
  const { id } = await params;
  const banco = await db();
  const [p] = await banco.select().from(schema.produtos).where(eq(schema.produtos.id, Number(id)));
  if (!p) notFound();
  const s = (await saldosPorProduto(banco, [p.id])).get(p.id) ?? SALDO_ZERO;
  const r = (await reservasPorProduto(banco, [p.id])).get(p.id) ?? 0;
  const movs = await banco.select().from(schema.movimentacoes).where(eq(schema.movimentacoes.produtoId, p.id)).orderBy(desc(schema.movimentacoes.criadoEm)).limit(200);
  const cm = custoMedio(s, p.tipoVenda);
  const qtd = (m: { gramas: number; pecas: number; unidades: number }) =>
    p.tipoVenda === "PECA" ? `${m.gramas >= 0 ? "+" : "−"}${formatarKg(Math.abs(m.gramas))}${m.pecas ? ` · ${m.pecas > 0 ? "+" : "−"}${Math.abs(m.pecas)} pç` : ""}` : `${m.unidades >= 0 ? "+" : "−"}${Math.abs(m.unidades)} un`;

  return (
    <>
      <div className="topo">
        <h1>{p.nome}</h1>
        <span className="chip ne">{p.tipoVenda === "PECA" ? "Peça inteira" : "Pacote"}</span>
        <div className="esp" />
        <Link href="/admin/estoque" className="btn btn-pq">
          ‹ Estoque
        </Link>
      </div>
      <div className="cont">
        <div className="kpis">
          <div className="cartao kpi">
            <span className="rotulo">Saldo</span>
            <b>{p.tipoVenda === "PECA" ? formatarKg(s.gramas) : `${s.unidades} un`}</b>
            <small>{p.tipoVenda === "PECA" ? `${s.pecas} peças` : "pacotes"}</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Reservado / disponível</span>
            <b>
              {r} / {disponivel(s, p.tipoVenda, r)}
            </b>
            <small>{p.tipoVenda === "PECA" ? "peças" : "pacotes"}</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Custo médio</span>
            <b>{cm !== null ? formatarReais(cm) : "—"}</b>
            <small>{p.tipoVenda === "PECA" ? "por kg" : "por pacote"}</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Valor em estoque</span>
            <b>{formatarReais(s.valorCentavos)}</b>
            <small>pelo custo médio</small>
          </div>
        </div>
        {podeAjustar && pendenteDeFechamento(s, p.tipoVenda) && <FormQuebra produtoId={p.id} gramas={s.gramas} />}
        {podeAjustar && <FormAjuste produtoId={p.id} tipoVenda={p.tipoVenda} />}
        <div className="cartao tabela-rolar">
          <div className="cartao-h">
            <h2>Movimentações</h2>
            <span className="rotulo">nenhum saldo muda sem uma linha aqui</span>
          </div>
          {movs.length === 0 ? (
            <p style={{ padding: 18, color: "var(--texto-2)" }}>Sem movimentações. O produto passa a ter estoque real na primeira entrada de nota.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Tipo</th>
                  <th className="n">Quantidade</th>
                  <th className="n">Valor</th>
                  <th>Motivo / origem</th>
                  <th>Por</th>
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id}>
                    <td className="num">{hora.format(m.criadoEm)}</td>
                    <td>
                      {TIPO[m.tipo] ?? m.tipo}
                      {m.manual ? <span className="chip at" style={{ marginLeft: 6 }}>manual</span> : null}
                    </td>
                    <td className="n">{qtd(m)}</td>
                    <td className="n">{formatarReais(Math.abs(m.valorCentavos))}</td>
                    <td>
                      {m.origem === "NOTA" && m.origemId ? <Link href={`/admin/notas/${m.origemId}`}>{m.motivo}</Link> : m.origem === "PEDIDO" && m.origemId ? <Link href={`/admin/pedidos/${m.origemId}`}>{m.motivo}</Link> : m.motivo}
                    </td>
                    <td>{m.autor}</td>
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
