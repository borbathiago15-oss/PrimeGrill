import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Menu } from "./menu";
import { exigirAdmin } from "@/lib/admin";
import { COOKIE } from "@/lib/sessao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel — Prime Grill", robots: { index: false } };

async function sair() {
  "use server";
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <div className="painel">
      <aside className="lateral">
        <div className="placa">
          <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 40 }} />
        </div>
        <Menu />
        <form action={sair} className="sair">
          <button className="btn btn-pq" style={{ background: "transparent", color: "#CFC6B8", borderColor: "#2E2925", width: "100%" }}>
            Sair
          </button>
        </form>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
