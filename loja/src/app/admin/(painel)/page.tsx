import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ROTULO_STATUS } from "@/lib/pedidos";
import { formatarReais } from "@/modules/dinheiro";
import { STATUS_PEDIDO } from "@/db/schema";

export const dynamic = "force-dynamic";

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filtro = STATUS_PEDIDO.find((s) => s === status);
  const banco = await db();
  const { pedidos } = schema;
  const lista = await banco
    .select()
    .from(pedidos)
    .where(filtro ? eq(pedidos.status, filtro) : undefined)
    .orderBy(desc(pedidos.criadoEm))
    .limit(100);
  return (
    <>
      <div className="topo">
        <h1>Pedidos</h1>
        <span className="rotulo">Loja online</span>
      </div>
      <div className="cont">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin" className={`chip ${!filtro ? "ouro" : "ne"}`}>
            Todos
          </Link>
          {STATUS_PEDIDO.map((s) => (
            <Link key={s} href={`/admin?status=${s}`} className={`chip ${filtro === s ? "ouro" : "ne"}`}>
              {ROTULO_STATUS[s].texto}
            </Link>
          ))}
        </div>
        <div className="cartao tabela-rolar">
          {lista.length === 0 ? (
            <p style={{ padding: 24, color: "var(--texto-2)" }}>Nenhum pedido {filtro ? "com este status" : "ainda"}.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Recebimento</th>
                  <th className="n">Total estimado</th>
                  <th>Status</th>
                  <th>Feito em</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} className="link">
                    <td>
                      <Link href={`/admin/pedidos/${p.id}`} style={{ fontWeight: 700 }}>
                        {p.codigo}
                      </Link>
                    </td>
                    <td>
                      {p.clienteNome}
                      <br />
                      <small style={{ color: "var(--texto-2)" }}>{p.clienteCelular}</small>
                    </td>
                    <td>{p.modo === "ENTREGA" ? `Entrega · ${p.bairro}` : "Retirada"}</td>
                    <td className="n">
                      {formatarReais(p.totalEstimadoCentavos)}
                      {p.temItemPesado ? " *" : ""}
                    </td>
                    <td>
                      <span className={`chip ${ROTULO_STATUS[p.status].cls}`}>
                        <i />
                        {ROTULO_STATUS[p.status].texto}
                      </span>
                    </td>
                    <td className="num">{hora.format(p.criadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <small style={{ color: "var(--texto-2)" }}>* contém peça inteira: valor final após pesagem.</small>
      </div>
    </>
  );
}
