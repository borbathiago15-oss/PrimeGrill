import { IdiomaProvider, SeletorIdioma } from "@/components/idioma";
import { idiomaAtual } from "@/lib/idioma";
import { ROTULO_IDIOMA } from "@/modules/i18n/idiomas";
import { BarraCarrinho, CarrinhoProvider, type ResumoProduto } from "@/components/carrinho";
import { catalogoPublico } from "@/lib/dados";
import { AppInstalavel } from "@/components/app-instalavel";

export const dynamic = "force-dynamic";

export default async function LayoutVitrine({ children }: { children: React.ReactNode }) {
  const [grupos, idioma] = await Promise.all([catalogoPublico(), idiomaAtual()]);
  const resumo: ResumoProduto[] = grupos.flatMap((g) =>
    g.itens
      .filter((p) => p.disponivel && p.quantidadeDisponivel !== 0)
      .map((p) => ({
        id: p.id,
        tipoVenda: p.tipoVenda,
        precoCentavos: p.precoCentavos,
        pesoMedioGramas: p.pesoMedioGramas,
        limite: p.quantidadeDisponivel,
      })),
  );
  return (
    <IdiomaProvider idioma={idioma}>
    <CarrinhoProvider produtos={resumo}>
      <div className="vitrine" lang={ROTULO_IDIOMA[idioma].html}>
        <SeletorIdioma />
        {children}
        <AppInstalavel />
        <BarraCarrinho />
      </div>
    </CarrinhoProvider>
    </IdiomaProvider>
  );
}
