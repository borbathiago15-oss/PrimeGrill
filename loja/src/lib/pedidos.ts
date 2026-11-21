import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ItemCalculado } from "@/modules/pedidos/calculo";
import type { PedidoParaMensagem } from "@/modules/pedidos/whatsapp";

const { pedidos, pedidoItens, pedidoEventos } = schema;

export async function pedidoCompleto(filtro: { codigo: string } | { id: number }) {
  const d = await db();
  const cond = "codigo" in filtro ? eq(pedidos.codigo, filtro.codigo) : eq(pedidos.id, filtro.id);
  const [p] = await d.select().from(pedidos).where(cond);
  if (!p) return null;
  const itens = await d.select().from(pedidoItens).where(eq(pedidoItens.pedidoId, p.id)).orderBy(asc(pedidoItens.id));
  const eventos = await d.select().from(pedidoEventos).where(eq(pedidoEventos.pedidoId, p.id)).orderBy(asc(pedidoEventos.criadoEm));
  return { pedido: p, itens, eventos };
}

export function paraMensagem(p: NonNullable<Awaited<ReturnType<typeof pedidoCompleto>>>): PedidoParaMensagem {
  const itens: ItemCalculado[] = p.itens.map((i) => ({
    produtoId: i.produtoId,
    nome: i.nome,
    tipoVenda: i.tipoVenda,
    precoCentavos: i.precoCentavos,
    quantidade: i.quantidade,
    pesoMedioGramas: i.pesoMedioGramas,
    valorCentavos: i.valorCentavos,
  }));
  return {
    codigo: p.pedido.codigo,
    modo: p.pedido.modo,
    clienteNome: p.pedido.clienteNome,
    clienteCelular: p.pedido.clienteCelular,
    endereco: p.pedido.endereco,
    numero: p.pedido.numero,
    complemento: p.pedido.complemento,
    bairro: p.pedido.bairro,
    cep: p.pedido.cep,
    itens,
    subtotalCentavos: p.pedido.subtotalEstimadoCentavos,
    freteCentavos: p.pedido.freteCentavos,
    totalCentavos: p.pedido.totalEstimadoCentavos,
    temItemPesado: p.pedido.temItemPesado,
    subtotalIncompleto: itens.some((i) => i.valorCentavos === null),
    observacao: p.pedido.observacao,
  };
}

export const ROTULO_STATUS: Record<string, { texto: string; cls: string }> = {
  NOVO: { texto: "Novo", cls: "ouro" },
  EM_SEPARACAO: { texto: "Em separação", cls: "in" },
  AGUARDANDO_CLIENTE: { texto: "Aguardando cliente", cls: "at" },
  CONFIRMADO: { texto: "Confirmado", cls: "ok" },
  CONCLUIDO: { texto: "Concluído", cls: "ne" },
  CANCELADO: { texto: "Cancelado", cls: "er" },
};
