"use client";

import { useState } from "react";
import { formatarKg, formatarReais, formatarValor, kgParaGramas, valorPorPeso } from "@/modules/dinheiro";

type Item = { id: number; nome: string; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; quantidade: number };

/**
 * Calculadora de pesagem (PES-001, versão manual do MVP): o operador digita o peso real de cada peça,
 * o sistema calcula o valor final e monta a mensagem para o cliente confirmar no WhatsApp.
 */
export function CalculadoraPesagem({ codigo, celularCliente, freteCentavos, itens }: { codigo: string; celularCliente: string; freteCentavos: number; itens: Item[] }) {
  const pecas = itens.flatMap((i) => (i.tipoVenda === "PECA" ? Array.from({ length: i.quantidade }, (_, n) => ({ chave: `${i.id}-${n}`, item: i, n })) : []));
  const [pesos, setPesos] = useState<Record<string, string>>({});

  const linhas: string[] = [];
  let total = 0;
  let completo = true;
  for (const { chave, item, n } of pecas) {
    const g = kgParaGramas(pesos[chave] ?? "");
    if (!g) {
      completo = false;
      continue;
    }
    const v = valorPorPeso(g, item.precoCentavos);
    total += v;
    linhas.push(`• ${item.nome}${item.quantidade > 1 ? ` (peça ${n + 1})` : ""}: ${formatarKg(g)} × R$ ${formatarValor(item.precoCentavos)}/kg = ${formatarReais(v)}`);
  }
  for (const i of itens.filter((x) => x.tipoVenda === "PACOTE")) {
    const v = i.precoCentavos * i.quantidade;
    total += v;
    linhas.push(`• ${i.quantidade}x ${i.nome}: ${formatarReais(v)}`);
  }
  if (freteCentavos) linhas.push(`• Frete: ${formatarReais(freteCentavos)}`);
  const final = total + freteCentavos;
  const msg = [`*Pedido ${codigo} pesado* — Prime Grill Paiva`, "", ...linhas, "", `*Total final: ${formatarReais(final)}*`, "", "Podemos confirmar?"].join("\n");

  return (
    <div className="cartao">
      <div className="cartao-h">
        <h2>Calculadora de pesagem</h2>
        <span className="rotulo">peso real de cada peça</span>
      </div>
      <div className="form">
        {pecas.map(({ chave, item, n }) => {
          const g = kgParaGramas(pesos[chave] ?? "");
          return (
            <div className="f" key={chave}>
              <label htmlFor={chave}>
                {item.nome}
                {item.quantidade > 1 ? ` · peça ${n + 1}` : ""} (R$ {formatarValor(item.precoCentavos)}/kg)
              </label>
              <input id={chave} inputMode="decimal" placeholder="Peso em kg, ex.: 1,385" value={pesos[chave] ?? ""} onChange={(e) => setPesos({ ...pesos, [chave]: e.target.value })} />
              <small className="num">{g ? `= ${formatarReais(valorPorPeso(g, item.precoCentavos))}` : "informe o peso da balança"}</small>
            </div>
          );
        })}
      </div>
      <div className="acoes" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className="num" style={{ fontWeight: 700, fontSize: 16 }}>
          Total final: {completo ? formatarReais(final) : "—"}
        </span>
        {completo ? (
          <a className="btn btn-pri" href={`https://wa.me/${celularCliente}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
            Enviar valor final ao cliente ↗
          </a>
        ) : (
          <button className="btn" disabled>
            Preencha todos os pesos
          </button>
        )}
      </div>
    </div>
  );
}
