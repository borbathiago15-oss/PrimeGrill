import Link from "next/link";
import { notFound } from "next/navigation";
import { configLoja } from "@/lib/dados";
import { paraMensagem, pedidoCompleto } from "@/lib/pedidos";
import { formatarDistancia } from "@/modules/entrega/frete";
import { formatarReais } from "@/modules/dinheiro";
import { linhaItem, linkWhatsapp, mensagemPedido } from "@/modules/pedidos/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedido recebido — Prime Grill Paiva", robots: { index: false } };

export default async function PedidoFeito({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^PG-[A-Z0-9]{6}$/.test(codigo)) notFound();
  const [dados, config] = await Promise.all([pedidoCompleto({ codigo }), configLoja()]);
  if (!dados) notFound();
  const msg = paraMensagem(dados);
  const link = linkWhatsapp(config.whatsapp, mensagemPedido(msg));
  const primeiroNome = dados.pedido.clienteNome.split(" ")[0];
  const status = dados.pedido.status;
  const novo = status === "NOVO";
  const ETAPAS: { chave: string; texto: string }[] = [
    { chave: "NOVO", texto: "Pedido recebido" },
    { chave: "EM_SEPARACAO", texto: "Em separação" },
    { chave: "AGUARDANDO_CLIENTE", texto: dados.pedido.temItemPesado ? "Pesado · confirme o valor" : "Aguardando sua confirmação" },
    { chave: "CONFIRMADO", texto: "Confirmado" },
    { chave: "CONCLUIDO", texto: dados.pedido.modo === "ENTREGA" ? "Entregue" : "Retirado" },
  ];
  const atual = ETAPAS.findIndex((e) => e.chave === status);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const quando = (chave: string) => dados.eventos.find((e) => e.status === chave)?.criadoEm;

  return (
    <div className="ck">
      <div className="placa" style={{ alignSelf: "flex-start" }}>
        <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 30 }} />
      </div>
      <h1>{novo ? `Pedido ${dados.pedido.codigo} registrado, ${primeiroNome}!` : `Pedido ${dados.pedido.codigo}`}</h1>
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
      {novo && (
        <>
          <p className="desc">
            Falta um passo: <b style={{ color: "var(--osso)" }}>envie o pedido para o nosso WhatsApp</b> para começarmos a separar.
          </p>
          <a className="btn-ouro centro" href={link} target="_blank" rel="noopener noreferrer">
            Enviar pedido pelo WhatsApp
          </a>
        </>
      )}

      <section className="bloco">
        <h2>Resumo</h2>
        <div className="campos" style={{ gap: 8, fontSize: 14, color: "#D7CEC0" }}>
          {msg.itens.map((i) => (
            <div key={i.produtoId}>{linhaItem(i).replace(/^• /, "")}</div>
          ))}
        </div>
        <div className="tot">
          {dados.pedido.modo === "ENTREGA" && (
            <div className="r">
              <span>
                Frete · {dados.pedido.bairro}
                {dados.pedido.distanciaMetros ? ` · ${formatarDistancia(dados.pedido.distanciaMetros)}` : ""}
              </span>
              <span className="num">{dados.pedido.freteACombinar ? "a confirmar" : formatarReais(dados.pedido.freteCentavos)}</span>
            </div>
          )}
          <div className="r f">
            <span>Total{dados.pedido.temItemPesado ? " estimado" : ""}</span>
            <span className="preco num">
              {formatarReais(dados.pedido.totalEstimadoCentavos)}
              {msg.subtotalIncompleto ? <small> + peças a pesar</small> : null}
            </span>
          </div>
        </div>
      </section>
      {dados.pedido.temItemPesado && (
        <p className="aviso">Depois da pesagem, enviamos pelo WhatsApp o peso real e o valor final para você confirmar. Você só paga o valor confirmado.</p>
      )}
      <Link href="/" className="btn-linha">
        Voltar ao cardápio
      </Link>
    </div>
  );
}
