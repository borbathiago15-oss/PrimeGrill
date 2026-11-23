"use client";

import { useActionState, useState } from "react";
import { adicionarItensPainel, type EstadoSeparacao } from "./acoes";
import { formatarReais, formatarValor } from "@/modules/dinheiro";

type Produto = { id: number; nome: string; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; estoque: number | null };

/** Atendente acrescenta itens ao pedido aberto (o cliente pediu mais pelo chat/WhatsApp). */
export function AdicionarItens({ pedidoId, produtos }: { pedidoId: number; produtos: Produto[] }) {
  const [estado, acao, enviando] = useActionState<EstadoSeparacao, FormData>(adicionarItensPainel, {});
  const [lista, setLista] = useState<{ produtoId: number; quantidade: number }[]>([]);
  const [sel, setSel] = useState("");
  const [qtd, setQtd] = useState(1);
  const nome = (id: number) => produtos.find((p) => p.id === id)?.nome ?? "";

  return (
    <details className="cartao adicionar-itens" open={!!estado.erro}>
      <summary>+ Adicionar itens a este pedido</summary>
      <form
        action={async (f) => {
          await acao(f);
          setLista([]);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 18px 16px" }}
      >
        <input type="hidden" name="pedidoId" value={pedidoId} />
        <input type="hidden" name="itens" value={JSON.stringify(lista)} />
        <div className="linha-botoes">
          <select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Produto" style={{ flex: 1, minWidth: 240, height: 40 }}>
            <option value="">Escolha o produto…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id} disabled={p.estoque === 0}>
                {p.nome} — {p.tipoVenda === "PECA" ? `R$ ${formatarValor(p.precoCentavos)}/kg` : formatarReais(p.precoCentavos)}
                {p.estoque !== null ? ` · ${p.estoque} disp.` : ""}
              </option>
            ))}
          </select>
          <input type="number" min={1} max={50} value={qtd} onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantidade" style={{ width: 80, height: 40 }} />
          <button
            type="button"
            className="btn"
            disabled={!sel}
            onClick={() => {
              const id = Number(sel);
              setLista((l) => {
                const j = l.find((x) => x.produtoId === id);
                return j ? l.map((x) => (x.produtoId === id ? { ...x, quantidade: x.quantidade + qtd } : x)) : [...l, { produtoId: id, quantidade: qtd }];
              });
              setSel("");
              setQtd(1);
            }}
          >
            Incluir
          </button>
        </div>
        {lista.length > 0 && (
          <ul style={{ paddingLeft: 18, fontSize: 14 }}>
            {lista.map((i) => (
              <li key={i.produtoId}>
                {i.quantidade}x {nome(i.produtoId)}{" "}
                <button type="button" className="btn btn-pq" onClick={() => setLista((l) => l.filter((x) => x.produtoId !== i.produtoId))}>
                  tirar
                </button>
              </li>
            ))}
          </ul>
        )}
        <small style={{ color: "var(--texto-2)" }}>Se o pedido já tiver sido pesado, ele volta para a separação só para pesar o que é novo; o cliente recebe o novo total depois.</small>
        <div>
          <button className="btn btn-pri" disabled={!lista.length || enviando}>
            {enviando ? "Adicionando…" : "Adicionar ao pedido"}
          </button>
        </div>
        {estado.erro && <p className="msg-erro">{estado.erro}</p>}
        {estado.ok && <p className="msg-ok">{estado.ok}</p>}
      </form>
    </details>
  );
}
