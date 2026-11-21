"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resumoCarrinho, SeletorQuantidade, useCarrinho } from "./carrinho";
import { criarPedido } from "@/app/(vitrine)/pedido/acoes";
import { formatarReais, formatarValor } from "@/modules/dinheiro";
import { valorAproximadoPeca } from "@/modules/pedidos/calculo";

type Prod = { id: number; nome: string; fotoUrl: string | null; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; pesoMedioGramas: number | null };
type Zona = { id: number; bairro: string; taxaCentavos: number; prazo: string; pedidoMinimoCentavos: number };

export function Checkout({ produtos, zonas, retiradaAtiva, enderecoRetirada }: { produtos: Prod[]; zonas: Zona[]; retiradaAtiva: boolean; enderecoRetirada: string }) {
  const { itens, produtos: resumo, limpar, pronto } = useCarrinho();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const entregaDisponivel = zonas.length > 0;
  const [modo, setModo] = useState<"ENTREGA" | "RETIRADA">(entregaDisponivel ? "ENTREGA" : "RETIRADA");
  const [zonaId, setZonaId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");

  const lista = produtos.filter((p) => itens[p.id]);
  const { total: subtotal, pesado } = resumoCarrinho(itens, resumo);
  const zona = zonas.find((z) => z.id === zonaId) ?? null;
  const frete = modo === "ENTREGA" && zona ? zona.taxaCentavos : 0;
  const algumSemPeso = lista.some((p) => p.tipoVenda === "PECA" && !p.pesoMedioGramas);

  if (!pronto) return <div className="ck" />;
  if (lista.length === 0)
    return (
      <div className="vazio">
        <p>Seu carrinho está vazio.</p>
        <Link href="/" className="btn-linha">
          Ver o cardápio
        </Link>
      </div>
    );

  async function buscarCep(valor: string) {
    const d = valor.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setEndereco(j.logradouro ?? "");
        const z = zonas.find((x) => x.bairro.localeCompare(j.bairro ?? "", "pt-BR", { sensitivity: "base" }) === 0);
        if (z) setZonaId(z.id);
      }
    } catch {
      /* sem CEP automático: o cliente preenche à mão */
    }
  }

  function enviar(form: FormData) {
    setErro(null);
    const dados = {
      itens: lista.map((p) => ({ produtoId: p.id, quantidade: itens[p.id] })),
      modo,
      nome: String(form.get("nome") ?? ""),
      celular: String(form.get("celular") ?? ""),
      cep,
      endereco,
      numero: String(form.get("numero") ?? ""),
      complemento: String(form.get("complemento") ?? ""),
      zonaId: modo === "ENTREGA" ? zonaId : null,
      observacao: String(form.get("observacao") ?? ""),
      consentimento: form.get("consentimento") === "on",
      optin: form.get("optin") === "on",
      site: String(form.get("site") ?? ""),
    };
    iniciar(async () => {
      const r = await criarPedido(dados);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      limpar();
      router.push(`/pedido/${r.codigo}`);
    });
  }

  return (
    <form className="ck" action={enviar}>
      <Link href="/" style={{ color: "var(--osso-2)", fontSize: 14 }}>
        ‹ Continuar comprando
      </Link>
      <h1>Seu pedido</h1>

      <section className="bloco">
        <h2>Itens</h2>
        {lista.map((p) => {
          const q = itens[p.id];
          const aprox = p.tipoVenda === "PECA" ? valorAproximadoPeca(p.precoCentavos, p.pesoMedioGramas) : p.precoCentavos;
          return (
            <div className="it-ck" key={p.id}>
              {p.fotoUrl && <img src={p.fotoUrl} alt="" />}
              <div className="d">
                <b>{p.nome}</b>
                {p.tipoVenda === "PECA" ? `R$ ${formatarValor(p.precoCentavos)}/kg · peça inteira` : `R$ ${formatarValor(p.precoCentavos)} · pacote`}
                <div style={{ marginTop: 8 }}>
                  <SeletorQuantidade id={p.id} nome={p.nome} />
                </div>
              </div>
              <div className="v num">
                {aprox !== null ? `${p.tipoVenda === "PECA" ? "≈ " : ""}${formatarReais(aprox * q)}` : "a pesar"}
              </div>
            </div>
          );
        })}
        <div className="tot">
          <div className="r">
            <span>Produtos{pesado ? " (estimado)" : ""}</span>
            <span className="num">
              {formatarReais(subtotal)}
              {algumSemPeso ? " + peças a pesar" : ""}
            </span>
          </div>
          {modo === "ENTREGA" && (
            <div className="r">
              <span>Frete{zona ? ` · ${zona.bairro}` : ""}</span>
              <span className="num">{zona ? formatarReais(frete) : "escolha o bairro"}</span>
            </div>
          )}
          <div className="r f">
            <span>Total{pesado ? " estimado" : ""}</span>
            <span className="preco num">
              {formatarReais(subtotal + frete)}
              {algumSemPeso ? <small> + peças a pesar</small> : null}
            </span>
          </div>
        </div>
      </section>

      {pesado && (
        <p className="aviso">
          Peças inteiras são pesadas na separação. Enviamos pelo WhatsApp o peso real e o valor final para você confirmar antes de pagar.
        </p>
      )}

      <section className="bloco">
        <h2>Como quer receber?</h2>
        <div className="opcoes">
          <button type="button" className="opcao" aria-pressed={modo === "ENTREGA"} disabled={!entregaDisponivel} onClick={() => setModo("ENTREGA")}>
            Entrega
            <small>{entregaDisponivel ? "frete conforme o bairro" : "em breve"}</small>
          </button>
          <button type="button" className="opcao" aria-pressed={modo === "RETIRADA"} disabled={!retiradaAtiva} onClick={() => setModo("RETIRADA")}>
            Retirada na loja
            <small>{enderecoRetirada || "sem custo"}</small>
          </button>
        </div>
        {modo === "ENTREGA" && (
          <div className="campos">
            <div className="duo">
              <div className="campo">
                <label htmlFor="cep">CEP</label>
                <input id="cep" inputMode="numeric" autoComplete="postal-code" value={cep} onChange={(e) => setCep(e.target.value)} onBlur={(e) => buscarCep(e.target.value)} placeholder="00000-000" />
              </div>
              <div className="campo">
                <label htmlFor="zona">Bairro</label>
                <select id="zona" value={zonaId ?? ""} onChange={(e) => setZonaId(e.target.value ? Number(e.target.value) : null)} required>
                  <option value="">Escolha…</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.bairro} · {formatarReais(z.taxaCentavos)}
                      {z.prazo ? ` · ${z.prazo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {zona && zona.pedidoMinimoCentavos > 0 && (
              <small style={{ color: "var(--osso-2)" }}>Pedido mínimo para {zona.bairro}: {formatarReais(zona.pedidoMinimoCentavos)}</small>
            )}
            <div className="campo">
              <label htmlFor="endereco">Endereço</label>
              <input id="endereco" autoComplete="address-line1" value={endereco} onChange={(e) => setEndereco(e.target.value)} required maxLength={120} />
            </div>
            <div className="duo">
              <div className="campo">
                <label htmlFor="numero">Número</label>
                <input id="numero" name="numero" required maxLength={15} />
              </div>
              <div className="campo">
                <label htmlFor="complemento">Complemento</label>
                <input id="complemento" name="complemento" maxLength={60} />
              </div>
            </div>
            <small style={{ color: "var(--osso-2)" }}>Não encontrou seu bairro? Fale com a gente pelo WhatsApp.</small>
          </div>
        )}
      </section>

      <section className="bloco">
        <h2>Seus dados</h2>
        <div className="campos">
          <div className="campo">
            <label htmlFor="nome">Nome e sobrenome</label>
            <input id="nome" name="nome" autoComplete="name" required minLength={2} maxLength={80} />
          </div>
          <div className="campo">
            <label htmlFor="celular">Celular com DDD</label>
            <input id="celular" name="celular" type="tel" autoComplete="tel" inputMode="tel" placeholder="(81) 99999-9999" required />
          </div>
          <div className="campo">
            <label htmlFor="observacao">Observação (opcional)</label>
            <textarea id="observacao" name="observacao" maxLength={180} placeholder="Ex.: ponto de referência" />
          </div>
          <input className="sr" tabIndex={-1} autoComplete="off" name="site" aria-hidden="true" />
          <label className="check">
            <input type="checkbox" name="consentimento" required />
            <span>Autorizo o uso dos meus dados para processar e entregar este pedido (LGPD).</span>
          </label>
          <label className="check">
            <input type="checkbox" name="optin" defaultChecked />
            <span>Quero receber pelo WhatsApp o peso real, o valor final e o andamento do pedido.</span>
          </label>
        </div>
      </section>

      {erro && (
        <p className="erro-box" role="alert">
          {erro}
        </p>
      )}
      <button className="btn-ouro centro" type="submit" disabled={pendente}>
        {pendente ? "Enviando…" : "Fazer pedido"}
      </button>
    </form>
  );
}
