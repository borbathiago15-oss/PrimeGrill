"use client";

import { useActionState } from "react";
import { ajustarEstoque, fecharQuebra, type EstadoEstoque } from "../acoes";
import { formatarKg } from "@/modules/dinheiro";

export function FormQuebra({ produtoId, gramas }: { produtoId: number; gramas: number }) {
  const [estado, acao, pendente] = useActionState<EstadoEstoque, FormData>(fecharQuebra, {});
  return (
    <form action={acao} className="cartao" style={{ borderColor: "#EFD7B8" }}>
      <input type="hidden" name="produtoId" value={produtoId} />
      <div className="cartao-h" style={{ background: "#FBF1E4" }}>
        <h2>Fechar saldo como quebra</h2>
        <span className="rotulo">{formatarKg(gramas)} sem peças</span>
      </div>
      {estado.erro && <p className="msg-erro" style={{ margin: "12px 18px 0" }}>{estado.erro}</p>}
      <div className="form" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
        <div className="f">
          <label htmlFor="motivoQuebra">Motivo</label>
          <input id="motivoQuebra" name="motivo" defaultValue="Exsudato e aparas no fechamento do lote" maxLength={160} />
        </div>
        <button className="btn btn-pri" disabled={pendente}>
          Registrar quebra
        </button>
      </div>
    </form>
  );
}

export function FormAjuste({ produtoId, tipoVenda }: { produtoId: number; tipoVenda: "PECA" | "PACOTE" }) {
  const [estado, acao, pendente] = useActionState<EstadoEstoque, FormData>(ajustarEstoque, {});
  return (
    <form action={acao} className="cartao">
      <input type="hidden" name="produtoId" value={produtoId} />
      <div className="cartao-h">
        <h2>Ajuste manual</h2>
        <span className="rotulo">inventário ou correção · fica registrado com motivo</span>
      </div>
      {estado.erro && <p className="msg-erro" style={{ margin: "12px 18px 0" }}>{estado.erro}</p>}
      {estado.ok && <p className="msg-ok" style={{ margin: "12px 18px 0" }}>{estado.ok}</p>}
      <div className="form" style={{ gridTemplateColumns: tipoVenda === "PECA" ? "1fr 1fr 1fr 2fr auto" : "1fr 1fr 2fr auto", alignItems: "end" }}>
        <div className="f">
          <label htmlFor="sentido">Tipo</label>
          <select id="sentido" name="sentido">
            <option value="entrada">Entrada (+)</option>
            <option value="saida">Saída (−)</option>
          </select>
        </div>
        {tipoVenda === "PECA" ? (
          <>
            <div className="f">
              <label htmlFor="kg">Peso (kg)</label>
              <input id="kg" name="kg" inputMode="decimal" placeholder="1,250" />
            </div>
            <div className="f">
              <label htmlFor="pecas">Peças</label>
              <input id="pecas" name="pecas" inputMode="numeric" placeholder="1" />
            </div>
          </>
        ) : (
          <div className="f">
            <label htmlFor="unidades">Pacotes</label>
            <input id="unidades" name="unidades" inputMode="numeric" placeholder="1" />
          </div>
        )}
        <div className="f">
          <label htmlFor="motivoAjuste">Motivo</label>
          <input id="motivoAjuste" name="motivo" required maxLength={160} placeholder="Ex.: contagem de inventário" />
        </div>
        <button className="btn btn-pri" disabled={pendente}>
          Registrar
        </button>
      </div>
    </form>
  );
}
