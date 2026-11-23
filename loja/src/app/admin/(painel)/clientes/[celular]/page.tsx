import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPermissao, usuarioAtual } from "@/lib/admin";
import { pedidosDoCliente } from "@/lib/clientes";
import { ROTULO_STATUS } from "@/lib/pedidos";
import { formatarReais } from "@/modules/dinheiro";
import { formatarCelular } from "@/modules/pedidos/whatsapp";
import { pode } from "@/modules/usuarios/permissoes";
import { ExcluirCliente } from "../excluir";

export const dynamic = "force-dynamic";
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const ABERTOS = ["NOVO", "EM_SEPARACAO", "AGUARDANDO_CLIENTE", "CONFIRMADO"];

export default async function Cliente({ params }: { params: Promise<{ celular: string }> }) {
  await exigirPermissao("clientesVer");
  const { celular } = await params;
  if (!/^\d{10,11}$/.test(celular)) notFound();
  const lista = await pedidosDoCliente(celular);
  if (!lista.length) notFound();
  const eu = await usuarioAtual();
  const dono = !!eu && pode(eu.papel, "clientesExcluir");
  const abertos = lista.filter((p) => ABERTOS.includes(p.status));

  return (
    <>
      <div className="topo">
        <h1>{lista[0].clienteNome}</h1>
        <span className="rotulo">{formatarCelular(celular)}</span>
        <div className="esp" />
        <a className="btn btn-pq" href={`https://wa.me/55${celular}`} target="_blank" rel="noopener noreferrer">
          WhatsApp ↗
        </a>
        <Link href="/admin/clientes" className="btn btn-pq">
          ‹ Clientes
        </Link>
      </div>
      <div className="cont">
        <div className="cartao tabela-rolar">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Recebimento</th>
                <th className="n">Total</th>
                <th>Status</th>
                <th>Feito em</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/pedidos/${p.id}`} style={{ fontWeight: 700 }}>
                      {p.codigo}
                    </Link>
                    {p.clienteNome !== lista[0].clienteNome && <small style={{ color: "var(--texto-2)" }}> · como {p.clienteNome}</small>}
                  </td>
                  <td>{p.modo === "ENTREGA" ? `Entrega · ${p.bairro ?? ""}` : "Retirada"}</td>
                  <td className="n">{formatarReais(p.totalFinalCentavos ?? p.totalEstimadoCentavos)}</td>
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
        </div>
        {dono && (
          <ExcluirCliente
            celular={celular}
            celularFormatado={formatarCelular(celular)}
            bloqueio={abertos.length ? `Há pedido em andamento (${abertos.map((p) => p.codigo).join(", ")}). Conclua ou cancele antes de apagar os dados.` : null}
          />
        )}
      </div>
    </>
  );
}
