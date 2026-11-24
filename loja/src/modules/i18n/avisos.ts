import type { Idioma } from "./idiomas";

/** Avisos no celular do cliente, no idioma em que ele fez o pedido. */
type A = { titulo: string; corpo: string };

export type AvisosCliente = {
  aceito: (c: string) => A;
  pesado: (c: string) => A;
  itensAcrescentados: (c: string, resumo: string) => A;
  linkCartao: (c: string) => A;
  pago: (c: string) => A;
  concluido: (c: string, entrega: boolean) => A;
  pixCopiaECola: (c: string) => A;
  pixQr: (c: string) => A;
  novoTotal: (c: string) => A;
  cancelado: (c: string, motivo?: string | null) => A;
  formaDefinida: (c: string, forma: string) => A;
  resposta: (c: string, previa: string) => A;
};

const pt: AvisosCliente = {
  aceito: (c) => ({ titulo: "Pedido aceito!", corpo: `${c}: já estamos separando seus cortes.` }),
  pesado: (c) => ({ titulo: "Seu pedido foi pesado", corpo: `${c}: o valor final está pronto. Toque para conferir e escolher como pagar.` }),
  itensAcrescentados: (c, r) => ({ titulo: "Itens acrescentados ao seu pedido", corpo: `${c}: ${r}. Avisamos quando o novo total estiver pronto.` }),
  linkCartao: (c) => ({ titulo: "Link de pagamento pronto", corpo: `${c}: toque para pagar com cartão de crédito.` }),
  pago: (c) => ({ titulo: "Pagamento confirmado ✓", corpo: `${c}: recebemos seu pagamento. Obrigado!` }),
  concluido: (c, e) => ({ titulo: e ? "Pedido entregue" : "Pedido retirado", corpo: `${c}: obrigado pela preferência. Bom churrasco! 🔥` }),
  pixCopiaECola: (c) => ({ titulo: "Seu Pix está pronto", corpo: `${c}: toque para copiar o Pix com o valor exato.` }),
  pixQr: (c) => ({ titulo: "Seu Pix está pronto", corpo: `${c}: toque para ver o QR Code e pagar.` }),
  novoTotal: (c) => ({ titulo: "Novo total pronto", corpo: `${c}: conferimos sua alteração. Toque para confirmar o valor.` }),
  cancelado: (c, m) => ({ titulo: "Pedido cancelado", corpo: m ? `${c}: ${m}` : `${c}: fale com a loja se tiver dúvidas.` }),
  formaDefinida: (c, f) => ({ titulo: "Forma de pagamento definida", corpo: `${c}: ${f}. Toque para ver como pagar.` }),
  resposta: (c, p) => ({ titulo: "💬 Prime Grill respondeu", corpo: `${c}: ${p}` }),
};

const en: AvisosCliente = {
  aceito: (c) => ({ titulo: "Order accepted!", corpo: `${c}: we're already preparing your cuts.` }),
  pesado: (c) => ({ titulo: "Your order has been weighed", corpo: `${c}: the final price is ready. Tap to check it and choose how to pay.` }),
  itensAcrescentados: (c, r) => ({ titulo: "Items added to your order", corpo: `${c}: ${r}. We'll let you know when the new total is ready.` }),
  linkCartao: (c) => ({ titulo: "Payment link ready", corpo: `${c}: tap to pay by credit card.` }),
  pago: (c) => ({ titulo: "Payment confirmed ✓", corpo: `${c}: we received your payment. Thank you!` }),
  concluido: (c, e) => ({ titulo: e ? "Order delivered" : "Order picked up", corpo: `${c}: thank you! Enjoy your barbecue! 🔥` }),
  pixCopiaECola: (c) => ({ titulo: "Your Pix is ready", corpo: `${c}: tap to copy the Pix code with the exact amount.` }),
  pixQr: (c) => ({ titulo: "Your Pix is ready", corpo: `${c}: tap to see the QR code and pay.` }),
  novoTotal: (c) => ({ titulo: "New total ready", corpo: `${c}: we checked your change. Tap to confirm the price.` }),
  cancelado: (c, m) => ({ titulo: "Order canceled", corpo: m ? `${c}: ${m}` : `${c}: message the store if you have questions.` }),
  formaDefinida: (c, f) => ({ titulo: "Payment method set", corpo: `${c}: ${f}. Tap to see how to pay.` }),
  resposta: (c, p) => ({ titulo: "💬 Prime Grill replied", corpo: `${c}: ${p}` }),
};

const es: AvisosCliente = {
  aceito: (c) => ({ titulo: "¡Pedido aceptado!", corpo: `${c}: ya estamos preparando tus cortes.` }),
  pesado: (c) => ({ titulo: "Tu pedido fue pesado", corpo: `${c}: el precio final está listo. Toca para revisarlo y elegir cómo pagar.` }),
  itensAcrescentados: (c, r) => ({ titulo: "Productos agregados a tu pedido", corpo: `${c}: ${r}. Te avisamos cuando el nuevo total esté listo.` }),
  linkCartao: (c) => ({ titulo: "Enlace de pago listo", corpo: `${c}: toca para pagar con tarjeta de crédito.` }),
  pago: (c) => ({ titulo: "Pago confirmado ✓", corpo: `${c}: recibimos tu pago. ¡Gracias!` }),
  concluido: (c, e) => ({ titulo: e ? "Pedido entregado" : "Pedido retirado", corpo: `${c}: ¡gracias! ¡Buen asado! 🔥` }),
  pixCopiaECola: (c) => ({ titulo: "Tu Pix está listo", corpo: `${c}: toca para copiar el Pix con el monto exacto.` }),
  pixQr: (c) => ({ titulo: "Tu Pix está listo", corpo: `${c}: toca para ver el código QR y pagar.` }),
  novoTotal: (c) => ({ titulo: "Nuevo total listo", corpo: `${c}: revisamos tu cambio. Toca para confirmar el precio.` }),
  cancelado: (c, m) => ({ titulo: "Pedido cancelado", corpo: m ? `${c}: ${m}` : `${c}: escribe a la tienda si tienes dudas.` }),
  formaDefinida: (c, f) => ({ titulo: "Forma de pago definida", corpo: `${c}: ${f}. Toca para ver cómo pagar.` }),
  resposta: (c, p) => ({ titulo: "💬 Prime Grill respondió", corpo: `${c}: ${p}` }),
};

export const AVISOS: Record<Idioma, AvisosCliente> = { pt, en, es };
