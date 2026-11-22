/**
 * Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central) a partir da chave da loja.
 * Não depende de provedor de pagamento: o valor e o identificador do pedido vão no próprio código.
 */

function campo(id: string, valor: string): string {
  const tam = String(valor.length).padStart(2, "0");
  if (valor.length > 99) throw new Error(`Campo ${id} longo demais`);
  return `${id}${tam}${valor}`;
}

/** Remove acentos e caracteres fora do padrão do BR Code. */
export function limparTexto(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), em 4 dígitos hexadecimais. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const ch of Buffer.from(texto, "utf8")) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type DadosPix = { chave: string; nome: string; cidade: string; valorCentavos?: number; txid?: string; descricao?: string };

export function pixCopiaECola(d: DadosPix): string {
  const chave = d.chave.trim();
  if (!chave) throw new Error("Chave Pix não configurada");
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave) + (d.descricao ? campo("02", limparTexto(d.descricao, 40)) : "");
  const txid = (d.txid ?? "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  let payload =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (d.valorCentavos && d.valorCentavos > 0 ? campo("54", (d.valorCentavos / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limparTexto(d.nome, 25) || "PRIME GRILL") +
    campo("60", limparTexto(d.cidade, 15) || "RECIFE") +
    campo("62", campo("05", txid));
  payload += "6304";
  return payload + crc16(payload);
}

/**
 * Lê um Pix copia e cola gerado fora do sistema (maquininha, app do banco).
 * Confere o formato e o dígito (CRC) e devolve o valor, quando o código traz valor.
 */
export function lerPixCopiaECola(bruto: string): { ok: true; codigo: string; valorCentavos: number | null } | { ok: false; erro: string } {
  const codigo = bruto.trim().split("").filter((ch) => ch >= " ").join("");
  if (!codigo.startsWith("000201") || codigo.length < 50 || codigo.length > 512) return { ok: false, erro: "Isso não parece um Pix copia e cola (começa com 000201)." };
  if (codigo.slice(-8, -4) !== "6304" || crc16(codigo.slice(0, -4)) !== codigo.slice(-4).toUpperCase())
    return { ok: false, erro: "O código Pix está incompleto ou foi copiado errado. Copie de novo da maquininha." };
  let i = 0;
  let valorCentavos: number | null = null;
  let temPix = false;
  while (i + 4 <= codigo.length - 8) {
    const id = codigo.slice(i, i + 2);
    const tam = Number(codigo.slice(i + 2, i + 4));
    if (!Number.isInteger(tam)) return { ok: false, erro: "Código Pix inválido." };
    const v = codigo.slice(i + 4, i + 4 + tam);
    if (id === "54") valorCentavos = Math.round(Number(v) * 100);
    if (Number(id) >= 26 && Number(id) <= 51 && v.toLowerCase().includes("br.gov.bcb.pix")) temPix = true;
    i += 4 + tam;
  }
  if (!temPix) return { ok: false, erro: "Esse código não é de Pix." };
  return { ok: true, codigo, valorCentavos: valorCentavos !== null && Number.isFinite(valorCentavos) ? valorCentavos : null };
}
