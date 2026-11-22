"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { registrarMovimento, saldosPorProduto } from "@/lib/estoque";
import { reaisParaCentavos } from "@/modules/dinheiro";
import { pendenteDeFechamento, SALDO_ZERO, valorAceito } from "@/modules/estoque/saldo";
import { chaveValida, lerNotaXml } from "@/modules/notas/xml";

const { notasEntrada, notaItens, fornecedores, vinculosFornecedor, produtos } = schema;

export type EstadoNota = { erro?: string; ok?: string };

async function garantirFornecedor(cnpj: string, nome: string) {
  const banco = await db();
  await banco.insert(fornecedores).values({ cnpj, nome }).onConflictDoNothing();
  const [f] = await banco.select().from(fornecedores).where(eq(fornecedores.cnpj, cnpj));
  return f;
}

/** "20,000" ou "20.5" → milésimos. */
function qtdParaMil(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(t)) return null;
  const [i, f = ""] = t.split(".");
  return Number(i) * 1000 + Number((f + "000").slice(0, 3));
}

/* ---------- Canal 2: XML ---------- */
export async function importarXml(_: EstadoNota, form: FormData): Promise<EstadoNota> {
  const autor = await exigirPermissao("notas");
  const arq = form.get("xml");
  if (!(arq instanceof File) || arq.size === 0) return { erro: "Escolha o arquivo XML da nota." };
  if (arq.size > 2_000_000) return { erro: "Arquivo acima de 2 MB." };
  let nota;
  const texto = await arq.text();
  try {
    nota = lerNotaXml(texto);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "XML inválido." };
  }
  if (!chaveValida(nota.chave)) return { erro: "A chave de acesso do XML não confere (dígito verificador)." };
  const banco = await db();
  const [dup] = await banco.select({ id: notasEntrada.id }).from(notasEntrada).where(eq(notasEntrada.chave, nota.chave));
  if (dup) return { erro: `Esta nota já foi lançada (chave ${nota.chave.slice(0, 4)}…${nota.chave.slice(-4)}).` };

  const fornecedor = await garantirFornecedor(nota.emitente.cnpj, nota.emitente.nome || "Fornecedor sem nome");
  const vinculos = await banco.select().from(vinculosFornecedor).where(eq(vinculosFornecedor.fornecedorId, fornecedor.id));
  const porCodigo = new Map(vinculos.map((v) => [v.codigoFornecedor, v.produtoId]));
  const porEan = new Map((await banco.select({ id: produtos.id, ean: produtos.ean }).from(produtos)).filter((p) => p.ean).map((p) => [p.ean!, p.id]));

  const id = await banco.transaction(async (tx) => {
    const [n] = await tx
      .insert(notasEntrada)
      .values({
        chave: nota.chave,
        numero: nota.numero,
        serie: nota.serie,
        fornecedorId: fornecedor.id,
        emissao: nota.emissao,
        valorTotalCentavos: nota.valorTotalCentavos,
        origem: "XML",
        xml: texto,
        criadoPor: autor,
      })
      .returning({ id: notasEntrada.id });
    await tx.insert(notaItens).values(
      nota.itens.map((i) => ({
        notaId: n.id,
        codigoFornecedor: i.codigo,
        descricao: i.descricao,
        unidade: i.unidade,
        ean: i.ean,
        quantidadeMil: i.quantidadeMil,
        valorTotalCentavos: i.valorTotalCentavos,
        produtoId: porCodigo.get(i.codigo) ?? (i.ean ? porEan.get(i.ean) : undefined) ?? null,
      })),
    );
    return n.id;
  });
  revalidatePath("/admin/notas");
  redirect(`/admin/notas/${id}`);
}

/* ---------- Alternativa manual: digitação (PG-P-001) ---------- */
export async function criarNotaManual(_: EstadoNota, form: FormData): Promise<EstadoNota> {
  const autor = await exigirPermissao("notas");
  const cnpj = String(form.get("cnpj") ?? "").replace(/\D/g, "");
  const nome = String(form.get("fornecedor") ?? "").trim();
  const numero = String(form.get("numero") ?? "").trim();
  const chave = String(form.get("chave") ?? "").replace(/\D/g, "");
  const emissao = String(form.get("emissao") ?? "");
  const valor = reaisParaCentavos(String(form.get("valor") ?? ""));
  const motivo = String(form.get("motivo") ?? "").trim();
  if (cnpj.length !== 14) return { erro: "CNPJ do fornecedor deve ter 14 dígitos." };
  if (nome.length < 2) return { erro: "Informe o nome do fornecedor." };
  if (!numero) return { erro: "Informe o número da nota." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(emissao)) return { erro: "Informe a data de emissão." };
  if (valor === null) return { erro: "Valor total inválido (use 2.275,80)." };
  if (motivo.length < 5) return { erro: "Informe o motivo da digitação manual (ex.: fornecedor não enviou o XML)." };
  if (chave && !chaveValida(chave)) return { erro: "Chave de acesso inválida. Confira os 44 dígitos ou deixe em branco." };
  const banco = await db();
  if (chave) {
    const [dup] = await banco.select({ id: notasEntrada.id }).from(notasEntrada).where(eq(notasEntrada.chave, chave));
    if (dup) return { erro: "Esta chave já foi lançada." };
  }
  const f = await garantirFornecedor(cnpj, nome);
  const [n] = await banco
    .insert(notasEntrada)
    .values({ chave: chave || null, numero, serie: String(form.get("serie") ?? "").trim(), fornecedorId: f.id, emissao, valorTotalCentavos: valor, origem: "MANUAL", motivoManual: motivo, criadoPor: autor })
    .returning({ id: notasEntrada.id });
  revalidatePath("/admin/notas");
  redirect(`/admin/notas/${n.id}`);
}

async function notaPendente(id: number) {
  const banco = await db();
  const [n] = await banco.select().from(notasEntrada).where(eq(notasEntrada.id, id));
  return n && n.status === "PENDENTE" ? n : null;
}

export async function adicionarItem(_: EstadoNota, form: FormData): Promise<EstadoNota> {
  await exigirPermissao("notas");
  const notaId = Number(form.get("notaId"));
  if (!(await notaPendente(notaId))) return { erro: "Só é possível alterar itens de nota pendente." };
  const descricao = String(form.get("descricao") ?? "").trim();
  const qtd = qtdParaMil(String(form.get("quantidade") ?? ""));
  const valor = reaisParaCentavos(String(form.get("valor") ?? ""));
  if (descricao.length < 2) return { erro: "Descreva o item." };
  if (!qtd) return { erro: "Quantidade inválida (ex.: 20,000)." };
  if (valor === null) return { erro: "Valor inválido." };
  const banco = await db();
  await banco.insert(notaItens).values({
    notaId,
    descricao,
    codigoFornecedor: String(form.get("codigo") ?? "").trim(),
    unidade: String(form.get("unidade") ?? "UN").trim().toUpperCase().slice(0, 6),
    quantidadeMil: qtd,
    valorTotalCentavos: valor,
    produtoId: Number(form.get("produtoId")) || null,
  });
  revalidatePath(`/admin/notas/${notaId}`);
  return { ok: "Item adicionado." };
}

export async function removerItem(form: FormData) {
  await exigirPermissao("notas");
  const notaId = Number(form.get("notaId"));
  if (!(await notaPendente(notaId))) return;
  const banco = await db();
  await banco.delete(notaItens).where(and(eq(notaItens.id, Number(form.get("itemId"))), eq(notaItens.notaId, notaId)));
  revalidatePath(`/admin/notas/${notaId}`);
}

export async function recusarNota(form: FormData) {
  const autor = await exigirPermissao("notas");
  const notaId = Number(form.get("notaId"));
  if (!(await notaPendente(notaId))) return;
  const banco = await db();
  await banco
    .update(notasEntrada)
    .set({ status: "RECUSADA", motivoManual: String(form.get("motivo") ?? "Recusada na conferência").slice(0, 200), confirmadoPor: autor, confirmadoEm: new Date() })
    .where(eq(notasEntrada.id, notaId));
  revalidatePath("/admin/notas");
  redirect("/admin/notas");
}

/* ---------- Conferência e confirmação (REC-001 §2) ---------- */
export async function conferirNota(_: EstadoNota, form: FormData): Promise<EstadoNota> {
  const autor = await exigirPermissao("notas");
  const notaId = Number(form.get("notaId"));
  const confirmar = form.get("acao") === "confirmar";
  const nota = await notaPendente(notaId);
  if (!nota) return { erro: "Nota não encontrada ou já processada." };
  const banco = await db();
  const itens = await banco.select().from(notaItens).where(eq(notaItens.notaId, notaId));
  if (itens.length === 0) return { erro: "Adicione os itens da nota antes de conferir." };
  const ids = [...new Set(itens.map((i) => Number(form.get(`p-${i.id}`)) || i.produtoId).filter(Boolean) as number[])];
  const prods = new Map((ids.length ? await banco.select().from(produtos).where(inArray(produtos.id, ids)) : []).map((p) => [p.id, p]));

  type Linha = { item: (typeof itens)[number]; produtoId: number | null; aceitoMil: number; divergencia: string | null; divNota: string; gramas: number | null; pecas: number | null; unidades: number | null };
  const linhas: Linha[] = [];
  for (const i of itens) {
    const produtoId = Number(form.get(`p-${i.id}`)) || null;
    const aceitoTxt = String(form.get(`a-${i.id}`) ?? "");
    const aceitoMil = aceitoTxt === "" ? i.quantidadeMil : qtdParaMil(aceitoTxt);
    if (aceitoMil === null) return { erro: `${i.descricao}: quantidade aceita inválida.` };
    const divergencia = String(form.get(`d-${i.id}`) ?? "") || null;
    const divNota = String(form.get(`dn-${i.id}`) ?? "").trim().slice(0, 200);
    if (aceitoMil !== i.quantidadeMil && !divergencia) return { erro: `${i.descricao}: o aceito difere da nota — informe a divergência (falta, avaria, sobra ou recusa).` };
    const kg = String(form.get(`g-${i.id}`) ?? "").trim();
    const gramas = kg ? qtdParaMil(kg) : null; // kg com 3 casas = gramas
    const pecas = String(form.get(`pc-${i.id}`) ?? "").trim() ? Number(form.get(`pc-${i.id}`)) : null;
    const unidades = String(form.get(`u-${i.id}`) ?? "").trim() ? Number(form.get(`u-${i.id}`)) : null;
    linhas.push({ item: i, produtoId, aceitoMil, divergencia, divNota, gramas, pecas, unidades });
  }

  // Salva a conferência (rascunho) em qualquer caso.
  await banco.transaction(async (tx) => {
    for (const l of linhas)
      await tx
        .update(notaItens)
        .set({ produtoId: l.produtoId, aceitoMil: l.aceitoMil, divergencia: l.divergencia, divergenciaNota: l.divNota, gramas: l.gramas, pecas: l.pecas, unidades: l.unidades })
        .where(eq(notaItens.id, l.item.id));
  });
  if (!confirmar) {
    revalidatePath(`/admin/notas/${notaId}`);
    return { ok: "Conferência salva." };
  }

  // Validações da confirmação (REC-001-R4..R6).
  for (const l of linhas) {
    if (l.aceitoMil === 0) continue;
    const p = l.produtoId ? prods.get(l.produtoId) : undefined;
    if (!p) return { erro: `${l.item.descricao}: escolha o produto do cadastro.` };
    if (p.tipoVenda === "PECA") {
      if (!l.gramas || l.gramas <= 0) return { erro: `${p.nome}: informe o peso aceito em kg.` };
      if (!l.pecas || !Number.isInteger(l.pecas) || l.pecas < 1) return { erro: `${p.nome}: informe quantas peças vieram.` };
    } else if (!l.unidades || !Number.isInteger(l.unidades) || l.unidades < 1) return { erro: `${p.nome}: informe quantos pacotes entram no estoque.` };
  }
  const pecaIds = linhas.filter((l) => l.aceitoMil > 0 && l.produtoId && prods.get(l.produtoId)?.tipoVenda === "PECA").map((l) => l.produtoId!);
  const saldos = await saldosPorProduto(banco, pecaIds);
  for (const id of pecaIds)
    if (pendenteDeFechamento(saldos.get(id) ?? SALDO_ZERO, "PECA")) return { erro: `${prods.get(id)!.nome} tem saldo pendente (0 peças com peso sobrando). Feche como quebra no Estoque antes de dar entrada.` };

  const comDivergencia = linhas.some((l) => l.divergencia);
  await banco.transaction(async (tx) => {
    for (const l of linhas) {
      if (l.aceitoMil === 0 || !l.produtoId) continue;
      const p = prods.get(l.produtoId)!;
      const valor = valorAceito(l.item.valorTotalCentavos, l.item.quantidadeMil, Math.min(l.aceitoMil, l.item.quantidadeMil));
      await registrarMovimento(tx, {
        produtoId: p.id,
        tipoVenda: p.tipoVenda,
        tipo: "ENTRADA_NOTA",
        sentido: "entrada",
        quantidade: p.tipoVenda === "PECA" ? { gramas: l.gramas!, pecas: l.pecas! } : { unidades: l.unidades! },
        valorCentavos: valor,
        origem: "NOTA",
        origemId: notaId,
        motivo: `NF ${nota.numero}${l.divergencia ? ` · ${l.divergencia}` : ""}`,
        manual: nota.origem === "MANUAL",
        autor,
      });
      if (l.item.codigoFornecedor) {
        const porCaixa = p.tipoVenda === "PACOTE" && l.aceitoMil % 1000 === 0 && l.aceitoMil > 0 && l.unidades! % (l.aceitoMil / 1000) === 0 ? l.unidades! / (l.aceitoMil / 1000) : null;
        await tx
          .insert(vinculosFornecedor)
          .values({ fornecedorId: nota.fornecedorId, codigoFornecedor: l.item.codigoFornecedor, produtoId: p.id, unidadesPorCaixa: porCaixa })
          .onConflictDoUpdate({ target: [vinculosFornecedor.fornecedorId, vinculosFornecedor.codigoFornecedor], set: { produtoId: p.id, unidadesPorCaixa: porCaixa } });
      }
    }
    await tx
      .update(notasEntrada)
      .set({ status: comDivergencia ? "RECEBIDA_DIVERGENCIA" : "RECEBIDA", confirmadoPor: autor, confirmadoEm: new Date() })
      .where(eq(notasEntrada.id, notaId));
  });
  revalidatePath("/", "layout");
  redirect(`/admin/notas/${notaId}?confirmada=1`);
}
