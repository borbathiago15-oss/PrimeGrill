import { textosAtuais } from "@/lib/idioma";
import Link from "next/link";
import { BotaoSair } from "@/components/cadastro-ofertas";
import { inscritoPorToken } from "@/lib/promocoes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sair das promoções — Prime Grill Paiva", robots: { index: false } };

/** Descadastro das promoções pelo link das mensagens (LGPD: retirar o consentimento é tão fácil quanto dar). */
export default async function Sair({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [i, { t }] = await Promise.all([inscritoPorToken(token), textosAtuais()]);
  const o = t.ofertas;
  return (
    <div className="ck">
      <div className="placa" style={{ alignSelf: "flex-start" }}>
        <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 30 }} />
      </div>
      <h1>{o.sairTitulo}</h1>
      {!i ? (
        <p className="aviso">{o.sairInvalido}</p>
      ) : i.revogadoEm ? (
        <p className="ok-box">{o.sairJa}</p>
      ) : (
        <>
          <p className="aviso">{o.sairAviso}</p>
          <BotaoSair token={token} />
        </>
      )}
      <Link href="/" className="btn-linha">
        {o.irCardapio}
      </Link>
    </div>
  );
}
