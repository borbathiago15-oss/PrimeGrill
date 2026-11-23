"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatarReais } from "@/modules/dinheiro";
import { QTD_MAXIMA_ITEM, valorAproximadoPeca } from "@/modules/pedidos/calculo";

export type ResumoProduto = {
  id: number;
  tipoVenda: "PECA" | "PACOTE";
  precoCentavos: number;
  pesoMedioGramas: number | null;
  limite: number | null;
};

type Itens = Record<number, number>;
type Ctx = {
  itens: Itens;
  definir: (id: number, qtd: number) => void;
  limpar: () => void;
  pronto: boolean;
  produtos: Map<number, ResumoProduto>;
};

const CarrinhoCtx = createContext<Ctx | null>(null);
const CHAVE = "pg-carrinho-v1";

export function CarrinhoProvider({ produtos, children }: { produtos: ResumoProduto[]; children: React.ReactNode }) {
  const [itens, setItens] = useState<Itens>({});
  const [pronto, setPronto] = useState(false);
  const mapa = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as Itens;
      const valido: Itens = {};
      for (const [k, v] of Object.entries(salvo)) if (mapa.has(Number(k)) && Number.isInteger(v) && v > 0) valido[Number(k)] = v;
      setItens(valido);
    } catch {
      /* armazenamento indisponível: carrinho começa vazio */
    }
    setPronto(true);
  }, [mapa]);

  useEffect(() => {
    if (!pronto) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch {
      /* ignora */
    }
  }, [itens, pronto]);

  const definir = useCallback(
    (id: number, qtd: number) => {
      setItens((atual) => {
        const lim = mapa.get(id)?.limite ?? QTD_MAXIMA_ITEM;
        const q = Math.max(0, Math.min(qtd, lim, QTD_MAXIMA_ITEM));
        const novo = { ...atual };
        if (q === 0) delete novo[id];
        else novo[id] = q;
        return novo;
      });
    },
    [mapa],
  );
  const limpar = useCallback(() => setItens({}), []);

  return <CarrinhoCtx.Provider value={{ itens, definir, limpar, pronto, produtos: mapa }}>{children}</CarrinhoCtx.Provider>;
}

export function useCarrinho() {
  const c = useContext(CarrinhoCtx);
  if (!c) throw new Error("useCarrinho fora do CarrinhoProvider");
  return c;
}

export function resumoCarrinho(itens: Itens, produtos: Map<number, ResumoProduto>) {
  let qtd = 0;
  let total = 0;
  let pesado = false;
  for (const [k, q] of Object.entries(itens)) {
    const p = produtos.get(Number(k));
    if (!p) continue;
    qtd += q;
    if (p.tipoVenda === "PACOTE") total += p.precoCentavos * q;
    else {
      pesado = true;
      total += (valorAproximadoPeca(p.precoCentavos, p.pesoMedioGramas) ?? 0) * q;
    }
  }
  return { qtd, total, pesado };
}

export function BarraCarrinho() {
  const { itens, produtos, pronto } = useCarrinho();
  const caminho = usePathname();
  const [adicionar, setAdicionar] = useState<string | null>(null);
  useEffect(() => {
    try {
      const c = sessionStorage.getItem("pg-adicionar-ao-pedido");
      setAdicionar(c && /^PG-[A-Z0-9]{6}$/.test(c) ? c : null);
    } catch {}
  }, [caminho]);
  if (!pronto || caminho.startsWith("/pedido") || caminho.startsWith("/produto")) return null;
  const { qtd, total, pesado } = resumoCarrinho(itens, produtos);
  if (qtd === 0) return null;
  return (
    <Link href={adicionar ? `/pedido?adicionar=${adicionar}` : "/pedido"} className="barra-carrinho">
      <span style={{ display: "flex", alignItems: "center" }}>
        <span className="q">{qtd}</span>
        {adicionar ? `Acrescentar ao ${adicionar}` : "Revisar pedido"}
      </span>
      <span className="num">
        {pesado ? "aprox. " : ""}
        {formatarReais(total)}
      </span>
    </Link>
  );
}

export function SeletorQuantidade({ id, nome }: { id: number; nome: string }) {
  const { itens, definir } = useCarrinho();
  const q = itens[id] ?? 0;
  return (
    <div className="qtd">
      <button type="button" aria-label={`Diminuir ${nome}`} onClick={() => definir(id, q - 1)}>
        −
      </button>
      <b className="num">{q}</b>
      <button type="button" aria-label={`Aumentar ${nome}`} onClick={() => definir(id, q + 1)}>
        +
      </button>
    </div>
  );
}
