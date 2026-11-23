import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Menu } from "./menu";
import { exigirUsuario } from "@/lib/admin";
import { ROTULO_PAPEL } from "@/modules/usuarios/permissoes";
import { FormTrocarSenha } from "./usuarios/forms";
import { AtivarAvisos } from "@/components/ativar-avisos";
import { COOKIE } from "@/lib/sessao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel — Prime Grill", robots: { index: false } };

async function sair() {
  "use server";
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const eu = await exigirUsuario();
  return (
    <div className="painel">
      <aside className="lateral">
        <div className="placa">
          <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 40 }} />
        </div>
        <Menu papel={eu.papel} />
        <AtivarAvisos publico="LOJA" tema="escuro" />
        <a href="/admin/conta" className="quem">
          <b>{eu.nome}</b>
          <small>{ROTULO_PAPEL[eu.papel].texto} · minha conta</small>
        </a>
        <form action={sair} className="sair">
          <button className="btn btn-pq" style={{ background: "transparent", color: "#CFC6B8", borderColor: "#2E2925", width: "100%" }}>
            Sair
          </button>
        </form>
      </aside>
      <div className="main">
        {eu.deveTrocarSenha ? (
          <div className="cont">
            <FormTrocarSenha obrigatoria />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
