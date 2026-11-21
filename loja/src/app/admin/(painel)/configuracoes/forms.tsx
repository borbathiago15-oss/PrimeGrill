"use client";

import { useActionState } from "react";
import { salvarConfig, salvarZona, type EstadoForm } from "../acoes";
import type { ConfigLoja } from "@/db/schema";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function FormConfig({ config }: { config: ConfigLoja }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarConfig, {});
  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Funcionamento</h2>
      </div>
      {estado.erro && <p className="msg-erro" style={{ margin: "14px 18px 0" }}>{estado.erro}</p>}
      {estado.ok && <p className="msg-ok" style={{ margin: "14px 18px 0" }}>{estado.ok}</p>}
      <div className="form">
        <label className="f-check cheio" style={{ padding: "8px 0" }}>
          <input type="checkbox" name="pausada" defaultChecked={config.pausada} /> <b>Pausar a loja agora</b> (aparece como fechada para os clientes)
        </label>
        <div className="f">
          <label htmlFor="mensagemPausa">Mensagem da pausa</label>
          <input id="mensagemPausa" name="mensagemPausa" defaultValue={config.mensagemPausa} maxLength={80} />
        </div>
        <div className="f">
          <label htmlFor="whatsapp">WhatsApp que recebe os pedidos</label>
          <input id="whatsapp" name="whatsapp" defaultValue={config.whatsapp} inputMode="numeric" required />
          <small>Com DDI e DDD, só números. Ex.: 5581998990694</small>
        </div>
        <label className="f-check">
          <input type="checkbox" name="retiradaAtiva" defaultChecked={config.retiradaAtiva} /> Oferecer retirada na loja
        </label>
        <div className="f">
          <label htmlFor="enderecoRetirada">Endereço para retirada</label>
          <input id="enderecoRetirada" name="enderecoRetirada" defaultValue={config.enderecoRetirada} maxLength={120} />
        </div>
        <div className="cheio">
          <span className="rotulo">Horário de funcionamento (horário de Recife)</span>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {config.horarios.map((h) => (
                <tr key={h.dia}>
                  <td style={{ width: 120 }}>{DIAS[h.dia]}</td>
                  <td>
                    <input type="time" name={`abre-${h.dia}`} defaultValue={h.abre} aria-label={`Abertura ${DIAS[h.dia]}`} style={{ height: 36, padding: "0 8px", border: "1px solid var(--borda)", borderRadius: 6 }} />
                  </td>
                  <td>
                    <input type="time" name={`fecha-${h.dia}`} defaultValue={h.fecha} aria-label={`Fechamento ${DIAS[h.dia]}`} style={{ height: 36, padding: "0 8px", border: "1px solid var(--borda)", borderRadius: 6 }} />
                  </td>
                  <td>
                    <label className="f-check">
                      <input type="checkbox" name={`fechado-${h.dia}`} defaultChecked={h.fechado} /> Fechado
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="acoes">
        <button className="btn btn-pri" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar funcionamento"}
        </button>
      </div>
    </form>
  );
}

export function FormZona() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarZona, {});
  return (
    <form action={acao} style={{ borderTop: "1px solid var(--borda)" }}>
      {estado.erro && <p className="msg-erro" style={{ margin: "14px 18px 0" }}>{estado.erro}</p>}
      {estado.ok && <p className="msg-ok" style={{ margin: "14px 18px 0" }}>{estado.ok}</p>}
      <div className="form" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", alignItems: "end" }}>
        <div className="f">
          <label htmlFor="bairro">Novo bairro</label>
          <input id="bairro" name="bairro" required maxLength={60} />
        </div>
        <div className="f">
          <label htmlFor="taxa">Taxa (R$)</label>
          <input id="taxa" name="taxa" inputMode="decimal" placeholder="9,90" required />
        </div>
        <div className="f">
          <label htmlFor="prazo">Prazo</label>
          <input id="prazo" name="prazo" placeholder="até 60 min" maxLength={30} />
        </div>
        <div className="f">
          <label htmlFor="minimo">Pedido mínimo (R$)</label>
          <input id="minimo" name="minimo" inputMode="decimal" placeholder="opcional" />
        </div>
        <button className="btn btn-pri" disabled={pendente}>
          Adicionar
        </button>
      </div>
    </form>
  );
}
