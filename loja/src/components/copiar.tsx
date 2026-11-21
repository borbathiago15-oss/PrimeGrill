"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Botão que copia um texto (link do pedido, Pix copia-e-cola). */
export function BotaoCopiar({ texto, rotulo = "Copiar", className = "btn btn-pq" }: { texto: string; rotulo?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          window.prompt("Copie o texto:", texto);
        }
      }}
    >
      {ok ? "Copiado ✓" : rotulo}
    </button>
  );
}

/** Recarrega os dados da página de tempos em tempos (pedidos novos, mudança de status). */
export function AtualizarSozinho({ segundos = 20 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
