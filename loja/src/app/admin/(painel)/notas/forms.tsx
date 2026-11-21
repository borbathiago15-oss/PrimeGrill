"use client";

import { useActionState } from "react";
import { adicionarItem, criarNotaManual, importarXml, type EstadoNota } from "./acoes";

export function FormXml() {
  const [estado, acao, pendente] = useActionState<EstadoNota, FormData>(importarXml, {});
  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Enviar XML da nota</h2>
        <span className="rotulo">recomendado</span>
      </div>
      <div className="form" style={{ gridTemplateColumns: "1fr" }}>
        {estado.erro && <p className="msg-erro">{estado.erro}</p>}
        <div className="f">
          <label htmlFor="xml">Arquivo XML recebido do fornecedor</label>
          <input id="xml" name="xml" type="file" accept=".xml,text/xml,application/xml" required />
          <small>O sistema lê fornecedor, itens e valores. O estoque só muda depois da conferência.</small>
        </div>
      </div>
      <div className="acoes">
        <button className="btn btn-pri" disabled={pendente}>
          {pendente ? "Lendo…" : "Importar XML"}
        </button>
      </div>
    </form>
  );
}

export function FormManual() {
  const [estado, acao, pendente] = useActionState<EstadoNota, FormData>(criarNotaManual, {});
  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Digitar nota</h2>
        <span className="rotulo">sem XML · exige motivo</span>
      </div>
      <div className="form">
        {estado.erro && <p className="msg-erro cheio">{estado.erro}</p>}
        <div className="f">
          <label htmlFor="cnpj">CNPJ do fornecedor</label>
          <input id="cnpj" name="cnpj" inputMode="numeric" required />
        </div>
        <div className="f">
          <label htmlFor="fornecedor">Nome do fornecedor</label>
          <input id="fornecedor" name="fornecedor" required maxLength={120} />
        </div>
        <div className="f">
          <label htmlFor="numero">Número da nota</label>
          <input id="numero" name="numero" required maxLength={12} />
        </div>
        <div className="f">
          <label htmlFor="serie">Série</label>
          <input id="serie" name="serie" maxLength={4} />
        </div>
        <div className="f">
          <label htmlFor="emissao">Emissão</label>
          <input id="emissao" name="emissao" type="date" required />
        </div>
        <div className="f">
          <label htmlFor="valor">Valor total (R$)</label>
          <input id="valor" name="valor" inputMode="decimal" required placeholder="2.275,80" />
        </div>
        <div className="f cheio">
          <label htmlFor="chave">Chave de acesso (opcional, 44 dígitos)</label>
          <input id="chave" name="chave" inputMode="numeric" maxLength={60} />
        </div>
        <div className="f cheio">
          <label htmlFor="motivo">Motivo da digitação</label>
          <input id="motivo" name="motivo" required maxLength={160} placeholder="Ex.: fornecedor não enviou o XML" />
        </div>
      </div>
      <div className="acoes">
        <button className="btn" disabled={pendente}>
          {pendente ? "Criando…" : "Criar nota e lançar itens"}
        </button>
      </div>
    </form>
  );
}

export function FormItem({ notaId, produtos }: { notaId: number; produtos: { id: number; nome: string }[] }) {
  const [estado, acao, pendente] = useActionState<EstadoNota, FormData>(adicionarItem, {});
  return (
    <form action={acao} style={{ borderTop: "1px solid var(--borda)" }}>
      <input type="hidden" name="notaId" value={notaId} />
      {estado.erro && <p className="msg-erro" style={{ margin: "12px 18px 0" }}>{estado.erro}</p>}
      <div className="form" style={{ gridTemplateColumns: "2fr 1fr 0.7fr 1fr 1fr 2fr auto", alignItems: "end" }}>
        <div className="f">
          <label htmlFor="descricao">Item (como na nota)</label>
          <input id="descricao" name="descricao" required maxLength={120} />
        </div>
        <div className="f">
          <label htmlFor="codigo">Código</label>
          <input id="codigo" name="codigo" maxLength={40} />
        </div>
        <div className="f">
          <label htmlFor="unidade">Unid.</label>
          <input id="unidade" name="unidade" defaultValue="KG" maxLength={6} />
        </div>
        <div className="f">
          <label htmlFor="quantidade">Quantidade</label>
          <input id="quantidade" name="quantidade" inputMode="decimal" required placeholder="20,000" />
        </div>
        <div className="f">
          <label htmlFor="valorItem">Valor total (R$)</label>
          <input id="valorItem" name="valor" inputMode="decimal" required placeholder="1.880,00" />
        </div>
        <div className="f">
          <label htmlFor="produtoId">Produto</label>
          <select id="produtoId" name="produtoId" defaultValue="">
            <option value="">Escolher depois…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-pri" disabled={pendente}>
          Adicionar
        </button>
      </div>
    </form>
  );
}
