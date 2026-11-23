"use client";

import { useActionState, useState } from "react";
import { cadastrarOfertas, sairDasOfertas, type EstadoCadastro } from "@/app/(vitrine)/ofertas-acoes";

/** "Receba as ofertas da semana": cadastro com consentimento explícito (caixa desmarcada). */
export function CadastroOfertas() {
  const [estado, acao, enviando] = useActionState<EstadoCadastro, FormData>(cadastrarOfertas, {});
  const [aberto, setAberto] = useState(false);
  if (estado.ok)
    return (
      <section className="cadastro-ofertas">
        <b>Pronto! 🔥</b>
        <p>Você vai receber as ofertas e o folder da semana no WhatsApp. Cada mensagem traz um link para sair quando quiser.</p>
      </section>
    );
  return (
    <section className="cadastro-ofertas">
      <b>Receba as ofertas da semana no WhatsApp</b>
      <p>Promoções, cortes que chegaram e o folder da semana. Sem spam: dá para sair a qualquer momento.</p>
      {!aberto ? (
        <button type="button" className="btn-ouro centro" onClick={() => setAberto(true)}>
          Quero receber
        </button>
      ) : (
        <form action={acao} className="campos">
          <input className="sr" tabIndex={-1} autoComplete="off" name="site" aria-hidden="true" />
          <div className="campo">
            <label htmlFor="of-nome">Nome</label>
            <input id="of-nome" name="nome" autoComplete="name" required minLength={2} maxLength={80} />
          </div>
          <div className="campo">
            <label htmlFor="of-cel">Celular com DDD (WhatsApp)</label>
            <input id="of-cel" name="celular" type="tel" inputMode="tel" autoComplete="tel" placeholder="(81) 99999-9999" required />
          </div>
          <label className="check">
            <input type="checkbox" name="aceite" required />
            <span>
              Aceito receber promoções e o folder da Prime Grill Paiva pelo WhatsApp, conforme a{" "}
              <a href="/privacidade" target="_blank" rel="noopener">
                política de privacidade
              </a>
              .
            </span>
          </label>
          {estado.erro && <p className="erro-box">{estado.erro}</p>}
          <button className="btn-ouro centro" disabled={enviando}>
            {enviando ? "Cadastrando…" : "Cadastrar"}
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
  if (feito) return <p className="ok-box">Pronto: você não vai mais receber promoções. Pedidos e avisos do seu pedido continuam funcionando normalmente.</p>;
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
      {enviando ? "Saindo…" : "Não quero mais receber promoções"}
    </button>
  );
}
