"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adicionarItensCliente } from "@/app/(vitrine)/pedido/[codigo]/acoes";
import { resumoCarrinho, useCarrinho } from "@/components/carrinho";
import { sairDoModoAdicionar } from "@/components/modo-adicionar";
import { formatarReais, formatarValor } from "@/modules/dinheiro";

type Prod = { id: number; nome: string; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number };

/** Revisão do carrinho no modo "acrescentar ao pedido": sem dados de entrega, só os itens. */
export function AdicionarAoPedido({ codigo, produtos }: { codigo: string; produtos: Prod[] }) {
  const { itens, produtos: resumo, limpar, pronto } = useCarrinho();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lista = Object.entries(itens)
    .map(([id, q]) => ({ p: produtos.find((x) => x.id === Number(id)), q, id: Number(id) }))
    .filter((x) => x.p);
  const { total, pesado } = resumoCarrinho(itens, resumo);

  if (!pronto) return null;
  return (
    <div className="ck">
      <h1>Acrescentar ao pedido {codigo}</h1>
      {lista.length === 0 ? (
        <p className="aviso">Seu carrinho está vazio. Volte ao cardápio e escolha os itens.</p>
      ) : (
        <section className="bloco">
          <h2>Itens novos</h2>
          <div className="campos" style={{ gap: 8, fontSize: 14, color: "#D7CEC0" }}>
            {lista.map(({ p, q, id }) => (
              <div key={id} className="linha-valor">
                <span>
                  {q}x {p!.nome}
                </span>
                <span className="num">{p!.tipoVenda === "PECA" ? `R$ ${formatarValor(p!.precoCentavos)}/kg` : formatarReais(p!.precoCentavos * q)}</span>
              </div>
            ))}
          </div>
          <div className="tot">
            <div className="r f">
              <span>Acréscimo {pesado ? "aproximado" : ""}</span>
              <span className="preco num">{formatarReais(total)}</span>
            </div>
          </div>
        </section>
      )}
      <p className="aviso">A loja separa e pesa os itens novos e o novo total aparece no link do seu pedido para você confirmar.</p>
      {erro && <p className="erro-box">{erro}</p>}
      <button
        type="button"
        className="btn-ouro centro"
        disabled={!lista.length || enviando}
        onClick={async () => {
          setEnviando(true);
          setErro(null);
          const r = await adicionarItensCliente(
            codigo,
            lista.map((x) => ({ produtoId: x.id, quantidade: x.q })),
          );
          setEnviando(false);
          if (r.erro) return setErro(r.erro);
          limpar();
          sairDoModoAdicionar();
          router.push(`/pedido/${codigo}`);
        }}
      >
        {enviando ? "Enviando…" : "Acrescentar ao meu pedido"}
      </button>
      <a href="/" className="btn-linha">
        Escolher mais itens
      </a>
    </div>
  );
}
