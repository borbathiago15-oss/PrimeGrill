"use client";
import { useT } from "./idioma";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resumoCarrinho, SeletorQuantidade, useCarrinho } from "./carrinho";
import { criarPedido } from "@/app/(vitrine)/pedido/acoes";
import { consultarFrete, type RespostaFrete } from "@/app/(vitrine)/pedido/frete";
import { formatarReais, formatarValor } from "@/modules/dinheiro";
import { valorAproximadoPeca } from "@/modules/pedidos/calculo";

type Prod = { id: number; nome: string; fotoUrl: string | null; tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; pesoMedioGramas: number | null };

export function Checkout({ produtos, entregaAtiva, raioKm, retiradaAtiva, enderecoRetirada }: { produtos: Prod[]; entregaAtiva: boolean; raioKm: number; retiradaAtiva: boolean; enderecoRetirada: string }) {
  const { itens, produtos: resumo, limpar, pronto } = useCarrinho();
  const router = useRouter();
  const t = useT();
  const c = t.checkout;
  const [pendente, iniciar] = useTransition();
  const entregaDisponivel = entregaAtiva;
  const [modo, setModo] = useState<"ENTREGA" | "RETIRADA">(entregaDisponivel ? "ENTREGA" : "RETIRADA");
  const [frete, setFrete] = useState<RespostaFrete | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");

  const lista = produtos.filter((p) => itens[p.id]);
  const { total: subtotal, pesado } = resumoCarrinho(itens, resumo);
  const freteOk = frete?.tipo === "ok" ? frete : null;
  const valorFrete = modo === "ENTREGA" && freteOk ? freteOk.taxaCentavos : 0;
  const podeEnviar = modo === "RETIRADA" || frete?.tipo === "ok" || frete?.tipo === "a_combinar";
  const algumSemPeso = lista.some((p) => p.tipoVenda === "PECA" && !p.pesoMedioGramas);

  if (!pronto) return <div className="ck" />;
  if (lista.length === 0)
    return (
      <div className="vazio">
        <p>{c.vazio}</p>
        <Link href="/" className="btn-linha">
          {c.verCardapio}
        </Link>
      </div>
    );

  async function calcular(cepAtual = cep, numeroAtual = numero) {
    if (cepAtual.replace(/\D/g, "").length !== 8) return;
    setCalculando(true);
    try {
      const r = await consultarFrete(cepAtual, numeroAtual);
      setFrete(r);
      if (r.tipo === "ok" || r.tipo === "a_combinar") {
        if (!endereco && r.logradouro) setEndereco(r.logradouro);
        if (!bairro && r.bairro) setBairro(r.bairro);
      }
    } catch {
      setFrete({ tipo: "a_combinar", logradouro: "", bairro: "", cidade: "", uf: "" });
    } finally {
      setCalculando(false);
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
      numero,
      bairro,
      complemento: String(form.get("complemento") ?? ""),
      observacao: String(form.get("observacao") ?? ""),
      consentimento: form.get("consentimento") === "on",
      optin: form.get("optin") === "on",
      promocoes: form.get("promocoes") === "on",
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
        {c.continuar}
      </Link>
      <h1>{c.titulo}</h1>

      <section className="bloco">
        <h2>{c.itens}</h2>
        {lista.map((p) => {
          const q = itens[p.id];
          const aprox = p.tipoVenda === "PECA" ? valorAproximadoPeca(p.precoCentavos, p.pesoMedioGramas) : p.precoCentavos;
          return (
            <div className="it-ck" key={p.id}>
              {p.fotoUrl && <img src={p.fotoUrl} alt="" />}
              <div className="d">
                <b>{p.nome}</b>
                {p.tipoVenda === "PECA" ? c.linhaPeca(formatarValor(p.precoCentavos)) : c.linhaPacote(formatarValor(p.precoCentavos))}
                <div style={{ marginTop: 8 }}>
                  <SeletorQuantidade id={p.id} nome={p.nome} />
                </div>
              </div>
              <div className="v num">
                {aprox !== null ? `${p.tipoVenda === "PECA" ? "≈ " : ""}${formatarReais(aprox * q)}` : c.aPesar}
              </div>
            </div>
          );
        })}
        <div className="tot">
          <div className="r">
            <span>
              {c.produtos}
              {pesado ? c.estimado : ""}
            </span>
            <span className="num">
              {formatarReais(subtotal)}
              {algumSemPeso ? c.pecasAPesar : ""}
            </span>
          </div>
          {modo === "ENTREGA" && (
            <div className="r">
              <span>
                {c.frete}
                {freteOk ? ` · ${freteOk.distancia}` : ""}
              </span>
              <span className="num">{freteOk ? formatarReais(valorFrete) : frete?.tipo === "a_combinar" ? c.aConfirmar : c.informeCep}</span>
            </div>
          )}
          <div className="r f">
            <span>{pesado ? c.totalEstimado : c.total}</span>
            <span className="preco num">
              {formatarReais(subtotal + valorFrete)}
              {algumSemPeso ? <small>{c.pecasAPesar}</small> : null}
            </span>
          </div>
        </div>
      </section>

      {pesado && (
        <p className="aviso">
          {c.avisoPesado}
        </p>
      )}

      <section className="bloco">
        <h2>{c.comoReceber}</h2>
        <div className="opcoes">
          <button type="button" className="opcao" aria-pressed={modo === "ENTREGA"} disabled={!entregaDisponivel} onClick={() => setModo("ENTREGA")}>
            {c.entrega}
            <small>{entregaDisponivel ? c.entregaSub(raioKm) : c.emBreve}</small>
          </button>
          <button type="button" className="opcao" aria-pressed={modo === "RETIRADA"} disabled={!retiradaAtiva} onClick={() => setModo("RETIRADA")}>
            {c.retirada}
            <small>{enderecoRetirada || c.semCusto}</small>
          </button>
        </div>
        {modo === "ENTREGA" && (
          <div className="campos">
            <div className="duo">
              <div className="campo">
                <label htmlFor="cep">{c.cep}</label>
                <input
                  id="cep"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value);
                    setFrete(null);
                    if (e.target.value.replace(/\D/g, "").length === 8) calcular(e.target.value);
                  }}
                  placeholder="00000-000"
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="numero">{c.numero}</label>
                <input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} onBlur={() => frete?.tipo !== "ok" && calcular()} required maxLength={15} />
              </div>
            </div>
            {calculando && <p className="aviso">{c.calculando}</p>}
            {!calculando && freteOk && (
              <p className="aviso">
                {c.entregamos(freteOk.distancia, formatarReais(freteOk.taxaCentavos))}
                {freteOk.prazo ? ` · ${freteOk.prazo}` : ""}
                {freteOk.pedidoMinimoCentavos > 0 ? c.minimo(formatarReais(freteOk.pedidoMinimoCentavos)) : ""}
              </p>
            )}
            {!calculando && frete?.tipo === "fora" && (
              <p className="erro-box">
                {c.fora(frete.distancia, frete.raioKm)}
              </p>
            )}
            {!calculando && frete?.tipo === "a_combinar" && (
              <p className="aviso">{c.aCombinar}</p>
            )}
            {!calculando && frete?.tipo === "cep_invalido" && <p className="erro-box">{c.cepInvalido}</p>}
            {!calculando && frete?.tipo === "indisponivel" && <p className="erro-box">{c.entregaIndisp}</p>}
            <div className="campo">
              <label htmlFor="endereco">{c.endereco}</label>
              <input id="endereco" autoComplete="address-line1" value={endereco} onChange={(e) => setEndereco(e.target.value)} required maxLength={120} />
            </div>
            <div className="duo">
              <div className="campo">
                <label htmlFor="bairro">{c.bairro}</label>
                <input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} required maxLength={60} />
              </div>
              <div className="campo">
                <label htmlFor="complemento">{c.complemento}</label>
                <input id="complemento" name="complemento" maxLength={60} />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bloco">
        <h2>{c.seusDados}</h2>
        <div className="campos">
          <div className="campo">
            <label htmlFor="nome">{c.nome}</label>
            <input id="nome" name="nome" autoComplete="name" required minLength={2} maxLength={80} />
          </div>
          <div className="campo">
            <label htmlFor="celular">{c.celular}</label>
            <input id="celular" name="celular" type="tel" autoComplete="tel" inputMode="tel" placeholder={c.celularDica ? "+1 305 555 0100" : "(81) 99999-9999"} required />
            {c.celularDica && <small style={{ color: "#A99E90", fontSize: 12.5 }}>{c.celularDica}</small>}
          </div>
          <div className="campo">
            <label htmlFor="observacao">{c.observacao}</label>
            <textarea id="observacao" name="observacao" maxLength={180} placeholder={c.obsPlaceholder} />
          </div>
          <input className="sr" tabIndex={-1} autoComplete="off" name="site" aria-hidden="true" />
          <label className="check">
            <input type="checkbox" name="consentimento" required />
            <span>
              {c.consentimentoAntes}
              <a href="/privacidade" target="_blank" rel="noopener" style={{ color: "var(--dourado)", textDecoration: "underline" }}>
                {c.consentimentoLink}
              </a>
              .
            </span>
          </label>
          <label className="check">
            <input type="checkbox" name="optin" defaultChecked />
            <span>{c.optin}</span>
          </label>
          <label className="check">
            <input type="checkbox" name="promocoes" />
            <span>{c.promocoes}</span>
          </label>
        </div>
      </section>

      {erro && (
        <p className="erro-box" role="alert">
          {erro}
        </p>
      )}
      <button className="btn-ouro centro" type="submit" disabled={pendente || calculando || !podeEnviar}>
        {pendente ? c.enviando : c.fazerPedido}
      </button>
    </form>
  );
}
