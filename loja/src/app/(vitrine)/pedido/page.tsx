import { Checkout } from "@/components/checkout";
import { AdicionarAoPedido } from "@/components/adicionar-ao-pedido";
import { aceitaAdicionar } from "@/lib/adicionar-itens";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { catalogoPublico, configLoja } from "@/lib/dados";
import { entregaDisponivel, raioMaximoKm } from "@/modules/entrega/frete";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu pedido — Prime Grill Paiva" };

export default async function PaginaPedido({ searchParams }: { searchParams: Promise<{ adicionar?: string }> }) {
  const { adicionar } = await searchParams;
  const [grupos, config] = await Promise.all([catalogoPublico(), configLoja()]);
  const produtos = grupos.flatMap((g) => g.itens).map((p) => ({
    id: p.id,
    nome: p.nome + (p.pesoNominal ? ` ${p.pesoNominal}` : ""),
    fotoUrl: p.fotoUrl,
    tipoVenda: p.tipoVenda,
    precoCentavos: p.precoCentavos,
    pesoMedioGramas: p.pesoMedioGramas,
  }));
  // Modo "acrescentar ao pedido": só vale para pedido ainda aberto e não pago.
  if (adicionar && /^PG-[A-Z0-9]{6}$/.test(adicionar)) {
    const [ped] = await (await db())
      .select({ status: schema.pedidos.status, pagamentoStatus: schema.pedidos.pagamentoStatus })
      .from(schema.pedidos)
      .where(eq(schema.pedidos.codigo, adicionar));
    if (ped && aceitaAdicionar(ped)) return <AdicionarAoPedido codigo={adicionar} produtos={produtos} />;
  }
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
