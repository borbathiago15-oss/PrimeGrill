import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { configLoja } from "@/lib/dados";
import { paraMensagem, pedidoCompleto } from "@/lib/pedidos";
import { formasAceitas, pixDoPedido, ROTULO_FORMA } from "@/lib/pagamento";
import { AtualizarSozinho, BotaoCopiar } from "@/components/copiar";
import { formatarDistancia } from "@/modules/entrega/frete";
import { formatarKg, formatarReais, formatarValor } from "@/modules/dinheiro";
import { linhaItem, linkWhatsapp, mensagemPedido } from "@/modules/pedidos/whatsapp";
import { AlterarPedido, EscolherPagamento, JaPaguei } from "./pagamento-cliente";
import { ChatPedido } from "@/components/chat";
import { LembrarPedido } from "@/components/app-instalavel";
import { enviarChatCliente, lerChatCliente } from "./chat-acoes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu pedido — Prime Grill Paiva", robots: { index: false } };

export default async function PedidoCliente({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^PG-[A-Z0-9]{6}$/.test(codigo)) notFound();
  const [dados, config] = await Promise.all([pedidoCompleto({ codigo }), configLoja()]);
  if (!dados) notFound();
  const p = dados.pedido;
  const msg = paraMensagem(dados);
  const linkWa = linkWhatsapp(config.whatsapp, mensagemPedido(msg));
  const falarLoja = linkWhatsapp(config.whatsapp, `Olá! Sobre o pedido ${p.codigo}:`);
  const primeiroNome = p.clienteNome.split(" ")[0];
  const status = p.status;
  const entrega = p.modo === "ENTREGA";
  const pesagens = p.baixaEstoque ? await (await db()).select().from(schema.pedidoPesagens).where(eq(schema.pedidoPesagens.pedidoId, p.id)).orderBy(asc(schema.pedidoPesagens.id)) : [];
  const final = p.totalFinalCentavos;
  const pix = status === "CONFIRMADO" && p.formaPagamento === "PIX" && p.pagamentoStatus === "PENDENTE" && final !== null ? await pixDoPedido(config.pagamento, final, p.codigo, { pixCodigo: p.pixCodigo, pixQrUrl: p.pixQrUrl }) : null;

  const ETAPAS = [
    { chave: "NOVO", texto: "Pedido recebido" },
    { chave: "EM_SEPARACAO", texto: "Separando e pesando" },
    { chave: "AGUARDANDO_CLIENTE", texto: "Confirme o valor e o pagamento" },
    { chave: "CONFIRMADO", texto: "Confirmado · pagamento" },
    { chave: "CONCLUIDO", texto: entrega ? "Entregue" : "Retirado" },
  ];
  const atual = ETAPAS.findIndex((e) => e.chave === status);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const quando = (chave: string) => dados.eventos.find((e) => e.status === chave)?.criadoEm;
  const detalheForma: Record<string, string> = {
    PIX: "QR Code e copia e cola aparecem aqui, já com o valor",
    CARTAO_LINK: "A loja envia um link seguro para pagar com cartão de crédito",
    NA_ENTREGA: entrega ? "Pague ao receber o pedido" : "Pague na retirada",
  };
  const opcoes = formasAceitas(config.pagamento).map((f) => ({ forma: f, titulo: f === "NA_ENTREGA" ? (entrega ? "Na entrega" : "Na retirada") : ROTULO_FORMA[f], detalhe: detalheForma[f] }));

  return (
    <div className="ck">
      <LembrarPedido codigo={p.codigo} />
      {status !== "CONCLUIDO" && status !== "CANCELADO" && <AtualizarSozinho segundos={25} />}
      <div className="placa" style={{ alignSelf: "flex-start" }}>
        <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 30 }} />
      </div>
      <h1>{status === "NOVO" ? `Pedido ${p.codigo} recebido, ${primeiroNome}!` : `Pedido ${p.codigo}`}</h1>

      {status === "CANCELADO" ? (
        <p className="erro-box">Este pedido foi cancelado. Fale com a gente pelo WhatsApp se tiver dúvidas.</p>
      ) : (
        <section className="bloco">
          <h2>Acompanhe seu pedido</h2>
          <ol className="etapas">
            {ETAPAS.map((e, i) => {
              const t = quando(e.chave);
              return (
                <li key={e.chave} className={i < atual ? "feita" : i === atual ? "atual" : ""}>
                  <span>{e.texto}</span>
                  {t && i <= atual && <small>{hora.format(t)}</small>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {status === "EM_SEPARACAO" && p.alteracaoCliente && (
        <p className="aviso">Recebemos sua alteração. A loja está conferindo e o novo total aparece aqui em instantes.</p>
      )}
      {(status === "NOVO" || (status === "EM_SEPARACAO" && !p.alteracaoCliente)) && (
        <p className="aviso">
          {status === "NOVO" ? "A loja já recebeu seu pedido. " : "Estamos separando seu pedido agora. "}
          {p.temItemPesado
            ? "Depois de pesar cada peça, o valor final aparece nesta página (e mandamos no seu WhatsApp) para você confirmar e escolher como pagar."
            : "Em seguida, o valor final aparece nesta página para você confirmar e escolher como pagar."}{" "}
          Guarde este link.
        </p>
      )}

      {final !== null && status !== "CANCELADO" && (
        <section className="bloco">
          <h2>Valor final</h2>
          <div className="campos" style={{ gap: 8, fontSize: 14, color: "#D7CEC0" }}>
            {dados.itens.map((i) =>
              i.tipoVenda === "PECA" ? (
                pesagens
                  .filter((x) => x.itemId === i.id)
                  .map((x) => (
                    <div key={x.id} className="linha-valor">
                      <span>
                        {i.nome}
                        {i.quantidade > 1 ? ` (peça ${x.peca})` : ""} · {formatarKg(x.gramas)} × R$ {formatarValor(i.precoCentavos)}/kg
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
                <span>Frete{p.distanciaMetros ? ` · ${formatarDistancia(p.distanciaMetros)}` : ""}</span>
                <span className="num">{formatarReais(p.freteCentavos)}</span>
              </div>
            )}
            <div className="r f">
              <span>Total final</span>
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
              .map((x) => ({ id: x.id, texto: `${i.nome}${i.quantidade > 1 ? ` (peça ${x.peca})` : ""} · ${formatarKg(x.gramas)}`, valor: formatarReais(x.valorCentavos) })),
          )}
          pacotes={dados.itens.filter((i) => i.tipoVenda === "PACOTE").map((i) => ({ id: i.id, nome: i.nome, quantidade: i.quantidade }))}
        />
      )}

      {status === "AGUARDANDO_CLIENTE" &&
        (opcoes.length ? (
          <EscolherPagamento codigo={p.codigo} opcoes={opcoes} />
        ) : (
          <a className="btn-ouro centro" href={falarLoja} target="_blank" rel="noopener noreferrer">
            Confirmar pelo WhatsApp
          </a>
        ))}

      {status === "CONFIRMADO" && (
        <section className="bloco">
          <h2>Pagamento · {p.formaPagamento ? ROTULO_FORMA[p.formaPagamento] : "a combinar"}</h2>
          <div className="pagar">
            {p.pagamentoStatus === "PAGO" ? (
              <p className="ok-box">Pagamento confirmado. Obrigado! {entrega ? "Seu pedido vai sair para entrega." : "Seu pedido está liberado para retirada."}</p>
            ) : p.pagamentoStatus === "INFORMADO" ? (
              <p className="aviso">Recebemos seu aviso de pagamento. A loja está conferindo e esta página atualiza sozinha.</p>
            ) : p.formaPagamento === "PIX" && pix ? (
              <>
                <p>{pix.codigoPix ? "Abra o app do seu banco e pague com o QR Code ou com o Pix copia e cola. O valor já vem preenchido." : "Abra o app do seu banco e leia o QR Code abaixo."}</p>
                <img src={pix.qr} alt="QR Code do Pix" width={220} height={220} className="qr" />
                {pix.codigoPix && (
                  <>
                    <textarea readOnly value={pix.codigoPix} rows={3} className="pix-codigo" aria-label="Pix copia e cola" />
                    <BotaoCopiar texto={pix.codigoPix} rotulo="Copiar Pix copia e cola" className="btn-ouro centro" />
                  </>
                )}
                <JaPaguei codigo={p.codigo} />
              </>
            ) : p.formaPagamento === "PIX" ? (
              <p className="aviso">A loja está gerando o Pix com o valor exato. Ele aparece aqui e no seu WhatsApp em instantes.</p>
            ) : p.formaPagamento === "CARTAO_LINK" ? (
              p.linkCartao ? (
                <>
                  <p>Pague com cartão de crédito no link seguro abaixo.</p>
                  <a className="btn-ouro centro" href={p.linkCartao} target="_blank" rel="noopener noreferrer">
                    Pagar {final !== null ? formatarReais(final) : ""} com cartão ↗
                  </a>
                  <JaPaguei codigo={p.codigo} />
                </>
              ) : (
                <p className="aviso">A loja está gerando o link de pagamento do cartão. Ele aparece aqui e no seu WhatsApp em instantes.</p>
              )
            ) : p.formaPagamento === "NA_ENTREGA" ? (
              <p className="aviso">Você paga {final !== null ? formatarReais(final) : ""} {entrega ? "na entrega" : "na retirada"}. {entrega ? "Avisamos quando sair." : "Avisamos quando estiver pronto."}</p>
            ) : (
              <p className="aviso">A loja vai combinar o pagamento com você pelo WhatsApp.</p>
            )}
          </div>
        </section>
      )}

      {status === "CONCLUIDO" && <p className="ok-box">Pedido {entrega ? "entregue" : "retirado"}. Bom churrasco! 🔥</p>}

      {final === null && (
        <section className="bloco">
          <h2>Resumo</h2>
          <div className="campos" style={{ gap: 8, fontSize: 14, color: "#D7CEC0" }}>
            {msg.itens.map((i) => (
              <div key={i.produtoId}>{linhaItem(i).replace(/^• /, "")}</div>
            ))}
          </div>
          <div className="tot">
            {entrega && (
              <div className="r">
                <span>
                  Frete · {p.bairro}
                  {p.distanciaMetros ? ` · ${formatarDistancia(p.distanciaMetros)}` : ""}
                </span>
                <span className="num">{p.freteACombinar ? "a confirmar" : formatarReais(p.freteCentavos)}</span>
              </div>
            )}
            <div className="r f">
              <span>Total{p.temItemPesado ? " estimado" : ""}</span>
              <span className="preco num">
                {formatarReais(p.totalEstimadoCentavos)}
                {msg.subtotalIncompleto ? <small> + peças a pesar</small> : null}
              </span>
            </div>
          </div>
        </section>
      )}

      {status !== "CANCELADO" && (
        <ChatPedido
          lado="CLIENTE"
          tema="escuro"
          titulo="Dúvidas? Fale com a loja"
          vazio="Mande sua pergunta aqui (corte, peso, entrega, pagamento). A resposta aparece nesta página."
          ler={lerChatCliente.bind(null, p.codigo)}
          enviar={enviarChatCliente.bind(null, p.codigo)}
        />
      )}

      {status === "NOVO" ? (
        <a className="btn-linha" href={linkWa} target="_blank" rel="noopener noreferrer">
          Quer adiantar? Envie o pedido no WhatsApp da loja
        </a>
      ) : (
        <a className="btn-linha" href={falarLoja} target="_blank" rel="noopener noreferrer">
          Falar com a loja no WhatsApp
        </a>
      )}
      <Link href="/" className="btn-linha">
        Voltar ao cardápio
      </Link>
    </div>
  );
}
