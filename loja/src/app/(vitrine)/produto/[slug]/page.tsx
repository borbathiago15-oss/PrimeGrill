import { textosAtuais } from "@/lib/idioma";
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
  const [p, { t }] = await Promise.all([produtoPublico(slug), textosAtuais()]);
  if (!p) notFound();
  const disp = textoDisponivel(p, t);
  const aprox = p.tipoVenda === "PECA" ? valorAproximadoPeca(p.precoCentavos, p.pesoMedioGramas) : null;

  return (
    <div className="prod-pg">
      <div className="prod-foto">
        <Link href="/" className="voltar" aria-label={t.produto.voltar}>
          ‹
        </Link>
        {p.fotoUrl && <img src={p.fotoUrl} alt={p.nome} />}
      </div>
      <div className="prod-c">
        <span className="tag">{(p.categoriaSlug && t.categorias[p.categoriaSlug]) || p.categoriaNome}</span>
        <h1>
          {p.nome}
          {p.pesoNominal ? ` ${p.pesoNominal}` : ""}
        </h1>
        {p.descricao && <p className="desc">{p.descricao}</p>}
        <div className="filete" />
        <div className="linha-preco">
          <span className="tag" style={{ color: "var(--osso-2)" }}>
            {p.tipoVenda === "PECA" ? t.produto.precoKg : t.produto.precoPacote}
          </span>
          <Preco p={p} grande t={t} />
        </div>
        <div className="caixa">
          {p.tipoVenda === "PECA" && (
            <>
              <div className="r">
                {t.produto.pesoMedio}
                <b className="num">{p.pesoMedioGramas ? `≈ ${formatarKg(p.pesoMedioGramas)}` : t.produto.informadoPesagem}</b>
              </div>
              {aprox !== null && (
                <div className="r">
                  {t.produto.valorAprox}
                  <b className="num">≈ {formatarReais(aprox)}</b>
                </div>
              )}
            </>
          )}
          <div className="r">
            {t.produto.disponibilidade}
            <b>{disp ?? t.produto.indisponivel}</b>
          </div>
        </div>
        {p.tipoVenda === "PECA" && (
          <p className="aviso">
            {t.produto.avisoPeca}
          </p>
        )}
      </div>
      <BotaoAdicionar id={p.id} nome={p.nome} disponivel={!!disp} aproxCentavos={p.tipoVenda === "PACOTE" ? p.precoCentavos : aprox} pesado={p.tipoVenda === "PECA"} />
    </div>
  );
}
