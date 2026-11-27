"use client";

import { useActionState } from "react";
import { abrirCaixa, ajustarTaxa, contaDaNota, fecharCaixa, movimentarCaixa, novaDespesa, pagarDespesa, salvarTaxas, type EstadoFin } from "./acoes";

function Msg({ e }: { e: EstadoFin }) {
  return (
    <>
      {e.erro && <p className="msg-erro">{e.erro}</p>}
      {e.ok && <p className="msg-ok">{e.ok}</p>}
    </>
  );
}

const FORMAS_PAGAR: [string, string][] = [
  ["PIX", "Pix"],
  ["BOLETO", "Boleto"],
  ["TRANSFERENCIA", "Transferência"],
  ["CARTAO_DEBITO", "Cartão de débito"],
  ["CARTAO_CREDITO", "Cartão de crédito"],
  ["DINHEIRO", "Dinheiro (da gaveta do caixa)"],
];

export function FormNovaDespesa({ categorias, fornecedores, hoje }: { categorias: [string, string][]; fornecedores: { id: number; nome: string }[]; hoje: string }) {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(novaDespesa, {});
  return (
    <details className="cartao adicionar-itens" open={false}>
      <summary>+ Lançar conta a pagar ou despesa</summary>
      <form action={acao} className="form">
        <div className="f">
          <label htmlFor="d-desc">Descrição</label>
          <input id="d-desc" name="descricao" required maxLength={120} placeholder="Ex.: Energia de novembro" />
        </div>
        <div className="f">
          <label htmlFor="d-cat">Categoria</label>
          <select id="d-cat" name="categoria" required defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {categorias.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="d-valor">Valor (R$)</label>
          <input id="d-valor" name="valor" required inputMode="decimal" placeholder="1.250,00" />
        </div>
        <div className="f">
          <label htmlFor="d-venc">Vencimento</label>
          <input id="d-venc" name="vencimento" type="date" required defaultValue={hoje} />
        </div>
        <div className="f">
          <label htmlFor="d-forn">Fornecedor (opcional)</label>
          <select id="d-forn" name="fornecedorId" defaultValue="">
            <option value="">—</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="d-forma">Forma de pagamento</label>
          <select id="d-forma" name="forma" defaultValue="PIX">
            {FORMAS_PAGAR.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <label className="f-check cheio">
          <input type="checkbox" name="jaPaga" /> Já está paga (lança hoje como paga)
        </label>
        <div className="f cheio">
          <Msg e={e} />
          <button className="btn btn-pri" disabled={enviando} style={{ alignSelf: "flex-start" }}>
            {enviando ? "Salvando…" : "Lançar"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function FormPagar({ id, hoje, formaSugerida }: { id: number; hoje: string; formaSugerida: string | null }) {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(pagarDespesa, {});
  if (e.ok) return <span className="chip ok">Pago</span>;
  return (
    <form action={acao} className="linha-botoes" style={{ gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <input type="date" name="dia" defaultValue={hoje} max={hoje} aria-label="Data do pagamento" style={{ height: 32, border: "1px solid var(--borda)", borderRadius: 6, padding: "0 6px" }} />
      <select name="forma" defaultValue={formaSugerida ?? "PIX"} aria-label="Como pagou" style={{ height: 32, border: "1px solid var(--borda)", borderRadius: 6 }}>
        {FORMAS_PAGAR.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
      <button className="btn btn-pq btn-pri" disabled={enviando}>
        Pagar
      </button>
      {e.erro && <small style={{ color: "var(--erro)" }}>{e.erro}</small>}
    </form>
  );
}

export function FormContaNota({ notaId, sugestao }: { notaId: number; sugestao: string }) {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(contaDaNota, {});
  if (e.ok) return <span className="chip ok">Conta criada</span>;
  return (
    <form action={acao} className="linha-botoes" style={{ gap: 6 }}>
      <input type="hidden" name="notaId" value={notaId} />
      <input type="date" name="vencimento" defaultValue={sugestao} aria-label="Vencimento" style={{ height: 32, border: "1px solid var(--borda)", borderRadius: 6, padding: "0 6px" }} />
      <button className="btn btn-pq" disabled={enviando}>
        Criar conta a pagar
      </button>
      {e.erro && <small style={{ color: "var(--erro)" }}>{e.erro}</small>}
    </form>
  );
}

export function FormAjustarTaxa({ id, liquido }: { id: number; liquido: string }) {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(ajustarTaxa, {});
  if (e.ok) return <span className="chip ok">Ajustado</span>;
  return (
    <details>
      <summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--texto-2)" }}>Caiu outro valor?</summary>
      <form action={acao} className="linha-botoes" style={{ gap: 6, marginTop: 6 }}>
        <input type="hidden" name="id" value={id} />
        <input name="liquido" defaultValue={liquido} inputMode="decimal" aria-label="Valor que caiu" style={{ width: 100, height: 32, border: "1px solid var(--borda)", borderRadius: 6, padding: "0 8px" }} />
        <button className="btn btn-pq" disabled={enviando}>
          Ajustar e conciliar
        </button>
        {e.erro && <small style={{ color: "var(--erro)" }}>{e.erro}</small>}
      </form>
    </details>
  );
}

export function FormTaxas({ v }: { v: Record<string, string> }) {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(salvarTaxas, {});
  const campo = (nome: string, rotulo: string, sufixo: string) => (
    <div className="f">
      <label htmlFor={`t-${nome}`}>
        {rotulo} ({sufixo})
      </label>
      <input id={`t-${nome}`} name={nome} defaultValue={v[nome]} inputMode="decimal" />
    </div>
  );
  return (
    <details className="cartao adicionar-itens">
      <summary>Taxas da maquininha/banco e prazos de recebimento</summary>
      <form action={acao} className="form">
        {campo("taxaPix", "Taxa do Pix", "%")}
        {campo("taxaDebito", "Taxa do débito", "%")}
        {campo("prazoDebito", "Débito cai em", "dias")}
        {campo("taxaCredito", "Taxa do crédito à vista", "%")}
        {campo("prazoCredito", "Crédito cai em", "dias")}
        {campo("taxaLink", "Taxa do link de pagamento", "%")}
        {campo("prazoLink", "Link cai em", "dias")}
        <div className="f cheio">
          <small style={{ color: "var(--texto-2)" }}>Use as taxas do contrato da sua maquininha/banco. Elas são aplicadas nos próximos recebimentos; se um valor cair diferente, ajuste na conciliação.</small>
          <Msg e={e} />
          <button className="btn btn-pri" disabled={enviando} style={{ alignSelf: "flex-start" }}>
            {enviando ? "Salvando…" : "Salvar taxas"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function FormAbrirCaixa() {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(abrirCaixa, {});
  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Abrir o caixa</h2>
      </div>
      <div className="form">
        <div className="f">
          <label htmlFor="cx-troco">Troco na gaveta (R$)</label>
          <input id="cx-troco" name="troco" inputMode="decimal" placeholder="100,00" required />
        </div>
        <div className="f cheio">
          <Msg e={e} />
          <button className="btn btn-pri" disabled={enviando} style={{ alignSelf: "flex-start" }}>
            Abrir caixa
          </button>
        </div>
      </div>
    </form>
  );
}

export function FormMovimento() {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(movimentarCaixa, {});
  return (
    <form action={acao} className="form">
      <div className="f">
        <label htmlFor="mv-tipo">Tipo</label>
        <select id="mv-tipo" name="tipo" defaultValue="SANGRIA">
          <option value="SANGRIA">Retirada (sangria)</option>
          <option value="SUPRIMENTO">Reforço de troco (suprimento)</option>
        </select>
      </div>
      <div className="f">
        <label htmlFor="mv-valor">Valor (R$)</label>
        <input id="mv-valor" name="valor" inputMode="decimal" required />
      </div>
      <div className="f cheio">
        <label htmlFor="mv-motivo">Motivo</label>
        <input id="mv-motivo" name="motivo" required maxLength={120} placeholder="Ex.: depósito no banco" />
      </div>
      <div className="f cheio">
        <Msg e={e} />
        <button className="btn" disabled={enviando} style={{ alignSelf: "flex-start" }}>
          Registrar
        </button>
      </div>
    </form>
  );
}

export function FormFecharCaixa({ esperado }: { esperado: string }) {
  const [e, acao, enviando] = useActionState<EstadoFin, FormData>(fecharCaixa, {});
  return (
    <form action={acao} className="form">
      <div className="f">
        <label htmlFor="fc-contado">Contei na gaveta (R$)</label>
        <input id="fc-contado" name="contado" inputMode="decimal" required placeholder={esperado} />
      </div>
      <div className="f">
        <label htmlFor="fc-obs">Observação (obrigatória se houver diferença)</label>
        <input id="fc-obs" name="observacao" maxLength={200} />
      </div>
      <div className="f cheio">
        <Msg e={e} />
        <button className="btn btn-pri" disabled={enviando} style={{ alignSelf: "flex-start" }}>
          Fechar caixa
        </button>
      </div>
    </form>
  );
}
