"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCarrinho } from "./carrinho";
import { formatarReais } from "@/modules/dinheiro";

export function BotaoAdicionar(props: { id: number; nome: string; disponivel: boolean; aproxCentavos: number | null; pesado: boolean }) {
  const { itens, definir } = useCarrinho();
  const router = useRouter();
  const noCarrinho = itens[props.id] ?? 0;
  const [qtd, setQtd] = useState(Math.max(1, noCarrinho));

  if (!props.disponivel)
    return (
      <div className="add-bar">
        <button className="btn-ouro centro" disabled>
          Indisponível no momento
        </button>
      </div>
    );

  const total = props.aproxCentavos !== null ? props.aproxCentavos * qtd : null;
  return (
    <div className="add-bar">
      <div className="qtd">
        <button type="button" aria-label="Diminuir" onClick={() => setQtd((q) => Math.max(1, q - 1))}>
          −
        </button>
        <b className="num">{qtd}</b>
        <button type="button" aria-label="Aumentar" onClick={() => setQtd((q) => Math.min(20, q + 1))}>
          +
        </button>
      </div>
      <button
        type="button"
        className="btn-ouro"
        onClick={() => {
          definir(props.id, qtd);
          router.push("/");
        }}
      >
        <span>{noCarrinho ? "Atualizar" : "Adicionar"}</span>
        {total !== null && (
          <span className="num">
            {props.pesado ? "≈ " : ""}
            {formatarReais(total)}
          </span>
        )}
      </button>
    </div>
  );
}
