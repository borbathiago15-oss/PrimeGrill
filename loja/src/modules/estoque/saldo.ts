/**
 * EST-001: saldo por produto, derivado de movimentações.
 * PECA: gramas + nº de peças. PACOTE: unidades. Valor do saldo em centavos (base do custo médio).
 */
import { dividirMeioPar } from "../dinheiro";
import type { TipoVenda } from "@/db/schema";

export type Saldo = { gramas: number; pecas: number; unidades: number; valorCentavos: number };
export const SALDO_ZERO: Saldo = { gramas: 0, pecas: 0, unidades: 0, valorCentavos: 0 };

export type Quantidade = { gramas?: number; pecas?: number; unidades?: number };

function inteiro(v: number | undefined, nome: string): number {
  const n = v ?? 0;
  if (!Number.isInteger(n) || n < 0) throw new Error(`${nome} deve ser inteiro não negativo`);
  return n;
}

/** Entrada: soma quantidade e valor; o custo médio ponderado sai naturalmente de valor ÷ quantidade. */
export function aplicarEntrada(s: Saldo, q: Quantidade, valorCentavos: number): Saldo {
  inteiro(valorCentavos, "valorCentavos");
  return {
    gramas: s.gramas + inteiro(q.gramas, "gramas"),
    pecas: s.pecas + inteiro(q.pecas, "pecas"),
    unidades: s.unidades + inteiro(q.unidades, "unidades"),
    valorCentavos: s.valorCentavos + valorCentavos,
  };
}

/** Valor a baixar pelo custo médio vigente, proporcional à quantidade que sai. */
export function valorDaSaida(s: Saldo, tipo: TipoVenda, q: Quantidade): number {
  if (tipo === "PECA") {
    const g = inteiro(q.gramas, "gramas");
    if (s.gramas <= 0) return 0;
    if (g >= s.gramas) return s.valorCentavos;
    return Number(dividirMeioPar(BigInt(s.valorCentavos) * BigInt(g), BigInt(s.gramas)));
  }
  const u = inteiro(q.unidades, "unidades");
  if (s.unidades <= 0) return 0;
  if (u >= s.unidades) return s.valorCentavos;
  return Number(dividirMeioPar(BigInt(s.valorCentavos) * BigInt(u), BigInt(s.unidades)));
}

/** Saída: nunca deixa saldo negativo (diferenças são tratadas antes, como ajuste registrado). */
export function aplicarSaida(s: Saldo, tipo: TipoVenda, q: Quantidade): { saldo: Saldo; valorCentavos: number } {
  const valor = valorDaSaida(s, tipo, q);
  const g = inteiro(q.gramas, "gramas");
  const p = inteiro(q.pecas, "pecas");
  const u = inteiro(q.unidades, "unidades");
  if (g > s.gramas || p > s.pecas || u > s.unidades) throw new Error("Saída maior que o saldo");
  return { saldo: { gramas: s.gramas - g, pecas: s.pecas - p, unidades: s.unidades - u, valorCentavos: s.valorCentavos - valor }, valorCentavos: valor };
}

/** Custo médio em centavos: por kg (PECA) ou por unidade (PACOTE). Null sem saldo. */
export function custoMedio(s: Saldo, tipo: TipoVenda): number | null {
  if (tipo === "PECA") return s.gramas > 0 ? Number(dividirMeioPar(BigInt(s.valorCentavos) * 1000n, BigInt(s.gramas))) : null;
  return s.unidades > 0 ? Number(dividirMeioPar(BigInt(s.valorCentavos), BigInt(s.unidades))) : null;
}

/** EST-001-R1: peça inteira com 0 peças e gramas sobrando precisa fechar o saldo como quebra. */
export function pendenteDeFechamento(s: Saldo, tipo: TipoVenda): boolean {
  return tipo === "PECA" && s.pecas === 0 && s.gramas > 0;
}

/** Quantidade disponível para venda (peças ou unidades) = saldo − reservado. */
export function disponivel(s: Saldo, tipo: TipoVenda, reservado: number): number {
  const base = tipo === "PECA" ? s.pecas : s.unidades;
  return Math.max(0, base - reservado);
}

/** Peso médio da peça em gramas, a partir do saldo (vitrine). */
export function pesoMedio(s: Saldo): number | null {
  return s.pecas > 0 && s.gramas > 0 ? Math.round(s.gramas / s.pecas) : null;
}

/** Valor proporcional aceito de um item da nota (divergência reduz o valor). */
export function valorAceito(valorItemCentavos: number, esperadoMil: number, aceitoMil: number): number {
  if (esperadoMil <= 0) return 0;
  if (aceitoMil >= esperadoMil) return valorItemCentavos;
  return Number(dividirMeioPar(BigInt(valorItemCentavos) * BigInt(aceitoMil), BigInt(esperadoMil)));
}
