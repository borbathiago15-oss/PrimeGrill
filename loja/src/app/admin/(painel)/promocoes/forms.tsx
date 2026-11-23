"use client";

import { useActionState, useState } from "react";
import { criarCampanha, marcarEnviado, registrarAceitePainel, type EstadoPromo } from "./acoes";

export function FormAceite() {
  const [estado, acao, enviando] = useActionState<EstadoPromo, FormData>(registrarAceitePainel, {});
  return (
    <details className="cartao adicionar-itens">
      <summary>+ Registrar cliente que pediu para receber (balcão/WhatsApp)</summary>
      <form action={acao} className="form">
        <div className="f">
          <label htmlFor="ac-nome">Nome</label>
          <input id="ac-nome" name="nome" required maxLength={80} />
        </div>
        <div className="f">
          <label htmlFor="ac-cel">Celular (WhatsApp)</label>
          <input id="ac-cel" name="celular" required inputMode="tel" placeholder="(81) 99999-9999" />
        </div>
        <label className="f-check cheio">
          <input type="checkbox" name="confirmo" required /> O cliente pediu ou aceitou receber promoções (fica registrado o meu nome como quem anotou).
        </label>
        <div className="f cheio">
          {estado.erro && <p className="msg-erro">{estado.erro}</p>}
          {estado.ok && <p className="msg-ok">{estado.ok}</p>}
          <button className="btn btn-pri" disabled={enviando} style={{ alignSelf: "flex-start" }}>
            {enviando ? "Salvando…" : "Registrar"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function FormCampanha({ folders }: { folders: { id: number; titulo: string; versao: number; formato: string }[] }) {
  const [estado, acao, enviando] = useActionState<EstadoPromo, FormData>(criarCampanha, {});
  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Nova campanha</h2>
      </div>
      <div className="form">
        <div className="f">
          <label htmlFor="cp-titulo">Nome da campanha (só para a loja)</label>
          <input id="cp-titulo" name="titulo" required maxLength={60} placeholder="Ex.: Ofertas do fim de semana" />
        </div>
        <div className="f">
          <label htmlFor="cp-folder">Folder (opcional)</label>
          <select id="cp-folder" name="folderId" defaultValue="">
            <option value="">Sem folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.titulo} · v{f.versao} · {f.formato.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="f cheio">
          <label htmlFor="cp-msg">Mensagem — use {"{nome}"} para o primeiro nome do cliente</label>
          <textarea id="cp-msg" name="mensagem" required rows={5} maxLength={700} defaultValue={"Oi, {nome}! 🔥 Chegaram cortes novos na Prime Grill Paiva. Confira as ofertas da semana:"} style={{ padding: 10, border: "1px solid var(--borda)", borderRadius: 6, font: "inherit" }} />
          <small>No fim da mensagem o sistema coloca sozinho: link do folder, link do cardápio e o link “Não quer mais receber?”.</small>
        </div>
      </div>
      {estado.erro && <p className="msg-erro" style={{ margin: "0 18px 12px" }}>{estado.erro}</p>}
      <div className="acoes">
        <button className="btn btn-pri" disabled={enviando}>
          {enviando ? "Criando…" : "Criar e ir para o envio"}
        </button>
      </div>
    </form>
  );
}

/** Botão por cliente: abre o WhatsApp com a mensagem pronta e marca como enviado. */
export function BotaoEnviar({ campanhaId, inscritoId, link, enviado }: { campanhaId: number; inscritoId: number; link: string; enviado: boolean }) {
  const [feito, setFeito] = useState(enviado);
  return (
    <a
      className={`btn btn-pq ${feito ? "" : "btn-pri"}`}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        setFeito(true);
        marcarEnviado(campanhaId, inscritoId);
      }}
    >
      {feito ? "Enviado ✓ (reenviar)" : "Enviar no WhatsApp ↗"}
    </a>
  );
}
