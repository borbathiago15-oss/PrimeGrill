import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { desc, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { agruparClientes, camposAnonimos, digitosCelular } from "@/modules/clientes/clientes";

const { pedidos, pedidoMensagens, pushInscricoes, pedidoEventos, lgpdExclusoes } = schema;

async function pedidosIdentificados() {
  return (await db())
    .select({
      id: pedidos.id,
      codigo: pedidos.codigo,
      clienteNome: pedidos.clienteNome,
      clienteCelular: pedidos.clienteCelular,
      status: pedidos.status,
      modo: pedidos.modo,
      bairro: pedidos.bairro,
      totalFinalCentavos: pedidos.totalFinalCentavos,
      totalEstimadoCentavos: pedidos.totalEstimadoCentavos,
      criadoEm: pedidos.criadoEm,
      anonimizadoEm: pedidos.anonimizadoEm,
      pixQrUrl: pedidos.pixQrUrl,
    })
    .from(pedidos)
    .where(isNull(pedidos.anonimizadoEm))
    .orderBy(desc(pedidos.criadoEm));
}

export async function listarClientes() {
  return agruparClientes(await pedidosIdentificados());
}

export async function pedidosDoCliente(celular: string) {
  const cel = digitosCelular(celular);
  return (await pedidosIdentificados()).filter((p) => digitosCelular(p.clienteCelular) === cel);
}

export async function historicoExclusoes() {
  return (await db()).select().from(lgpdExclusoes).orderBy(desc(lgpdExclusoes.criadoEm)).limit(50);
}

/** Apaga um arquivo enviado (Blob na Vercel ou pasta local em desenvolvimento). Nunca derruba a exclusão. */
async function apagarArquivo(url: string): Promise<boolean> {
  try {
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url));
      return true;
    }
    if (/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(url)) {
      const { del } = await import("@vercel/blob");
      await del(url);
      return true;
    }
  } catch (e) {
    console.error("arquivo não apagado", e);
  }
  return false;
}

const ABERTOS = ["NOVO", "EM_SEPARACAO", "AGUARDANDO_CLIENTE", "CONFIRMADO"];

/**
 * LGPD (art. 18, VI): apaga os dados pessoais de um cliente a pedido dele.
 * - Pedidos: nome, celular, endereço e observação são trocados por "Cliente removido (LGPD)".
 *   Itens, valores, pesagens e movimentos de estoque ficam (obrigação fiscal/contábil, art. 16, I), sem identificar ninguém.
 * - Chat do pedido (mensagens e arquivos), avisos no celular e fotos de QR: apagados.
 * - Fica só um registro da exclusão (4 últimos dígitos do celular, quantidades, motivo, quem fez e quando).
 */
export async function excluirDadosCliente(celular: string, autor: string, motivo: string): Promise<{ erro: string } | { pedidos: number; mensagens: number; arquivos: number }> {
  const lista = await pedidosDoCliente(celular);
  if (!lista.length) return { erro: "Nenhum pedido com esse celular." };
  const abertos = lista.filter((p) => ABERTOS.includes(p.status));
  if (abertos.length) return { erro: `Há pedido em andamento (${abertos.map((p) => p.codigo).join(", ")}). Conclua ou cancele antes de apagar os dados.` };
  const ids = lista.map((p) => p.id);
  const banco = await db();
  const msgs = await banco.select({ id: pedidoMensagens.id, anexoUrl: pedidoMensagens.anexoUrl }).from(pedidoMensagens).where(inArray(pedidoMensagens.pedidoId, ids));
  const arquivos = [...msgs.map((m) => m.anexoUrl), ...lista.map((p) => p.pixQrUrl)].filter((u): u is string => !!u);

  await banco.transaction(async (tx) => {
    await tx.update(pedidos).set({ ...camposAnonimos(new Date()), pixQrUrl: null }).where(inArray(pedidos.id, ids));
    await tx.delete(pedidoMensagens).where(inArray(pedidoMensagens.pedidoId, ids));
    await tx.delete(pushInscricoes).where(inArray(pushInscricoes.pedidoId, ids));
    await tx.insert(pedidoEventos).values(ids.map((pedidoId) => ({ pedidoId, status: lista.find((p) => p.id === pedidoId)!.status, nota: "Dados pessoais do cliente apagados a pedido do titular (LGPD)", autor })));
    await tx.insert(lgpdExclusoes).values({ celularFinal: digitosCelular(celular).slice(-4), pedidos: ids.length, mensagens: msgs.length, arquivos: arquivos.length, motivo, autor });
  });

  let apagados = 0;
  for (const u of arquivos) if (await apagarArquivo(u)) apagados++;
  return { pedidos: ids.length, mensagens: msgs.length, arquivos: apagados };
}
