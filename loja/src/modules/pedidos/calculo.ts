import { valorPorPeso } from "../dinheiro";
import type { TipoVenda } from "@/db/schema";

export type ProdutoParaCalculo = {
  id: number;
  nome: string;
  tipoVenda: TipoVenda;
  precoCentavos: number;
  pesoMedioGramas: number | null;
  ativo: boolean;
  disponivel: boolean;
  quantidadeDisponivel: number | null;
};

export type ItemCalculado = {
  produtoId: number;
  nome: string;
  tipoVenda: TipoVenda;
  precoCentavos: number;
  quantidade: number;
  pesoMedioGramas: number | null;
  /** PACOTE: valor exato. PECA: estimado pelo peso médio; nulo se não houver peso médio. */
  valorCentavos: number | null;
};

export type ZonaParaCalculo = { taxaCentavos: number; pedidoMinimoCentavos: number };

export type ResultadoCalculo =
  | {
      ok: true;
      itens: ItemCalculado[];
      subtotalCentavos: number;
      freteCentavos: number;
      totalCentavos: number;
      temItemPesado: boolean;
      /** Há peça sem peso médio: o subtotal não inclui o valor dela. */
      subtotalIncompleto: boolean;
    }
  | { ok: false; erro: string };

export const QTD_MAXIMA_ITEM = 20;

/** Calcula o pedido no servidor a partir dos produtos do banco (nunca de preços enviados pelo navegador). */
export function calcularPedido(
  pedido: { produtoId: number; quantidade: number }[],
  produtos: Map<number, ProdutoParaCalculo>,
  modo: "ENTREGA" | "RETIRADA",
  zona: ZonaParaCalculo | null,
): ResultadoCalculo {
  if (pedido.length === 0) return { ok: false, erro: "Seu carrinho está vazio." };
  const itens: ItemCalculado[] = [];
  let subtotal = 0;
  let incompleto = false;
  for (const { produtoId, quantidade } of pedido) {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QTD_MAXIMA_ITEM)
      return { ok: false, erro: "Quantidade inválida." };
    const p = produtos.get(produtoId);
    if (!p || !p.ativo || !p.disponivel) return { ok: false, erro: `${p?.nome ?? "Um produto"} não está mais disponível.` };
    if (p.quantidadeDisponivel !== null && quantidade > p.quantidadeDisponivel)
      return { ok: false, erro: `${p.nome}: restam apenas ${p.quantidadeDisponivel}.` };
    let valor: number | null;
    if (p.tipoVenda === "PACOTE") valor = p.precoCentavos * quantidade;
    else valor = p.pesoMedioGramas ? valorPorPeso(p.pesoMedioGramas, p.precoCentavos) * quantidade : null;
    if (valor === null) incompleto = true;
    else subtotal += valor;
    itens.push({
      produtoId: p.id,
      nome: p.nome,
      tipoVenda: p.tipoVenda,
      precoCentavos: p.precoCentavos,
      quantidade,
      pesoMedioGramas: p.tipoVenda === "PECA" ? p.pesoMedioGramas : null,
      valorCentavos: valor,
    });
  }
  let frete = 0;
  if (modo === "ENTREGA") {
    if (!zona) return { ok: false, erro: "Informe um CEP atendido para entrega." };
    if (subtotal < zona.pedidoMinimoCentavos) return { ok: false, erro: "O pedido não atinge o valor mínimo para entrega neste endereço." };
    frete = zona.taxaCentavos;
  }
  return {
    ok: true,
    itens,
    subtotalCentavos: subtotal,
    freteCentavos: frete,
    totalCentavos: subtotal + frete,
    temItemPesado: itens.some((i) => i.tipoVenda === "PECA"),
    subtotalIncompleto: incompleto,
  };
}

/** Valor aproximado de uma peça (somente vitrine). */
export function valorAproximadoPeca(precoCentavosKg: number, pesoMedioGramas: number | null): number | null {
  return pesoMedioGramas ? valorPorPeso(pesoMedioGramas, precoCentavosKg) : null;
}
