"use client";

import { useActionState } from "react";
import { salvarLinkCartao, type EstadoSeparacao } from "./acoes";

export function FormLinkCartao({ pedidoId, atual }: { pedidoId: number; atual: string | null }) {
  const [estado, acao, enviando] = useActionState<EstadoSeparacao, FormData>(salvarLinkCartao, {});
  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <label htmlFor="link-cartao" style={{ fontSize: 13, fontWeight: 600 }}>
        Link de pagamento do cartão (gerado na maquininha ou no banco)
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input id="link-cartao" name="link" defaultValue={atual ?? ""} placeholder="https://…" style={{ flex: 1, minWidth: 220 }} required />
        <button className="btn btn-pri" disabled={enviando}>
          {enviando ? "Salvando…" : atual ? "Trocar link" : "Salvar link"}
        </button>
      </div>
      {estado.erro && <p className="msg-erro">{estado.erro}</p>}
      {estado.ok && <p className="msg-ok">{estado.ok}</p>}
    </form>
  );
}
