"use client";
import { useIdioma, useT } from "@/components/idioma";
import { traduzirErro } from "@/modules/i18n/erros";

import { useActionState, useState } from "react";
import { cadastrarOfertas, sairDasOfertas, type EstadoCadastro } from "@/app/(vitrine)/ofertas-acoes";

/** "Receba as ofertas da semana": cadastro com consentimento explícito (caixa desmarcada). */
export function CadastroOfertas() {
  const [estado, acao, enviando] = useActionState<EstadoCadastro, FormData>(cadastrarOfertas, {});
  const [aberto, setAberto] = useState(false);
  const t = useT();
  const idioma = useIdioma();
  const o = t.ofertas;
  if (estado.ok)
    return (
      <section className="cadastro-ofertas">
        <b>{o.pronto}</b>
        <p>{o.prontoTexto}</p>
      </section>
    );
  return (
    <section className="cadastro-ofertas">
      <b>{o.titulo}</b>
      <p>{o.texto}</p>
      {!aberto ? (
        <button type="button" className="btn-ouro centro" onClick={() => setAberto(true)}>
          {o.quero}
        </button>
      ) : (
        <form action={acao} className="campos">
          <input className="sr" tabIndex={-1} autoComplete="off" name="site" aria-hidden="true" />
          <div className="campo">
            <label htmlFor="of-nome">{o.nome}</label>
            <input id="of-nome" name="nome" autoComplete="name" required minLength={2} maxLength={80} />
          </div>
          <div className="campo">
            <label htmlFor="of-cel">{o.celular}</label>
            <input id="of-cel" name="celular" type="tel" inputMode="tel" autoComplete="tel" placeholder={idioma === "pt" ? "(81) 99999-9999" : "+1 305 555 0100"} required />
          </div>
          <label className="check">
            <input type="checkbox" name="aceite" required />
            <span>
              {o.aceiteAntes}
              <a href="/privacidade" target="_blank" rel="noopener">
                {t.checkout.consentimentoLink}
              </a>
              .
            </span>
          </label>
          {estado.erro && <p className="erro-box">{traduzirErro(estado.erro, idioma)}</p>}
          <button className="btn-ouro centro" disabled={enviando}>
            {enviando ? o.cadastrando : o.cadastrar}
          </button>
        </form>
      )}
    </section>
  );
}

/** Botão do link de descadastro (precisa de um toque: evita sair sem querer por pré-visualização de link). */
export function BotaoSair({ token }: { token: string }) {
  const [feito, setFeito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const t = useT();
  if (feito) return <p className="ok-box">{t.ofertas.sairFeito}</p>;
  return (
    <button
      type="button"
      className="btn-ouro centro"
      disabled={enviando}
      onClick={async () => {
        setEnviando(true);
        const r = await sairDasOfertas(token);
        setEnviando(false);
        setFeito(r.ok);
      }}
    >
      {enviando ? t.ofertas.saindo : t.ofertas.sairBotao}
    </button>
  );
}
