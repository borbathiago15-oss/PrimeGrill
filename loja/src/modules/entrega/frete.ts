/** Frete por distância (ECM-001 §5, decisão de 2026-11-21): faixas em km a partir da loja. */

export type Faixa = { ateKm: number; taxaCentavos: number; prazo: string; pedidoMinimoCentavos: number };

export type ConfigEntrega = {
  ativa: boolean;
  endereco: string;
  lat: number | null;
  lng: number | null;
  /** Multiplica a distância em linha reta para aproximar o trajeto pelas ruas. */
  fatorRota: number;
  faixas: Faixa[];
};

export const ENTREGA_PADRAO: ConfigEntrega = { ativa: false, endereco: "", lat: null, lng: null, fatorRota: 1.3, faixas: [] };

export type Ponto = { lat: number; lng: number };

/** Distância em linha reta (fórmula de haversine), em metros. */
export function distanciaRetaMetros(a: Ponto, b: Ponto): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distância estimada de entrega (reta × fator de rota), em metros inteiros. */
export function distanciaEntregaMetros(loja: Ponto, cliente: Ponto, fatorRota: number): number {
  const fator = Number.isFinite(fatorRota) && fatorRota >= 1 && fatorRota <= 3 ? fatorRota : 1.3;
  return Math.round(distanciaRetaMetros(loja, cliente) * fator);
}

export function faixasOrdenadas(faixas: Faixa[]): Faixa[] {
  return [...faixas].filter((f) => f.ateKm > 0).sort((a, b) => a.ateKm - b.ateKm);
}

/** Primeira faixa que cobre a distância; null = fora da área de entrega. */
export function escolherFaixa(metros: number, faixas: Faixa[]): Faixa | null {
  return faixasOrdenadas(faixas).find((f) => metros <= f.ateKm * 1000) ?? null;
}

export function raioMaximoKm(faixas: Faixa[]): number {
  const o = faixasOrdenadas(faixas);
  return o.length ? o[o.length - 1].ateKm : 0;
}

export function entregaDisponivel(c: ConfigEntrega): boolean {
  return c.ativa && c.lat !== null && c.lng !== null && faixasOrdenadas(c.faixas).length > 0;
}

export function formatarDistancia(metros: number): string {
  return `${(metros / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function normalizarCep(texto: string): string | null {
  const d = texto.replace(/\D/g, "");
  return d.length === 8 ? d : null;
}
