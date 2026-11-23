"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const CHAVE_ADICIONAR = "pg-adicionar-ao-pedido";

export function pedidoEmAdicao(): string | null {
  try {
    const c = sessionStorage.getItem(CHAVE_ADICIONAR);
    return c && /^PG-[A-Z0-9]{6}$/.test(c) ? c : null;
  } catch {
    return null;
  }
}

export function sairDoModoAdicionar() {
  try {
    sessionStorage.removeItem(CHAVE_ADICIONAR);
  } catch {}
}

/** Faixa no cardápio quando o cliente está escolhendo itens para acrescentar a um pedido já feito. */
export function FaixaModoAdicionar() {
  const [codigo, setCodigo] = useState<string | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("adicionar");
    if (p && /^PG-[A-Z0-9]{6}$/.test(p)) {
      try {
        sessionStorage.setItem(CHAVE_ADICIONAR, p);
      } catch {}
    }
    setCodigo(pedidoEmAdicao());
  }, []);
  if (!codigo) return null;
  return (
    <div className="faixa-adicionar">
      <span>
        Escolha os itens para <b>acrescentar ao pedido {codigo}</b>.
      </span>
      <span style={{ display: "flex", gap: 10 }}>
        <Link href={`/pedido/${codigo}`}>Voltar ao pedido</Link>
        <button
          type="button"
          onClick={() => {
            sairDoModoAdicionar();
            setCodigo(null);
          }}
        >
          Cancelar
        </button>
      </span>
    </div>
  );
}
