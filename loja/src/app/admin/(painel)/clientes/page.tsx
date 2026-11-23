import Link from "next/link";
import { exigirPermissao, usuarioAtual } from "@/lib/admin";
import { historicoExclusoes, listarClientes } from "@/lib/clientes";
import { filtrarClientes } from "@/modules/clientes/clientes";
import { formatarReais } from "@/modules/dinheiro";
import { formatarCelular } from "@/modules/pedidos/whatsapp";
import { pode } from "@/modules/usuarios/permissoes";

export const dynamic = "force-dynamic";
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "2-digit" });
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; apagado?: string }> }) {
  await exigirPermissao("clientesVer");
  const { q = "", apagado } = await searchParams;
  const eu = await usuarioAtual();
  const dono = !!eu && pode(eu.papel, "clientesExcluir");
  const [todos, exclusoes] = await Promise.all([listarClientes(), dono ? historicoExclusoes() : Promise.resolve([])]);
  const lista = filtrarClientes(todos, q);
  const [p, m, a] = (apagado ?? "").split("-");

  return (
    <>
      <div className="topo">
        <h1>Clientes</h1>
        <span className="rotulo">{todos.length} clientes · identificados pelo celular dos pedidos</span>
      </div>
      <div className="cont">
        {apagado && (
          <p className="msg-ok">
            Dados pessoais apagados: {p} pedido(s) anonimizados, {m} mensagem(ns) do chat e {a} arquivo(s) removidos.
          </p>
        )}
        <form className="linha-botoes" action="/admin/clientes">
          <input name="q" defaultValue={q} placeholder="Buscar por nome ou celular" aria-label="Buscar cliente" style={{ flex: 1, minWidth: 240, height: 40, padding: "0 12px", border: "1px solid var(--borda)", borderRadius: 6 }} />
          <button className="btn">Buscar</button>
        </form>
        <div className="cartao tabela-rolar">
          {lista.length === 0 ? (
            <p style={{ padding: 24, color: "var(--texto-2)" }}>Nenhum cliente {q ? "encontrado" : "ainda"}.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="n">Pedidos</th>
                  <th className="n">Comprou (concluídos)</th>
                  <th>Último pedido</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.celular}>
                    <td>
                      <b>{c.nome}</b>
                      <br />
                      <small style={{ color: "var(--texto-2)" }}>{formatarCelular(c.celular)}</small>
                      {c.abertos > 0 && (
                        <small style={{ color: "var(--atencao)", fontWeight: 700 }}>
                          {" "}
                          · {c.abertos} em andamento
                        </small>
                      )}
                    </td>
                    <td className="n">{c.pedidos}</td>
                    <td className="n">{formatarReais(c.totalCentavos)}</td>
                    <td className="num">{data.format(c.ultimo)}</td>
                    <td>
                      <Link href={`/admin/clientes/${c.celular}`} className="btn btn-pq">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {dono && exclusoes.length > 0 && (
          <div className="cartao tabela-rolar">
            <div className="cartao-h">
              <h2>Exclusões feitas (LGPD)</h2>
              <span className="rotulo">registro sem dados pessoais</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Celular</th>
                  <th className="n">Pedidos</th>
                  <th className="n">Mensagens</th>
                  <th>Motivo</th>
                  <th>Feito por</th>
                </tr>
              </thead>
              <tbody>
                {exclusoes.map((x) => (
                  <tr key={x.id}>
                    <td className="num">{hora.format(x.criadoEm)}</td>
                    <td className="num">final {x.celularFinal}</td>
                    <td className="n">{x.pedidos}</td>
                    <td className="n">{x.mensagens}</td>
                    <td>{x.motivo}</td>
                    <td>{x.autor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
