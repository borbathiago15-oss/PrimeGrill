"use client";

import { useActionState, useState } from "react";
import { salvarProduto, type EstadoForm } from "../../acoes";

type Inicial = {
  id: number;
  nome: string;
  descricao: string;
  categoriaId: number;
  tipoVenda: "PECA" | "PACOTE";
  preco: string;
  pesoMedio: string;
  pesoNominal: string;
  quantidade: string;
  ativo: boolean;
  disponivel: boolean;
  destaque: boolean;
  fotoUrl: string | null;
};

export function FormProduto({ categorias, inicial }: { categorias: { id: number; nome: string }[]; inicial: Inicial | null }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarProduto, {});
  const [tipo, setTipo] = useState<"PECA" | "PACOTE">(inicial?.tipoVenda ?? "PECA");

  return (
    <form action={acao} className="cartao">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      {estado.erro && (
        <p className="msg-erro" style={{ margin: 18, marginBottom: 0 }} role="alert">
          {estado.erro}
        </p>
      )}
      <div className="form">
        <div className="f cheio">
          <label htmlFor="nome">Nome do produto</label>
          <input id="nome" name="nome" defaultValue={inicial?.nome} required maxLength={90} />
        </div>
        <div className="f">
          <label htmlFor="categoriaId">Categoria</label>
          <select id="categoriaId" name="categoriaId" defaultValue={inicial?.categoriaId}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="tipoVenda">Tipo de venda</label>
          <select id="tipoVenda" name="tipoVenda" value={tipo} onChange={(e) => setTipo(e.target.value as "PECA" | "PACOTE")}>
            <option value="PECA">Peça inteira (preço por kg, pesada na saída)</option>
            <option value="PACOTE">Pacote (preço fixo)</option>
          </select>
          <small>Não pode mudar depois que o produto tiver pedidos.</small>
        </div>
        <div className="f">
          <label htmlFor="preco">{tipo === "PECA" ? "Preço por kg (R$)" : "Preço do pacote (R$)"}</label>
          <input id="preco" name="preco" inputMode="decimal" defaultValue={inicial?.preco} placeholder="119,40" required />
        </div>
        {tipo === "PECA" ? (
          <div className="f">
            <label htmlFor="pesoMedio">Peso médio da peça (kg)</label>
            <input id="pesoMedio" name="pesoMedio" inputMode="decimal" defaultValue={inicial?.pesoMedio} placeholder="1,320" />
            <small>Usado só para o valor aproximado na loja. Em branco = mostra só o R$/kg.</small>
          </div>
        ) : (
          <div className="f">
            <label htmlFor="pesoNominal">Peso do pacote (texto)</label>
            <input id="pesoNominal" name="pesoNominal" defaultValue={inicial?.pesoNominal} placeholder="600 g" maxLength={20} />
          </div>
        )}
        <div className="f">
          <label htmlFor="quantidade">{tipo === "PECA" ? "Peças disponíveis" : "Pacotes disponíveis"}</label>
          <input id="quantidade" name="quantidade" inputMode="numeric" defaultValue={inicial?.quantidade} placeholder="em branco = não controlar" />
          <small>Até o módulo de estoque existir, a quantidade é ajustada aqui.</small>
        </div>
        <div className="f">
          <label htmlFor="foto">Foto {inicial?.fotoUrl ? "(enviar para substituir)" : ""}</label>
          <input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" />
          <small>JPG, PNG ou WebP, até 5 MB.</small>
        </div>
        {inicial?.fotoUrl && (
          <div className="f">
            <label>Foto atual</label>
            <img src={inicial.fotoUrl} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 6 }} />
          </div>
        )}
        <div className="f cheio">
          <label htmlFor="descricao">Descrição comercial</label>
          <textarea id="descricao" name="descricao" defaultValue={inicial?.descricao} maxLength={600} />
        </div>
        <label className="f-check">
          <input type="checkbox" name="ativo" defaultChecked={inicial?.ativo ?? true} /> Mostrar na loja
        </label>
        <label className="f-check">
          <input type="checkbox" name="disponivel" defaultChecked={inicial?.disponivel ?? true} /> Disponível para pedido
        </label>
        <label className="f-check">
          <input type="checkbox" name="destaque" defaultChecked={inicial?.destaque ?? false} /> Destaque
        </label>
      </div>
      <div className="acoes">
        <button className="btn btn-pri" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}
