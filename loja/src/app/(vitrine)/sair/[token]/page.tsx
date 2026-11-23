import Link from "next/link";
import { BotaoSair } from "@/components/cadastro-ofertas";
import { inscritoPorToken } from "@/lib/promocoes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sair das promoções — Prime Grill Paiva", robots: { index: false } };

/** Descadastro das promoções pelo link das mensagens (LGPD: retirar o consentimento é tão fácil quanto dar). */
export default async function Sair({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const i = await inscritoPorToken(token);
  return (
    <div className="ck">
      <div className="placa" style={{ alignSelf: "flex-start" }}>
        <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 30 }} />
      </div>
      <h1>Promoções pelo WhatsApp</h1>
      {!i ? (
        <p className="aviso">Este link não é válido. Se quiser sair da lista, mande “SAIR” no nosso WhatsApp.</p>
      ) : i.revogadoEm ? (
        <p className="ok-box">Você já saiu da lista de promoções. Não vai receber mais mensagens de ofertas.</p>
      ) : (
        <>
          <p className="aviso">Ao confirmar, você deixa de receber promoções e o folder da semana. Pedidos e avisos do seu pedido continuam funcionando normalmente.</p>
          <BotaoSair token={token} />
        </>
      )}
      <Link href="/" className="btn-linha">
        Ir para o cardápio
      </Link>
    </div>
  );
}
