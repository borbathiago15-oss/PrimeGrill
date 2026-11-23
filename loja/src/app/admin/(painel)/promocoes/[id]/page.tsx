import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { linkDoPedido } from "@/lib/pagamento";
import { listarInscritos } from "@/lib/promocoes";
import { linkWhatsappPara, mensagemCampanha } from "@/modules/promocoes/mensagem";
import { formatarCelular } from "@/modules/pedidos/whatsapp";
import { BotaoEnviar } from "../forms";

export const dynamic = "force-dynamic";

export default async function Campanha({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("promocoes");
  const { id } = await params;
  const banco = await db();
  const [c] = await banco.select().from(schema.campanhas).where(eq(schema.campanhas.id, Number(id)));
  if (!c) notFound();
  const [inscritos, envios] = await Promise.all([listarInscritos(), banco.select().from(schema.campanhaEnvios).where(eq(schema.campanhaEnvios.campanhaId, c.id))]);
  const ativos = inscritos.filter((i) => !i.revogadoEm);
  const enviados = new Set(envios.map((e) => e.inscritoId));
  // Endereço do site pelo qual o painel foi aberto (mesma regra do link do pedido).
  const site = (await linkDoPedido("X")).replace(/\/pedido\/X$/, "");
  const exemplo = mensagemCampanha({ nome: ativos[0]?.nome ?? "Cliente", mensagem: c.mensagem, site, folderId: c.folderId, token: ativos[0]?.token ?? "…" });
  const pendentes = ativos.filter((i) => !enviados.has(i.id));

  return (
    <>
      <div className="topo">
        <h1>{c.titulo}</h1>
        <span className="rotulo">
          {ativos.length - pendentes.length} de {ativos.length} enviados
        </span>
        <div className="esp" />
        <Link href="/admin/promocoes" className="btn btn-pq">
          ‹ Promoções
        </Link>
      </div>
      <div className="cont det">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="cartao tabela-rolar">
            <div className="cartao-h">
              <h2>Enviar para cada cliente</h2>
              <span className="rotulo">um toque por cliente · abre o WhatsApp com a mensagem pronta</span>
            </div>
            {ativos.length === 0 ? (
              <p style={{ padding: 20, color: "var(--texto-2)" }}>Ninguém aceitou receber promoções ainda.</p>
            ) : (
              <table>
                <tbody>
                  {[...pendentes, ...ativos.filter((i) => enviados.has(i.id))].map((i) => (
                    <tr key={i.id}>
                      <td>
                        <b>{i.nome}</b>
                        <br />
                        <small style={{ color: "var(--texto-2)" }}>{formatarCelular(i.celular)}</small>
                      </td>
                      <td className="n">
                        <BotaoEnviar
                          campanhaId={c.id}
                          inscritoId={i.id}
                          enviado={enviados.has(i.id)}
                          link={linkWhatsappPara(i.celular, mensagemCampanha({ nome: i.nome, mensagem: c.mensagem, site, folderId: c.folderId, token: i.token }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="cartao">
            <div className="cartao-h">
              <h2>Como a mensagem chega</h2>
            </div>
            <pre className="previa-msg">{exemplo}</pre>
            {c.folderId && (
              <div className="acoes">
                <a className="btn" href={`/ofertas/${c.folderId}`} target="_blank" rel="noopener">
                  Ver página do folder ↗
                </a>
              </div>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--texto-2)", lineHeight: 1.5 }}>
            O envio é feito pelo seu WhatsApp, um cliente por vez. Quando a loja tiver a API oficial do WhatsApp Business, este mesmo envio pode ser automático para a lista toda.
          </p>
        </div>
      </div>
    </>
  );
}
