import { describe, expect, it } from "vitest";
import { crc16, lerPixCopiaECola, limparTexto, pixCopiaECola } from "./pix";

describe("Pix copia e cola (BR Code)", () => {
  it("CRC16 confere com o exemplo do manual do Banco Central", () => {
    const semCrc = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16(semCrc)).toBe("1D3D");
  });
  it("monta o código com valor, nome, cidade e identificador do pedido", () => {
    const c = pixCopiaECola({ chave: "loja@exemplo.com", nome: "Prime Grill Paiva", cidade: "Cabo de Santo Agostinho", valorCentavos: 23117, txid: "PG-XJEU84" });
    expect(c.startsWith("000201")).toBe(true);
    expect(c).toContain("0014br.gov.bcb.pix0116loja@exemplo.com");
    expect(c).toContain("5406231.17");
    expect(c).toContain("5917PRIME GRILL PAIVA");
    expect(c).toContain("6015CABO DE SANTO A");
    expect(c).toContain("0508PGXJEU84");
    expect(c.slice(-8, -4)).toBe("6304");
    expect(crc16(c.slice(0, -4))).toBe(c.slice(-4));
  });
  it("tira acentos e exige chave", () => {
    expect(limparTexto("São José", 25)).toBe("SAO JOSE");
    expect(() => pixCopiaECola({ chave: " ", nome: "x", cidade: "y" })).toThrow();
  });
});

describe("Pix colado da maquininha", () => {
  const c = pixCopiaECola({ chave: "loja@exemplo.com", nome: "Prime Grill", cidade: "Recife", valorCentavos: 96681, txid: "PGABC123" });
  it("aceita código válido e lê o valor", () => {
    const r = lerPixCopiaECola(` ${c.slice(0, 30)}
${c.slice(30)} `);
    expect(r).toEqual({ ok: true, codigo: c, valorCentavos: 96681 });
  });
  it("recusa código cortado ou que não é Pix", () => {
    expect(lerPixCopiaECola(c.slice(0, -1)).ok).toBe(false);
    expect(lerPixCopiaECola("https://pagamento.exemplo.com").ok).toBe(false);
  });
  it("aceita Pix sem valor (valor fica nulo)", () => {
    const sem = pixCopiaECola({ chave: "loja@exemplo.com", nome: "Prime Grill", cidade: "Recife" });
    expect(lerPixCopiaECola(sem)).toMatchObject({ ok: true, valorCentavos: null });
  });
});
