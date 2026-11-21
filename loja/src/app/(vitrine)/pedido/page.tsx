import { Checkout } from "@/components/checkout";
import { catalogoPublico, configLoja } from "@/lib/dados";
import { entregaDisponivel, raioMaximoKm } from "@/modules/entrega/frete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu pedido — Prime Grill Paiva" };

export default async function PaginaPedido() {
  const [grupos, config] = await Promise.all([catalogoPublico(), configLoja()]);
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
      entregaAtiva={entregaDisponivel(config.entrega)}
      raioKm={raioMaximoKm(config.entrega.faixas)}
      retiradaAtiva={config.retiradaAtiva}
      enderecoRetirada={config.enderecoRetirada}
    />
  );
}
