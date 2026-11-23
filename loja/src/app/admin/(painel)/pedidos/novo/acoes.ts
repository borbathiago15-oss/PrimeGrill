"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { registrarPedido } from "@/lib/novo-pedido";
import { reaisParaCentavos } from "@/modules/dinheiro";
import { normalizarCelular } from "@/modules/pedidos/whatsapp";

export type EstadoNovo = { erro?: string };

const Entrada = z.object({
  itens: z.array(z.object({ produtoId: z.number().int().positive(), quantidade: z.number().int().min(1).max(50) })).min(1, "Adicione pelo menos um produto."),
  origem: z.enum(["WHATSAPP", "BALCAO"]),
  modo: z.enum(["ENTREGA", "RETIRADA"]),
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(80),
  celular: z.string().trim().max(25),
  cep: z.string().trim().max(9),
  endereco: z.string().trim().max(120),
  numero: z.string().trim().max(15),
  complemento: z.string().trim().max(60),
  bairro: z.string().trim().max(60),
  frete: z.string().trim().max(12),
  observacao: z.string().trim().max(180),
  separar: z.boolean(),
  promocoes: z.boolean(),
});

/** Pedido que chegou pelo WhatsApp ou no balcão: o atendente lança e ele segue o mesmo fluxo da loja online. */
export async function criarPedidoPainel(_: EstadoNovo, form: FormData): Promise<EstadoNovo> {
  const autor = await exigirPermissao("pedidos");
  let itens: unknown = [];
  try {
    itens = JSON.parse(String(form.get("itens") ?? "[]"));
  } catch {
    return { erro: "Itens inválidos." };
  }
  const v = Entrada.safeParse({
    itens,
    origem: form.get("origem"),
    modo: form.get("modo"),
    nome: form.get("nome") ?? "",
    celular: form.get("celular") ?? "",
    cep: form.get("cep") ?? "",
    endereco: form.get("endereco") ?? "",
    numero: form.get("numero") ?? "",
    complemento: form.get("complemento") ?? "",
    bairro: form.get("bairro") ?? "",
    frete: form.get("frete") ?? "",
    observacao: form.get("observacao") ?? "",
    separar: form.get("separar") === "on",
    promocoes: form.get("promocoes") === "on",
  });
  if (!v.success) return { erro: v.error.issues[0]?.message ?? "Confira os dados." };
  const d = v.data;
  const celular = normalizarCelular(d.celular);
  if (!celular) return { erro: "Informe o celular do cliente com DDD." };
  if (d.modo === "ENTREGA" && (!d.endereco || !d.numero)) return { erro: "Para entrega, informe endereço e número." };
  let freteManual: number | null = null;
  if (d.modo === "ENTREGA" && d.frete) {
    freteManual = reaisParaCentavos(d.frete);
    if (freteManual === null) return { erro: "Frete inválido. Ex.: 10,00" };
  }

  const r = await registrarPedido(
    { ...d, celular, optin: true },
    {
      origem: d.origem,
      autor,
      nota: d.origem === "WHATSAPP" ? "Pedido recebido pelo WhatsApp e lançado no painel" : "Pedido feito no balcão",
      freteFlexivel: true,
      freteManualCentavos: freteManual,
    },
  );
  if (!r.ok) return { erro: r.erro };
  if (d.promocoes) {
    const { registrarAceite } = await import("@/lib/promocoes");
    await registrarAceite({ celular, nome: d.nome, origem: "PAINEL", registradoPor: autor });
  }
  if (d.separar) {
    const banco = await db();
    await banco.transaction(async (tx) => {
      await tx.update(schema.pedidos).set({ status: "EM_SEPARACAO", atualizadoEm: new Date() }).where(eq(schema.pedidos.id, r.id));
      await tx.insert(schema.pedidoEventos).values({ pedidoId: r.id, status: "EM_SEPARACAO", nota: "Aceito ao lançar; separação iniciada", autor });
    });
  }
  revalidatePath("/admin");
  redirect(`/admin/pedidos/${r.id}`);
}
