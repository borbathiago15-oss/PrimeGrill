import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao, usuarioAtual } from "@/lib/admin";
import { ROTULO_PAPEL } from "@/modules/usuarios/permissoes";
import { AcoesUsuario, FormNovoUsuario } from "./forms";

export const dynamic = "force-dynamic";
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Usuarios() {
  await exigirPermissao("usuarios");
  const eu = await usuarioAtual();
  const lista = await (await db()).select().from(schema.usuarios).orderBy(asc(schema.usuarios.nome));
  const principal = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return (
    <>
      <div className="topo">
        <h1>Usuários</h1>
        <span className="rotulo">quem entra no painel</span>
      </div>
      <div className="cont">
        <div className="cartao tabela-rolar">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Situação</th>
                <th>Último acesso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {principal && (
                <tr>
                  <td>
                    <b>Dono (acesso principal)</b>
                    <br />
                    <small style={{ color: "var(--texto-2)" }}>{principal}</small>
                  </td>
                  <td>Dono</td>
                  <td>
                    <span className="chip ok">Ativo</span>
                  </td>
                  <td>—</td>
                  <td>
                    <small style={{ color: "var(--texto-2)" }}>Senha definida na Vercel. Serve de acesso de recuperação.</small>
                  </td>
                </tr>
              )}
              {lista.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.nome}</b>
                    {eu?.id === u.id && " (você)"}
                    <br />
                    <small style={{ color: "var(--texto-2)" }}>{u.email}</small>
                  </td>
                  <td>
                    {ROTULO_PAPEL[u.papel].texto}
                    <br />
                    <small style={{ color: "var(--texto-2)" }}>{ROTULO_PAPEL[u.papel].descricao}</small>
                  </td>
                  <td>
                    {u.ativo ? <span className="chip ok">Ativo</span> : <span className="chip ne">Desativado</span>}
                    {u.ativo && u.deveTrocarSenha && (
                      <>
                        <br />
                        <small style={{ color: "var(--atencao)" }}>senha provisória</small>
                      </>
                    )}
                  </td>
                  <td className="num">{u.ultimoAcesso ? hora.format(u.ultimoAcesso) : "nunca"}</td>
                  <td>{eu?.id !== u.id && <AcoesUsuario id={u.id} nome={u.nome} papel={u.papel} ativo={u.ativo} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FormNovoUsuario />
        <div className="cartao" style={{ padding: "14px 18px", fontSize: 13.5, lineHeight: 1.6 }}>
          <b>O que cada papel faz</b>
          <br />
          {(["DONO", "GERENTE", "ATENDENTE"] as const).map((p) => (
            <span key={p}>
              <b>{ROTULO_PAPEL[p].texto}:</b> {ROTULO_PAPEL[p].descricao}.<br />
            </span>
          ))}
          <span style={{ color: "var(--texto-2)" }}>Tudo o que a equipe faz (pesagem, baixa de estoque, cobrança, notas) fica registrado com o e-mail de quem fez.</span>
        </div>
      </div>
    </>
  );
}
