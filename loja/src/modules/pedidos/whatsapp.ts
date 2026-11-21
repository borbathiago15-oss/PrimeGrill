import { formatarKg, formatarReais, formatarValor } from "../dinheiro";
import type { ItemCalculado } from "./calculo";

export type PedidoParaMensagem = {
  codigo: string;
  modo: "ENTREGA" | "RETIRADA";
  clienteNome: string;
  clienteCelular: string;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  itens: ItemCalculado[];
  subtotalCentavos: number;
  freteCentavos: number;
  totalCentavos: number;
  temItemPesado: boolean;
  subtotalIncompleto: boolean;
  observacao: string;
};

export function linhaItem(i: ItemCalculado): string {
  if (i.tipoVenda === "PACOTE")
    return `• ${i.quantidade}x ${i.nome} — ${formatarReais(i.precoCentavos)} · PACOTE = ${formatarReais(i.valorCentavos ?? 0)}`;
  const peso = i.pesoMedioGramas ? ` (≈ ${formatarKg(i.pesoMedioGramas)} cada)` : "";
  const valor = i.valorCentavos !== null ? ` ≈ ${formatarReais(i.valorCentavos)}` : "";
  return `• ${i.quantidade} peça(s) ${i.nome} — R$ ${formatarValor(i.precoCentavos)}/kg${peso}${valor}`;
}

export function mensagemPedido(p: PedidoParaMensagem): string {
  const linhas = [
    `*Novo pedido ${p.codigo}* — Prime Grill Paiva`,
    "",
    ...p.itens.map(linhaItem),
    "",
    `Subtotal${p.temItemPesado ? " estimado" : ""}: ${formatarReais(p.subtotalCentavos)}${p.subtotalIncompleto ? " + peças a pesar" : ""}`,
  ];
  if (p.modo === "ENTREGA") linhas.push(`Frete (${p.bairro}): ${formatarReais(p.freteCentavos)}`);
  linhas.push(`*Total${p.temItemPesado ? " estimado" : ""}: ${formatarReais(p.totalCentavos)}${p.subtotalIncompleto ? " + peças a pesar" : ""}*`);
  if (p.temItemPesado) linhas.push("_Peças inteiras são pesadas na separação; o valor final é enviado para confirmação._");
  linhas.push("", `Cliente: ${p.clienteNome}`, `Celular: ${p.clienteCelular}`);
  if (p.modo === "ENTREGA") {
    const comp = p.complemento ? `, ${p.complemento}` : "";
    linhas.push(`Entrega: ${p.endereco}, ${p.numero}${comp} — ${p.bairro}${p.cep ? ` · CEP ${p.cep}` : ""}`);
  } else linhas.push("Retirada na loja");
  if (p.observacao) linhas.push(`Obs.: ${p.observacao}`);
  return linhas.join("\n");
}

export function linkWhatsapp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
}

/** Normaliza celular brasileiro: retorna só dígitos (DDD + número) ou null. */
export function normalizarCelular(texto: string): string | null {
  const d = texto.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return /^\d{2}9\d{8}$/.test(d) ? d : null;
}

export function formatarCelular(d: string): string {
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
