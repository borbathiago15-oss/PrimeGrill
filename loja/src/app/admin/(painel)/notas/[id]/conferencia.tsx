"use client";

import { useActionState, useState } from "react";
import { conferirNota, type EstadoNota } from "../acoes";
import { formatarReais } from "@/modules/dinheiro";

type Prod = { id: number; nome: string; tipoVenda: "PECA" | "PACOTE" };
type Item = {
  id: number;
  descricao: string;
  codigo: string;
  unidade: string;
  quantidadeMil: number;
  valorTotalCentavos: number;
  produtoId: number | null;
  aceitoMil: number | null;
  divergencia: string | null;
  divergenciaNota: string;
  gramas: number | null;
  pecas: number | null;
  unidades: number | null;
  unidadesPorCaixa: number | null;
};

const mil = (v: number) => (v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const kg = (g: number) => (g / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const UNITARIAS = ["UN", "UND", "UNID", "PC", "PCT", "PACOTE", "PT"];

const campo = { height: 36, padding: "0 8px", border: "1px solid var(--borda)", borderRadius: 6, width: "100%", background: "#fff" } as const;

export function Conferencia({ notaId, pendente, produtos, itens }: { notaId: number; pendente: boolean; produtos: Prod[]; itens: Item[] }) {
  const [estado, acao, enviando] = useActionState<EstadoNota, FormData>(conferirNota, {});
  const [escolhidos, setEscolhidos] = useState<Record<number, number | null>>(Object.fromEntries(itens.map((i) => [i.id, i.produtoId])));
  const tipo = (id: number | null) => produtos.find((p) => p.id === id)?.tipoVenda ?? null;

  return (
    <form action={acao} className="cartao tabela-rolar">
      <input type="hidden" name="notaId" value={notaId} />
      <div className="cartao-h">
        <h2>{pendente ? "Conferência e confirmação" : "Itens recebidos"}</h2>
        <span className="rotulo">o estoque só muda ao confirmar</span>
      </div>
      {estado.erro && (
        <p className="msg-erro" style={{ margin: "14px 18px 0" }} role="alert">
          {estado.erro}
        </p>
      )}
      {estado.ok && <p className="msg-ok" style={{ margin: "14px 18px 0" }}>{estado.ok}</p>}
      <table>
        <thead>
          <tr>
            <th>Item da nota</th>
            <th>Produto no cadastro</th>
            <th className="n">Na nota</th>
            <th>Aceito</th>
            <th>Divergência</th>
            <th>Entra no estoque</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => {
            const pid = escolhidos[i.id];
            const t = tipo(pid);
            const gramasPadrao = i.gramas ?? (i.unidade === "KG" ? i.aceitoMil ?? i.quantidadeMil : null);
            const unidPadrao =
              i.unidades ??
              (i.quantidadeMil % 1000 === 0
                ? i.unidadesPorCaixa
                  ? (i.quantidadeMil / 1000) * i.unidadesPorCaixa
                  : UNITARIAS.includes(i.unidade)
                    ? i.quantidadeMil / 1000
                    : null
                : null);
            return (
              <tr key={i.id} style={{ verticalAlign: "top" }}>
                <td style={{ minWidth: 180 }}>
                  <b>{i.descricao}</b>
                  <br />
                  <small style={{ color: "var(--texto-2)" }}>
                    {i.codigo ? `cód. ${i.codigo} · ` : ""}
                    {formatarReais(i.valorTotalCentavos)}
                  </small>
                </td>
                <td style={{ minWidth: 210 }}>
                  <select
                    name={`p-${i.id}`}
                    defaultValue={i.produtoId ?? ""}
                    disabled={!pendente}
                    onChange={(e) => setEscolhidos({ ...escolhidos, [i.id]: e.target.value ? Number(e.target.value) : null })}
                    style={campo}
                    aria-label={`Produto para ${i.descricao}`}
                  >
                    <option value="">Escolha…</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.tipoVenda === "PECA" ? "peça" : "pacote"})
                      </option>
                    ))}
                  </select>
                  {i.produtoId && pendente && <small style={{ color: "var(--ok)", display: "block", marginTop: 4 }}>vinculado automaticamente</small>}
                </td>
                <td className="n">
                  {mil(i.quantidadeMil)} {i.unidade}
                </td>
                <td style={{ minWidth: 100 }}>
                  <input name={`a-${i.id}`} defaultValue={i.aceitoMil !== null ? mil(i.aceitoMil) : mil(i.quantidadeMil)} disabled={!pendente} inputMode="decimal" style={campo} aria-label={`Aceito de ${i.descricao}`} />
                </td>
                <td style={{ minWidth: 170 }}>
                  <select name={`d-${i.id}`} defaultValue={i.divergencia ?? ""} disabled={!pendente} style={campo} aria-label={`Divergência de ${i.descricao}`}>
                    <option value="">Sem divergência</option>
                    <option value="FALTA">Falta</option>
                    <option value="AVARIA">Avaria</option>
                    <option value="SOBRA">Sobra</option>
                    <option value="RECUSA">Recusa</option>
                  </select>
                  <input name={`dn-${i.id}`} defaultValue={i.divergenciaNota} disabled={!pendente} placeholder="Destino / observação" style={{ ...campo, marginTop: 6 }} maxLength={200} aria-label={`Observação da divergência de ${i.descricao}`} />
                </td>
                <td style={{ minWidth: 200 }}>
                  {t === "PECA" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <label style={{ fontSize: 11.5, color: "var(--texto-2)" }}>
                        Peso aceito (kg)
                        <input name={`g-${i.id}`} defaultValue={gramasPadrao !== null ? kg(gramasPadrao) : ""} disabled={!pendente} inputMode="decimal" style={campo} />
                      </label>
                      <label style={{ fontSize: 11.5, color: "var(--texto-2)" }}>
                        Nº de peças
                        <input name={`pc-${i.id}`} defaultValue={i.pecas ?? ""} disabled={!pendente} inputMode="numeric" style={campo} placeholder="?" />
                      </label>
                    </div>
                  )}
                  {t === "PACOTE" && (
                    <label style={{ fontSize: 11.5, color: "var(--texto-2)" }}>
                      Pacotes que entram
                      <input name={`u-${i.id}`} defaultValue={unidPadrao ?? ""} disabled={!pendente} inputMode="numeric" style={campo} placeholder="?" />
                      {i.unidadesPorCaixa ? <small style={{ display: "block" }}>1 caixa = {i.unidadesPorCaixa} (memorizado)</small> : null}
                    </label>
                  )}
                  {!t && <small style={{ color: "var(--texto-2)" }}>escolha o produto</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pendente && (
        <div className="acoes">
          <button className="btn" name="acao" value="salvar" disabled={enviando}>
            Salvar conferência
          </button>
          <button className="btn btn-pri" name="acao" value="confirmar" disabled={enviando}>
            {enviando ? "Processando…" : "Confirmar entrada no estoque"}
          </button>
        </div>
      )}
    </form>
  );
}
