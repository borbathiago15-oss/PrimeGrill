import Link from "next/link";
import { notFound } from "next/navigation";
import { mudarStatus } from "../../acoes";
import { CalculadoraPesagem } from "./calculadora";
import { ProximoPasso } from "./proximo-passo";
import { AdicionarItens } from "./adicionar";
import { aceitaAdicionar } from "@/lib/adicionar-itens";
import { comEstoqueReal } from "@/lib/estoque";
import { asc } from "drizzle-orm";
import { ChatPedido } from "@/components/chat";
import { enviarChatLoja, lerChatLoja } from "./chat-acoes";
import { AtualizarSozinho } from "@/components/copiar";
import { linkDoPedido, pixDoPedido } from "@/lib/pagamento";
import { usuarioAtual } from "@/lib/admin";
import { pode } from "@/modules/usuarios/permissoes";
import { ROTULO_STATUS, pedidoCompleto } from "@/lib/pedidos";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { configLoja } from "@/lib/dados";
import { formatarDistancia } from "@/modules/entrega/frete";
import { STATUS_PEDIDO } from "@/db/schema";
import { formatarKg, formatarReais, formatarValor } from "@/modules/dinheiro";

export const dynamic = "force-dynamic";
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function DetalhePedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dados, config] = await Promise.all([pedidoCompleto({ id: Number(id) }), configLoja()]);
  if (!dados) notFound();
  const { pedido: p, itens, eventos } = dados;
  const pesagens = await (await db()).select().from(schema.pedidoPesagens).where(eq(schema.pedidoPesagens.pedidoId, p.id));
  const st = ROTULO_STATUS[p.status];
  const celular = "55" + p.clienteCelular.replace(/\D/g, "");
  const destino = [p.endereco && `${p.endereco}, ${p.numero}`, p.bairro, p.cidade, p.cep].filter(Boolean).join(", ");
  const origem = config.entrega.lat !== null ? `${config.entrega.lat},${config.entrega.lng}` : config.entrega.endereco;
  const link = await linkDoPedido(p.codigo);
  const pendentes = itens.reduce((s, i) => s + Math.max(0, i.quantidade - i.separados), 0);
  const podeAdicionar = aceitaAdicionar(p);
  const catalogo = podeAdicionar
    ? (await comEstoqueReal(await db(), await (await db()).select().from(schema.produtos).orderBy(asc(schema.produtos.nome))))
        .filter((x) => x.ativo && x.disponivel)
        .map((x) => ({ id: x.id, nome: x.nome + (x.pesoNominal ? ` ${x.pesoNominal}` : ""), tipoVenda: x.tipoVenda, precoCentavos: x.precoCentavos, estoque: x.controlaEstoque ? (x.quantidadeDisponivel ?? 0) : null }))
    : [];
  const eu = await usuarioAtual();
  const pix = p.totalFinalCentavos !== null && p.formaPagamento === "PIX" ? await pixDoPedido(config.pagamento, p.totalFinalCentavos, p.codigo, { pixCodigo: p.pixCodigo, pixQrUrl: p.pixQrUrl }) : null;
  const rota = p.modo === "ENTREGA" && !p.anonimizadoEm ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}` : null;

  return (
    <>
      <div className="topo">
        <h1>Pedido {p.codigo}</h1>
        <span className={`chip ${st.cls}`}>
          <i />
          {st.texto}
        </span>
        <div className="esp" />
        <Link href="/admin" className="btn btn-pq">
          ‹ Pedidos
        </Link>
      </div>
      <AtualizarSozinho />
      <div className="cont">
        <ProximoPasso p={p} pendentes={pendentes} celular={celular} link={link} pix={pix?.codigoPix ?? null} pixOrigem={pix?.origem ?? null} pagamento={config.pagamento} />
      </div>
      <div className="cont det" style={{ paddingTop: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="cartao">
            <div className="cartao-h">
              <h2>Itens</h2>
              <span className="rotulo">{p.temItemPesado ? "valor estimado" : "valor final"}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="n">Qtd.</th>
                  <th className="n">Preço</th>
                  <th className="n">Valor</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <b>{i.nome}</b>
                      <br />
                      <small style={{ color: "var(--texto-2)" }}>
                        {i.tipoVenda === "PECA" ? `Peça inteira${i.pesoMedioGramas ? ` · peso médio ${formatarKg(i.pesoMedioGramas)}` : ""}` : "Pacote"}
                      </small>
                    </td>
                    <td className="n">{i.quantidade}</td>
                    <td className="n">{i.tipoVenda === "PECA" ? `R$ ${formatarValor(i.precoCentavos)}/kg` : formatarReais(i.precoCentavos)}</td>
                    <td className="n">{i.valorCentavos !== null ? `${i.tipoVenda === "PECA" ? "≈ " : ""}${formatarReais(i.valorCentavos)}` : "a pesar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="kv">
              <dt>Frete</dt>
              <dd className="num">
                {p.freteACombinar ? "a confirmar com o cliente" : formatarReais(p.freteCentavos)}
                {p.distanciaMetros ? ` · ${formatarDistancia(p.distanciaMetros)}` : ""}
              </dd>
              {p.totalFinalCentavos !== null && (
                <>
                  <dt>Total final</dt>
                  <dd className="num" style={{ fontWeight: 700, color: "var(--ok)" }}>{formatarReais(p.totalFinalCentavos)}</dd>
                </>
              )}
              <dt>Total {p.temItemPesado ? "estimado" : ""}</dt>
              <dd className="num" style={{ fontWeight: 700 }}>
                {formatarReais(p.totalEstimadoCentavos)}
              </dd>
            </dl>
          </div>
          {podeAdicionar && <AdicionarItens pedidoId={p.id} produtos={catalogo} />}
          {p.status !== "CANCELADO" && p.status !== "NOVO" && (
            <CalculadoraPesagem
              linkCliente={link}
              podeEnviar={p.status === "AGUARDANDO_CLIENTE" || (p.status === "EM_SEPARACAO" && !p.alteracaoCliente)}
              pedidoId={p.id}
              baixaFeita={p.baixaEstoque}
              pesagens={pesagens.map((x) => ({ itemId: x.itemId, peca: x.peca, gramas: x.gramas, valorCentavos: x.valorCentavos }))}
              codigo={p.codigo}
              celularCliente={celular}
              freteCentavos={p.freteCentavos}
              freteACombinar={p.freteACombinar}
              itens={itens.map((i) => ({ id: i.id, nome: i.nome, tipoVenda: i.tipoVenda, precoCentavos: i.precoCentavos, quantidade: i.quantidade, separados: i.separados }))}
            />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="cartao">
            <ChatPedido
              lado="LOJA"
              tema="claro"
              titulo="Chat com o cliente"
              vazio="Nenhuma mensagem ainda. O cliente escreve pelo link do pedido."
              ler={lerChatLoja.bind(null, p.id)}
              enviar={enviarChatLoja.bind(null, p.id)}
            />
          </div>
          <div className="cartao">
            <div className="cartao-h">
              <h2>Cliente</h2>
              {p.anonimizadoEm ? (
                <span className="chip ne">Dados apagados (LGPD)</span>
              ) : (
                <a className="btn btn-pq" href={`https://wa.me/${celular}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp ↗
                </a>
              )}
            </div>
            <dl className="kv">
              <dt>Nome</dt>
              <dd>{p.clienteNome}</dd>
              <dt>Celular</dt>
              <dd>{p.clienteCelular}</dd>
              <dt>Recebimento</dt>
              <dd>
                {p.anonimizadoEm
                  ? p.modo === "ENTREGA"
                    ? "Entrega (endereço apagado — LGPD)"
                    : "Retirada na loja"
                  : p.modo === "ENTREGA"
                  ? `${p.endereco}, ${p.numero}${p.complemento ? `, ${p.complemento}` : ""} — ${p.bairro}${p.cidade ? `, ${p.cidade}` : ""}${p.cep ? ` · CEP ${p.cep}` : ""}`
                  : "Retirada na loja"}
                {rota && (
                  <>
                    <br />
                    <a href={rota} target="_blank" rel="noopener noreferrer" style={{ color: "var(--info)", fontWeight: 600 }}>
                      Ver rota no mapa ↗
                    </a>
                  </>
                )}
              </dd>
              {p.observacao && (
                <>
                  <dt>Observação</dt>
                  <dd>{p.observacao}</dd>
                </>
              )}
              <dt>Avisos WhatsApp</dt>
              <dd>{p.optinWhatsapp ? "Aceitou" : "Não aceitou"}</dd>
            </dl>
          </div>
          {eu && pode(eu.papel, "pedidosAjusteManual") && (
          <details className="cartao manual-status">
          <summary>Ajuste manual de status / cancelar pedido</summary>
          <form action={mudarStatus}>
            <div className="form" style={{ gridTemplateColumns: "1fr" }}>
              <input type="hidden" name="id" value={p.id} />
              <div className="f">
                <label htmlFor="status">Novo status</label>
                <select id="status" name="status" defaultValue={p.status}>
                  {STATUS_PEDIDO.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_STATUS[s].texto}
                    </option>
                  ))}
                </select>
              </div>
              <div className="f">
                <label htmlFor="nota">Anotação (opcional)</label>
                <input id="nota" name="nota" maxLength={300} placeholder="Ex.: peso real enviado ao cliente" />
              </div>
            </div>
            <div className="acoes">
              <button className="btn">Salvar status</button>
            </div>
          </form>
          </details>
          )}
          <div className="cartao">
            <div className="cartao-h">
              <h2>Histórico</h2>
            </div>
            <ul style={{ listStyle: "none", padding: "8px 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {eventos.map((e) => (
                <li key={e.id} style={{ fontSize: 13 }}>
                  <b>{ROTULO_STATUS[e.status].texto}</b>
                  {e.nota ? ` — ${e.nota}` : ""}
                  <br />
                  <small style={{ color: "var(--texto-2)" }}>
                    {hora.format(e.criadoEm)} · {e.autor}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
