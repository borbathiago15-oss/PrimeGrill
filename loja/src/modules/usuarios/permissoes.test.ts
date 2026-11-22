import { describe, expect, it } from "vitest";
import { pode, problemaNaSenha } from "./permissoes";

describe("Permissões por papel", () => {
  it("atendente cuida dos pedidos mas não mexe em preço, notas, Pix nem usuários", () => {
    expect(pode("ATENDENTE", "pedidos")).toBe(true);
    expect(pode("ATENDENTE", "produtosDisponibilidade")).toBe(true);
    expect(pode("ATENDENTE", "produtosEditar")).toBe(false);
    expect(pode("ATENDENTE", "notas")).toBe(false);
    expect(pode("ATENDENTE", "pagamento")).toBe(false);
    expect(pode("ATENDENTE", "usuarios")).toBe(false);
    expect(pode("ATENDENTE", "pedidosAjusteManual")).toBe(false);
  });
  it("gerente opera tudo menos usuários e Pix; dono pode tudo", () => {
    expect(pode("GERENTE", "notas")).toBe(true);
    expect(pode("GERENTE", "estoqueAjustar")).toBe(true);
    expect(pode("GERENTE", "usuarios")).toBe(false);
    expect(pode("GERENTE", "pagamento")).toBe(false);
    expect(pode("DONO", "usuarios")).toBe(true);
    expect(pode("DONO", "pagamento")).toBe(true);
  });
});

describe("Regra de senha", () => {
  it("exige tamanho, letras e números", () => {
    expect(problemaNaSenha("curta1")).toMatch(/10/);
    expect(problemaNaSenha("somenteletras")).toMatch(/números/);
    expect(problemaNaSenha("Picanha2026forte")).toBeNull();
  });
  it("não aceita o próprio e-mail na senha", () => {
    expect(problemaNaSenha("joana12345", "joana@loja.com")).toMatch(/e-mail/);
  });
});
