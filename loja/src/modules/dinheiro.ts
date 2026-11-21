/** ADR-004: dinheiro em centavos inteiros, peso em gramas inteiras. Sem ponto flutuante na regra. */

/** Arredondamento meio-par de numerador/denominador inteiros (ambos ≥ 0). */
export function dividirMeioPar(numerador: bigint, denominador: bigint): bigint {
  const q = numerador / denominador;
  const r = numerador % denominador;
  const dobro = r * 2n;
  if (dobro > denominador) return q + 1n;
  if (dobro < denominador) return q;
  return q % 2n === 0n ? q : q + 1n;
}

/** Valor em centavos de uma quantidade em gramas a um preço em centavos por kg. */
export function valorPorPeso(gramas: number, centavosPorKg: number): number {
  assertInteiroNaoNegativo(gramas, "gramas");
  assertInteiroNaoNegativo(centavosPorKg, "centavosPorKg");
  return Number(dividirMeioPar(BigInt(gramas) * BigInt(centavosPorKg), 1000n));
}

export function assertInteiroNaoNegativo(v: number, nome: string) {
  if (!Number.isInteger(v) || v < 0) throw new Error(`${nome} deve ser inteiro não negativo`);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(centavos: number): string {
  return brl.format(centavos / 100).replace(/ /g, " ");
}

/** "R$ 119,40" sem o símbolo repetido: útil para compor "R$ 119,40 KG". */
export function formatarValor(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatarKg(gramas: number): string {
  return `${(gramas / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
}

/** Converte "119,40", "119.40" ou "1.234,56" em centavos. Retorna null se inválido. */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/i, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(limpo)) return null;
  let normal = limpo;
  if (limpo.includes(",")) normal = limpo.replace(/\./g, "").replace(",", ".");
  const [inteiro, frac = ""] = normal.split(".");
  return Number(inteiro) * 100 + Number((frac + "00").slice(0, 2));
}

/** Converte "1,32" (kg) ou "1320" (g) do formulário em gramas. */
export function kgParaGramas(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(limpo)) return null;
  const [inteiro, frac = ""] = limpo.split(".");
  return Number(inteiro) * 1000 + Number((frac + "000").slice(0, 3));
}
