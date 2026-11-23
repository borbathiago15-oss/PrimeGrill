import { describe, expect, it } from "vitest";
import { linkWhatsappPara, mensagemCampanha } from "./mensagem";

describe("Mensagem de campanha", () => {
  const base = { nome: "Joana Lima", mensagem: "Oi, {nome}! Chegaram as picanhas da semana.", site: "https://loja.exemplo", token: "abc123" };
  it("personaliza com o primeiro nome e sempre traz o link de descadastro", () => {
    const m = mensagemCampanha({ ...base, folderId: null });
    expect(m.startsWith("Oi, Joana! Chegaram")).toBe(true);
    expect(m).toContain("Peça pelo site: https://loja.exemplo");
    expect(m).toContain("Não quer mais receber? https://loja.exemplo/sair/abc123");
    expect(m).not.toContain("/ofertas/");
  });
  it("inclui o link público do folder quando há folder", () => {
    expect(mensagemCampanha({ ...base, folderId: 7 })).toContain("Veja o folder: https://loja.exemplo/ofertas/7");
  });
  it("gera link do WhatsApp com DDI do Brasil e texto codificado", () => {
    expect(linkWhatsappPara("81999990000", "Oi & tchau")).toBe("https://wa.me/5581999990000?text=Oi%20%26%20tchau");
  });
});
