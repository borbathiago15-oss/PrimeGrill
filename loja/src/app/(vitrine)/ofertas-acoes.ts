"use server";

import { registrarAceite, revogarPorToken } from "@/lib/promocoes";
import { normalizarCelular } from "@/modules/pedidos/whatsapp";

export type EstadoCadastro = { erro?: string; ok?: boolean };

/** Cadastro no site para receber promoções e o folder (consentimento explícito, LGPD art. 7º, I). */
export async function cadastrarOfertas(_: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  if (String(form.get("site") ?? "")) return { ok: true }; // campo-isca contra robôs
  const nome = String(form.get("nome") ?? "").trim();
  const celular = normalizarCelular(String(form.get("celular") ?? ""));
  if (nome.length < 2) return { erro: "Informe seu nome." };
  if (!celular) return { erro: "Informe um celular com DDD, ex.: (81) 99999-9999." };
  if (form.get("aceite") !== "on") return { erro: "Marque que aceita receber as ofertas." };
  await registrarAceite({ celular, nome, origem: "SITE" });
  return { ok: true };
}

export async function sairDasOfertas(token: string): Promise<{ ok: boolean }> {
  return { ok: await revogarPorToken(token) };
}
