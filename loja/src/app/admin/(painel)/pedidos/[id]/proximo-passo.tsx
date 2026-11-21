import type { ConfigPagamento, FormaPagamento } from "@/db/schema";
import { BotaoCopiar } from "@/components/copiar";
import { formatarReais } from "@/modules/dinheiro";
import { ROTULO_FORMA, ROTULO_PAGAMENTO } from "@/lib/pagamento";
import { aceitarPedido, concluirPedido, marcarPago, registrarFormaPeloAtendente } from "./acoes";
import { FormLinkCartao } from "./link-cartao";

type Pedido = {
  id: number;
  codigo: string;
  status: string;
  modo: "ENTREGA" | "RETIRADA";
  clienteNome: string;
  totalFinalCentavos: number | null;
  formaPagamento: FormaPagamento | null;
  pagamentoStatus: string;
  linkCartao: string | null;
};

const PASSOS = ["Aceitar", "Separar e pesar", "Cliente confirma", "Pagamento", "Entregar"];

function wa(celular: string, texto: string) {
  return `https://wa.me/${celular}?text=${encodeURIComponent(texto)}`;
}

/**
 * Fluxo guiado do pedido: mostra só o que o atendente precisa fazer agora.
 * NOVO → aceitar · EM_SEPARACAO → pesar · AGUARDANDO_CLIENTE → mandar o link · CONFIRMADO → cobrar e conferir · entregar.
 */
export function ProximoPasso({ p, celular, link, pix, pagamento }: { p: Pedido; celular: string; link: string; pix: string | null; pagamento: ConfigPagamento }) {
  const nome = p.clienteNome.split(" ")[0];
  const total = p.totalFinalCentavos !== null ? formatarReais(p.totalFinalCentavos) : "";
  const pago = p.pagamentoStatus === "PAGO";
  const passo =
    p.status === "NOVO" ? 0 : p.status === "EM_SEPARACAO" ? 1 : p.status === "AGUARDANDO_CLIENTE" ? 2 : p.status === "CONFIRMADO" ? (pago ? 4 : 3) : 5;
  if (p.status === "CANCELADO") return null;

  let titulo = "";
  let corpo: React.ReactNode = null;

  if (p.status === "NOVO") {
    titulo = "Pedido novo: aceite para começar";
    corpo = (
      <>
        <p>Confira os itens abaixo. Ao aceitar, o pedido vai para a separação e o cliente vê no link dele que a loja já está preparando.</p>
        <form action={aceitarPedido}>
          <input type="hidden" name="pedidoId" value={p.id} />
          <button className="btn btn-pri btn-grande">Aceitar e começar a separar</button>
        </form>
      </>
    );
  } else if (p.status === "EM_SEPARACAO") {
    titulo = "Separe e pese as peças";
    corpo = <p>Preencha o peso de cada peça em “Separação e pesagem”, logo abaixo. Ao confirmar, o sistema calcula o valor final e dá baixa no estoque.</p>;
  } else if (p.status === "AGUARDANDO_CLIENTE") {
    titulo = "Envie o valor final e o link para o cliente";
    const msg = `Olá, ${nome}! Seu pedido ${p.codigo} da Prime Grill Paiva está separado.\n\n*Total final: ${total}*\n\nConfirme e escolha como pagar (Pix, cartão ou na ${p.modo === "ENTREGA" ? "entrega" : "retirada"}) neste link:\n${link}`;
    corpo = (
      <>
        <p>
          O cliente abre o link, vê o peso real de cada peça e escolhe como pagar. Quando ele escolher, este pedido muda sozinho para <b>Confirmado</b>.
        </p>
        <div className="linha-botoes">
          <a className="btn btn-pri btn-grande" href={wa(celular, msg)} target="_blank" rel="noopener noreferrer">
            Enviar no WhatsApp ↗
          </a>
          <BotaoCopiar texto={link} rotulo="Copiar link do pedido" className="btn" />
        </div>
        <details className="manual">
          <summary>O cliente respondeu direto no WhatsApp? Registrar a forma de pagamento</summary>
          <form action={registrarFormaPeloAtendente} className="linha-botoes">
            <input type="hidden" name="pedidoId" value={p.id} />
            {(["PIX", "CARTAO_LINK", "NA_ENTREGA"] as const).map((f) => (
              <button key={f} name="forma" value={f} className="btn btn-pq">
                {ROTULO_FORMA[f]}
              </button>
            ))}
          </form>
        </details>
      </>
    );
  } else if (p.status === "CONFIRMADO" && !pago) {
    const forma = p.formaPagamento;
    titulo = forma ? `Cobrar: ${ROTULO_FORMA[forma]} · ${total}` : "Registrar a forma de pagamento";
    const informado = p.pagamentoStatus === "INFORMADO";
    const botaoPago = (
      <form action={marcarPago}>
        <input type="hidden" name="pedidoId" value={p.id} />
        <button className={`btn ${informado ? "btn-pri btn-grande" : ""}`}>Confirmar que o pagamento caiu</button>
      </form>
    );
    if (forma === "PIX") {
      const msg = pix
        ? `Pedido ${p.codigo} — *${total}*\n\nPix copia e cola (já com o valor):\n${pix}\n\nOu abra o QR Code no link do pedido:\n${link}\n\nAssim que pagar, toque em “Já paguei” no link. Obrigado!`
        : "";
      corpo = (
        <>
          {informado && <p className="msg-ok">O cliente avisou que pagou. Confira no extrato do banco e confirme.</p>}
          {pix ? (
            <>
              <p>O QR Code e o Pix copia e cola já aparecem para o cliente no link do pedido. Se quiser, mande também pelo WhatsApp.</p>
              <div className="linha-botoes">
                <a className="btn btn-grande" href={wa(celular, msg)} target="_blank" rel="noopener noreferrer">
                  Enviar Pix no WhatsApp ↗
                </a>
                <BotaoCopiar texto={pix} rotulo="Copiar Pix" className="btn" />
                {botaoPago}
              </div>
            </>
          ) : (
            <p className="msg-erro">Cadastre a chave Pix da loja em “Loja e entregas” para gerar o Pix automático.</p>
          )}
        </>
      );
    } else if (forma === "CARTAO_LINK") {
      const msg = `Pedido ${p.codigo} — *${total}*\n\nLink para pagar com cartão de crédito:\n${p.linkCartao}\n\nDepois de pagar, toque em “Já paguei” em ${link}`;
      corpo = (
        <>
          {informado && <p className="msg-ok">O cliente avisou que pagou. Confira na maquininha/banco e confirme.</p>}
          <p>Gere um link de pagamento de {total} na maquininha ou no banco e cole aqui. Ele aparece para o cliente no link do pedido.</p>
          <FormLinkCartao pedidoId={p.id} atual={p.linkCartao} />
          <div className="linha-botoes">
            {p.linkCartao && (
              <a className="btn btn-grande" href={wa(celular, msg)} target="_blank" rel="noopener noreferrer">
                Enviar link do cartão no WhatsApp ↗
              </a>
            )}
            {botaoPago}
          </div>
        </>
      );
    } else if (forma === "NA_ENTREGA") {
      titulo = `Pagamento na ${p.modo === "ENTREGA" ? "entrega" : "retirada"} · ${total}`;
      const msg = p.modo === "ENTREGA" ? `Olá, ${nome}! Seu pedido ${p.codigo} saiu para entrega. Total: ${total} (pagamento na entrega). Acompanhe: ${link}` : `Olá, ${nome}! Seu pedido ${p.codigo} está pronto para retirada. Total: ${total}. ${link}`;
      corpo = (
        <>
          <p>O cliente paga quando receber. Ao entregar e receber, conclua o pedido.</p>
          <div className="linha-botoes">
            <a className="btn" href={wa(celular, msg)} target="_blank" rel="noopener noreferrer">
              Avisar que {p.modo === "ENTREGA" ? "saiu para entrega" : "está pronto"} ↗
            </a>
            <form action={concluirPedido}>
              <input type="hidden" name="pedidoId" value={p.id} />
              <button className="btn btn-pri btn-grande">{p.modo === "ENTREGA" ? "Entregue e recebido" : "Retirado e recebido"}</button>
            </form>
          </div>
        </>
      );
    } else {
      corpo = (
        <form action={registrarFormaPeloAtendente} className="linha-botoes">
          <input type="hidden" name="pedidoId" value={p.id} />
          {(["PIX", "CARTAO_LINK", "NA_ENTREGA"] as const).map((f) => (
            <button key={f} name="forma" value={f} className="btn">
              {ROTULO_FORMA[f]}
            </button>
          ))}
        </form>
      );
    }
  } else if (p.status === "CONFIRMADO" && pago) {
    titulo = p.modo === "ENTREGA" ? "Pago. Envie para entrega" : "Pago. Libere a retirada";
    const msg = p.modo === "ENTREGA" ? `Olá, ${nome}! Pagamento confirmado. Seu pedido ${p.codigo} saiu para entrega.` : `Olá, ${nome}! Pagamento confirmado. Seu pedido ${p.codigo} está pronto para retirada.`;
    corpo = (
      <div className="linha-botoes">
        <a className="btn" href={wa(celular, msg)} target="_blank" rel="noopener noreferrer">
          Avisar o cliente ↗
        </a>
        <form action={concluirPedido}>
          <input type="hidden" name="pedidoId" value={p.id} />
          <button className="btn btn-pri btn-grande">{p.modo === "ENTREGA" ? "Marcar como entregue" : "Marcar como retirado"}</button>
        </form>
      </div>
    );
  } else {
    titulo = "Pedido concluído";
    corpo = <p>Entregue e pago. Nada mais a fazer.</p>;
  }

  return (
    <div className="cartao passo-atual">
      <ol className="trilha">
        {PASSOS.map((t, i) => (
          <li key={t} className={i < passo ? "feita" : i === passo ? "atual" : ""}>
            <span>{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <div className="passo-corpo">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h2>{titulo}</h2>
          {p.status === "CONFIRMADO" && <span className={`chip ${ROTULO_PAGAMENTO[p.pagamentoStatus].cls}`}>{ROTULO_PAGAMENTO[p.pagamentoStatus].texto}</span>}
        </div>
        {corpo}
        {p.status !== "NOVO" && p.status !== "CONCLUIDO" && (
          <p className="link-cliente">
            Link do cliente: <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
          </p>
        )}
        {!pagamento.pixChave && p.status === "AGUARDANDO_CLIENTE" && <p className="dica">Dica: cadastre a chave Pix em “Loja e entregas” para o cliente pagar pelo QR Code com o valor certo.</p>}
      </div>
    </div>
  );
}
