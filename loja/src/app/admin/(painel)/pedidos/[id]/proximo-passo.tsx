import type { ConfigPagamento, FormaPagamento } from "@/db/schema";
import { BotaoCopiar } from "@/components/copiar";
import { formatarReais } from "@/modules/dinheiro";
import { idiomaValido, ROTULO_IDIOMA } from "@/modules/i18n/idiomas";
import { MENSAGENS_LOJA } from "@/modules/i18n/mensagens-loja";
import { ROTULO_FORMA, ROTULO_PAGAMENTO } from "@/lib/pagamento";
import { aceitarPedido, concluirPedido, marcarPago, registrarFormaPeloAtendente, revisarAlteracao } from "./acoes";
import { CancelarPedido } from "./cancelar";
import { FormLinkCartao, FormPixMaquininha } from "./link-cartao";

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
  alteracaoCliente: string | null;
  baixaEstoque: boolean;
  idioma: string;
  motivoCancelamento: string | null;
  anonimizadoEm: Date | null;
};

const PASSOS = ["Aceitar", "Separar e pesar", "Cliente confirma", "Pagamento", "Entregar"];
const NOME_IDIOMA: Record<string, string> = { en: "inglês", es: "espanhol" };

function wa(celular: string, texto: string) {
  return `https://wa.me/${celular}?text=${encodeURIComponent(texto)}`;
}

/** Botões para a loja definir a forma de pagamento sem esperar o cliente escolher. */
function DefinirForma({ id, entrega, destaque, exceto }: { id: number; entrega: boolean; destaque?: boolean; exceto?: FormaPagamento | null }) {
  return (
    <form action={registrarFormaPeloAtendente} className="linha-botoes">
      <input type="hidden" name="pedidoId" value={id} />
      {(["PIX", "CARTAO_LINK", "NA_ENTREGA"] as const).filter((f) => f !== exceto).map((f) => (
        <button key={f} name="forma" value={f} className={`btn ${destaque ? "" : "btn-pq"}`}>
          {f === "NA_ENTREGA" ? (entrega ? "Na entrega" : "Na retirada") : ROTULO_FORMA[f]}
        </button>
      ))}
    </form>
  );
}

/**
 * Fluxo guiado do pedido: mostra só o que o atendente precisa fazer agora.
 * NOVO → aceitar ou recusar · EM_SEPARACAO → pesar · AGUARDANDO_CLIENTE → mandar o link ou definir a forma ·
 * CONFIRMADO → cobrar e conferir · entregar. As mensagens prontas saem no idioma do cliente.
 */
export function ProximoPasso({ p, pendentes, celular, link, pix, pixOrigem, pagamento }: { p: Pedido; pendentes: number; celular: string; link: string; pix: string | null; pixOrigem: "maquininha" | "foto" | "chave" | null; pagamento: ConfigPagamento }) {
  const idioma = idiomaValido(p.idioma) ? p.idioma : "pt";
  const M = MENSAGENS_LOJA[idioma];
  const nome = p.clienteNome.split(" ")[0];
  const total = p.totalFinalCentavos !== null ? formatarReais(p.totalFinalCentavos) : "";
  const pago = p.pagamentoStatus === "PAGO";
  const entrega = p.modo === "ENTREGA";
  const passo =
    p.status === "NOVO" ? 0 : p.status === "EM_SEPARACAO" ? 1 : p.status === "AGUARDANDO_CLIENTE" ? 2 : p.status === "CONFIRMADO" ? (pago ? 4 : 3) : 5;
  const podeCancelar = ["NOVO", "EM_SEPARACAO", "AGUARDANDO_CLIENTE", "CONFIRMADO"].includes(p.status) && !pago;
  const nomeForma = (f: FormaPagamento) => (f === "NA_ENTREGA" ? (entrega ? "Na entrega" : "Na retirada") : ROTULO_FORMA[f]);
  const escolhida = p.formaPagamento;
  const avisoForma = escolhida && ["NOVO", "EM_SEPARACAO"].includes(p.status) && (
    <p className="forma-escolhida">
      💳 O cliente quer pagar com <b>{nomeForma(escolhida)}</b>.{" "}
      {escolhida === "PIX" ? "Ao terminar a pesagem, o Pix já pode ser enviado." : escolhida === "CARTAO_LINK" ? "Ao terminar a pesagem, gere o link do cartão com o valor final." : "Ele paga ao receber."}
    </p>
  );

  if (p.status === "CANCELADO") {
    if (p.anonimizadoEm) return null;
    return (
      <div className="cartao passo-atual cancelado">
        <div className="passo-corpo">
          <h2>Pedido cancelado</h2>
          {p.motivoCancelamento && <p>Motivo enviado ao cliente: {p.motivoCancelamento}</p>}
          <div className="linha-botoes">
            <a className="btn" href={wa(celular, M.cancelado(nome, p.codigo, p.motivoCancelamento ?? "—"))} target="_blank" rel="noopener noreferrer">
              Avisar o cliente no WhatsApp ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  let titulo = "";
  let corpo: React.ReactNode = null;

  if (p.status === "NOVO") {
    titulo = "Pedido novo: aceite ou recuse";
    corpo = (
      <>
        {avisoForma}
        <p>Confira os itens abaixo. Ao aceitar, o pedido vai para a separação e o cliente vê no link dele que a loja já está preparando. Se não der para atender, recuse com o motivo: o cliente é avisado.</p>
        <form action={aceitarPedido}>
          <input type="hidden" name="pedidoId" value={p.id} />
          <button className="btn btn-pri btn-grande">Aceitar e começar a separar</button>
        </form>
      </>
    );
  } else if (p.status === "EM_SEPARACAO" && p.alteracaoCliente && pendentes > 0) {
    titulo = "Pedido com itens novos: separe e pese";
    corpo = (
      <>
        <p className="msg-ok" style={{ background: "#FBF0DE", borderColor: "#E8C98A", color: "var(--texto)" }}>{p.alteracaoCliente}</p>
        <p>As peças que já estavam pesadas continuam como estão. Pese só as novas em “Separação e pesagem”, logo abaixo: o sistema soma tudo e o pedido volta para o cliente confirmar o novo total.</p>
      </>
    );
  } else if (p.status === "EM_SEPARACAO" && p.alteracaoCliente) {
    titulo = "O cliente alterou o pedido";
    corpo = (
      <>
        <p className="msg-ok" style={{ background: "#FBF0DE", borderColor: "#E8C98A", color: "var(--texto)" }}>{p.alteracaoCliente}</p>
        <p>O que o cliente tirou já voltou para o estoque no sistema. Devolva as peças à câmara/prateleira, confira o novo total e reenvie ao cliente.</p>
        <form action={revisarAlteracao}>
          <input type="hidden" name="pedidoId" value={p.id} />
          <button className="btn btn-pri btn-grande">Conferido — enviar novo total ao cliente</button>
        </form>
      </>
    );
  } else if (p.status === "EM_SEPARACAO") {
    titulo = "Separe e pese as peças";
    corpo = (
      <>
        {avisoForma}
        <p>Preencha o peso de cada peça em “Separação e pesagem”, logo abaixo. Ao confirmar, o sistema calcula o valor final e dá baixa no estoque.</p>
      </>
    );
  } else if (p.status === "AGUARDANDO_CLIENTE" && escolhida) {
    titulo = `Valor pronto · o cliente escolheu ${nomeForma(escolhida)}: cobre agora`;
    corpo = (
      <>
        <p>
          O cliente já disse no pedido que vai pagar com <b>{nomeForma(escolhida)}</b>. Libere a cobrança de {total} agora:{" "}
          {escolhida === "PIX" ? "o Pix aparece no link dele e você pode mandar pelo WhatsApp." : escolhida === "CARTAO_LINK" ? "em seguida cole o link do cartão gerado na maquininha." : "ele paga ao receber."}
        </p>
        <form action={registrarFormaPeloAtendente} className="linha-botoes">
          <input type="hidden" name="pedidoId" value={p.id} />
          <input type="hidden" name="doCliente" value="1" />
          <button name="forma" value={escolhida} className="btn btn-pri btn-grande">
            {escolhida === "PIX" ? "Cobrar com Pix agora" : escolhida === "CARTAO_LINK" ? "Cobrar com cartão (link) agora" : `Confirmar: paga ${entrega ? "na entrega" : "na retirada"}`}
          </button>
        </form>
        <div className="linha-botoes">
          <a className="btn" href={wa(celular, M.valorPronto(nome, p.codigo, total, entrega, link))} target="_blank" rel="noopener noreferrer">
            Só enviar valor e link para o cliente conferir ↗
          </a>
          <BotaoCopiar texto={link} rotulo="Copiar link do pedido" className="btn" />
        </div>
        <details className="manual">
          <summary>O cliente mudou de ideia? Usar outra forma</summary>
          <DefinirForma id={p.id} entrega={entrega} exceto={escolhida} />
        </details>
      </>
    );
  } else if (p.status === "AGUARDANDO_CLIENTE") {
    titulo = "Envie o valor final ou defina a forma de pagamento";
    corpo = (
      <>
        <p>
          O cliente abre o link, vê o peso real e escolhe como pagar — o pedido muda sozinho para <b>Confirmado</b>. Se ele já disse como vai pagar (ou para agilizar), defina você mesmo:
        </p>
        <div className="linha-botoes">
          <a className="btn btn-pri btn-grande" href={wa(celular, M.valorPronto(nome, p.codigo, total, entrega, link))} target="_blank" rel="noopener noreferrer">
            Enviar valor e link no WhatsApp ↗
          </a>
          <BotaoCopiar texto={link} rotulo="Copiar link do pedido" className="btn" />
        </div>
        <div className="definir-forma">
          <b>Definir a forma de pagamento agora:</b>
          <DefinirForma id={p.id} entrega={entrega} destaque />
          <small>O cliente recebe o aviso e o link já mostra como pagar (Pix, link do cartão ou pagamento na {entrega ? "entrega" : "retirada"}).</small>
        </div>
      </>
    );
  } else if (p.status === "CONFIRMADO" && !pago) {
    const forma = p.formaPagamento;
    titulo = forma ? `Cobrar: ${forma === "NA_ENTREGA" ? (entrega ? "Na entrega" : "Na retirada") : ROTULO_FORMA[forma]} · ${total}` : "Definir a forma de pagamento";
    const informado = p.pagamentoStatus === "INFORMADO";
    const botaoPago = (
      <form action={marcarPago}>
        <input type="hidden" name="pedidoId" value={p.id} />
        <button className={`btn ${informado ? "btn-pri btn-grande" : ""}`}>Pagamento recebido — dar baixa</button>
      </form>
    );
    const trocarForma = forma && (
      <details className="manual">
        <summary>Trocar a forma de pagamento</summary>
        <DefinirForma id={p.id} entrega={entrega} />
      </details>
    );
    if (forma === "PIX") {
      const temPix = pixOrigem !== null;
      const msg = pix ? M.pixCopiaECola(p.codigo, total, pix, link) : M.pixNoLink(p.codigo, total, link);
      corpo = (
        <>
          {informado && <p className="msg-ok">O cliente avisou que pagou. Confira no extrato do banco e confirme.</p>}
          {temPix && (
            <>
              <p>
                {pixOrigem === "chave" ? "O Pix automático (chave da loja) já aparece no link do cliente com o valor certo." : "O Pix da maquininha já aparece no link do cliente."} Se quiser, mande também pelo WhatsApp.
              </p>
              <div className="linha-botoes">
                <a className="btn btn-grande" href={wa(celular, msg)} target="_blank" rel="noopener noreferrer">
                  Enviar Pix no WhatsApp ↗
                </a>
                {pix && <BotaoCopiar texto={pix} rotulo="Copiar Pix" className="btn" />}
                {botaoPago}
              </div>
            </>
          )}
          {temPix ? (
            <details className="manual">
              <summary>{pixOrigem === "chave" ? "Prefere usar o Pix da maquininha neste pedido?" : "Trocar o Pix da maquininha"}</summary>
              <FormPixMaquininha pedidoId={p.id} total={total} />
            </details>
          ) : (
            <>
              <FormPixMaquininha pedidoId={p.id} total={total} />
              <div className="linha-botoes">{botaoPago}</div>
            </>
          )}
          {trocarForma}
        </>
      );
    } else if (forma === "CARTAO_LINK") {
      corpo = (
        <>
          {informado && <p className="msg-ok">O cliente avisou que pagou. Confira na maquininha/banco e confirme.</p>}
          <p>Gere um link de pagamento de {total} na maquininha ou no banco e cole aqui. Ele aparece para o cliente no link do pedido.</p>
          <FormLinkCartao pedidoId={p.id} atual={p.linkCartao} />
          <div className="linha-botoes">
            {p.linkCartao && (
              <a className="btn btn-grande" href={wa(celular, M.cartao(p.codigo, total, p.linkCartao, link))} target="_blank" rel="noopener noreferrer">
                Enviar link do cartão no WhatsApp ↗
              </a>
            )}
            {botaoPago}
          </div>
          {trocarForma}
        </>
      );
    } else if (forma === "NA_ENTREGA") {
      const msg = entrega ? M.saiuNaEntrega(nome, p.codigo, total, link) : M.prontoRetirada(nome, p.codigo, total, link);
      corpo = (
        <>
          <p>O cliente paga quando receber. Ao {entrega ? "entregar" : "liberar a retirada"}, marque como ele pagou: o valor entra no financeiro (dinheiro vai para o caixa aberto).</p>
          <div className="linha-botoes">
            <a className="btn" href={wa(celular, msg)} target="_blank" rel="noopener noreferrer">
              Avisar que {entrega ? "saiu para entrega" : "está pronto"} ↗
            </a>
          </div>
          <form action={concluirPedido} className="recebido-como">
            <input type="hidden" name="pedidoId" value={p.id} />
            <b>{entrega ? "Entregue" : "Retirado"} e recebido em:</b>
            <div className="linha-botoes">
              {(
                [
                  ["DINHEIRO", "💵 Dinheiro"],
                  ["PIX", "Pix"],
                  ["CARTAO_DEBITO", "Débito"],
                  ["CARTAO_CREDITO", "Crédito"],
                ] as const
              ).map(([v, r]) => (
                <button key={v} name="recebidoComo" value={v} className="btn btn-pri">
                  {r}
                </button>
              ))}
            </div>
          </form>
          {trocarForma}
        </>
      );
    } else {
      corpo = <DefinirForma id={p.id} entrega={entrega} destaque />;
    }
  } else if (p.status === "CONFIRMADO" && pago) {
    titulo = entrega ? "Pago. Envie para entrega" : "Pago. Libere a retirada";
    corpo = (
      <div className="linha-botoes">
        <a className="btn" href={wa(celular, entrega ? M.pagoSaiu(nome, p.codigo) : M.pagoPronto(nome, p.codigo))} target="_blank" rel="noopener noreferrer">
          Avisar o cliente ↗
        </a>
        <form action={concluirPedido}>
          <input type="hidden" name="pedidoId" value={p.id} />
          <button className="btn btn-pri btn-grande">{entrega ? "Marcar como entregue" : "Marcar como retirado"}</button>
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
        {idioma !== "pt" && (
          <p className="idioma-cliente">
            {ROTULO_IDIOMA[idioma].bandeira} Cliente fala {NOME_IDIOMA[idioma]}: as mensagens prontas de WhatsApp e os avisos já saem em {NOME_IDIOMA[idioma]}.
          </p>
        )}
        {corpo}
        {podeCancelar && <CancelarPedido pedidoId={p.id} novo={p.status === "NOVO"} />}
        {p.status !== "NOVO" && p.status !== "CONCLUIDO" && (
          <p className="link-cliente">
            Link do cliente: <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
          </p>
        )}
        {!pagamento.pixChave && p.status === "AGUARDANDO_CLIENTE" && <p className="dica">Se a forma for Pix, você gera o Pix na maquininha com o valor exato e cola no pedido. (Com a chave Pix cadastrada em “Loja e entregas”, isso fica automático.)</p>}
      </div>
    </div>
  );
}
