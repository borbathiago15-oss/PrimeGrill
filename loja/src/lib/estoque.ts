import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Db } from "@/db/criar";
import type { TipoMovimento, TipoVenda } from "@/db/schema";
import { aplicarEntrada, aplicarSaida, disponivel, pesoMedio, SALDO_ZERO, type Quantidade, type Saldo } from "@/modules/estoque/saldo";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const { estoqueSaldos, movimentacoes, produtos, pedidos, pedidoItens } = schema;

/** Lê e trava o saldo do produto até o fim da transação (evita duas baixas simultâneas). */
export async function travarSaldo(tx: Tx, produtoId: number): Promise<Saldo> {
  await tx.insert(estoqueSaldos).values({ produtoId }).onConflictDoNothing();
  const [s] = await tx.select().from(estoqueSaldos).where(eq(estoqueSaldos.produtoId, produtoId)).for("update");
  return s ? { gramas: s.gramas, pecas: s.pecas, unidades: s.unidades, valorCentavos: s.valorCentavos } : { ...SALDO_ZERO };
}

type Mov = {
  produtoId: number;
  tipoVenda: TipoVenda;
  tipo: TipoMovimento;
  sentido: "entrada" | "saida";
  quantidade: Quantidade;
  /** Obrigatório na entrada (valor de compra). Na saída é calculado pelo custo médio. */
  valorCentavos?: number;
  origem: "NOTA" | "PEDIDO" | "AJUSTE";
  origemId?: number | null;
  motivo?: string;
  manual?: boolean;
  autor: string;
};

/** Única forma de mudar saldo: grava a movimentação e atualiza a projeção na mesma transação (EST-001). */
export async function registrarMovimento(tx: Tx, m: Mov): Promise<{ saldo: Saldo; valorCentavos: number }> {
  const atual = await travarSaldo(tx, m.produtoId);
  let novo: Saldo;
  let valor: number;
  if (m.sentido === "entrada") {
    valor = m.valorCentavos ?? 0;
    novo = aplicarEntrada(atual, m.quantidade, valor);
  } else {
    const r = aplicarSaida(atual, m.tipoVenda, m.quantidade);
    novo = r.saldo;
    valor = r.valorCentavos;
  }
  const sinal = m.sentido === "entrada" ? 1 : -1;
  await tx.insert(movimentacoes).values({
    produtoId: m.produtoId,
    tipo: m.tipo,
    gramas: sinal * (m.quantidade.gramas ?? 0),
    pecas: sinal * (m.quantidade.pecas ?? 0),
    unidades: sinal * (m.quantidade.unidades ?? 0),
    valorCentavos: sinal * valor,
    origem: m.origem,
    origemId: m.origemId ?? null,
    motivo: m.motivo ?? "",
    manual: m.manual ?? false,
    autor: m.autor,
  });
  await tx
    .update(estoqueSaldos)
    .set({ ...novo, atualizadoEm: new Date() })
    .where(eq(estoqueSaldos.produtoId, m.produtoId));
  if (m.sentido === "entrada") await tx.update(produtos).set({ controlaEstoque: true }).where(eq(produtos.id, m.produtoId));
  return { saldo: novo, valorCentavos: valor };
}

/** Status em que o pedido segura peças/pacotes antes da baixa. */
export const STATUS_QUE_RESERVAM = ["NOVO", "EM_SEPARACAO"] as const;

/** Reservado por produto: itens de pedidos abertos que ainda não deram baixa. */
export async function reservasPorProduto(banco: Db | Tx, produtoIds?: number[]): Promise<Map<number, number>> {
  const cond = [inArray(pedidos.status, [...STATUS_QUE_RESERVAM]), eq(pedidos.baixaEstoque, false)];
  if (produtoIds?.length) cond.push(inArray(pedidoItens.produtoId, produtoIds));
  const linhas = await banco
    .select({ produtoId: pedidoItens.produtoId, qtd: sql<number>`sum(${pedidoItens.quantidade})::int` })
    .from(pedidoItens)
    .innerJoin(pedidos, eq(pedidoItens.pedidoId, pedidos.id))
    .where(and(...cond))
    .groupBy(pedidoItens.produtoId);
  return new Map(linhas.map((l) => [l.produtoId, Number(l.qtd)]));
}

export async function saldosPorProduto(banco: Db | Tx, produtoIds?: number[]): Promise<Map<number, Saldo>> {
  const linhas = await banco
    .select()
    .from(estoqueSaldos)
    .where(produtoIds?.length ? inArray(estoqueSaldos.produtoId, produtoIds) : undefined);
  return new Map(linhas.map((s) => [s.produtoId, { gramas: s.gramas, pecas: s.pecas, unidades: s.unidades, valorCentavos: s.valorCentavos }]));
}

export async function bancoAtual() {
  return db();
}

type ProdutoBase = { id: number; tipoVenda: TipoVenda; controlaEstoque: boolean; quantidadeDisponivel: number | null; pesoMedioGramas: number | null; disponivel: boolean };

/**
 * Produto com estoque controlado: disponível = saldo − reservado (peças ou unidades) e, sem peso médio
 * cadastrado, usa o peso médio do saldo. Produto ainda sem nota de entrada continua com o controle manual.
 */
export async function comEstoqueReal<T extends ProdutoBase>(banco: Db | Tx, lista: T[]): Promise<T[]> {
  const ids = lista.filter((p) => p.controlaEstoque).map((p) => p.id);
  if (ids.length === 0) return lista;
  const [saldos, reservas] = await Promise.all([saldosPorProduto(banco, ids), reservasPorProduto(banco, ids)]);
  return lista.map((p) => {
    if (!p.controlaEstoque) return p;
    const s = saldos.get(p.id) ?? SALDO_ZERO;
    const qtd = disponivel(s, p.tipoVenda, reservas.get(p.id) ?? 0);
    return {
      ...p,
      quantidadeDisponivel: qtd,
      pesoMedioGramas: p.tipoVenda === "PECA" ? (p.pesoMedioGramas ?? pesoMedio(s)) : null,
      disponivel: p.disponivel && qtd > 0,
    };
  });
}
