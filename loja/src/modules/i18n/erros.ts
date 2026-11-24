import type { Idioma } from "./idiomas";

/**
 * Mensagens de erro que o servidor devolve para o cliente (em português) traduzidas na saída.
 * Assim a regra de negócio continua num lugar só; o que não estiver aqui aparece em português.
 */
const FIXAS: Record<string, { en: string; es: string }> = {
  "Informe seu nome.": { en: "Please enter your name.", es: "Ingresa tu nombre." },
  "Informe um celular com DDD, ex.: (81) 99999-9999.": { en: "Please enter a valid mobile number. From abroad, include the country code, e.g. +1 305 555 0100.", es: "Ingresa un celular válido. Desde el exterior, incluye el código del país, ej.: +54 11 5555 0100." },
  "Informe endereço e número para entrega.": { en: "Please enter the street address and number for delivery.", es: "Ingresa la dirección y el número para la entrega." },
  "Entrega indisponível no momento. Escolha retirada na loja.": { en: "Delivery is unavailable right now. Please choose store pickup.", es: "La entrega no está disponible por el momento. Elige retiro en la tienda." },
  "CEP não encontrado. Confira o número.": { en: "ZIP code not found. Please check the number.", es: "Código postal no encontrado. Revisa el número." },
  "Seu endereço está fora da nossa área de entrega. Escolha retirada na loja.": { en: "Your address is outside our delivery area. Please choose store pickup.", es: "Tu dirección está fuera de nuestra zona de entrega. Elige retiro en la tienda." },
  "Informe o bairro.": { en: "Please enter the neighborhood.", es: "Ingresa el barrio." },
  "É preciso aceitar o uso dos dados para o pedido.": { en: "You need to accept the use of your data to place the order.", es: "Debes aceptar el uso de tus datos para hacer el pedido." },
  "Não foi possível enviar.": { en: "Couldn't send. Please try again.", es: "No se pudo enviar. Inténtalo de nuevo." },
  "Dados inválidos.": { en: "Invalid data. Please check the form.", es: "Datos inválidos. Revisa el formulario." },
  "Escolha uma forma de pagamento.": { en: "Please choose a payment method.", es: "Elige una forma de pago." },
  "Essa forma de pagamento não está disponível.": { en: "This payment method isn't available.", es: "Esta forma de pago no está disponible." },
  "Este pedido não está mais aguardando confirmação. Atualize a página.": { en: "This order is no longer waiting for confirmation. Please refresh the page.", es: "Este pedido ya no está esperando confirmación. Actualiza la página." },
  "Pedido inválido.": { en: "Invalid order.", es: "Pedido inválido." },
  "Pedido não encontrado.": { en: "Order not found.", es: "Pedido no encontrado." },
  "Não foi possível registrar. Atualize a página.": { en: "Couldn't save that. Please refresh the page.", es: "No se pudo registrar. Actualiza la página." },
  "Este pedido não pode mais ser alterado por aqui. Fale com a loja no WhatsApp.": { en: "This order can no longer be changed here. Please message the store on WhatsApp.", es: "Este pedido ya no se puede cambiar por aquí. Escribe a la tienda por WhatsApp." },
  "Marque o que você quer tirar do pedido.": { en: "Select what you want to remove from the order.", es: "Marca lo que quieres quitar del pedido." },
  "Para desistir do pedido inteiro, fale com a loja no WhatsApp.": { en: "To cancel the whole order, please message the store on WhatsApp.", es: "Para cancelar todo el pedido, escribe a la tienda por WhatsApp." },
  "Escolha pelo menos um produto.": { en: "Choose at least one product.", es: "Elige al menos un producto." },
  "Este pedido já foi pago. Faça um pedido novo para os itens extras.": { en: "This order has already been paid. Please place a new order for the extra items.", es: "Este pedido ya fue pagado. Haz un pedido nuevo para los productos extra." },
  "Este pedido não aceita mais itens.": { en: "This order can't take more items.", es: "Este pedido ya no acepta más productos." },
  "Escreva a mensagem ou anexe um arquivo.": { en: "Type a message or attach a file.", es: "Escribe un mensaje o adjunta un archivo." },
  "Muitas mensagens seguidas. Aguarde a resposta da loja.": { en: "Too many messages in a row. Please wait for the store to reply.", es: "Demasiados mensajes seguidos. Espera la respuesta de la tienda." },
  "Este pedido foi cancelado. Fale com a loja pelo WhatsApp.": { en: "This order was canceled. Please message the store on WhatsApp.", es: "Este pedido fue cancelado. Escribe a la tienda por WhatsApp." },
  "Arquivo vazio.": { en: "Empty file.", es: "Archivo vacío." },
  "Arquivo acima de 5 MB.": { en: "File is larger than 5 MB.", es: "El archivo supera los 5 MB." },
  "Envie uma foto (JPG, PNG, WebP) ou um PDF.": { en: "Please send a photo (JPG, PNG, WebP) or a PDF.", es: "Envía una foto (JPG, PNG, WebP) o un PDF." },
  "Marque que aceita receber as ofertas.": { en: "Please check the box to agree to receive deals.", es: "Marca que aceptas recibir las ofertas." },
};

const PADROES: { re: RegExp; en: (m: RegExpMatchArray) => string; es: (m: RegExpMatchArray) => string }[] = [
  { re: /^(.+) acabou de esgotar\. Ajuste (?:o carrinho|os itens)\.$/, en: (m) => `${m[1]} just sold out. Please adjust your items.`, es: (m) => `${m[1]} se acaba de agotar. Ajusta los productos.` },
  { re: /^(.+): só há (\d+) disponível\(is\)\.$/, en: (m) => `${m[1]}: only ${m[2]} available.`, es: (m) => `${m[1]}: solo hay ${m[2]} disponible(s).` },
  { re: /^Pedido mínimo para entrega: (.+)\.?$/, en: (m) => `Minimum order for delivery: ${m[1]}`, es: (m) => `Pedido mínimo para entrega: ${m[1]}` },
];

export function traduzirErro(msg: string, idioma: Idioma): string {
  if (idioma === "pt" || !msg) return msg;
  const f = FIXAS[msg];
  if (f) return f[idioma];
  for (const p of PADROES) {
    const m = msg.match(p.re);
    if (m) return p[idioma](m);
  }
  return msg;
}
