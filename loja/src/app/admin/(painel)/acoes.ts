"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { STATUS_PEDIDO, type ConfigLoja } from "@/db/schema";
import { exigirPermissao } from "@/lib/admin";
import { salvarFoto } from "@/lib/arquivos";
import { configLoja } from "@/lib/dados";
import { kgParaGramas, reaisParaCentavos } from "@/modules/dinheiro";
import { faixasOrdenadas, type Faixa } from "@/modules/entrega/frete";

const { produtos, pedidos, pedidoEventos, configuracoes } = schema;

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
  const autor = await exigirPermissao("pedidosAjusteManual");
  const id = Number(form.get("id"));
  const status = z.enum(STATUS_PEDIDO).parse(form.get("status"));
  const nota = String(form.get("nota") ?? "").trim().slice(0, 300);
  if (status === "CANCELADO") {
    const { estornarPedido } = await import("@/lib/estorno");
    await estornarPedido(id, autor);
  }
  const banco = await db();
  await banco.transaction(async (tx) => {
    await tx.update(pedidos).set({ status, atualizadoEm: new Date() }).where(eq(pedidos.id, id));
    await tx.insert(pedidoEventos).values({ pedidoId: id, status, nota, autor });
  });
  if (status === "CANCELADO") {
    const { avisarCliente } = await import("@/lib/push");
    avisarCliente(id, (c) => ({ titulo: "Pedido cancelado", corpo: `${c}: fale com a loja se tiver dúvidas.` }));
  }
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/", "layout");
}

/* ---------------- Produtos ---------------- */
export type EstadoForm = { erro?: string; ok?: string };

export async function salvarProduto(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirPermissao("produtosEditar");
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
  await exigirPermissao("produtosDisponibilidade");
  const id = Number(form.get("id"));
  const banco = await db();
  const [p] = await banco.select({ d: produtos.disponivel }).from(produtos).where(eq(produtos.id, id));
  if (p) await banco.update(produtos).set({ disponivel: !p.d, atualizadoEm: new Date() }).where(eq(produtos.id, id));
  revalidatePath("/", "layout");
}

/* ---------------- Loja e entregas ---------------- */
export async function salvarConfig(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirPermissao("lojaEntregas");
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
    ...atual,
    horarios,
    pausada: form.get("pausada") === "on",
    mensagemPausa: String(form.get("mensagemPausa") ?? "").trim().slice(0, 80),
    whatsapp,
    retiradaAtiva: form.get("retiradaAtiva") === "on",
    enderecoRetirada: String(form.get("enderecoRetirada") ?? "").trim().slice(0, 120),
    entrega: atual.entrega,
    pagamento: atual.pagamento,
    privacidade: atual.privacidade,
  };
  const banco = await db();
  await banco
    .insert(configuracoes)
    .values({ id: 1, dados })
    .onConflictDoUpdate({ target: configuracoes.id, set: { dados, atualizadoEm: new Date() } });
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}

const MAX_FAIXAS = 8; // espelha o formulário de entrega

/** Endereço da loja (ponto de saída) e faixas de frete por distância. */
export async function salvarEntrega(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirPermissao("lojaEntregas");
  const atual = await configLoja();
  const endereco = String(form.get("endereco") ?? "").trim().slice(0, 160);
  const latTxt = String(form.get("lat") ?? "").trim().replace(",", ".");
  const lngTxt = String(form.get("lng") ?? "").trim().replace(",", ".");
  const fatorTxt = String(form.get("fatorRota") ?? "1,3").trim().replace(",", ".");
  const fatorRota = Number(fatorTxt);
  if (!Number.isFinite(fatorRota) || fatorRota < 1 || fatorRota > 3) return { erro: "Fator de rota deve ficar entre 1,0 e 3,0." };

  let lat: number | null = null;
  let lng: number | null = null;
  if (latTxt || lngTxt) {
    lat = Number(latTxt);
    lng = Number(lngTxt);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { erro: "Latitude/longitude inválidas." };
  } else if (endereco) {
    const { geocodificarTexto } = await import("@/lib/geo");
    const p = await geocodificarTexto(endereco);
    if (!p) return { erro: "Não encontramos esse endereço no mapa. Confira o texto ou informe latitude e longitude manualmente." };
    lat = p.lat;
    lng = p.lng;
  }

  const faixas: Faixa[] = [];
  for (let i = 0; i < MAX_FAIXAS; i++) {
    const kmTxt = String(form.get(`km-${i}`) ?? "").trim().replace(",", ".");
    const taxaTxt = String(form.get(`taxa-${i}`) ?? "").trim();
    if (!kmTxt && !taxaTxt) continue;
    const ateKm = Number(kmTxt);
    const taxa = reaisParaCentavos(taxaTxt || "0");
    const minTxt = String(form.get(`minimo-${i}`) ?? "").trim();
    const minimo = minTxt ? reaisParaCentavos(minTxt) : 0;
    if (!Number.isFinite(ateKm) || ateKm <= 0 || ateKm > 100) return { erro: `Faixa ${i + 1}: distância inválida.` };
    if (taxa === null) return { erro: `Faixa ${i + 1}: taxa inválida (use 8,00).` };
    if (minimo === null) return { erro: `Faixa ${i + 1}: pedido mínimo inválido.` };
    faixas.push({ ateKm, taxaCentavos: taxa, prazo: String(form.get(`prazo-${i}`) ?? "").trim().slice(0, 30), pedidoMinimoCentavos: minimo });
  }
  if (new Set(faixas.map((f) => f.ateKm)).size !== faixas.length) return { erro: "Há duas faixas com a mesma distância." };
  const ativa = form.get("ativa") === "on";
  if (ativa && (lat === null || faixas.length === 0)) return { erro: "Para ativar a entrega, informe o endereço da loja e ao menos uma faixa." };

  const dados: ConfigLoja = { ...atual, entrega: { ativa, endereco, lat, lng, fatorRota, faixas: faixasOrdenadas(faixas) } };
  const banco = await db();
  await banco
    .insert(configuracoes)
    .values({ id: 1, dados })
    .onConflictDoUpdate({ target: configuracoes.id, set: { dados, atualizadoEm: new Date() } });
  revalidatePath("/", "layout");
  return { ok: ativa ? "Entrega salva e ativa." : "Entrega salva (desativada para os clientes)." };
}

/** Chave Pix e formas de pagamento aceitas no link do pedido. */
export async function salvarPagamento(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirPermissao("pagamento");
  const atual = await configLoja();
  const pixChave = String(form.get("pixChave") ?? "").trim().slice(0, 77);
  const pixNome = String(form.get("pixNome") ?? "").trim().slice(0, 60);
  const pixCidade = String(form.get("pixCidade") ?? "").trim().slice(0, 40);
  const aceitaPix = form.get("aceitaPix") === "on";
  const aceitaCartaoLink = form.get("aceitaCartaoLink") === "on";
  const aceitaNaEntrega = form.get("aceitaNaEntrega") === "on";
  if (pixChave && (!pixNome || !pixCidade)) return { erro: "Informe o nome do recebedor e a cidade (aparecem no Pix)." };
  if (!aceitaPix && !aceitaCartaoLink && !aceitaNaEntrega) return { erro: "Deixe pelo menos uma forma de pagamento ativa." };
  const dados: ConfigLoja = { ...atual, pagamento: { pixChave, pixNome, pixCidade, aceitaPix, aceitaCartaoLink, aceitaNaEntrega } };
  const banco = await db();
  await banco.insert(configuracoes).values({ id: 1, dados }).onConflictDoUpdate({ target: configuracoes.id, set: { dados, atualizadoEm: new Date() } });
  revalidatePath("/admin/configuracoes");
  return { ok: "Pagamento salvo." };
}

/** Dados da empresa e do encarregado (LGPD) que aparecem na política de privacidade. Só o dono. */
export async function salvarPrivacidade(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirPermissao("pagamento");
  const { cnpjValido } = await import("@/modules/loja/cnpj");
  const atual = await configLoja();
  const razaoSocial = String(form.get("razaoSocial") ?? "").trim().slice(0, 120);
  const cnpj = String(form.get("cnpj") ?? "").replace(/\D/g, "");
  const encarregado = String(form.get("encarregado") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  if (cnpj && !cnpjValido(cnpj)) return { erro: "CNPJ inválido: confira os números." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "E-mail inválido." };
  const dados: ConfigLoja = { ...atual, privacidade: { razaoSocial, cnpj, encarregado, email } };
  const banco = await db();
  await banco.insert(configuracoes).values({ id: 1, dados }).onConflictDoUpdate({ target: configuracoes.id, set: { dados, atualizadoEm: new Date() } });
  revalidatePath("/admin/configuracoes");
  revalidatePath("/privacidade");
  return { ok: "Dados da política de privacidade salvos." };
}
