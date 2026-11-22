"use client";

import { useActionState, useMemo, useState } from "react";
import { criarFolder, type EstadoFolder } from "./acoes";
import { formatarValor } from "@/modules/dinheiro";

type Produto = { id: number; nome: string; categoria: string; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; problema: string | null; destaque: boolean };
const MAX = { ENCARTE: 36, FEED: 4, STORY: 4 } as const;

export function FormNovoFolder({ produtos }: { produtos: Produto[] }) {
  const [estado, acao, enviando] = useActionState<EstadoFolder, FormData>(criarFolder, {});
  const [formato, setFormato] = useState<keyof typeof MAX>("ENCARTE");
  const [sel, setSel] = useState<number[]>([]);
  const [titulo, setTitulo] = useState("Nossas carnes premium");
  const [destaque, setDestaque] = useState(1);
  const palavras = titulo.trim().split(/\s+/).slice(0, 4);
  const categorias = useMemo(() => [...new Set(produtos.map((p) => p.categoria))], [produtos]);
  const alternar = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX[formato] ? s : [...s, id]));
  const marcar = (ids: number[]) => setSel(ids.slice(0, MAX[formato]));

  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Novo folder</h2>
      </div>
      {estado.erro && <p className="msg-erro" style={{ margin: "12px 18px 0" }}>{estado.erro}</p>}
      {estado.fora && estado.fora.length > 0 && (
        <ul className="msg-erro" style={{ margin: "8px 18px 0", paddingLeft: 32 }}>
          {estado.fora.map((f) => (
            <li key={f.nome}>
              {f.nome}: {f.motivo}
            </li>
          ))}
        </ul>
      )}
      <div className="form">
        <div className="f">
          <label htmlFor="formato">Formato</label>
          <select id="formato" name="formato" value={formato} onChange={(e) => { const f = e.target.value as keyof typeof MAX; setFormato(f); setSel((s) => s.slice(0, MAX[f])); }}>
            <option value="ENCARTE">Encarte 1080×1620 — WhatsApp e PDF</option>
            <option value="FEED">Feed Instagram 4:5 — até 4 produtos</option>
            <option value="STORY">Story 1080×1920 — até 4 produtos</option>
          </select>
        </div>
        <div className="f">
          <label htmlFor="titulo">Título (até 4 palavras)</label>
          <input id="titulo" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={40} required />
        </div>
        <div className="f">
          <label htmlFor="destaque">Palavra em dourado</label>
          <select id="destaque" name="destaque" value={destaque} onChange={(e) => setDestaque(Number(e.target.value))}>
            {palavras.map((p, i) => (
              <option key={i} value={i}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="subtitulo">Linha abaixo do título (a parte depois da “/” sai em dourado)</label>
          <input id="subtitulo" name="subtitulo" defaultValue="Cortes premium para / momentos especiais" maxLength={60} />
        </div>
        <div className="f">
          <label htmlFor="secao">Título da seção</label>
          <input id="secao" name="secao" defaultValue="Nossa seleção" maxLength={24} required />
        </div>
        <div className="f">
          <label htmlFor="frase">Frase da seção</label>
          <input id="frase" name="frase" defaultValue="Cortes selecionados para quem não abre mão de qualidade." maxLength={70} />
        </div>
        <div className="f">
          <label htmlFor="validadeDe">Preços válidos de (opcional)</label>
          <input id="validadeDe" name="validadeDe" type="date" />
        </div>
        <div className="f">
          <label htmlFor="validadeAte">até</label>
          <input id="validadeAte" name="validadeAte" type="date" />
        </div>
      </div>
      <div className="cartao-h" style={{ borderTop: "1px solid var(--borda)" }}>
        <h2>
          Produtos <span className="rotulo">{sel.length} de até {MAX[formato]} · na ordem em que você marcar</span>
        </h2>
        <span className="linha-botoes">
          <button type="button" className="btn btn-pq" onClick={() => marcar(produtos.filter((p) => p.destaque && !p.problema).map((p) => p.id))}>
            Destaques
          </button>
          {categorias.map((c) => (
            <button key={c} type="button" className="btn btn-pq" onClick={() => marcar(produtos.filter((p) => p.categoria === c && !p.problema).map((p) => p.id))}>
              {c}
            </button>
          ))}
          <button type="button" className="btn btn-pq" onClick={() => setSel([])}>
            Limpar
          </button>
        </span>
      </div>
      <ul className="lista-prod" style={{ maxHeight: 380 }}>
        {produtos.map((p) => {
          const n = sel.indexOf(p.id);
          return (
            <li key={p.id} className={n >= 0 ? "sel" : ""}>
              <label style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, cursor: p.problema ? "not-allowed" : "pointer" }}>
                <input type="checkbox" value={p.id} checked={n >= 0} disabled={!!p.problema} onChange={() => alternar(p.id)} />
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <b>
                    {n >= 0 ? `${n + 1}. ` : ""}
                    {p.nome}
                  </b>
                  <small>
                    {p.categoria} · {p.tipoVenda === "PECA" ? `R$ ${formatarValor(p.precoCentavos)} KG` : `R$ ${formatarValor(p.precoCentavos)} · PACOTE`}
                    {p.problema && <b style={{ color: "var(--erro)" }}> · fica de fora: {p.problema}</b>}
                  </small>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {/* A ordem dos produtos segue a ordem de seleção. */}
      {sel.map((id) => (
        <input key={id} type="hidden" name="ordem" value={id} />
      ))}
      <div className="acoes">
        <button className="btn btn-pri btn-grande" disabled={!sel.length || enviando}>
          {enviando ? "Montando…" : "Montar folder"}
        </button>
      </div>
    </form>
  );
}
