"use client";
import { useIdioma, useT } from "@/components/idioma";
import { traduzirErro } from "@/modules/i18n/erros";

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
  const t = useT();
  const idioma = useIdioma();
  const a = t.acrescentar;
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lista = Object.entries(itens)
    .map(([id, q]) => ({ p: produtos.find((x) => x.id === Number(id)), q, id: Number(id) }))
    .filter((x) => x.p);
  const { total, pesado } = resumoCarrinho(itens, resumo);

  if (!pronto) return null;
  return (
    <div className="ck">
      <h1>{a.titulo(codigo)}</h1>
      {lista.length === 0 ? (
        <p className="aviso">{a.vazio}</p>
      ) : (
        <section className="bloco">
          <h2>{a.itensNovos}</h2>
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
              <span>
                {a.acrescimo}
                {pesado ? a.aproximado : ""}
              </span>
              <span className="preco num">{formatarReais(total)}</span>
            </div>
          </div>
        </section>
      )}
      <p className="aviso">{a.aviso}</p>
      {erro && <p className="erro-box">{traduzirErro(erro, idioma)}</p>}
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
        {enviando ? a.enviando : a.botao}
      </button>
      <a href="/" className="btn-linha">
        {a.escolherMais}
      </a>
    </div>
  );
}
