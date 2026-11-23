import { describe, expect, it } from "vitest";
import { cnpjValido, formatarCnpj } from "./cnpj";

describe("CNPJ", () => {
  it("aceita CNPJ com dígitos corretos, com ou sem máscara", () => {
    // CNPJ de exemplo da documentação da Receita (dígitos verificadores corretos).
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
  });
  it("recusa dígito errado, tamanho errado e números repetidos", () => {
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("00.000.000/0000-00")).toBe(false);
  });
  it("formata com a máscara padrão", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});
