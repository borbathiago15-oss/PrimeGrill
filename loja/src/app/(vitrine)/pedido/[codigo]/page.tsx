import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { configLoja } from "@/lib/dados";
import { paraMensagem, pedidoCompleto } from "@/lib/pedidos";
import { formasAceitas, pixDoPedido } from "@/lib/pagamento";
import { textosAtuais } from "@/lib/idioma";
import { AtualizarSozinho, BotaoCopiar } from "@/components/copiar";
import { formatarDistancia } from "@/modules/entrega/frete";
import { formatarKg, formatarReais, formatarValor } from "@/modules/dinheiro";
import { linkWhatsapp, mensagemPedido } from "@/modules/pedidos/whatsapp";
import { AlterarPedido, EscolherPagamento, JaPaguei } from "./pagamento-cliente";
import { ChatPedido } from "@/components/chat";
import { LembrarPedido } from "@/components/app-instalavel";
import { AtivarAvisos } from "@/components/ativar-avisos";
import { aceitaAdicionar } from "@/lib/adicionar-itens";
import { enviarChatCliente, lerChatCliente } from "./chat-acoes";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await textosAtuais();
  return { title: t.pedido.metaTitulo, robots: { index: false } };
}

export default async function PedidoCliente({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^PG-[A-Z0-9]{6}$/.test(codigo)) notFound();
  const [dados, config, { idioma, t }] = await Promise.all([pedidoCompleto({ codigo }), configLoja(), textosAtuais()]);
  if (!dados) notFound();
  const p = dados.pedido;
  const tp = t.pedido;
  const msg = paraMensagem(dados);
  // A mensagem que vai para o WhatsApp da loja fica em português (quem lê é a equipe).
  const linkWa = linkWhatsapp(config.whatsapp, mensagemPedido(msg));
  const falarLoja = linkWhatsapp(config.whatsapp, `Olá! Sobre o pedido ${p.codigo}:`);
  const primeiroNome = p.clienteNome.split(" ")[0];
  const status = p.status;
  const entrega = p.modo === "ENTREGA";
  const pesagens = p.baixaEstoque ? await (await db()).select().from(schema.pedidoPesagens).where(eq(schema.pedidoPesagens.pedidoId, p.id)).orderBy(asc(schema.pedidoPesagens.id)) : [];
  const final = p.totalFinalCentavos;
  const pix = status === "CONFIRMADO" && p.formaPagamento === "PIX" && p.pagamentoStatus === "PENDENTE" && final !== null ? await pixDoPedido(config.pagamento, final, p.codigo, { pixCodigo: p.pixCodigo, pixQrUrl: p.pixQrUrl }) : null;

  const ETAPAS = [
    { chave: "NOVO", texto: tp.etapaRecebido },
    { chave: "EM_SEPARACAO", texto: tp.etapaSeparando },
    { chave: "AGUARDANDO_CLIENTE", texto: tp.etapaConfirme },
    { chave: "CONFIRMADO", texto: tp.etapaConfirmado },
    { chave: "CONCLUIDO", texto: entrega ? tp.etapaEntregue : tp.etapaRetirado },
  ];
  const atual = ETAPAS.findIndex((e) => e.chave === status);
  const hora = new Intl.DateTimeFormat(idioma === "pt" ? "pt-BR" : idioma, { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const quando = (chave: string) => dados.eventos.find((e) => e.status === chave)?.criadoEm;
  const nomeForma = (f: string) => (f === "NA_ENTREGA" ? (entrega ? t.formas.naEntrega : t.formas.naRetirada) : f === "PIX" ? t.formas.PIX : t.formas.CARTAO_LINK);
  const detalheForma: Record<string, string> = {
    PIX: t.formas.detPix,
    CARTAO_LINK: t.formas.detCartao,
    NA_ENTREGA: entrega ? t.formas.detNaEntrega : t.formas.detNaRetirada,
  };
  const opcoes = formasAceitas(config.pagamento).map((f) => ({ forma: f, titulo: nomeForma(f), detalhe: detalheForma[f] }));
  const pecaN = (qtd: number, n: number) => (qtd > 1 ? ` (${tp.peca(n)})` : "");

  return (
    <div className="ck">
      <LembrarPedido codigo={p.codigo} />
      {status !== "CONCLUIDO" && status !== "CANCELADO" && <AtualizarSozinho segundos={25} />}
      <div className="placa" style={{ alignSelf: "flex-start" }}>
        <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 30 }} />
      </div>
      <h1>{status === "NOVO" ? tp.recebido(p.codigo, primeiroNome) : tp.titulo(p.codigo)}</h1>

      {status !== "CANCELADO" && status !== "CONCLUIDO" && <AtivarAvisos publico="CLIENTE" codigo={p.codigo} tema="escuro" />}
      {status === "CANCELADO" ? (
        <p className="erro-box">
          {tp.cancelado}
          {p.motivoCancelamento && (
            <>
              <br />
              <b>{tp.motivo}:</b> {p.motivoCancelamento}
            </>
          )}
        </p>
      ) : (
        <section className="bloco">
          <h2>{tp.acompanhe}</h2>
          <ol className="etapas">
            {ETAPAS.map((e, i) => {
              const quandoFoi = quando(e.chave);
              return (
                <li key={e.chave} className={i < atual ? "feita" : i === atual ? "atual" : ""}>
                  <span>{e.texto}</span>
                  {quandoFoi && i <= atual && <small>{hora.format(quandoFoi)}</small>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {status === "EM_SEPARACAO" && p.alteracaoCliente && <p className="aviso">{tp.alteracaoRecebida}</p>}
      {(status === "NOVO" || (status === "EM_SEPARACAO" && !p.alteracaoCliente)) && (
        <p className="aviso">
          {status === "NOVO" ? tp.avisoNovo : tp.avisoSeparando}
          {p.temItemPesado ? tp.avisoPesado : tp.avisoSemPeso}
          {tp.guardeLink}
        </p>
      )}

      {final !== null && status !== "CANCELADO" && (
        <section className="bloco">
          <h2>{tp.valorFinal}</h2>
          <div className="campos" style={{ gap: 8, fontSize: 14, color: "#D7CEC0" }}>
            {dados.itens.map((i) =>
              i.tipoVenda === "PECA" ? (
                pesagens
                  .filter((x) => x.itemId === i.id)
                  .map((x) => (
                    <div key={x.id} className="linha-valor">
                      <span>
                        {i.nome}
                        {pecaN(i.quantidade, x.peca)} · {formatarKg(x.gramas)} × R$ {formatarValor(i.precoCentavos)}/kg
                      </span>
                      <span className="num">{formatarReais(x.valorCentavos)}</span>
                    </div>
                  ))
              ) : (
                <div key={i.id} className="linha-valor">
                  <span>
                    {i.quantidade}x {i.nome}
                  </span>
                  <span className="num">{formatarReais(i.precoCentavos * i.quantidade)}</span>
                </div>
              ),
            )}
          </div>
          <div className="tot">
            {entrega && (
              <div className="r">
                <span>
                  {t.checkout.frete}
                  {p.distanciaMetros ? ` · ${formatarDistancia(p.distanciaMetros)}` : ""}
                </span>
                <span className="num">{formatarReais(p.freteCentavos)}</span>
              </div>
            )}
            <div className="r f">
              <span>{tp.totalFinal}</span>
              <span className="preco num">{formatarReais(final)}</span>
            </div>
          </div>
        </section>
      )}

      {status === "AGUARDANDO_CLIENTE" && (
        <AlterarPedido
          codigo={p.codigo}
          pecas={dados.itens.flatMap((i) =>
            pesagens
              .filter((x) => x.itemId === i.id)
              .map((x) => ({ id: x.id, texto: `${i.nome}${pecaN(i.quantidade, x.peca)} · ${formatarKg(x.gramas)}`, valor: formatarReais(x.valorCentavos) })),
          )}
          pacotes={dados.itens.filter((i) => i.tipoVenda === "PACOTE").map((i) => ({ id: i.id, nome: i.nome, quantidade: i.quantidade }))}
        />
      )}

      {status === "AGUARDANDO_CLIENTE" && tp.turista && opcoes.some((o) => o.forma === "CARTAO_LINK") && <p className="aviso">{tp.turista}</p>}
      {status === "AGUARDANDO_CLIENTE" &&
        (opcoes.length ? (
          <EscolherPagamento codigo={p.codigo} opcoes={opcoes} />
        ) : (
          <a className="btn-ouro centro" href={falarLoja} target="_blank" rel="noopener noreferrer">
            {tp.confirmarWhats}
          </a>
        ))}

      {status === "CONFIRMADO" && (
        <section className="bloco">
          <h2>
            {tp.pagamento} · {p.formaPagamento ? nomeForma(p.formaPagamento) : tp.aCombinarForma}
          </h2>
          <div className="pagar">
            {p.pagamentoStatus === "PAGO" ? (
              <p className="ok-box">{tp.pago(entrega)}</p>
            ) : p.pagamentoStatus === "INFORMADO" ? (
              <p className="aviso">{tp.informado}</p>
            ) : p.formaPagamento === "PIX" && pix ? (
              <>
                <p>{pix.codigoPix ? tp.pixComCodigo : tp.pixSoQr}</p>
                <img src={pix.qr} alt={tp.pixAlt} width={220} height={220} className="qr" />
                {pix.codigoPix && (
                  <>
                    <textarea readOnly value={pix.codigoPix} rows={3} className="pix-codigo" aria-label="Pix" />
                    <BotaoCopiar texto={pix.codigoPix} rotulo={tp.copiarPix} className="btn-ouro centro" />
                  </>
                )}
                <JaPaguei codigo={p.codigo} />
              </>
            ) : p.formaPagamento === "PIX" ? (
              <p className="aviso">{tp.pixGerando}</p>
            ) : p.formaPagamento === "CARTAO_LINK" ? (
              p.linkCartao ? (
                <>
                  <p>{tp.cartaoInstr}</p>
                  <a className="btn-ouro centro" href={p.linkCartao} target="_blank" rel="noopener noreferrer">
                    {tp.pagarCartao(final !== null ? formatarReais(final) : "")}
                  </a>
                  <JaPaguei codigo={p.codigo} />
                </>
              ) : (
                <p className="aviso">{tp.cartaoGerando}</p>
              )
            ) : p.formaPagamento === "NA_ENTREGA" ? (
              <p className="aviso">{tp.naEntrega(final !== null ? formatarReais(final) : "", entrega)}</p>
            ) : (
              <p className="aviso">{tp.combinarPagamento}</p>
            )}
          </div>
        </section>
      )}

      {status === "CONCLUIDO" && <p className="ok-box">{tp.concluido(entrega)}</p>}

      {final === null && (
        <section className="bloco">
          <h2>{tp.resumo}</h2>
          <div className="campos" style={{ gap: 8, fontSize: 14, color: "#D7CEC0" }}>
            {msg.itens.map((i) => (
              <div key={i.produtoId} className="linha-valor">
                <span>
                  {i.quantidade}x {i.nome}
                </span>
                <span className="num">{i.valorCentavos !== null ? `${i.tipoVenda === "PECA" ? "≈ " : ""}${formatarReais(i.valorCentavos)}` : t.checkout.aPesar}</span>
              </div>
            ))}
          </div>
          <div className="tot">
            {entrega && (
              <div className="r">
                <span>
                  {t.checkout.frete}
                  {p.bairro ? ` · ${p.bairro}` : ""}
                  {p.distanciaMetros ? ` · ${formatarDistancia(p.distanciaMetros)}` : ""}
                </span>
                <span className="num">{p.freteACombinar ? t.checkout.aConfirmar : formatarReais(p.freteCentavos)}</span>
              </div>
            )}
            <div className="r f">
              <span>{p.temItemPesado ? tp.totalEstimado : t.checkout.total}</span>
              <span className="preco num">
                {formatarReais(p.totalEstimadoCentavos)}
                {msg.subtotalIncompleto ? <small>{tp.mais}</small> : null}
              </span>
            </div>
          </div>
        </section>
      )}

      {aceitaAdicionar(p) && (
        <Link href={`/?adicionar=${p.codigo}`} className="btn-linha">
          {tp.adicionarMais}
        </Link>
      )}

      {status !== "CANCELADO" && (
        <ChatPedido
          lado="CLIENTE"
          tema="escuro"
          titulo={t.chat.titulo}
          vazio={t.chat.vazio}
          ler={lerChatCliente.bind(null, p.codigo)}
          enviar={enviarChatCliente.bind(null, p.codigo)}
        />
      )}

      {status === "NOVO" ? (
        <a className="btn-linha" href={linkWa} target="_blank" rel="noopener noreferrer">
          {tp.adiantar}
        </a>
      ) : (
        <a className="btn-linha" href={falarLoja} target="_blank" rel="noopener noreferrer">
          {tp.falarLoja}
        </a>
      )}
      <Link href="/" className="btn-linha">
        {tp.voltar}
      </Link>
      <a href="/privacidade" style={{ textAlign: "center", fontSize: 12.5, color: "#A99E90", textDecoration: "underline" }}>
        {t.loja.politica}
      </a>
    </div>
  );
}
