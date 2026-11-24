import type { Idioma } from "./idiomas";

/**
 * Mensagens prontas que a equipe manda pelo WhatsApp, no idioma do cliente.
 * O painel continua em português; só o texto que vai para o cliente muda de idioma.
 */
export type MensagensLoja = {
  valorPronto: (nome: string, codigo: string, total: string, entrega: boolean, link: string) => string;
  pesadoTitulo: (codigo: string, pesado: boolean) => string;
  linhaPeca: (nome: string, n: number | null, kg: string, precoKg: string, valor: string) => string;
  linhaPacote: (q: number, nome: string, valor: string) => string;
  linhaFrete: (valor: string) => string;
  totalFinal: (valor: string) => string;
  confirmeNoLink: string;
  pixCopiaECola: (codigo: string, total: string, pix: string, link: string) => string;
  pixNoLink: (codigo: string, total: string, link: string) => string;
  cartao: (codigo: string, total: string, linkCartao: string, link: string) => string;
  saiuNaEntrega: (nome: string, codigo: string, total: string, link: string) => string;
  prontoRetirada: (nome: string, codigo: string, total: string, link: string) => string;
  pagoSaiu: (nome: string, codigo: string) => string;
  pagoPronto: (nome: string, codigo: string) => string;
  formaDefinida: (nome: string, codigo: string, forma: string, link: string) => string;
  cancelado: (nome: string, codigo: string, motivo: string) => string;
  formas: { PIX: string; CARTAO_LINK: string; NA_ENTREGA: string; NA_RETIRADA: string };
};

const pt: MensagensLoja = {
  valorPronto: (n, c, t, e, l) => `Olá, ${n}! Seu pedido ${c} da Prime Grill Paiva está separado.\n\n*Total final: ${t}*\n\nConfirme e escolha como pagar (Pix, cartão ou na ${e ? "entrega" : "retirada"}) neste link:\n${l}`,
  pesadoTitulo: (c, p) => `*Pedido ${c} ${p ? "pesado" : "separado"}* — Prime Grill Paiva`,
  linhaPeca: (nome, n, kg, pk, v) => `• ${nome}${n ? ` (peça ${n})` : ""}: ${kg} × R$ ${pk}/kg = ${v}`,
  linhaPacote: (q, nome, v) => `• ${q}x ${nome}: ${v}`,
  linhaFrete: (v) => `• Frete: ${v}`,
  totalFinal: (v) => `*Total final: ${v}*`,
  confirmeNoLink: "Confirme e escolha como pagar (Pix, cartão ou na entrega/retirada) neste link:",
  pixCopiaECola: (c, t, pix, l) => `Pedido ${c} — *${t}*\n\nPix copia e cola (já com o valor):\n${pix}\n\nOu abra o QR Code no link do pedido:\n${l}\n\nAssim que pagar, toque em “Já paguei” no link. Obrigado!`,
  pixNoLink: (c, t, l) => `Pedido ${c} — *${t}*\n\nO QR Code do Pix está no link do pedido:\n${l}\n\nAssim que pagar, toque em “Já paguei” no link. Obrigado!`,
  cartao: (c, t, lc, l) => `Pedido ${c} — *${t}*\n\nLink para pagar com cartão de crédito:\n${lc}\n\nDepois de pagar, toque em “Já paguei” em ${l}`,
  saiuNaEntrega: (n, c, t, l) => `Olá, ${n}! Seu pedido ${c} saiu para entrega. Total: ${t} (pagamento na entrega). Acompanhe: ${l}`,
  prontoRetirada: (n, c, t, l) => `Olá, ${n}! Seu pedido ${c} está pronto para retirada. Total: ${t}. ${l}`,
  pagoSaiu: (n, c) => `Olá, ${n}! Pagamento confirmado. Seu pedido ${c} saiu para entrega.`,
  pagoPronto: (n, c) => `Olá, ${n}! Pagamento confirmado. Seu pedido ${c} está pronto para retirada.`,
  formaDefinida: (n, c, f, l) => `Olá, ${n}! Combinamos o pagamento do pedido ${c}: *${f}*. Veja como pagar neste link:\n${l}`,
  cancelado: (n, c, m) => `Olá, ${n}. Infelizmente cancelamos o pedido ${c}: ${m}. Se quiser, podemos ajudar com outra opção.`,
  formas: { PIX: "Pix", CARTAO_LINK: "cartão de crédito (link)", NA_ENTREGA: "pagamento na entrega", NA_RETIRADA: "pagamento na retirada" },
};

const en: MensagensLoja = {
  valorPronto: (n, c, t, e, l) => `Hi ${n}! Your order ${c} from Prime Grill Paiva is ready.\n\n*Final total: ${t}*\n\nPlease confirm and choose how to pay (Pix, credit card or ${e ? "on delivery" : "at pickup"}) here:\n${l}`,
  pesadoTitulo: (c, p) => `*Order ${c} ${p ? "weighed" : "prepared"}* — Prime Grill Paiva`,
  linhaPeca: (nome, n, kg, pk, v) => `• ${nome}${n ? ` (piece ${n})` : ""}: ${kg} × R$ ${pk}/kg = ${v}`,
  linhaPacote: (q, nome, v) => `• ${q}x ${nome}: ${v}`,
  linhaFrete: (v) => `• Delivery fee: ${v}`,
  totalFinal: (v) => `*Final total: ${v}*`,
  confirmeNoLink: "Please confirm and choose how to pay (Pix, credit card or on delivery/at pickup) here:",
  pixCopiaECola: (c, t, pix, l) => `Order ${c} — *${t}*\n\nPix copy-and-paste code (amount included):\n${pix}\n\nOr open the QR code on your order page:\n${l}\n\nOnce you pay, tap “I've paid” on the page. Thank you!`,
  pixNoLink: (c, t, l) => `Order ${c} — *${t}*\n\nThe Pix QR code is on your order page:\n${l}\n\nOnce you pay, tap “I've paid” on the page. Thank you!`,
  cartao: (c, t, lc, l) => `Order ${c} — *${t}*\n\nSecure link to pay by credit card:\n${lc}\n\nAfter paying, tap “I've paid” at ${l}`,
  saiuNaEntrega: (n, c, t, l) => `Hi ${n}! Your order ${c} is out for delivery. Total: ${t} (pay on delivery). Track it: ${l}`,
  prontoRetirada: (n, c, t, l) => `Hi ${n}! Your order ${c} is ready for pickup. Total: ${t}. ${l}`,
  pagoSaiu: (n, c) => `Hi ${n}! Payment confirmed. Your order ${c} is out for delivery.`,
  pagoPronto: (n, c) => `Hi ${n}! Payment confirmed. Your order ${c} is ready for pickup.`,
  formaDefinida: (n, c, f, l) => `Hi ${n}! Payment for order ${c} is set: *${f}*. See how to pay here:\n${l}`,
  cancelado: (n, c, m) => `Hi ${n}. Unfortunately we had to cancel order ${c}: ${m}. We'd be happy to help with another option.`,
  formas: { PIX: "Pix", CARTAO_LINK: "credit card (payment link)", NA_ENTREGA: "pay on delivery", NA_RETIRADA: "pay at pickup" },
};

const es: MensagensLoja = {
  valorPronto: (n, c, t, e, l) => `¡Hola, ${n}! Tu pedido ${c} de Prime Grill Paiva está listo.\n\n*Total final: ${t}*\n\nConfirma y elige cómo pagar (Pix, tarjeta o ${e ? "al recibir" : "al retirar"}) en este enlace:\n${l}`,
  pesadoTitulo: (c, p) => `*Pedido ${c} ${p ? "pesado" : "preparado"}* — Prime Grill Paiva`,
  linhaPeca: (nome, n, kg, pk, v) => `• ${nome}${n ? ` (pieza ${n})` : ""}: ${kg} × R$ ${pk}/kg = ${v}`,
  linhaPacote: (q, nome, v) => `• ${q}x ${nome}: ${v}`,
  linhaFrete: (v) => `• Envío: ${v}`,
  totalFinal: (v) => `*Total final: ${v}*`,
  confirmeNoLink: "Confirma y elige cómo pagar (Pix, tarjeta o al recibir/retirar) en este enlace:",
  pixCopiaECola: (c, t, pix, l) => `Pedido ${c} — *${t}*\n\nPix copia y pega (con el monto incluido):\n${pix}\n\nO abre el código QR en el enlace del pedido:\n${l}\n\nCuando pagues, toca “Ya pagué” en el enlace. ¡Gracias!`,
  pixNoLink: (c, t, l) => `Pedido ${c} — *${t}*\n\nEl código QR de Pix está en el enlace del pedido:\n${l}\n\nCuando pagues, toca “Ya pagué” en el enlace. ¡Gracias!`,
  cartao: (c, t, lc, l) => `Pedido ${c} — *${t}*\n\nEnlace seguro para pagar con tarjeta de crédito:\n${lc}\n\nDespués de pagar, toca “Ya pagué” en ${l}`,
  saiuNaEntrega: (n, c, t, l) => `¡Hola, ${n}! Tu pedido ${c} salió para entrega. Total: ${t} (pago al recibir). Síguelo: ${l}`,
  prontoRetirada: (n, c, t, l) => `¡Hola, ${n}! Tu pedido ${c} está listo para retirar. Total: ${t}. ${l}`,
  pagoSaiu: (n, c) => `¡Hola, ${n}! Pago confirmado. Tu pedido ${c} salió para entrega.`,
  pagoPronto: (n, c) => `¡Hola, ${n}! Pago confirmado. Tu pedido ${c} está listo para retirar.`,
  formaDefinida: (n, c, f, l) => `¡Hola, ${n}! Definimos el pago del pedido ${c}: *${f}*. Mira cómo pagar en este enlace:\n${l}`,
  cancelado: (n, c, m) => `Hola, ${n}. Lamentablemente cancelamos el pedido ${c}: ${m}. Con gusto te ayudamos con otra opción.`,
  formas: { PIX: "Pix", CARTAO_LINK: "tarjeta de crédito (enlace)", NA_ENTREGA: "pago al recibir", NA_RETIRADA: "pago al retirar" },
};

export const MENSAGENS_LOJA: Record<Idioma, MensagensLoja> = { pt, en, es };

/** Motivos prontos para recusar/cancelar: o cliente vê no idioma dele. "OUTRO" usa o texto digitado pela loja. */
export const MOTIVOS_CANCELAMENTO = {
  ESGOTADO: { pt: "um ou mais produtos esgotaram", en: "one or more products are sold out", es: "uno o más productos se agotaron" },
  FORA_AREA: { pt: "o endereço está fora da nossa área de entrega", en: "the address is outside our delivery area", es: "la dirección está fuera de nuestra zona de entrega" },
  SEM_HORARIO: { pt: "não conseguimos atender no horário pedido", en: "we can't fulfill it at the requested time", es: "no podemos atenderlo en el horario solicitado" },
  DUPLICADO: { pt: "o pedido estava duplicado", en: "the order was a duplicate", es: "el pedido estaba duplicado" },
  PEDIDO_CLIENTE: { pt: "a pedido do cliente", en: "at the customer's request", es: "a pedido del cliente" },
  SEM_PAGAMENTO: { pt: "não recebemos a confirmação do pagamento", en: "we did not receive payment confirmation", es: "no recibimos la confirmación del pago" },
} as const satisfies Record<string, Record<Idioma, string>>;

export type MotivoCancelamento = keyof typeof MOTIVOS_CANCELAMENTO | "OUTRO";
