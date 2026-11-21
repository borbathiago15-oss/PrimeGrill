"use server";

import { configLoja } from "@/lib/dados";
import { calcularFrete } from "@/lib/geo";
import { formatarDistancia, raioMaximoKm } from "@/modules/entrega/frete";

export type RespostaFrete =
  | { tipo: "ok"; taxaCentavos: number; pedidoMinimoCentavos: number; prazo: string; distancia: string; logradouro: string; bairro: string; cidade: string; uf: string }
  | { tipo: "fora"; distancia: string; raioKm: number; bairro: string; cidade: string }
  | { tipo: "a_combinar"; logradouro: string; bairro: string; cidade: string; uf: string }
  | { tipo: "cep_invalido" }
  | { tipo: "indisponivel" };

/** Usado pelo checkout para mostrar o frete. O pedido recalcula tudo no servidor ao ser enviado. */
export async function consultarFrete(cep: string, numero: string): Promise<RespostaFrete> {
  const config = await configLoja();
  const r = await calcularFrete(config.entrega, String(cep).slice(0, 12), String(numero).slice(0, 15));
  switch (r.tipo) {
    case "ok":
      return {
        tipo: "ok",
        taxaCentavos: r.faixa.taxaCentavos,
        pedidoMinimoCentavos: r.faixa.pedidoMinimoCentavos,
        prazo: r.faixa.prazo,
        distancia: formatarDistancia(r.distanciaMetros),
        logradouro: r.endereco.logradouro,
        bairro: r.endereco.bairro,
        cidade: r.endereco.cidade,
        uf: r.endereco.uf,
      };
    case "fora":
      return { tipo: "fora", distancia: formatarDistancia(r.distanciaMetros), raioKm: raioMaximoKm(config.entrega.faixas), bairro: r.endereco.bairro, cidade: r.endereco.cidade };
    case "a_combinar":
      return { tipo: "a_combinar", logradouro: r.endereco?.logradouro ?? "", bairro: r.endereco?.bairro ?? "", cidade: r.endereco?.cidade ?? "", uf: r.endereco?.uf ?? "" };
    default:
      return r;
  }
}
