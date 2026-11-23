"use client";

import { useActionState, useState } from "react";
import { excluirCliente, type EstadoExclusao } from "./acoes";

/** Formulário de exclusão (LGPD) com dupla confirmação: digitar o celular e informar o motivo. */
export function ExcluirCliente({ celular, celularFormatado, bloqueio }: { celular: string; celularFormatado: string; bloqueio: string | null }) {
  const [estado, acao, enviando] = useActionState<EstadoExclusao, FormData>(excluirCliente, {});
  const [aberto, setAberto] = useState(false);
  // Campos controlados: se der erro, o que foi digitado não se perde.
  const [motivo, setMotivo] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  if (!aberto)
    return (
      <button type="button" className="btn btn-perigo" onClick={() => setAberto(true)}>
        Apagar dados deste cliente (LGPD)
      </button>
    );
  return (
    <form action={acao} className="cartao lgpd" style={{ maxWidth: 640 }}>
      <input type="hidden" name="celular" value={celular} />
      <div className="passo-corpo">
        <h2>Apagar dados pessoais de {celularFormatado}</h2>
        <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
          <li>
            <b>Apaga:</b> nome, celular, endereço e observações dos pedidos; o chat (mensagens, fotos e PDFs); os avisos no celular.
          </li>
          <li>
            <b>Mantém, sem identificar o cliente:</b> itens, valores, pesagens e estoque — a lei exige guardar o registro da venda (LGPD art. 16, I).
          </li>
          <li>
            <b>Não dá para desfazer.</b> Fica registrado quem apagou, quando e o motivo (só os 4 últimos dígitos do celular).
          </li>
        </ul>
        {bloqueio ? (
          <p className="msg-erro">{bloqueio}</p>
        ) : (
          <>
            <div className="f">
              <label htmlFor="motivo">Motivo</label>
              <input id="motivo" name="motivo" required minLength={5} maxLength={200} placeholder="Ex.: pedido do titular pelo WhatsApp em 23/11" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="confirmacao">Para confirmar, digite o celular do cliente</label>
              <input id="confirmacao" name="confirmacao" required inputMode="tel" autoComplete="off" placeholder={celularFormatado} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            </div>
            {estado.erro && <p className="msg-erro">{estado.erro}</p>}
            <div className="linha-botoes">
              <button className="btn btn-perigo btn-grande" disabled={enviando}>
                {enviando ? "Apagando…" : "Apagar definitivamente"}
              </button>
              <button type="button" className="btn" onClick={() => setAberto(false)}>
                Desistir
              </button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
