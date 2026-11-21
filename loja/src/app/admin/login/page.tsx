import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { credenciaisValidas, pendenciasAdmin } from "@/lib/admin";
import { COOKIE, criarToken, OPCOES_COOKIE } from "@/lib/sessao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel — Prime Grill", robots: { index: false } };

const tentativas = new Map<string, { n: number; ate: number }>();

async function entrar(form: FormData) {
  "use server";
  const email = String(form.get("email") ?? "");
  const senha = String(form.get("senha") ?? "");
  const chave = email.toLowerCase();
  const t = tentativas.get(chave);
  if (t && t.n >= 5 && Date.now() < t.ate) redirect("/admin/login?erro=bloqueado");
  if (!credenciaisValidas(email, senha)) {
    const atual = t && Date.now() < t.ate ? t.n + 1 : 1;
    tentativas.set(chave, { n: atual, ate: Date.now() + 15 * 60_000 });
    redirect("/admin/login?erro=1");
  }
  tentativas.delete(chave);
  const jar = await cookies();
  jar.set(COOKIE, await criarToken(email.trim().toLowerCase()), OPCOES_COOKIE);
  redirect("/admin");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const pendencias = pendenciasAdmin();
  const configurado = pendencias.length === 0;
  return (
    <div className="login">
      <form action={entrar}>
        <div className="placa">
          <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 40 }} />
        </div>
        <h1>Painel da loja</h1>
        {!configurado && (
          <p className="msg-erro">
            Acesso não configurado: {pendencias.join("; ")}. Ajuste em Vercel → Configurações → Variáveis de ambiente e publique de novo.
          </p>
        )}
        {erro === "1" && <p className="msg-erro">E-mail ou senha incorretos.</p>}
        {erro === "bloqueado" && <p className="msg-erro">Muitas tentativas. Aguarde 15 minutos.</p>}
        <div className="f">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="f">
          <label htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn btn-pri" type="submit" disabled={!configurado}>
          Entrar
        </button>
      </form>
    </div>
  );
}
