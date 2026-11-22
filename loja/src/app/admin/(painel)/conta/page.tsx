import { exigirUsuario } from "@/lib/admin";
import { ROTULO_PAPEL } from "@/modules/usuarios/permissoes";
import { FormTrocarSenha } from "../usuarios/forms";

export const dynamic = "force-dynamic";

export default async function MinhaConta() {
  const eu = await exigirUsuario();
  return (
    <>
      <div className="topo">
        <h1>Minha conta</h1>
      </div>
      <div className="cont">
        <div className="cartao" style={{ maxWidth: 520 }}>
          <dl className="kv">
            <dt>Nome</dt>
            <dd>{eu.nome}</dd>
            <dt>E-mail</dt>
            <dd>{eu.email}</dd>
            <dt>Papel</dt>
            <dd>
              {ROTULO_PAPEL[eu.papel].texto} — {ROTULO_PAPEL[eu.papel].descricao}
            </dd>
          </dl>
        </div>
        {eu.principal ? (
          <p className="aviso-painel">Este é o acesso principal: a senha fica nas variáveis da Vercel (ADMIN_PASSWORD). Para o dia a dia, cadastre seu próprio usuário em “Usuários”.</p>
        ) : (
          <FormTrocarSenha />
        )}
      </div>
    </>
  );
}
