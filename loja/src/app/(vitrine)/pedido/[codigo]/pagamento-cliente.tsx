"use client";
import { useIdioma, useT } from "@/components/idioma";
import { traduzirErro } from "@/modules/i18n/erros";

import { useActionState, useState } from "react";
import { alterarPedidoCliente, avisarPagamento, escolherPagamento, type EstadoCliente } from "./acoes";

type Opcao = { forma: string; titulo: string; detalhe: string };

/** Cliente confirma o valor final e escolhe como vai pagar. */
export function EscolherPagamento({ codigo, opcoes }: { codigo: string; opcoes: Opcao[] }) {
  const [estado, acao, enviando] = useActionState<EstadoCliente, FormData>(escolherPagamento, {});
  const t = useT();
  const idioma = useIdioma();
  const [forma, setForma] = useState(opcoes.length === 1 ? opcoes[0].forma : "");
  return (
    <form action={acao} className="bloco">
      <h2>{t.formas.titulo}</h2>
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
      {estado.erro && <p className="erro-box" style={{ margin: "0 16px 12px" }}>{traduzirErro(estado.erro, idioma)}</p>}
      <div style={{ padding: "0 16px 16px" }}>
        <button className="btn-ouro centro" style={{ width: "100%" }} disabled={!forma || enviando}>
          {enviando ? t.formas.confirmando : t.formas.confirmar}
        </button>
      </div>
    </form>
  );
}

/** Cliente avisa que já pagou; a loja confere. */
export function JaPaguei({ codigo }: { codigo: string }) {
  const [estado, acao, enviando] = useActionState<EstadoCliente, FormData>(avisarPagamento, {});
  const t = useT();
  const idioma = useIdioma();
  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="codigo" value={codigo} />
      {estado.erro && <p className="erro-box">{traduzirErro(estado.erro, idioma)}</p>}
      <button className="btn-linha" disabled={enviando}>
        {enviando ? t.checkout.enviando : t.formas.jaPaguei}
      </button>
    </form>
  );
}

type PecaRem = { id: number; texto: string; valor: string };
type PacoteRem = { id: number; nome: string; quantidade: number };

/** Cliente tira peças/pacotes depois de ver o valor; o pedido volta para a loja com o novo total. */
export function AlterarPedido({ codigo, pecas, pacotes }: { codigo: string; pecas: PecaRem[]; pacotes: PacoteRem[] }) {
  const [estado, acao, enviando] = useActionState<EstadoCliente, FormData>(alterarPedidoCliente, {});
  const t = useT();
  const idioma = useIdioma();
  return (
    <details className="bloco alterar-pedido">
      <summary>{t.alterar.resumo}</summary>
      <form action={acao}>
        <input type="hidden" name="codigo" value={codigo} />
        {pecas.map((p) => (
          <label key={p.id} className="linha-rem">
            <span>
              {p.texto} · {p.valor}
            </span>
            <input type="checkbox" name={`remover-${p.id}`} aria-label={t.alterar.tirar(p.texto)} />
          </label>
        ))}
        {pacotes.map((p) => (
          <div key={p.id} className="linha-rem">
            <span>{p.nome}</span>
            <select name={`qtd-${p.id}`} defaultValue={p.quantidade} aria-label={`Quantidade de ${p.nome}`}>
              {Array.from({ length: p.quantidade + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n === 0 ? t.alterar.tirarOpcao : t.alterar.un(n)}
                </option>
              ))}
            </select>
          </div>
        ))}
        {estado.erro && <p className="erro-box" style={{ margin: "8px 16px" }}>{traduzirErro(estado.erro, idioma)}</p>}
        <div style={{ padding: "12px 16px 16px" }}>
          <button className="btn-linha" style={{ width: "100%" }} disabled={enviando}>
            {enviando ? t.checkout.enviando : t.alterar.enviar}
          </button>
          <small style={{ display: "block", marginTop: 8, color: "#A99E90", fontSize: 12.5 }}>{t.alterar.nota}</small>
        </div>
      </form>
    </details>
  );
}
