"use server";
import { idiomaAtual } from "@/lib/idioma";
import { traduzirErro } from "@/modules/i18n/erros";
import type { Idioma } from "@/modules/i18n/idiomas";

import { z } from "zod";
import { registrarPedido } from "@/lib/novo-pedido";
import { normalizarCelular } from "@/modules/pedidos/whatsapp";

const entrada = z.object({
  itens: z.array(z.object({ produtoId: z.number().int().positive(), quantidade: z.number().int() })).min(1).max(40),
  modo: z.enum(["ENTREGA", "RETIRADA"]),
  nome: z.string().trim().min(2, "Informe seu nome.").max(80),
  celular: z.string().trim().max(25),
  cep: z.string().trim().max(9).optional().default(""),
  endereco: z.string().trim().max(120).optional().default(""),
  numero: z.string().trim().max(15).optional().default(""),
  complemento: z.string().trim().max(60).optional().default(""),
  bairro: z.string().trim().max(60).optional().default(""),
  observacao: z.string().trim().max(180).optional().default(""),
  consentimento: z.literal(true, { errorMap: () => ({ message: "É preciso aceitar o uso dos dados para o pedido." }) }),
  optin: z.boolean(),
  promocoes: z.boolean().optional().default(false),
  site: z.string().max(0).optional(), // campo-isca contra robôs
});

export type ResultadoPedido = { ok: true; codigo: string } | { ok: false; erro: string };

export async function criarPedido(dados: unknown): Promise<ResultadoPedido> {
  const idioma = await idiomaAtual();
  const r = await criarPedidoPt(dados, idioma);
  return r.ok ? r : { ok: false, erro: traduzirErro(r.erro, idioma) };
}

async function criarPedidoPt(dados: unknown, idioma: Idioma): Promise<ResultadoPedido> {
  const v = entrada.safeParse(dados);
  if (!v.success) return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  const d = v.data;
  if (d.site) return { ok: false, erro: "Não foi possível enviar." };
  const celular = normalizarCelular(d.celular);
  if (!celular) return { ok: false, erro: "Informe um celular com DDD, ex.: (81) 99999-9999." };
  if (d.modo === "ENTREGA" && (!d.endereco || !d.numero)) return { ok: false, erro: "Informe endereço e número para entrega." };

  const r = await registrarPedido(
    { ...d, celular },
    { origem: "LOJA_ONLINE", autor: "cliente", nota: "Pedido feito pela loja online", freteFlexivel: false, idioma },
  );
  // Consentimento separado para promoções (LGPD): só grava se o cliente marcou.
  if (r.ok && d.promocoes) {
    const { registrarAceite } = await import("@/lib/promocoes");
    await registrarAceite({ celular, nome: d.nome, origem: "CHECKOUT" });
  }
  return r;
}
