"use client";

import { useActionState, useState } from "react";
import { confirmarSeparacao, type EstadoSeparacao } from "./acoes";
import { formatarKg, formatarReais, formatarValor, kgParaGramas, reaisParaCentavos, valorPorPeso } from "@/modules/dinheiro";

type Item = { id: number; nome: string; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; quantidade: number };
type Pesagem = { itemId: number; peca: number; gramas: number; valorCentavos: number };

/**
 * Separação e pesagem (PES-001, versão manual): o operador digita o peso real de cada peça,
 * o sistema calcula o valor final, dá baixa no estoque e monta a mensagem para o cliente.
 */
export function CalculadoraPesagem(props: {
  pedidoId: number;
  codigo: string;
  celularCliente: string;
  freteCentavos: number;
  freteACombinar: boolean;
  itens: Item[];
  baixaFeita: boolean;
  pesagens: Pesagem[];
}) {
  const { pedidoId, codigo, celularCliente, freteCentavos, freteACombinar, itens, baixaFeita } = props;
  const [estado, acao, enviando] = useActionState<EstadoSeparacao, FormData>(confirmarSeparacao, {});
  const pecas = itens.flatMap((i) => (i.tipoVenda === "PECA" ? Array.from({ length: i.quantidade }, (_, n) => ({ chave: `${i.id}-${n}`, item: i, n })) : []));
  const registrados = new Map(props.pesagens.map((p) => [`${p.itemId}-${p.peca - 1}`, p.gramas]));
  const [pesos, setPesos] = useState<Record<string, string>>(
    Object.fromEntries([...registrados].map(([k, g]) => [k, (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3 })])),
  );
  const [freteTxt, setFreteTxt] = useState("");
  const frete = freteACombinar && !baixaFeita ? (reaisParaCentavos(freteTxt) ?? 0) : freteCentavos;

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
  if (frete) linhas.push(`• Frete: ${formatarReais(frete)}`);
  if (freteACombinar && !baixaFeita && reaisParaCentavos(freteTxt) === null) completo = false;
  const final = total + frete;
  const msg = [`*Pedido ${codigo} ${pecas.length ? "pesado" : "separado"}* — Prime Grill Paiva`, "", ...linhas, "", `*Total final: ${formatarReais(final)}*`, "", "Podemos confirmar?"].join("\n");
  const pronto = baixaFeita || estado.ok;

  return (
    <form action={acao} className="cartao">
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <div className="cartao-h">
        <h2>Separação e pesagem</h2>
        {baixaFeita ? <span className="chip ok">Estoque baixado</span> : <span className="rotulo">{pecas.length ? "peso real de cada peça" : "confira e separe os pacotes"}</span>}
      </div>
      {estado.erro && <p className="msg-erro" style={{ margin: "12px 18px 0" }}>{estado.erro}</p>}
      {estado.ok && <p className="msg-ok" style={{ margin: "12px 18px 0" }}>{estado.ok}</p>}
      {pecas.length > 0 && (
        <div className="form">
          {pecas.map(({ chave, item, n }) => {
            const g = kgParaGramas(pesos[chave] ?? "");
            return (
              <div className="f" key={chave}>
                <label htmlFor={chave}>
                  {item.nome}
                  {item.quantidade > 1 ? ` · peça ${n + 1}` : ""} (R$ {formatarValor(item.precoCentavos)}/kg)
                </label>
                <input id={chave} name={`peso-${chave}`} inputMode="decimal" placeholder="Peso em kg, ex.: 1,385" value={pesos[chave] ?? ""} disabled={!!pronto} onChange={(e) => setPesos({ ...pesos, [chave]: e.target.value })} />
                <small className="num">{g ? `= ${formatarReais(valorPorPeso(g, item.precoCentavos))}` : "informe o peso da balança"}</small>
              </div>
            );
          })}
        </div>
      )}
      {freteACombinar && !baixaFeita && (
        <div className="form" style={{ paddingTop: pecas.length ? 0 : 18 }}>
          <div className="f">
            <label htmlFor="frete-combinar">Frete a cobrar (R$) — CEP não localizado automaticamente</label>
            <input id="frete-combinar" name="frete" inputMode="decimal" placeholder="Ex.: 10,00" value={freteTxt} onChange={(e) => setFreteTxt(e.target.value)} disabled={!!pronto} />
          </div>
        </div>
      )}
      <div className="acoes" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <span className="num" style={{ fontWeight: 700, fontSize: 16 }}>
          Total final: {completo ? formatarReais(final) : "—"}
        </span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!pronto && (
            <button className="btn btn-pri" disabled={!completo || enviando}>
              {enviando ? "Registrando…" : "Confirmar separação e dar baixa"}
            </button>
          )}
          {pronto && completo && (
            <a className="btn btn-pri" href={`https://wa.me/${celularCliente}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
              Enviar valor final ao cliente ↗
            </a>
          )}
        </span>
      </div>
    </form>
  );
}
