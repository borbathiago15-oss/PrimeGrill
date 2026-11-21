"use client";

import { useActionState } from "react";
import { salvarConfig, salvarEntrega, type EstadoForm } from "../acoes";
import { formatarValor } from "@/modules/dinheiro";
import type { ConfigEntrega } from "@/modules/entrega/frete";
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

const LINHAS = 8;
const estiloCampo = { height: 36, padding: "0 8px", border: "1px solid var(--borda)", borderRadius: 6, width: "100%" } as const;

export function FormEntrega({ entrega }: { entrega: ConfigEntrega }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarEntrega, {});
  const linhas = Array.from({ length: LINHAS }, (_, i) => entrega.faixas[i] ?? null);
  const mapa = entrega.lat !== null && entrega.lng !== null ? `https://www.openstreetmap.org/?mlat=${entrega.lat}&mlon=${entrega.lng}#map=17/${entrega.lat}/${entrega.lng}` : null;
  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Entrega por distância</h2>
        {entrega.ativa ? <span className="chip ok">Ativa</span> : <span className="chip ne">Desativada</span>}
      </div>
      {estado.erro && <p className="msg-erro" style={{ margin: "14px 18px 0" }}>{estado.erro}</p>}
      {estado.ok && <p className="msg-ok" style={{ margin: "14px 18px 0" }}>{estado.ok}</p>}
      <div className="form">
        <div className="f cheio">
          <label htmlFor="endereco">Endereço da loja (de onde saem as entregas)</label>
          <input id="endereco" name="endereco" defaultValue={entrega.endereco} placeholder="Rua, número, bairro, cidade - UF, CEP" maxLength={160} />
          <small>
            O sistema localiza o endereço no mapa ao salvar.{" "}
            {mapa ? (
              <a href={mapa} target="_blank" rel="noopener noreferrer" style={{ color: "var(--info)", fontWeight: 600 }}>
                Conferir o ponto no mapa ↗
              </a>
            ) : (
              "Ainda não localizado."
            )}
          </small>
        </div>
        <div className="f">
          <label htmlFor="lat">Latitude (opcional)</label>
          <input id="lat" name="lat" defaultValue={entrega.lat ?? ""} placeholder="-8.2914" inputMode="decimal" />
          <small>Preencha só se o ponto encontrado estiver errado.</small>
        </div>
        <div className="f">
          <label htmlFor="lng">Longitude (opcional)</label>
          <input id="lng" name="lng" defaultValue={entrega.lng ?? ""} placeholder="-34.9611" inputMode="decimal" />
          <small>Dica: no Google Maps, clique com o botão direito no ponto para copiar as coordenadas.</small>
        </div>
        <div className="f">
          <label htmlFor="fatorRota">Fator de rota</label>
          <input id="fatorRota" name="fatorRota" defaultValue={String(entrega.fatorRota).replace(".", ",")} inputMode="decimal" />
          <small>A distância em linha reta é multiplicada por este fator para aproximar o caminho pelas ruas (padrão 1,3).</small>
        </div>
        <label className="f-check">
          <input type="checkbox" name="ativa" defaultChecked={entrega.ativa} /> <b>Oferecer entrega aos clientes</b>
        </label>
        <div className="cheio">
          <span className="rotulo">Faixas de frete (a menor faixa que cobre a distância é a cobrada)</span>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Até (km)</th>
                <th>Taxa (R$)</th>
                <th>Prazo</th>
                <th>Pedido mínimo (R$)</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((f, i) => (
                <tr key={i}>
                  <td>
                    <input name={`km-${i}`} defaultValue={f ? String(f.ateKm).replace(".", ",") : ""} placeholder={i === 0 ? "3" : ""} inputMode="decimal" aria-label={`Faixa ${i + 1}: até km`} style={estiloCampo} />
                  </td>
                  <td>
                    <input name={`taxa-${i}`} defaultValue={f ? formatarValor(f.taxaCentavos) : ""} placeholder={i === 0 ? "5,00" : ""} inputMode="decimal" aria-label={`Faixa ${i + 1}: taxa`} style={estiloCampo} />
                  </td>
                  <td>
                    <input name={`prazo-${i}`} defaultValue={f?.prazo ?? ""} placeholder={i === 0 ? "até 40 min" : ""} maxLength={30} aria-label={`Faixa ${i + 1}: prazo`} style={estiloCampo} />
                  </td>
                  <td>
                    <input name={`minimo-${i}`} defaultValue={f && f.pedidoMinimoCentavos ? formatarValor(f.pedidoMinimoCentavos) : ""} placeholder="opcional" inputMode="decimal" aria-label={`Faixa ${i + 1}: pedido mínimo`} style={estiloCampo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <small style={{ color: "var(--texto-2)", display: "block", marginTop: 8 }}>
            Acima da maior faixa, o endereço fica fora da área de entrega. Deixe a linha em branco para removê-la.
          </small>
        </div>
      </div>
      <div className="acoes">
        <button className="btn btn-pri" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar entrega"}
        </button>
      </div>
    </form>
  );
}
