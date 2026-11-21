import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { distanciaEntregaMetros, entregaDisponivel, escolherFaixa, normalizarCep, type ConfigEntrega, type Faixa } from "@/modules/entrega/frete";

/**
 * Localização por CEP: ViaCEP (endereço) + BrasilAPI v2 (coordenadas) e, se faltar,
 * Nominatim/OpenStreetMap. Resultados ficam em cache no banco para não repetir consultas.
 */
export type Endereco = { cep: string; logradouro: string; bairro: string; cidade: string; uf: string; lat: number | null; lng: number | null };

const UA = "PrimeGrillLoja/1.0 (loja online; frete por distancia)";

async function obterJson(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

type Nominatim = { lat: string; lon: string }[];

export async function geocodificarTexto(q: string): Promise<{ lat: number; lng: number } | null> {
  const j = (await obterJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`)) as Nominatim | null;
  return j && j[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
}

async function geocodificarEstruturado(e: Omit<Endereco, "lat" | "lng">, numero?: string): Promise<{ lat: number; lng: number } | null> {
  const base = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&city=${encodeURIComponent(e.cidade)}&state=${encodeURIComponent(e.uf)}`;
  if (e.logradouro) {
    const rua = `${numero ? `${numero} ` : ""}${e.logradouro}`;
    const j = (await obterJson(`${base}&street=${encodeURIComponent(rua)}`)) as Nominatim | null;
    if (j && j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  }
  if (e.bairro) {
    const j = (await obterJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(`${e.bairro}, ${e.cidade}, ${e.uf}`)}`)) as Nominatim | null;
    if (j && j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  }
  return null;
}

export async function localizarCep(cepTexto: string, numero?: string): Promise<Endereco | null> {
  const cep = normalizarCep(cepTexto);
  if (!cep) return null;
  const banco = await db();
  const [cache] = await banco.select().from(schema.geoCache).where(eq(schema.geoCache.cep, cep));
  if (cache) return { cep, logradouro: cache.logradouro, bairro: cache.bairro, cidade: cache.cidade, uf: cache.uf, lat: cache.lat, lng: cache.lng };

  const via = (await obterJson(`https://viacep.com.br/ws/${cep}/json/`)) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null;
  const brasil = (await obterJson(`https://brasilapi.com.br/api/cep/v2/${cep}`)) as {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    location?: { coordinates?: { latitude?: string; longitude?: string } };
  } | null;
  if ((!via || via.erro) && !brasil?.city) return null;

  const end = {
    cep,
    logradouro: via?.logradouro || brasil?.street || "",
    bairro: via?.bairro || brasil?.neighborhood || "",
    cidade: via?.localidade || brasil?.city || "",
    uf: via?.uf || brasil?.state || "",
  };
  let coords: { lat: number; lng: number } | null = null;
  let fonte = "";
  const c = brasil?.location?.coordinates;
  if (c?.latitude && c?.longitude && Number.isFinite(Number(c.latitude))) {
    coords = { lat: Number(c.latitude), lng: Number(c.longitude) };
    fonte = "brasilapi";
  } else {
    coords = await geocodificarEstruturado(end, numero);
    fonte = coords ? "nominatim" : "nenhuma";
  }
  // Só guarda em cache quando encontrou coordenadas (permite tentar de novo depois).
  if (coords)
    await banco
      .insert(schema.geoCache)
      .values({ ...end, lat: coords.lat, lng: coords.lng, fonte })
      .onConflictDoNothing();
  return { ...end, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

export type ResultadoFrete =
  | { tipo: "ok"; endereco: Endereco; faixa: Faixa; distanciaMetros: number }
  | { tipo: "fora"; endereco: Endereco; distanciaMetros: number }
  | { tipo: "a_combinar"; endereco: Endereco | null; motivo: string }
  | { tipo: "cep_invalido" }
  | { tipo: "indisponivel" };

export async function calcularFrete(config: ConfigEntrega, cep: string, numero?: string): Promise<ResultadoFrete> {
  if (!entregaDisponivel(config) || config.lat === null || config.lng === null) return { tipo: "indisponivel" };
  if (!normalizarCep(cep)) return { tipo: "cep_invalido" };
  const end = await localizarCep(cep, numero);
  if (!end) return { tipo: "cep_invalido" };
  if (end.lat === null || end.lng === null) return { tipo: "a_combinar", endereco: end, motivo: "Não conseguimos localizar este CEP no mapa." };
  const distanciaMetros = distanciaEntregaMetros({ lat: config.lat, lng: config.lng }, { lat: end.lat, lng: end.lng }, config.fatorRota);
  const faixa = escolherFaixa(distanciaMetros, config.faixas);
  return faixa ? { tipo: "ok", endereco: end, faixa, distanciaMetros } : { tipo: "fora", endereco: end, distanciaMetros };
}
