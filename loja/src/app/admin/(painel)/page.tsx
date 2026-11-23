import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ROTULO_STATUS } from "@/lib/pedidos";
import { formatarReais } from "@/modules/dinheiro";
import { STATUS_PEDIDO } from "@/db/schema";
import { AtualizarSozinho } from "@/components/copiar";
import { ROTULO_PAGAMENTO } from "@/lib/pagamento";
import { pedidosComMensagemNova } from "@/lib/chat";

export const dynamic = "force-dynamic";

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ status?: string; "sem-permissao"?: string }> }) {
  const sp = await searchParams;
  const { status } = sp;
  const filtro = STATUS_PEDIDO.find((s) => s === status);
  const banco = await db();
  const { pedidos } = schema;
  const lista = await banco
    .select()
    .from(pedidos)
    .where(filtro ? eq(pedidos.status, filtro) : undefined)
    .orderBy(desc(pedidos.criadoEm))
    .limit(100);
  const comMensagem = await pedidosComMensagemNova();
  const novos = (await banco.select({ id: pedidos.id }).from(pedidos).where(eq(pedidos.status, "NOVO"))).length;
  return (
    <>
      <div className="topo">
        <h1>Pedidos</h1>
        <span className="rotulo">atualiza sozinho</span>
        <div className="esp" />
        <Link href="/admin/pedidos/novo" className="btn btn-pri">
          + Novo pedido (WhatsApp/balcão)
        </Link>
      </div>
      <AtualizarSozinho />
      <div className="cont">
        {sp["sem-permissao"] && <p className="msg-erro">Seu papel não tem acesso a essa área. Fale com o dono da loja.</p>}
        {comMensagem.size > 0 && (
          <p className="alerta-novos" style={{ background: "#E3ECF4", borderColor: "var(--info)" }}>
            <b style={{ color: "var(--info)" }}>💬 {comMensagem.size === 1 ? "1 pedido" : `${comMensagem.size} pedidos`} com mensagem nova</b> do cliente — abra o pedido para responder.
          </p>
        )}
        {novos > 0 && (
          <Link href="/admin?status=NOVO" className="alerta-novos">
            <b>{novos === 1 ? "1 pedido novo" : `${novos} pedidos novos`}</b> esperando a loja aceitar →
          </Link>
        )}
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
                  <th className="n">Total</th>
                  <th>Status</th>
                  <th>Feito em</th>
                  <th></th>
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
                      <small style={{ color: "var(--texto-2)" }}>
                        {p.clienteCelular}
                        {p.origem !== "LOJA_ONLINE" && ` · ${p.origem === "WHATSAPP" ? "WhatsApp" : "Balcão"}`}
                      </small>
                      {comMensagem.has(p.id) && (
                        <>
                          <br />
                          <small style={{ color: "var(--info)", fontWeight: 700 }}>💬 Mensagem nova do cliente</small>
                        </>
                      )}
                      {p.alteracaoCliente && (
                        <>
                          <br />
                          <small style={{ color: "var(--atencao)", fontWeight: 700 }}>Cliente alterou o pedido</small>
                        </>
                      )}
                    </td>
                    <td>{p.modo === "ENTREGA" ? `Entrega${p.bairro ? ` · ${p.bairro}` : ""}` : "Retirada"}</td>
                    <td className="n">
                      {p.totalFinalCentavos !== null ? (
                        <b>{formatarReais(p.totalFinalCentavos)}</b>
                      ) : (
                        <>
                          {formatarReais(p.totalEstimadoCentavos)}
                          {p.temItemPesado ? " *" : ""}
                        </>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${ROTULO_STATUS[p.status].cls}`}>
                        <i />
                        {ROTULO_STATUS[p.status].texto}
                      </span>
                      {(p.status === "CONFIRMADO" || p.pagamentoStatus === "PAGO") && (
                        <>
                          <br />
                          <small style={{ color: "var(--texto-2)" }}>{ROTULO_PAGAMENTO[p.pagamentoStatus].texto}</small>
                        </>
                      )}
                    </td>
                    <td className="num">{hora.format(p.criadoEm)}</td>
                    <td>
                      <Link href={`/admin/pedidos/${p.id}`} className={`btn btn-pq ${p.status === "NOVO" || comMensagem.has(p.id) ? "btn-pri" : ""}`}>
                        {p.status === "NOVO" ? "Abrir e aceitar" : comMensagem.has(p.id) ? "Responder" : "Abrir"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <small style={{ color: "var(--texto-2)" }}>* contém peça inteira: valor final após pesagem. Valor em negrito = total final já pesado.</small>
      </div>
    </>
  );
}
