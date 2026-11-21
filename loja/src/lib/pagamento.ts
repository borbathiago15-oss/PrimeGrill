import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";
import type { ConfigPagamento, FormaPagamento } from "@/db/schema";
import { pixCopiaECola } from "@/modules/pagamento/pix";

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  PIX: "Pix",
  CARTAO_LINK: "Cartão de crédito (link)",
  NA_ENTREGA: "Na entrega / retirada",
};

export const ROTULO_PAGAMENTO: Record<string, { texto: string; cls: string }> = {
  PENDENTE: { texto: "Pagamento pendente", cls: "at" },
  INFORMADO: { texto: "Cliente avisou que pagou", cls: "in" },
  PAGO: { texto: "Pago", cls: "ok" },
};

export function formasAceitas(c: ConfigPagamento): FormaPagamento[] {
  const f: FormaPagamento[] = [];
  if (c.aceitaPix && c.pixChave.trim()) f.push("PIX");
  if (c.aceitaCartaoLink) f.push("CARTAO_LINK");
  if (c.aceitaNaEntrega) f.push("NA_ENTREGA");
  return f;
}

/** Pix copia-e-cola com o valor final e o código do pedido, mais o QR em data URL. */
export async function pixDoPedido(c: ConfigPagamento, valorCentavos: number, codigo: string) {
  if (!c.pixChave.trim()) return null;
  const codigoPix = pixCopiaECola({ chave: c.pixChave, nome: c.pixNome, cidade: c.pixCidade, valorCentavos, txid: codigo });
  const qr = await QRCode.toDataURL(codigoPix, { margin: 1, width: 280, errorCorrectionLevel: "M" });
  return { codigoPix, qr };
}

/** Endereço público do pedido para mandar ao cliente (usa o domínio pelo qual o painel foi aberto). */
export async function linkDoPedido(codigo: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "primegrill-loja.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/pedido/${codigo}`;
}
