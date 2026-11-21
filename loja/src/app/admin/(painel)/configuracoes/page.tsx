import { asc } from "drizzle-orm";
import { FormConfig, FormZona } from "./forms";
import { alternarZona } from "../acoes";
import { db, schema } from "@/db";
import { configLoja } from "@/lib/dados";
import { formatarReais } from "@/modules/dinheiro";

export const dynamic = "force-dynamic";

export default async function Configuracoes() {
  const config = await configLoja();
  const banco = await db();
  const zonas = await banco.select().from(schema.zonasEntrega).orderBy(asc(schema.zonasEntrega.bairro));
  return (
    <>
      <div className="topo">
        <h1>Loja e entregas</h1>
      </div>
      <div className="cont">
        <FormConfig config={config} />
        <div className="cartao">
          <div className="cartao-h">
            <h2>Bairros atendidos (entrega)</h2>
            <span className="rotulo">{zonas.filter((z) => z.ativo).length} ativos</span>
          </div>
          {zonas.length === 0 ? (
            <p style={{ padding: "16px 18px", color: "var(--texto-2)" }}>Nenhum bairro cadastrado: a loja oferece só retirada até você adicionar bairros.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Bairro</th>
                  <th className="n">Taxa</th>
                  <th>Prazo</th>
                  <th className="n">Pedido mínimo</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {zonas.map((z) => (
                  <tr key={z.id}>
                    <td>{z.bairro}</td>
                    <td className="n">{formatarReais(z.taxaCentavos)}</td>
                    <td>{z.prazo || "—"}</td>
                    <td className="n">{z.pedidoMinimoCentavos ? formatarReais(z.pedidoMinimoCentavos) : "—"}</td>
                    <td>{z.ativo ? <span className="chip ok">Ativo</span> : <span className="chip ne">Pausado</span>}</td>
                    <td className="n">
                      <form action={alternarZona}>
                        <input type="hidden" name="id" value={z.id} />
                        <button className="btn btn-pq">{z.ativo ? "Pausar" : "Reativar"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <FormZona />
        </div>
      </div>
    </>
  );
}
