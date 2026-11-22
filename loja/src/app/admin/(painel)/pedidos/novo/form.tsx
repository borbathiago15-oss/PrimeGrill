"use client";

import { useActionState, useMemo, useState } from "react";
import { criarPedidoPainel, type EstadoNovo } from "./acoes";
import { formatarReais, formatarValor } from "@/modules/dinheiro";

type Produto = { id: number; nome: string; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; disponivel: boolean; estoque: number | null };

export function FormNovoPedido({ produtos }: { produtos: Produto[] }) {
  const [estado, acao, enviando] = useActionState<EstadoNovo, FormData>(criarPedidoPainel, {});
  const [qtd, setQtd] = useState<Record<number, number>>({});
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"RETIRADA" | "ENTREGA">("RETIRADA");
  const itens = Object.entries(qtd)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ produtoId: Number(id), quantidade: q }));
  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return b ? produtos.filter((p) => p.nome.toLowerCase().includes(b)) : produtos;
  }, [busca, produtos]);
  const pacotes = itens.reduce((s, i) => {
    const p = produtos.find((x) => x.id === i.produtoId);
    return p?.tipoVenda === "PACOTE" ? s + p.precoCentavos * i.quantidade : s;
  }, 0);
  const temPeca = itens.some((i) => produtos.find((x) => x.id === i.produtoId)?.tipoVenda === "PECA");
  const mudar = (id: number, d: number) => setQtd((q) => ({ ...q, [id]: Math.max(0, Math.min(50, (q[id] ?? 0) + d)) }));

  return (
    <form action={acao} className="novo-pedido">
      <input type="hidden" name="itens" value={JSON.stringify(itens)} />
      <div className="cartao">
        <div className="cartao-h">
          <h2>1. Produtos</h2>
          <input className="busca" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
        </div>
        <ul className="lista-prod">
          {filtrados.map((p) => (
            <li key={p.id} className={qtd[p.id] ? "sel" : ""}>
              <span>
                <b>{p.nome}</b>
                <small>
                  {p.tipoVenda === "PECA" ? `R$ ${formatarValor(p.precoCentavos)}/kg · peça inteira` : `${formatarReais(p.precoCentavos)} · pacote`}
                  {!p.disponivel ? " · indisponível na loja online" : p.estoque !== null ? ` · ${p.estoque} em estoque` : ""}
                </small>
              </span>
              <span className="qtd">
                <button type="button" className="btn btn-pq" onClick={() => mudar(p.id, -1)} aria-label={`Menos ${p.nome}`}>
                  −
                </button>
                <b className="num">{qtd[p.id] ?? 0}</b>
                <button type="button" className="btn btn-pq" onClick={() => mudar(p.id, 1)} aria-label={`Mais ${p.nome}`}>
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="cartao">
        <div className="cartao-h">
          <h2>2. Cliente e recebimento</h2>
        </div>
        <div className="form">
          <div className="f">
            <label htmlFor="origem">Pedido veio por</label>
            <select id="origem" name="origem" defaultValue="WHATSAPP">
              <option value="WHATSAPP">WhatsApp</option>
              <option value="BALCAO">Balcão / telefone</option>
            </select>
          </div>
          <div className="f">
            <label htmlFor="modo">Recebimento</label>
            <select id="modo" name="modo" value={modo} onChange={(e) => setModo(e.target.value as "RETIRADA" | "ENTREGA")}>
              <option value="RETIRADA">Retirada na loja</option>
              <option value="ENTREGA">Entrega</option>
            </select>
          </div>
          <div className="f">
            <label htmlFor="nome">Nome do cliente</label>
            <input id="nome" name="nome" required maxLength={80} autoComplete="off" />
          </div>
          <div className="f">
            <label htmlFor="celular">Celular (WhatsApp)</label>
            <input id="celular" name="celular" required inputMode="tel" placeholder="(81) 99999-9999" autoComplete="off" />
            <small>É para onde vai o link do pedido.</small>
          </div>
          {modo === "ENTREGA" && (
            <>
              <div className="f">
                <label htmlFor="cep">CEP</label>
                <input id="cep" name="cep" inputMode="numeric" maxLength={9} placeholder="00000-000" />
              </div>
              <div className="f">
                <label htmlFor="bairro">Bairro</label>
                <input id="bairro" name="bairro" maxLength={60} />
              </div>
              <div className="f">
                <label htmlFor="endereco">Endereço</label>
                <input id="endereco" name="endereco" maxLength={120} />
              </div>
              <div className="f">
                <label htmlFor="numero">Número</label>
                <input id="numero" name="numero" maxLength={15} />
              </div>
              <div className="f">
                <label htmlFor="complemento">Complemento</label>
                <input id="complemento" name="complemento" maxLength={60} />
              </div>
              <div className="f">
                <label htmlFor="frete">Frete (R$) — deixe vazio para calcular pela distância</label>
                <input id="frete" name="frete" inputMode="decimal" placeholder="Ex.: 10,00" />
              </div>
            </>
          )}
          <div className="f cheio">
            <label htmlFor="observacao">Observação</label>
            <input id="observacao" name="observacao" maxLength={180} placeholder="Ex.: cortar a picanha em bifes" />
          </div>
          <label className="f-check cheio">
            <input type="checkbox" name="separar" defaultChecked /> Já aceitar e começar a separar
          </label>
        </div>
      </div>

      {estado.erro && <p className="msg-erro">{estado.erro}</p>}
      <div className="cartao barra-novo">
        <span>
          {itens.length ? `${itens.reduce((s, i) => s + i.quantidade, 0)} item(ns)` : "Nenhum produto"}
          {pacotes > 0 && ` · pacotes ${formatarReais(pacotes)}`}
          {temPeca && " · peças: valor após pesagem"}
        </span>
        <button className="btn btn-pri btn-grande" disabled={!itens.length || enviando}>
          {enviando ? "Registrando…" : "Registrar pedido"}
        </button>
      </div>
    </form>
  );
}
