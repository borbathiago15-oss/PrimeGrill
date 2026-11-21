"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/admin";
import { registrarMovimento, travarSaldo } from "@/lib/estoque";
import { custoMedio, pendenteDeFechamento } from "@/modules/estoque/saldo";

export type EstadoEstoque = { erro?: string; ok?: string };

/** EST-001 §4: zera o peso restante de peça inteira sem peças como quebra (motivo obrigatório). */
export async function fecharQuebra(_: EstadoEstoque, form: FormData): Promise<EstadoEstoque> {
  const autor = await exigirAdmin();
  const produtoId = Number(form.get("produtoId"));
  const motivo = String(form.get("motivo") ?? "").trim();
  if (motivo.length < 3) return { erro: "Informe o motivo da quebra." };
  const banco = await db();
  const [p] = await banco.select().from(schema.produtos).where(eq(schema.produtos.id, produtoId));
  if (!p) return { erro: "Produto não encontrado." };
  const r = await banco.transaction(async (tx) => {
    const s = await travarSaldo(tx, produtoId);
    if (!pendenteDeFechamento(s, p.tipoVenda)) return "Nada a fechar: o produto não está com 0 peças e peso sobrando.";
    await registrarMovimento(tx, { produtoId, tipoVenda: p.tipoVenda, tipo: "QUEBRA", sentido: "saida", quantidade: { gramas: s.gramas }, origem: "AJUSTE", motivo, manual: true, autor });
    return null;
  });
  if (r) return { erro: r };
  revalidatePath("/", "layout");
  return { ok: "Saldo fechado como quebra." };
}

/** Ajuste com motivo (inventário, correção). Alternativa manual auditada — PG-P-001. */
export async function ajustarEstoque(_: EstadoEstoque, form: FormData): Promise<EstadoEstoque> {
  const autor = await exigirAdmin();
  const produtoId = Number(form.get("produtoId"));
  const sentido = form.get("sentido") === "saida" ? "saida" : "entrada";
  const motivo = String(form.get("motivo") ?? "").trim();
  if (motivo.length < 5) return { erro: "Descreva o motivo do ajuste (mín. 5 caracteres)." };
  const banco = await db();
  const [p] = await banco.select().from(schema.produtos).where(eq(schema.produtos.id, produtoId));
  if (!p) return { erro: "Produto não encontrado." };
  let quantidade: { gramas?: number; pecas?: number; unidades?: number };
  if (p.tipoVenda === "PECA") {
    const kg = String(form.get("kg") ?? "").trim().replace(",", ".");
    const pecas = Number(form.get("pecas") ?? 0);
    if (!/^\d+(\.\d{1,3})?$/.test(kg || "0") || !Number.isInteger(pecas) || pecas < 0) return { erro: "Peso (kg) ou peças inválidos." };
    const [i, f = ""] = (kg || "0").split(".");
    const gramas = Number(i) * 1000 + Number((f + "000").slice(0, 3));
    if (gramas === 0 && pecas === 0) return { erro: "Informe o peso e/ou as peças do ajuste." };
    quantidade = { gramas, pecas };
  } else {
    const unidades = Number(form.get("unidades") ?? 0);
    if (!Number.isInteger(unidades) || unidades <= 0) return { erro: "Informe a quantidade de pacotes." };
    quantidade = { unidades };
  }
  const erro = await banco.transaction(async (tx) => {
    const s = await travarSaldo(tx, produtoId);
    if (sentido === "saida") {
      if ((quantidade.gramas ?? 0) > s.gramas || (quantidade.pecas ?? 0) > s.pecas || (quantidade.unidades ?? 0) > s.unidades) return "O ajuste de saída é maior que o saldo.";
      await registrarMovimento(tx, { produtoId, tipoVenda: p.tipoVenda, tipo: "AJUSTE_SAIDA", sentido, quantidade, origem: "AJUSTE", motivo, manual: true, autor });
    } else {
      // Entrada por ajuste entra pelo custo médio atual (não altera o custo).
      const cm = custoMedio(s, p.tipoVenda) ?? 0;
      const valor = p.tipoVenda === "PECA" ? Math.round((cm * (quantidade.gramas ?? 0)) / 1000) : cm * (quantidade.unidades ?? 0);
      await registrarMovimento(tx, { produtoId, tipoVenda: p.tipoVenda, tipo: "AJUSTE_ENTRADA", sentido, quantidade, valorCentavos: valor, origem: "AJUSTE", motivo, manual: true, autor });
    }
    return null;
  });
  if (erro) return { erro };
  revalidatePath("/", "layout");
  return { ok: "Ajuste registrado." };
}
