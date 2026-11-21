"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { STATUS_PEDIDO, type ConfigLoja } from "@/db/schema";
import { exigirAdmin } from "@/lib/admin";
import { salvarFoto } from "@/lib/arquivos";
import { configLoja } from "@/lib/dados";
import { kgParaGramas, reaisParaCentavos } from "@/modules/dinheiro";

const { produtos, pedidos, pedidoEventos, configuracoes, zonasEntrega } = schema;

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/* ---------------- Pedidos ---------------- */
export async function mudarStatus(form: FormData) {
  const autor = await exigirAdmin();
  const id = Number(form.get("id"));
  const status = z.enum(STATUS_PEDIDO).parse(form.get("status"));
  const nota = String(form.get("nota") ?? "").trim().slice(0, 300);
  const banco = await db();
  await banco.transaction(async (tx) => {
    await tx.update(pedidos).set({ status, atualizadoEm: new Date() }).where(eq(pedidos.id, id));
    await tx.insert(pedidoEventos).values({ pedidoId: id, status, nota, autor });
  });
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin");
}

/* ---------------- Produtos ---------------- */
export type EstadoForm = { erro?: string; ok?: string };

export async function salvarProduto(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const id = Number(form.get("id")) || null;
  const nome = String(form.get("nome") ?? "").trim();
  const tipoVenda = String(form.get("tipoVenda")) as "PECA" | "PACOTE";
  const preco = reaisParaCentavos(String(form.get("preco") ?? ""));
  const pesoTxt = String(form.get("pesoMedio") ?? "").trim();
  const peso = pesoTxt ? kgParaGramas(pesoTxt) : null;
  const qtdTxt = String(form.get("quantidade") ?? "").trim();
  const quantidade = qtdTxt === "" ? null : Number(qtdTxt);
  const categoriaId = Number(form.get("categoriaId"));

  if (nome.length < 3) return { erro: "Informe o nome do produto." };
  if (tipoVenda !== "PECA" && tipoVenda !== "PACOTE") return { erro: "Escolha o tipo de venda." };
  if (preco === null || preco <= 0) return { erro: "Preço inválido. Use o formato 119,40." };
  if (pesoTxt && (peso === null || peso <= 0)) return { erro: "Peso médio inválido. Use kg, ex.: 1,32." };
  if (quantidade !== null && (!Number.isInteger(quantidade) || quantidade < 0)) return { erro: "Quantidade inválida." };
  if (!categoriaId) return { erro: "Escolha a categoria." };

  const banco = await db();
  const slug = slugify(nome);
  const conflito = await banco.select({ id: produtos.id }).from(produtos).where(id ? and(eq(produtos.slug, slug), ne(produtos.id, id)) : eq(produtos.slug, slug));
  if (conflito.length) return { erro: "Já existe um produto com esse nome." };

  let fotoUrl: string | undefined;
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const r = await salvarFoto(foto);
    if (!r.ok) return { erro: r.erro };
    fotoUrl = r.url;
  }

  if (id) {
    const [atual] = await banco.select().from(produtos).where(eq(produtos.id, id));
    if (!atual) return { erro: "Produto não encontrado." };
    if (atual.tipoVenda !== tipoVenda) {
      const usado = await banco.select({ id: schema.pedidoItens.id }).from(schema.pedidoItens).where(eq(schema.pedidoItens.produtoId, id)).limit(1);
      if (usado.length) return { erro: "O tipo de venda não pode mudar depois que o produto já teve pedidos (CAT-001)." };
    }
  }

  const valores = {
    slug,
    nome,
    descricao: String(form.get("descricao") ?? "").trim().slice(0, 600),
    categoriaId,
    tipoVenda,
    precoCentavos: preco,
    pesoMedioGramas: tipoVenda === "PECA" ? peso : null,
    pesoNominal: tipoVenda === "PACOTE" ? String(form.get("pesoNominal") ?? "").trim().slice(0, 20) || null : null,
    ativo: form.get("ativo") === "on",
    disponivel: form.get("disponivel") === "on",
    quantidadeDisponivel: quantidade,
    destaque: form.get("destaque") === "on",
    atualizadoEm: new Date(),
    ...(fotoUrl ? { fotoUrl } : {}),
  };
  if (id) await banco.update(produtos).set(valores).where(eq(produtos.id, id));
  else await banco.insert(produtos).values(valores);
  revalidatePath("/", "layout");
  redirect("/admin/produtos?salvo=1");
}

export async function alternarDisponivel(form: FormData) {
  await exigirAdmin();
  const id = Number(form.get("id"));
  const banco = await db();
  const [p] = await banco.select({ d: produtos.disponivel }).from(produtos).where(eq(produtos.id, id));
  if (p) await banco.update(produtos).set({ disponivel: !p.d, atualizadoEm: new Date() }).where(eq(produtos.id, id));
  revalidatePath("/", "layout");
}

/* ---------------- Loja e entregas ---------------- */
export async function salvarConfig(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const atual = await configLoja();
  const horarios = atual.horarios.map((h) => {
    const abre = String(form.get(`abre-${h.dia}`) ?? h.abre);
    const fecha = String(form.get(`fecha-${h.dia}`) ?? h.fecha);
    return { dia: h.dia, abre, fecha, fechado: form.get(`fechado-${h.dia}`) === "on" };
  });
  if (horarios.some((h) => !/^\d{2}:\d{2}$/.test(h.abre) || !/^\d{2}:\d{2}$/.test(h.fecha) || (!h.fechado && h.abre >= h.fecha)))
    return { erro: "Confira os horários: o fechamento deve ser depois da abertura." };
  const whatsapp = String(form.get("whatsapp") ?? "").replace(/\D/g, "");
  if (!/^55\d{10,11}$/.test(whatsapp)) return { erro: "WhatsApp deve ter DDI e DDD, ex.: 5581998990694." };
  const dados: ConfigLoja = {
    horarios,
    pausada: form.get("pausada") === "on",
    mensagemPausa: String(form.get("mensagemPausa") ?? "").trim().slice(0, 80),
    whatsapp,
    retiradaAtiva: form.get("retiradaAtiva") === "on",
    enderecoRetirada: String(form.get("enderecoRetirada") ?? "").trim().slice(0, 120),
  };
  const banco = await db();
  await banco
    .insert(configuracoes)
    .values({ id: 1, dados })
    .onConflictDoUpdate({ target: configuracoes.id, set: { dados, atualizadoEm: new Date() } });
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}

export async function salvarZona(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const bairro = String(form.get("bairro") ?? "").trim();
  const taxa = reaisParaCentavos(String(form.get("taxa") ?? ""));
  const minimoTxt = String(form.get("minimo") ?? "").trim();
  const minimo = minimoTxt ? reaisParaCentavos(minimoTxt) : 0;
  if (bairro.length < 2) return { erro: "Informe o bairro." };
  if (taxa === null) return { erro: "Taxa inválida. Use o formato 9,90." };
  if (minimo === null) return { erro: "Pedido mínimo inválido." };
  const banco = await db();
  await banco.insert(zonasEntrega).values({ bairro, taxaCentavos: taxa, prazo: String(form.get("prazo") ?? "").trim().slice(0, 30), pedidoMinimoCentavos: minimo });
  revalidatePath("/admin/configuracoes");
  revalidatePath("/pedido");
  return { ok: `${bairro} adicionado.` };
}

export async function alternarZona(form: FormData) {
  await exigirAdmin();
  const id = Number(form.get("id"));
  const banco = await db();
  const [z] = await banco.select({ a: zonasEntrega.ativo }).from(zonasEntrega).where(eq(zonasEntrega.id, id));
  if (z) await banco.update(zonasEntrega).set({ ativo: !z.a }).where(eq(zonasEntrega.id, id));
  revalidatePath("/admin/configuracoes");
  revalidatePath("/pedido");
}
