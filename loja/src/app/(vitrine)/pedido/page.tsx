import { Checkout } from "@/components/checkout";
import { catalogoPublico, configLoja, zonasAtivas } from "@/lib/dados";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu pedido — Prime Grill Paiva" };

export default async function PaginaPedido() {
  const [grupos, config, zonas] = await Promise.all([catalogoPublico(), configLoja(), zonasAtivas()]);
  const produtos = grupos.flatMap((g) => g.itens).map((p) => ({
    id: p.id,
    nome: p.nome + (p.pesoNominal ? ` ${p.pesoNominal}` : ""),
    fotoUrl: p.fotoUrl,
    tipoVenda: p.tipoVenda,
    precoCentavos: p.precoCentavos,
    pesoMedioGramas: p.pesoMedioGramas,
  }));
  return (
    <Checkout
      produtos={produtos}
      zonas={zonas.map((z) => ({ id: z.id, bairro: z.bairro, taxaCentavos: z.taxaCentavos, prazo: z.prazo, pedidoMinimoCentavos: z.pedidoMinimoCentavos }))}
      retiradaAtiva={config.retiradaAtiva}
      enderecoRetirada={config.enderecoRetirada}
    />
  );
}
