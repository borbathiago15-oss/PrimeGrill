import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { reservasPorProduto, saldosPorProduto } from "@/lib/estoque";
import { formatarKg, formatarReais } from "@/modules/dinheiro";
import { custoMedio, disponivel, pendenteDeFechamento, SALDO_ZERO } from "@/modules/estoque/saldo";

export const dynamic = "force-dynamic";

export default async function Estoque() {
  const banco = await db();
  const { produtos, categorias } = schema;
  const lista = await banco.select({ p: produtos, cat: categorias.nome }).from(produtos).innerJoin(categorias, eq(produtos.categoriaId, categorias.id)).orderBy(asc(categorias.ordem), asc(produtos.nome));
  const [saldos, reservas] = await Promise.all([saldosPorProduto(banco), reservasPorProduto(banco)]);
  const linhas = lista.map(({ p, cat }) => {
    const s = saldos.get(p.id) ?? SALDO_ZERO;
    const r = reservas.get(p.id) ?? 0;
    return { p, cat, s, r, disp: disponivel(s, p.tipoVenda, r), cm: custoMedio(s, p.tipoVenda), pend: pendenteDeFechamento(s, p.tipoVenda) };
  });
  const controlados = linhas.filter((l) => l.p.controlaEstoque);
  const kgTotal = controlados.filter((l) => l.p.tipoVenda === "PECA").reduce((a, l) => a + l.s.gramas, 0);
  const pecas = controlados.reduce((a, l) => a + l.s.pecas, 0);
  const un = controlados.reduce((a, l) => a + l.s.unidades, 0);
  const valor = controlados.reduce((a, l) => a + l.s.valorCentavos, 0);
  const pendentes = linhas.filter((l) => l.pend);

  return (
    <>
      <div className="topo">
        <h1>Estoque</h1>
        <span className="rotulo">saldo vem só de movimentações</span>
        <div className="esp" />
        <Link href="/admin/notas" className="btn btn-pri">
          Dar entrada em nota
        </Link>
      </div>
      <div className="cont">
        <div className="kpis">
          <div className="cartao kpi">
            <span className="rotulo">Carnes em estoque</span>
            <b>{formatarKg(kgTotal)}</b>
            <small>{pecas} peças</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Pacotes em estoque</span>
            <b>{un} un</b>
            <small>{controlados.filter((l) => l.p.tipoVenda === "PACOTE").length} produtos</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Reservado em pedidos</span>
            <b>{[...reservas.values()].reduce((a, b) => a + b, 0)}</b>
            <small>peças/pacotes em pedidos abertos</small>
          </div>
          <div className="cartao kpi">
            <span className="rotulo">Valor em estoque</span>
            <b>{formatarReais(valor)}</b>
            <small>pelo custo médio</small>
          </div>
        </div>
        {pendentes.map((l) => (
          <p key={l.p.id} className="msg-erro" style={{ color: "var(--atencao)", background: "#FBF1E4", borderColor: "#EFD7B8" }}>
            {l.p.nome}: 0 peças e {formatarKg(l.s.gramas)} no saldo. <Link href={`/admin/estoque/${l.p.id}`} style={{ textDecoration: "underline" }}>Fechar como quebra</Link> para liberar novas entradas.
          </p>
        ))}
        <div className="cartao tabela-rolar">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th className="n">Saldo</th>
                <th className="n">Reservado</th>
                <th className="n">Disponível</th>
                <th className="n">Custo médio</th>
                <th>Controle</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ p, cat, s, r, disp, cm }) => (
                <tr key={p.id} className="link">
                  <td>
                    <Link href={`/admin/estoque/${p.id}`} className="prod-l">
                      {p.fotoUrl ? <img src={p.fotoUrl} alt="" /> : <span className="sem" />}
                      <span>
                        <b>{p.nome}</b>
                        <small>{cat}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="chip ne">{p.tipoVenda === "PECA" ? "Peça inteira" : "Pacote"}</span>
                  </td>
                  <td className="n">{p.tipoVenda === "PECA" ? `${formatarKg(s.gramas)} · ${s.pecas} pç` : `${s.unidades} un`}</td>
                  <td className="n">{r || "—"}</td>
                  <td className="n">
                    <b>{p.controlaEstoque ? `${disp} ${p.tipoVenda === "PECA" ? "pç" : "un"}` : "—"}</b>
                  </td>
                  <td className="n">{cm !== null ? `${formatarReais(cm)}${p.tipoVenda === "PECA" ? "/kg" : "/un"}` : "—"}</td>
                  <td>{p.controlaEstoque ? <span className="chip ok">Estoque real</span> : <span className="chip ne">Manual (sem nota)</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
