"use client";

import { useActionState, useState } from "react";
import { alterarPedidoCliente, avisarPagamento, escolherPagamento, type EstadoCliente } from "./acoes";

type Opcao = { forma: string; titulo: string; detalhe: string };

/** Cliente confirma o valor final e escolhe como vai pagar. */
export function EscolherPagamento({ codigo, opcoes }: { codigo: string; opcoes: Opcao[] }) {
  const [estado, acao, enviando] = useActionState<EstadoCliente, FormData>(escolherPagamento, {});
  const [forma, setForma] = useState(opcoes.length === 1 ? opcoes[0].forma : "");
  return (
    <form action={acao} className="bloco">
      <h2>Como você quer pagar?</h2>
      <input type="hidden" name="codigo" value={codigo} />
      <div className="formas">
        {opcoes.map((o) => (
          <label key={o.forma} className={`forma ${forma === o.forma ? "on" : ""}`}>
            <input type="radio" name="forma" value={o.forma} checked={forma === o.forma} onChange={() => setForma(o.forma)} />
            <span>
              <b>{o.titulo}</b>
              <small>{o.detalhe}</small>
            </span>
          </label>
        ))}
      </div>
      {estado.erro && <p className="erro-box" style={{ margin: "0 16px 12px" }}>{estado.erro}</p>}
      <div style={{ padding: "0 16px 16px" }}>
        <button className="btn-ouro centro" style={{ width: "100%" }} disabled={!forma || enviando}>
          {enviando ? "Confirmando…" : "Confirmar pedido e forma de pagamento"}
        </button>
      </div>
    </form>
  );
}

/** Cliente avisa que já pagou; a loja confere. */
export function JaPaguei({ codigo }: { codigo: string }) {
  const [estado, acao, enviando] = useActionState<EstadoCliente, FormData>(avisarPagamento, {});
  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="codigo" value={codigo} />
      {estado.erro && <p className="erro-box">{estado.erro}</p>}
      <button className="btn-linha" disabled={enviando}>
        {enviando ? "Enviando…" : "Já paguei — avisar a loja"}
      </button>
    </form>
  );
}

type PecaRem = { id: number; texto: string; valor: string };
type PacoteRem = { id: number; nome: string; quantidade: number };

/** Cliente tira peças/pacotes depois de ver o valor; o pedido volta para a loja com o novo total. */
export function AlterarPedido({ codigo, pecas, pacotes }: { codigo: string; pecas: PecaRem[]; pacotes: PacoteRem[] }) {
  const [estado, acao, enviando] = useActionState<EstadoCliente, FormData>(alterarPedidoCliente, {});
  return (
    <details className="bloco alterar-pedido">
      <summary>O valor não ficou como esperava? Tirar itens do pedido</summary>
      <form action={acao}>
        <input type="hidden" name="codigo" value={codigo} />
        {pecas.map((p) => (
          <label key={p.id} className="linha-rem">
            <span>
              {p.texto} · {p.valor}
            </span>
            <input type="checkbox" name={`remover-${p.id}`} aria-label={`Tirar ${p.texto}`} />
          </label>
        ))}
        {pacotes.map((p) => (
          <div key={p.id} className="linha-rem">
            <span>{p.nome}</span>
            <select name={`qtd-${p.id}`} defaultValue={p.quantidade} aria-label={`Quantidade de ${p.nome}`}>
              {Array.from({ length: p.quantidade + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n === 0 ? "tirar" : `${n} un`}
                </option>
              ))}
            </select>
          </div>
        ))}
        {estado.erro && <p className="erro-box" style={{ margin: "8px 16px" }}>{estado.erro}</p>}
        <div style={{ padding: "12px 16px 16px" }}>
          <button className="btn-linha" style={{ width: "100%" }} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar alteração para a loja"}
          </button>
          <small style={{ display: "block", marginTop: 8, color: "#A99E90", fontSize: 12.5 }}>A loja confere e te manda o novo total aqui mesmo.</small>
        </div>
      </form>
    </details>
  );
}
