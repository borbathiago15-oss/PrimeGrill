"use client";

import { useActionState } from "react";
import { salvarLinkCartao, salvarPixManual, type EstadoSeparacao } from "./acoes";

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

/** Pix da maquininha: colar o copia e cola (preferido) ou mandar a foto do QR com o valor exato. */
export function FormPixMaquininha({ pedidoId, total }: { pedidoId: number; total: string }) {
  const [estado, acao, enviando] = useActionState<EstadoSeparacao, FormData>(salvarPixManual, {});
  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <label htmlFor="pix-codigo" style={{ fontSize: 13, fontWeight: 600 }}>
        Gere na maquininha um Pix de {total} e cole aqui o “Pix copia e cola”
      </label>
      <textarea id="pix-codigo" name="codigo" rows={3} placeholder="00020126…" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, padding: 10, border: "1px solid var(--borda)", borderRadius: 6 }} />
      <label htmlFor="pix-foto" style={{ fontSize: 13 }}>
        …ou, se a maquininha só mostra o QR, tire uma foto dele:
      </label>
      <input id="pix-foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" />
      <div>
        <button className="btn btn-pri" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar Pix no pedido"}
        </button>
      </div>
      {estado.erro && <p className="msg-erro">{estado.erro}</p>}
      {estado.ok && <p className="msg-ok">{estado.ok}</p>}
    </form>
  );
}
