import type { FormatoFolder, ItemFolder } from "@/db/schema";
import { formatarValor } from "@/modules/dinheiro";

/** STU-002 §5: tamanho de cada página em px (exportado em 2× para nitidez). */
export const TAMANHO: Record<FormatoFolder, { w: number; h: number; max: number; rotulo: string }> = {
  ENCARTE: { w: 1080, h: 1620, max: 36, rotulo: "Encarte 1080×1620 (WhatsApp e PDF)" },
  FEED: { w: 1080, h: 1350, max: 4, rotulo: "Feed Instagram 4:5 (até 4 produtos)" },
  STORY: { w: 1080, h: 1920, max: 4, rotulo: "Story 1080×1920 (até 4 produtos)" },
};

export const POR_PAGINA = 12;

export type Linha = { tipo: "vertical" | "horizontal" | "grande"; itens: ItemFolder[] };
export type Pagina = { linhas: Linha[] };

function emLinhas<T>(lista: T[], n: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < lista.length; i += n) r.push(lista.slice(i, i + n));
  return r;
}

/**
 * Grade automática (STU-002 §4):
 * - 1 a 3 produtos: cards grandes;
 * - 4 a 8: linhas de 4 cards verticais;
 * - 9 a 12: 8 verticais + última linha com 1 a 3 cards horizontais (12 = 3 linhas de 4);
 * - mais de 12: nova página a cada 12, com a mesma regra.
 * Feed e Story: até 4 produtos em 2×2 (ou grandes, se forem até 2).
 */
export function montarPaginas(itens: ItemFolder[], formato: FormatoFolder): Pagina[] {
  if (!itens.length) return [];
  if (formato !== "ENCARTE") {
    const sel = itens.slice(0, 4);
    return [{ linhas: sel.length <= 2 ? [{ tipo: "grande", itens: sel }] : emLinhas(sel, 2).map((l) => ({ tipo: "vertical" as const, itens: l })) }];
  }
  return emLinhas(itens, POR_PAGINA).map((pag) => {
    const n = pag.length;
    if (n <= 3) return { linhas: [{ tipo: "grande" as const, itens: pag }] };
    if (n <= 8 || n === 12) return { linhas: emLinhas(pag, 4).map((l) => ({ tipo: "vertical" as const, itens: l })) };
    return {
      linhas: [...emLinhas(pag.slice(0, 8), 4).map((l) => ({ tipo: "vertical" as const, itens: l })), { tipo: "horizontal" as const, itens: pag.slice(8) }],
    };
  });
}

/** Preço como no encarte: "119,40" + "KG" (peça) ou "· PACOTE" (pacote, nunca com KG). */
export function precoFolder(i: Pick<ItemFolder, "tipoVenda" | "precoCentavos">): { valor: string; unidade: string } {
  return { valor: formatarValor(i.precoCentavos), unidade: i.tipoVenda === "PECA" ? "KG" : "· PACOTE" };
}

export type ProdutoCandidato = {
  id: number;
  nome: string;
  tipoVenda: "PECA" | "PACOTE";
  precoCentavos: number;
  fotoUrl: string | null;
  pesoNominal: string | null;
  ativo: boolean;
  disponivel: boolean;
  controlaEstoque: boolean;
  quantidadeDisponivel: number | null;
};

/** STU-002 §4.2: separa o que entra no folder e o que fica de fora, com o motivo. */
export function validarProdutos(lista: ProdutoCandidato[]): { ok: ItemFolder[]; fora: { nome: string; motivo: string }[] } {
  const ok: ItemFolder[] = [];
  const fora: { nome: string; motivo: string }[] = [];
  for (const p of lista) {
    if (!p.ativo || !p.disponivel) fora.push({ nome: p.nome, motivo: "marcado como indisponível" });
    else if (!p.precoCentavos || p.precoCentavos <= 0) fora.push({ nome: p.nome, motivo: "sem preço" });
    else if (p.controlaEstoque && (p.quantidadeDisponivel ?? 0) <= 0) fora.push({ nome: p.nome, motivo: "sem estoque" });
    else if (!p.fotoUrl) fora.push({ nome: p.nome, motivo: "sem foto" });
    else ok.push({ id: p.id, nome: p.nome, tipoVenda: p.tipoVenda, precoCentavos: p.precoCentavos, fotoUrl: p.fotoUrl, pesoNominal: p.pesoNominal });
  }
  return { ok, fora };
}

/** STU-002-R2: o que mudou desde a geração (preço, foto, nome ou saiu de linha/estoque). */
export function mudancasDesde(gerado: ItemFolder[], atuais: ProdutoCandidato[]): string[] {
  const mapa = new Map(atuais.map((p) => [p.id, p]));
  const r: string[] = [];
  for (const g of gerado) {
    const a = mapa.get(g.id);
    if (!a) {
      r.push(`${g.nome}: produto removido`);
      continue;
    }
    if (a.precoCentavos !== g.precoCentavos) r.push(`${g.nome}: preço mudou de ${formatarValor(g.precoCentavos)} para ${formatarValor(a.precoCentavos)}`);
    if (!a.ativo || !a.disponivel) r.push(`${g.nome}: ficou indisponível`);
    else if (a.controlaEstoque && (a.quantidadeDisponivel ?? 0) <= 0) r.push(`${g.nome}: esgotou`);
    if ((a.fotoUrl ?? "") !== g.fotoUrl) r.push(`${g.nome}: foto trocada`);
    if (a.nome !== g.nome) r.push(`${g.nome}: nome mudou para ${a.nome}`);
  }
  return r;
}

/** Título em até 3 palavras com uma em destaque (dourado). */
export function partesTitulo(titulo: string, destaque: number): { texto: string; ouro: boolean }[] {
  return titulo
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((t, i) => ({ texto: t.toUpperCase(), ouro: i === destaque }));
}

export function dataBr(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
