/** Leitura de NF-e (modelo 55) em XML — REC-001, canal 2. */
import { XMLParser } from "fast-xml-parser";

export type ItemNota = { codigo: string; descricao: string; unidade: string; quantidadeMil: number; valorTotalCentavos: number; ean: string };
export type NotaLida = {
  chave: string;
  numero: string;
  serie: string;
  emissao: string; // ISO yyyy-mm-dd
  emitente: { cnpj: string; nome: string };
  destinatarioCnpj: string;
  itens: ItemNota[];
  valorTotalCentavos: number;
};

/** "20.0000" → 20000 (milésimos), sem ponto flutuante. */
export function decimalParaMilesimos(v: unknown): number {
  const s = String(v ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Quantidade inválida: ${s}`);
  const [i, f = ""] = s.split(".");
  return Number(i) * 1000 + Number((f + "000").slice(0, 3));
}

/** "1300.50" → 130050 centavos. */
export function decimalParaCentavos(v: unknown): number {
  const s = String(v ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Valor inválido: ${s}`);
  const [i, f = ""] = s.split(".");
  return Number(i) * 100 + Number((f + "00").slice(0, 2));
}

const lista = <T,>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

export function lerNotaXml(xml: string): NotaLida {
  if (xml.length > 2_000_000) throw new Error("Arquivo XML muito grande.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("XML com declarações não permitidas.");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", parseTagValue: false, removeNSPrefix: true });
  const raiz = parser.parse(xml);
  const nfe = raiz?.nfeProc?.NFe ?? raiz?.NFe;
  const inf = nfe?.infNFe;
  if (!inf) throw new Error("Não é um XML de NF-e (infNFe não encontrado).");
  const chave = String(inf["@Id"] ?? "").replace(/^NFe/, "");
  if (!/^\d{44}$/.test(chave)) throw new Error("Chave de acesso inválida no XML.");
  const ide = inf.ide ?? {};
  const emit = inf.emit ?? {};
  const itens = lista(inf.det).map((d: Record<string, any>) => {
    const p = d.prod ?? {};
    return {
      codigo: String(p.cProd ?? "").trim(),
      descricao: String(p.xProd ?? "").trim(),
      unidade: String(p.uCom ?? "").trim().toUpperCase(),
      quantidadeMil: decimalParaMilesimos(p.qCom),
      valorTotalCentavos: decimalParaCentavos(p.vProd),
      ean: /^\d{8,14}$/.test(String(p.cEAN ?? "")) ? String(p.cEAN) : "",
    };
  });
  if (itens.length === 0) throw new Error("A nota não tem itens.");
  return {
    chave,
    numero: String(ide.nNF ?? ""),
    serie: String(ide.serie ?? ""),
    emissao: String(ide.dhEmi ?? ide.dEmi ?? "").slice(0, 10),
    emitente: { cnpj: String(emit.CNPJ ?? emit.CPF ?? ""), nome: String(emit.xNome ?? "").trim() },
    destinatarioCnpj: String(inf.dest?.CNPJ ?? ""),
    itens,
    valorTotalCentavos: decimalParaCentavos(inf.total?.ICMSTot?.vNF ?? "0"),
  };
}

/** Valida a chave de acesso pelo dígito verificador (módulo 11). */
export function chaveValida(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  const corpo = chave.slice(0, 43);
  let soma = 0;
  let peso = 2;
  for (let i = corpo.length - 1; i >= 0; i--) {
    soma += Number(corpo[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(chave[43]);
}
