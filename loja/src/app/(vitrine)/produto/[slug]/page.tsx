import Link from "next/link";
import { notFound } from "next/navigation";
import { Preco, textoDisponivel } from "@/components/preco";
import { BotaoAdicionar } from "@/components/botao-adicionar";
import { produtoPublico } from "@/lib/dados";
import { formatarKg, formatarReais } from "@/modules/dinheiro";
import { valorAproximadoPeca } from "@/modules/pedidos/calculo";

export const dynamic = "force-dynamic";

export default async function Produto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await produtoPublico(slug);
  if (!p) notFound();
  const disp = textoDisponivel(p);
  const aprox = p.tipoVenda === "PECA" ? valorAproximadoPeca(p.precoCentavos, p.pesoMedioGramas) : null;

  return (
    <div className="prod-pg">
      <div className="prod-foto">
        <Link href="/" className="voltar" aria-label="Voltar ao cardápio">
          ‹
        </Link>
        {p.fotoUrl && <img src={p.fotoUrl} alt={p.nome} />}
      </div>
      <div className="prod-c">
        <span className="tag">{p.categoriaNome}</span>
        <h1>
          {p.nome}
          {p.pesoNominal ? ` ${p.pesoNominal}` : ""}
        </h1>
        {p.descricao && <p className="desc">{p.descricao}</p>}
        <div className="filete" />
        <div className="linha-preco">
          <span className="tag" style={{ color: "var(--osso-2)" }}>
            {p.tipoVenda === "PECA" ? "Preço por kg" : "Preço do pacote"}
          </span>
          <Preco p={p} grande />
        </div>
        <div className="caixa">
          {p.tipoVenda === "PECA" && (
            <>
              <div className="r">
                Peso médio da peça<b className="num">{p.pesoMedioGramas ? `≈ ${formatarKg(p.pesoMedioGramas)}` : "informado na pesagem"}</b>
              </div>
              {aprox !== null && (
                <div className="r">
                  Valor aproximado<b className="num">≈ {formatarReais(aprox)}</b>
                </div>
              )}
            </>
          )}
          <div className="r">
            Disponibilidade<b>{disp ?? "Indisponível no momento"}</b>
          </div>
        </div>
        {p.tipoVenda === "PECA" && (
          <p className="aviso">
            Cada peça é pesada na separação. Você recebe o peso e o valor exatos pelo WhatsApp e só paga depois de confirmar.
          </p>
        )}
      </div>
      <BotaoAdicionar id={p.id} nome={p.nome} disponivel={!!disp} aproxCentavos={p.tipoVenda === "PACOTE" ? p.precoCentavos : aprox} pesado={p.tipoVenda === "PECA"} />
    </div>
  );
}
