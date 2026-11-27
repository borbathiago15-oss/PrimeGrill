"use server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import type { ConfigLoja } from "@/db/schema";
import { exigirPermissao } from "@/lib/admin";
import { configLoja } from "@/lib/dados";
import { caixaAberto } from "@/lib/financeiro";
import { reaisParaCentavos } from "@/modules/dinheiro";
import { CATEGORIAS_DESPESA, diaRecife, diaValido, esperadoNoCaixa, FORMAS_FIN, percentualParaBps, type FormaFin } from "@/modules/financeiro/financeiro";

export type EstadoFin = { erro?: string; ok?: string };

const { lancamentos, caixas, caixaMovimentos, notasEntrada, fornecedores, configuracoes } = schema;

function atualizar() {
  revalidatePath("/admin/financeiro", "layout");
}

function forma(v: FormDataEntryValue | null): FormaFin | null {
  const s = String(v ?? "");
  return (FORMAS_FIN as readonly string[]).includes(s) ? (s as FormaFin) : null;
}

/* ---------------- Recebimentos e conciliação ---------------- */

/** Marca recebimentos de Pix/cartão como conferidos no extrato. */
export async function conciliar(form: FormData) {
  const autor = await exigirPermissao("financeiro");
  const ids = form.getAll("id").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 500);
  if (!ids.length) return;
  await (await db())
    .update(lancamentos)
    .set({ conciliadoEm: new Date(), conciliadoPor: autor })
    .where(and(inArray(lancamentos.id, ids), eq(lancamentos.tipo, "RECEITA"), eq(lancamentos.status, "QUITADO"), isNull(lancamentos.conciliadoEm)));
  atualizar();
}

export async function desfazerConciliacao(form: FormData) {
  await exigirPermissao("financeiro");
  await (await db()).update(lancamentos).set({ conciliadoEm: null, conciliadoPor: null }).where(eq(lancamentos.id, Number(form.get("id"))));
  atualizar();
}

/** Valor que caiu diferente (taxa real da maquininha): ajusta a taxa e já concilia. */
export async function ajustarTaxa(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  const autor = await exigirPermissao("financeiro");
  const id = Number(form.get("id"));
  const liquido = reaisParaCentavos(String(form.get("liquido") ?? ""));
  const banco = await db();
  const [l] = await banco.select().from(lancamentos).where(eq(lancamentos.id, id));
  if (!l || l.tipo !== "RECEITA") return { erro: "Recebimento não encontrado." };
  if (liquido === null || liquido < 0 || liquido > l.valorCentavos) return { erro: "Informe o valor que caiu na conta (até o valor bruto)." };
  await banco.update(lancamentos).set({ taxaCentavos: l.valorCentavos - liquido, conciliadoEm: new Date(), conciliadoPor: autor }).where(eq(lancamentos.id, id));
  atualizar();
  return { ok: "Taxa ajustada e conciliado." };
}

/** Taxas da maquininha/banco e prazos de recebimento. */
export async function salvarTaxas(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  await exigirPermissao("financeiro");
  const atual = await configLoja();
  const bps = (k: string) => percentualParaBps(String(form.get(k) ?? ""));
  const dias = (k: string) => {
    const n = Number(String(form.get(k) ?? "").trim() || "0");
    return Number.isInteger(n) && n >= 0 && n <= 120 ? n : null;
  };
  const f = {
    taxaPixBps: bps("taxaPix"),
    taxaDebitoBps: bps("taxaDebito"),
    taxaCreditoBps: bps("taxaCredito"),
    taxaLinkBps: bps("taxaLink"),
    prazoDebitoDias: dias("prazoDebito"),
    prazoCreditoDias: dias("prazoCredito"),
    prazoLinkDias: dias("prazoLink"),
  };
  if (Object.values(f).some((v) => v === null)) return { erro: "Taxas entre 0 e 99,99% (ex.: 2,99) e prazos entre 0 e 120 dias." };
  const dados: ConfigLoja = { ...atual, financeiro: f as ConfigLoja["financeiro"] & object };
  await (await db()).insert(configuracoes).values({ id: 1, dados }).onConflictDoUpdate({ target: configuracoes.id, set: { dados, atualizadoEm: new Date() } });
  atualizar();
  return { ok: "Taxas salvas. Valem para os próximos recebimentos." };
}

/* ---------------- Contas a pagar ---------------- */

export async function novaDespesa(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  const autor = await exigirPermissao("financeiro");
  const descricao = String(form.get("descricao") ?? "").trim().slice(0, 120);
  const categoria = String(form.get("categoria") ?? "");
  const valor = reaisParaCentavos(String(form.get("valor") ?? ""));
  const vencimento = String(form.get("vencimento") ?? "");
  const fornecedorId = Number(form.get("fornecedorId")) || null;
  const jaPaga = form.get("jaPaga") === "on";
  const f = forma(form.get("forma"));
  if (descricao.length < 3) return { erro: "Descreva a conta (ex.: Energia de novembro)." };
  if (!(categoria in CATEGORIAS_DESPESA)) return { erro: "Escolha a categoria." };
  if (valor === null || valor <= 0) return { erro: "Valor inválido. Use o formato 1.250,00." };
  if (!diaValido(vencimento)) return { erro: "Informe o vencimento." };
  if (jaPaga && !f) return { erro: "Informe como foi paga." };
  const banco = await db();
  const caixa = jaPaga && f === "DINHEIRO" ? await caixaAberto(banco) : null;
  if (jaPaga && f === "DINHEIRO" && !caixa) return { erro: "Para pagar em dinheiro da gaveta, abra o caixa antes." };
  await banco.insert(lancamentos).values({
    tipo: "DESPESA",
    categoria,
    descricao,
    valorCentavos: valor,
    forma: f,
    status: jaPaga ? "QUITADO" : "ABERTO",
    vencimento,
    quitadoEm: jaPaga ? diaRecife() : null,
    fornecedorId,
    caixaId: caixa?.id ?? null,
    autor,
  });
  atualizar();
  return { ok: jaPaga ? "Despesa lançada como paga." : "Conta a pagar lançada." };
}

export async function pagarDespesa(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  const autor = await exigirPermissao("financeiro");
  const id = Number(form.get("id"));
  const dia = String(form.get("dia") ?? "");
  const f = forma(form.get("forma"));
  if (!diaValido(dia) || dia > diaRecife()) return { erro: "Data de pagamento inválida." };
  if (!f) return { erro: "Informe como foi paga." };
  const banco = await db();
  const caixa = f === "DINHEIRO" ? await caixaAberto(banco) : null;
  if (f === "DINHEIRO" && !caixa) return { erro: "Para pagar em dinheiro da gaveta, abra o caixa antes." };
  const r = await banco
    .update(lancamentos)
    .set({ status: "QUITADO", quitadoEm: dia, forma: f, caixaId: caixa?.id ?? null, observacao: `Paga por ${autor}` })
    .where(and(eq(lancamentos.id, id), eq(lancamentos.tipo, "DESPESA"), eq(lancamentos.status, "ABERTO")))
    .returning({ id: lancamentos.id });
  if (!r[0]) return { erro: "Esta conta já foi paga ou cancelada." };
  atualizar();
  return { ok: "Pago." };
}

export async function cancelarDespesa(form: FormData) {
  const autor = await exigirPermissao("financeiro");
  await (await db())
    .update(lancamentos)
    .set({ status: "CANCELADO", observacao: `Cancelada por ${autor}` })
    .where(and(eq(lancamentos.id, Number(form.get("id"))), eq(lancamentos.tipo, "DESPESA"), eq(lancamentos.status, "ABERTO")));
  atualizar();
}

/** Nota de entrada recebida vira conta a pagar ao fornecedor. */
export async function contaDaNota(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  const autor = await exigirPermissao("financeiro");
  const notaId = Number(form.get("notaId"));
  const vencimento = String(form.get("vencimento") ?? "");
  if (!diaValido(vencimento)) return { erro: "Informe o vencimento do boleto/fatura." };
  const banco = await db();
  const [n] = await banco
    .select({ id: notasEntrada.id, numero: notasEntrada.numero, valor: notasEntrada.valorTotalCentavos, fornecedorId: notasEntrada.fornecedorId, fornecedor: fornecedores.nome, status: notasEntrada.status })
    .from(notasEntrada)
    .innerJoin(fornecedores, eq(fornecedores.id, notasEntrada.fornecedorId))
    .where(eq(notasEntrada.id, notaId));
  if (!n || (n.status !== "RECEBIDA" && n.status !== "RECEBIDA_DIVERGENCIA")) return { erro: "Nota não encontrada ou ainda não recebida." };
  const [ja] = await banco.select({ id: lancamentos.id }).from(lancamentos).where(eq(lancamentos.notaId, notaId));
  if (ja) return { erro: "Esta nota já tem conta a pagar." };
  await banco.insert(lancamentos).values({
    tipo: "DESPESA",
    categoria: "FORNECEDOR",
    descricao: `NF ${n.numero} · ${n.fornecedor}`,
    valorCentavos: n.valor,
    forma: "BOLETO",
    vencimento,
    notaId,
    fornecedorId: n.fornecedorId,
    autor,
  });
  atualizar();
  return { ok: "Conta a pagar criada." };
}

/* ---------------- Caixa ---------------- */

export async function abrirCaixa(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  const autor = await exigirPermissao("caixa");
  const troco = reaisParaCentavos(String(form.get("troco") ?? "") || "0");
  if (troco === null || troco < 0) return { erro: "Troco inválido." };
  const banco = await db();
  if (await caixaAberto(banco)) return { erro: "Já existe um caixa aberto." };
  await banco.insert(caixas).values({ abertoPor: autor, trocoCentavos: troco });
  atualizar();
  return { ok: "Caixa aberto." };
}

export async function movimentarCaixa(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  const autor = await exigirPermissao("caixa");
  const tipo = String(form.get("tipo"));
  const valor = reaisParaCentavos(String(form.get("valor") ?? ""));
  const motivo = String(form.get("motivo") ?? "").trim().slice(0, 120);
  if (tipo !== "SUPRIMENTO" && tipo !== "SANGRIA") return { erro: "Escolha reforço ou retirada." };
  if (valor === null || valor <= 0) return { erro: "Valor inválido." };
  if (motivo.length < 3) return { erro: "Diga o motivo (ex.: depósito no banco, troco)." };
  const banco = await db();
  const c = await caixaAberto(banco);
  if (!c) return { erro: "Abra o caixa antes." };
  await banco.insert(caixaMovimentos).values({ caixaId: c.id, tipo, valorCentavos: valor, motivo, autor });
  atualizar();
  return { ok: tipo === "SANGRIA" ? "Retirada registrada." : "Reforço registrado." };
}

export async function fecharCaixa(_: EstadoFin, form: FormData): Promise<EstadoFin> {
  const autor = await exigirPermissao("caixa");
  const contado = reaisParaCentavos(String(form.get("contado") ?? ""));
  const observacao = String(form.get("observacao") ?? "").trim().slice(0, 200);
  if (contado === null || contado < 0) return { erro: "Informe quanto tem na gaveta (contado)." };
  const banco = await db();
  const c = await caixaAberto(banco);
  if (!c) return { erro: "Não há caixa aberto." };
  const [movs, lancs] = await Promise.all([
    banco.select().from(caixaMovimentos).where(eq(caixaMovimentos.caixaId, c.id)),
    banco.select().from(lancamentos).where(and(eq(lancamentos.caixaId, c.id), eq(lancamentos.forma, "DINHEIRO"))),
  ]);
  const esperado = esperadoNoCaixa(c.trocoCentavos, movs, lancs);
  if (contado !== esperado && observacao.length < 3) return { erro: "Há diferença entre o contado e o esperado: explique na observação." };
  await banco.update(caixas).set({ fechadoEm: new Date(), fechadoPor: autor, esperadoCentavos: esperado, contadoCentavos: contado, observacao }).where(and(eq(caixas.id, c.id), isNull(caixas.fechadoEm)));
  atualizar();
  return { ok: "Caixa fechado." };
}

