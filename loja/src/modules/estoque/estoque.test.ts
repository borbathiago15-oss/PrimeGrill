import { describe, expect, it } from "vitest";
import { aplicarEntrada, aplicarSaida, custoMedio, disponivel, pendenteDeFechamento, pesoMedio, SALDO_ZERO, valorAceito } from "./saldo";
import { chaveValida, decimalParaCentavos, decimalParaMilesimos, lerNotaXml } from "../notas/xml";

describe("EST-001 — saldo e custo médio", () => {
  it("custo médio ponderado: 20 kg a R$ 1.300 + 20 kg a R$ 1.400 = R$ 67,50/kg", () => {
    let s = aplicarEntrada(SALDO_ZERO, { gramas: 20_000, pecas: 14 }, 130_000);
    s = aplicarEntrada(s, { gramas: 20_000, pecas: 15 }, 140_000);
    expect(s).toEqual({ gramas: 40_000, pecas: 29, unidades: 0, valorCentavos: 270_000 });
    expect(custoMedio(s, "PECA")).toBe(6750);
  });
  it("saída de peça baixa gramas, 1 peça e o valor pelo custo médio", () => {
    const s = aplicarEntrada(SALDO_ZERO, { gramas: 20_000, pecas: 14 }, 188_000); // R$ 94,00/kg
    const r = aplicarSaida(s, "PECA", { gramas: 1_385, pecas: 1 });
    expect(r.saldo.gramas).toBe(18_615);
    expect(r.saldo.pecas).toBe(13);
    expect(r.valorCentavos).toBe(13_019); // 1,385 kg × R$ 94,00 = R$ 130,19
    expect(custoMedio(r.saldo, "PECA")).toBe(9400);
  });
  it("pacote: baixa unidades", () => {
    const s = aplicarEntrada(SALDO_ZERO, { unidades: 24 }, 22_080);
    const r = aplicarSaida(s, "PACOTE", { unidades: 3 });
    expect(r.saldo.unidades).toBe(21);
    expect(r.valorCentavos).toBe(2_760);
    expect(custoMedio(r.saldo, "PACOTE")).toBe(920);
  });
  it("não permite saldo negativo", () => {
    const s = aplicarEntrada(SALDO_ZERO, { unidades: 2 }, 1_000);
    expect(() => aplicarSaida(s, "PACOTE", { unidades: 3 })).toThrow();
  });
  it("última saída leva todo o valor restante (sem centavo perdido)", () => {
    const s = aplicarEntrada(SALDO_ZERO, { gramas: 1_000, pecas: 1 }, 10_001);
    expect(aplicarSaida(s, "PECA", { gramas: 1_000, pecas: 1 }).valorCentavos).toBe(10_001);
  });
  it("0 peças com gramas sobrando exige fechamento como quebra", () => {
    expect(pendenteDeFechamento({ gramas: 420, pecas: 0, unidades: 0, valorCentavos: 3_948 }, "PECA")).toBe(true);
    expect(pendenteDeFechamento({ gramas: 0, pecas: 0, unidades: 0, valorCentavos: 0 }, "PECA")).toBe(false);
  });
  it("disponível desconta o reservado e peso médio vem do saldo", () => {
    const s = { gramas: 18_500, pecas: 13, unidades: 0, valorCentavos: 0 };
    expect(disponivel(s, "PECA", 2)).toBe(11);
    expect(disponivel(s, "PECA", 20)).toBe(0);
    expect(pesoMedio(s)).toBe(1_423);
  });
  it("valor aceito proporcional na divergência", () => {
    expect(valorAceito(17_500, 10_000, 9_000)).toBe(15_750);
    expect(valorAceito(17_500, 10_000, 10_000)).toBe(17_500);
  });
});

function chaveCom(dvBase: string) {
  let soma = 0;
  let peso = 2;
  for (let i = dvBase.length - 1; i >= 0; i--) {
    soma += Number(dvBase[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  return dvBase + (r < 2 ? 0 : 11 - r);
}

describe("REC-001 — leitura do XML da NF-e", () => {
  const chave = chaveCom("2611110000000000010055001000048215100000000");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${chave}" versao="4.00">
    <ide><nNF>48215</nNF><serie>1</serie><dhEmi>2026-11-20T10:15:00-03:00</dhEmi></ide>
    <emit><CNPJ>00000000000100</CNPJ><xNome>Distribuidora Teste</xNome></emit>
    <dest><CNPJ>11111111000111</CNPJ></dest>
    <det nItem="1"><prod><cProd>PIC-ARG</cProd><cEAN>SEM GTIN</cEAN><xProd>PICANHA ARG CX</xProd><uCom>KG</uCom><qCom>20.0000</qCom><vProd>1880.00</vProd></prod></det>
    <det nItem="2"><prod><cProd>COX-600</cProd><cEAN>7891234567895</cEAN><xProd>COXINHA ASA 600G</xProd><uCom>CX</uCom><qCom>2.0000</qCom><vProd>220.80</vProd></prod></det>
    <total><ICMSTot><vNF>2100.80</vNF></ICMSTot></total>
  </infNFe></NFe></nfeProc>`;

  it("lê cabeçalho, emitente e itens sem ponto flutuante", () => {
    const n = lerNotaXml(xml);
    expect(n.chave).toBe(chave);
    expect(n.numero).toBe("48215");
    expect(n.emissao).toBe("2026-11-20");
    expect(n.emitente).toEqual({ cnpj: "00000000000100", nome: "Distribuidora Teste" });
    expect(n.itens).toHaveLength(2);
    expect(n.itens[0]).toMatchObject({ codigo: "PIC-ARG", unidade: "KG", quantidadeMil: 20_000, valorTotalCentavos: 188_000, ean: "" });
    expect(n.itens[1]).toMatchObject({ unidade: "CX", quantidadeMil: 2_000, ean: "7891234567895" });
    expect(n.valorTotalCentavos).toBe(210_080);
  });
  it("valida a chave pelo dígito verificador", () => {
    expect(chaveValida(chave)).toBe(true);
    expect(chaveValida(chave.slice(0, 43) + ((Number(chave[43]) + 1) % 10))).toBe(false);
  });
  it("recusa XML que não é NF-e ou com DOCTYPE", () => {
    expect(() => lerNotaXml("<a/>")).toThrow();
    expect(() => lerNotaXml('<!DOCTYPE x [<!ENTITY e "x">]><NFe/>')).toThrow();
  });
  it("converte decimais", () => {
    expect(decimalParaMilesimos("1.385")).toBe(1_385);
    expect(decimalParaCentavos("26.9")).toBe(2_690);
  });
});
