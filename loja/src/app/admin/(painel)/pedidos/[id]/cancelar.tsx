"use client";

import { useActionState, useState } from "react";
import { cancelarPedidoPainel, type EstadoSeparacao } from "./acoes";
import { MOTIVOS_CANCELAMENTO } from "@/modules/i18n/mensagens-loja";

/** Recusar (pedido novo) ou cancelar (em andamento) com motivo. O estoque volta sozinho e o cliente é avisado. */
export function CancelarPedido({ pedidoId, novo }: { pedidoId: number; novo: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoSeparacao, FormData>(cancelarPedidoPainel, {});
  const [motivo, setMotivo] = useState<string>("ESGOTADO");
  return (
    <details className="manual cancelar-pedido">
      <summary>{novo ? "Recusar este pedido" : "Cancelar este pedido"}</summary>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
        <input type="hidden" name="pedidoId" value={pedidoId} />
        <label style={{ fontSize: 13, fontWeight: 600 }} htmlFor={`motivo-${pedidoId}`}>
          Motivo (o cliente vê no link do pedido, no idioma dele)
        </label>
        <select id={`motivo-${pedidoId}`} name="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ height: 40 }}>
          {Object.entries(MOTIVOS_CANCELAMENTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v.pt}
            </option>
          ))}
          <option value="OUTRO">Outro motivo (escrever)</option>
        </select>
        {motivo === "OUTRO" && <input name="texto" required maxLength={200} placeholder="Escreva o motivo para o cliente" style={{ height: 40, padding: "0 10px" }} />}
        <small style={{ color: "var(--texto-2)" }}>Se já houve separação, o estoque volta automaticamente. Pedido já pago não pode ser cancelado por aqui.</small>
        <div>
          <button className="btn btn-perigo" disabled={enviando}>
            {enviando ? "Cancelando…" : novo ? "Recusar pedido" : "Cancelar pedido"}
          </button>
        </div>
        {estado.erro && <p className="msg-erro">{estado.erro}</p>}
      </form>
    </details>
  );
}
