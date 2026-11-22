"use client";

import { useActionState } from "react";
import { alterarUsuario, criarUsuario, trocarMinhaSenha, type EstadoUsuario } from "./acoes";
import { ROTULO_PAPEL } from "@/modules/usuarios/permissoes";
import { PAPEIS, type Papel } from "@/db/schema";

function Mensagens({ e }: { e: EstadoUsuario }) {
  return (
    <>
      {e.erro && <p className="msg-erro" style={{ margin: "12px 18px 0" }}>{e.erro}</p>}
      {e.ok && <p className="msg-ok" style={{ margin: "12px 18px 0" }}>{e.ok}</p>}
    </>
  );
}

export function FormNovoUsuario() {
  const [estado, acao, enviando] = useActionState<EstadoUsuario, FormData>(criarUsuario, {});
  return (
    <form action={acao} className="cartao">
      <div className="cartao-h">
        <h2>Cadastrar pessoa da equipe</h2>
      </div>
      <Mensagens e={estado} />
      <div className="form">
        <div className="f">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" required maxLength={60} autoComplete="off" />
        </div>
        <div className="f">
          <label htmlFor="email-novo">E-mail (usado para entrar)</label>
          <input id="email-novo" name="email" type="email" required maxLength={120} autoComplete="off" />
        </div>
        <div className="f">
          <label htmlFor="papel-novo">Papel</label>
          <select id="papel-novo" name="papel" defaultValue="ATENDENTE">
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p].texto} — {ROTULO_PAPEL[p].descricao}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="senha-nova">Senha provisória</label>
          <input id="senha-nova" name="senha" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
          <small>Mínimo 10 caracteres, com letras e números. A pessoa troca no primeiro acesso.</small>
        </div>
      </div>
      <div className="acoes">
        <button className="btn btn-pri" disabled={enviando}>
          {enviando ? "Cadastrando…" : "Cadastrar"}
        </button>
      </div>
    </form>
  );
}

export function AcoesUsuario({ id, nome, papel, ativo }: { id: number; nome: string; papel: Papel; ativo: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoUsuario, FormData>(alterarUsuario, {});
  return (
    <details className="acoes-usuario">
      <summary>Alterar</summary>
      <Mensagens e={estado} />
      <form action={acao} className="linha-botoes" style={{ padding: "10px 0" }}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="acao" value="papel" />
        <select name="papel" defaultValue={papel} aria-label={`Papel de ${nome}`}>
          {PAPEIS.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PAPEL[p].texto}
            </option>
          ))}
        </select>
        <button className="btn btn-pq" disabled={enviando}>
          Salvar papel
        </button>
      </form>
      <form action={acao} className="linha-botoes" style={{ padding: "0 0 10px" }}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="acao" value="senha" />
        <input name="senha" type="password" placeholder="Nova senha provisória" minLength={10} maxLength={72} autoComplete="new-password" aria-label={`Nova senha provisória de ${nome}`} required />
        <button className="btn btn-pq" disabled={enviando}>
          Redefinir senha
        </button>
      </form>
      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="acao" value={ativo ? "desativar" : "reativar"} />
        <button className={`btn btn-pq ${ativo ? "btn-perigo" : ""}`} disabled={enviando}>
          {ativo ? "Desativar acesso" : "Reativar acesso"}
        </button>
      </form>
    </details>
  );
}

export function FormTrocarSenha({ obrigatoria }: { obrigatoria?: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoUsuario, FormData>(trocarMinhaSenha, {});
  return (
    <form action={acao} className="cartao" style={{ maxWidth: 520 }}>
      <div className="cartao-h">
        <h2>{obrigatoria ? "Crie a sua senha para continuar" : "Trocar minha senha"}</h2>
      </div>
      {obrigatoria && !estado.ok && (
        <p style={{ padding: "12px 18px 0", fontSize: 14 }}>Você entrou com uma senha provisória. Crie uma senha só sua; ninguém da loja vai conhecê-la.</p>
      )}
      <Mensagens e={estado} />
      <div className="form" style={{ gridTemplateColumns: "1fr" }}>
        <div className="f">
          <label htmlFor="atual">Senha atual{obrigatoria ? " (a provisória)" : ""}</label>
          <input id="atual" name="atual" type="password" required autoComplete="current-password" />
        </div>
        <div className="f">
          <label htmlFor="nova">Nova senha</label>
          <input id="nova" name="nova" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
          <small>Mínimo 10 caracteres, com letras e números.</small>
        </div>
        <div className="f">
          <label htmlFor="confirmacao">Repita a nova senha</label>
          <input id="confirmacao" name="confirmacao" type="password" required minLength={10} maxLength={72} autoComplete="new-password" />
        </div>
      </div>
      <div className="acoes">
        <button className="btn btn-pri" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar nova senha"}
        </button>
      </div>
    </form>
  );
}
