/**
 * Regras do financeiro (FIN-001), sem banco: taxas, previsão de recebimento, caixa e resumo.
 * Valores sempre em centavos inteiros (ADR-004); datas como "AAAA-MM-DD" no fuso de Recife.
 */

export const FORMAS_FIN = ["DINHEIRO", "PIX", "CARTAO_DEBITO", "CARTAO_CREDITO", "CARTAO_LINK", "BOLETO", "TRANSFERENCIA", "NAO_INFORMADO"] as const;
export type FormaFin = (typeof FORMAS_FIN)[number];

export const ROTULO_FORMA_FIN: Record<FormaFin, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_DEBITO: "Cartão de débito",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_LINK: "Cartão (link)",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  NAO_INFORMADO: "Não informado",
};

/** Como o cliente pode pagar na entrega/retirada (o atendente marca ao concluir). */
export const FORMAS_NA_ENTREGA = ["DINHEIRO", "PIX", "CARTAO_DEBITO", "CARTAO_CREDITO"] as const satisfies readonly FormaFin[];

export const CATEGORIAS_DESPESA = {
  FORNECEDOR: "Fornecedor (mercadoria)",
  EMBALAGEM: "Embalagens e insumos",
  ENTREGA: "Entregas / motoboy",
  FOLHA: "Salários e pró-labore",
  ALUGUEL: "Aluguel e condomínio",
  ENERGIA: "Energia",
  AGUA: "Água",
  INTERNET: "Internet e telefone",
  IMPOSTOS: "Impostos",
  TAXAS: "Tarifas bancárias e taxas",
  MARKETING: "Marketing",
  MANUTENCAO: "Manutenção e equipamentos",
  OUTROS: "Outros",
} as const;
export type CategoriaDespesa = keyof typeof CATEGORIAS_DESPESA;

export const CATEGORIAS_RECEITA = { VENDA: "Venda (pedido)", OUTRAS: "Outras receitas" } as const;

/** Taxas da maquininha/banco em centésimos de ponto percentual (1,99% = 199) e prazo para o dinheiro cair. */
export type ConfigFinanceiro = {
  taxaPixBps: number;
  taxaDebitoBps: number;
  taxaCreditoBps: number;
  taxaLinkBps: number;
  prazoDebitoDias: number;
  prazoCreditoDias: number;
  prazoLinkDias: number;
};

export const FINANCEIRO_PADRAO: ConfigFinanceiro = {
  taxaPixBps: 0,
  taxaDebitoBps: 0,
  taxaCreditoBps: 0,
  taxaLinkBps: 0,
  prazoDebitoDias: 1,
  prazoCreditoDias: 30,
  prazoLinkDias: 30,
};

/** Taxa cobrada pela maquininha/banco sobre um recebimento. */
export function taxaDaForma(c: ConfigFinanceiro, forma: FormaFin, valorCentavos: number): number {
  const bps = forma === "PIX" ? c.taxaPixBps : forma === "CARTAO_DEBITO" ? c.taxaDebitoBps : forma === "CARTAO_CREDITO" ? c.taxaCreditoBps : forma === "CARTAO_LINK" ? c.taxaLinkBps : 0;
  return Math.round((valorCentavos * bps) / 10_000);
}

/** Dias até o dinheiro cair na conta (Pix e dinheiro: na hora). */
export function prazoDaForma(c: ConfigFinanceiro, forma: FormaFin): number {
  return forma === "CARTAO_DEBITO" ? c.prazoDebitoDias : forma === "CARTAO_CREDITO" ? c.prazoCreditoDias : forma === "CARTAO_LINK" ? c.prazoLinkDias : 0;
}

/** Recebimentos que precisam ser conferidos no extrato (dinheiro é conferido no fechamento do caixa). */
export function precisaConciliar(forma: string | null): boolean {
  return forma !== null && forma !== "DINHEIRO" && forma !== "NAO_INFORMADO";
}

/** "AAAA-MM-DD" de hoje (ou da data) no fuso de Recife. */
export function diaRecife(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function somarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

export function diaValido(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** "27/11/2026" a partir de "2026-11-27". */
export function formatarDia(dia: string | null): string {
  if (!dia) return "—";
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

/** Período do filtro: mês atual por padrão. */
export function periodo(de?: string, ate?: string, hoje = diaRecife()): { de: string; ate: string } {
  const inicioMes = `${hoje.slice(0, 8)}01`;
  const d = de && diaValido(de) ? de : inicioMes;
  const a = ate && diaValido(ate) ? ate : hoje;
  return d <= a ? { de: d, ate: a } : { de: a, ate: d };
}

/** Percentual digitado ("1,99" ou "1.99%") → centésimos de ponto (199). Null quando inválido. */
export function percentualParaBps(txt: string): number | null {
  const t = txt.replace("%", "").replace(",", ".").trim();
  if (t === "") return 0;
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

export function bpsParaPercentual(bps: number): string {
  return (bps / 100).toFixed(2).replace(".", ",");
}

type MovCaixa = { tipo: "SUPRIMENTO" | "SANGRIA"; valorCentavos: number };
type LancCaixa = { tipo: "RECEITA" | "DESPESA"; valorCentavos: number; status: string };

/** Dinheiro que deveria estar na gaveta: troco + vendas em dinheiro + reforços − retiradas − despesas pagas do caixa. */
export function esperadoNoCaixa(trocoCentavos: number, movs: MovCaixa[], lancs: LancCaixa[]): number {
  let total = trocoCentavos;
  for (const m of movs) total += m.tipo === "SUPRIMENTO" ? m.valorCentavos : -m.valorCentavos;
  for (const l of lancs) if (l.status !== "CANCELADO") total += l.tipo === "RECEITA" ? l.valorCentavos : -l.valorCentavos;
  return total;
}

export type LancResumo = {
  tipo: "RECEITA" | "DESPESA";
  categoria: string;
  forma: string | null;
  valorCentavos: number;
  taxaCentavos: number;
  status: string;
  pedidoId: number | null;
};

/** Resumo do período pelo regime de caixa: o que entrou e saiu de fato. */
export function resumir(lancs: LancResumo[], cmvCentavos: number) {
  const ok = lancs.filter((l) => l.status === "QUITADO");
  const receitas = ok.filter((l) => l.tipo === "RECEITA");
  const despesas = ok.filter((l) => l.tipo === "DESPESA");
  const bruto = receitas.reduce((s, l) => s + l.valorCentavos, 0);
  const taxas = receitas.reduce((s, l) => s + l.taxaCentavos, 0);
  const vendas = receitas.filter((l) => l.pedidoId !== null);
  const totalDespesas = despesas.reduce((s, l) => s + l.valorCentavos, 0);
  const porForma = new Map<string, { bruto: number; taxas: number; qtd: number }>();
  for (const l of receitas) {
    const k = l.forma ?? "NAO_INFORMADO";
    const v = porForma.get(k) ?? { bruto: 0, taxas: 0, qtd: 0 };
    v.bruto += l.valorCentavos;
    v.taxas += l.taxaCentavos;
    v.qtd += 1;
    porForma.set(k, v);
  }
  const porCategoria = new Map<string, number>();
  for (const l of despesas) porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + l.valorCentavos);
  const liquido = bruto - taxas;
  const vendasBruto = vendas.reduce((s, l) => s + l.valorCentavos, 0);
  return {
    bruto,
    taxas,
    liquido,
    pedidos: vendas.length,
    ticketMedio: vendas.length ? Math.round(vendasBruto / vendas.length) : 0,
    cmv: cmvCentavos,
    margemBruta: vendasBruto - cmvCentavos,
    despesas: totalDespesas,
    resultado: liquido - cmvCentavos - totalDespesas,
    porForma: [...porForma.entries()].sort((a, b) => b[1].bruto - a[1].bruto),
    porCategoria: [...porCategoria.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Linha de CSV com ";" (abre direto no Excel em português). */
export function linhaCsv(campos: (string | number | null)[]): string {
  return campos
    .map((c) => {
      const s = c === null ? "" : String(c);
      // Evita fórmula injetada no Excel e escapa aspas/separador.
      const seguro = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s) ? `'${s}` : s;
      return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
    })
    .join(";");
}

/** Centavos → "1234,56" (sem R$, para planilha). */
export function centavosCsv(v: number): string {
  const neg = v < 0;
  const a = Math.abs(v);
  return `${neg ? "-" : ""}${Math.floor(a / 100)},${String(a % 100).padStart(2, "0")}`;
}
