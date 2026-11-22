import { BarraCarrinho, CarrinhoProvider, type ResumoProduto } from "@/components/carrinho";
import { catalogoPublico } from "@/lib/dados";
import { AppInstalavel } from "@/components/app-instalavel";

export const dynamic = "force-dynamic";

export default async function LayoutVitrine({ children }: { children: React.ReactNode }) {
  const grupos = await catalogoPublico();
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
    <CarrinhoProvider produtos={resumo}>
      <div className="vitrine">
        {children}
        <AppInstalavel />
        <BarraCarrinho />
      </div>
    </CarrinhoProvider>
  );
}
