import { describe, expect, it } from "vitest";
import { idiomaDoNavegador } from "./idiomas";
import { TEXTOS } from "./textos";
import { traduzirErro } from "./erros";
import { formatarCelular, normalizarCelular, numeroWhatsapp } from "@/modules/pedidos/whatsapp";
import { digitosCelular } from "@/modules/clientes/clientes";

describe("Idioma pelo navegador", () => {
  it("respeita a preferência do celular entre PT, EN e ES", () => {
    expect(idiomaDoNavegador("es-AR,es;q=0.9,en;q=0.8")).toBe("es");
    expect(idiomaDoNavegador("en-US,en;q=0.9")).toBe("en");
    expect(idiomaDoNavegador("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt");
  });
  it("turista com outro idioma cai em inglês; sem cabeçalho fica em português", () => {
    expect(idiomaDoNavegador("fr-FR,fr;q=0.9")).toBe("en");
    expect(idiomaDoNavegador("de-DE,de;q=0.9,es;q=0.5")).toBe("es");
    expect(idiomaDoNavegador(null)).toBe("pt");
  });
});

describe("Dicionário", () => {
  it("os três idiomas têm as mesmas chaves", () => {
    const chaves = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? chaves(v).map((c) => `${k}.${c}`) : [k])).sort();
    expect(chaves(TEXTOS.en)).toEqual(chaves(TEXTOS.pt));
    expect(chaves(TEXTOS.es)).toEqual(chaves(TEXTOS.pt));
  });
  it("situação da loja em cada idioma", () => {
    const s = { tipo: "abre" as const, dia: 1, amanha: true, hora: "09:00" };
    expect(TEXTOS.pt.loja.situacao(s)).toBe("Abre amanhã às 09:00");
    expect(TEXTOS.en.loja.situacao(s)).toBe("Opens tomorrow at 09:00");
    expect(TEXTOS.es.loja.situacao(s)).toBe("Abre mañana a las 09:00");
  });
});

describe("Erros do servidor traduzidos", () => {
  it("traduz mensagens fixas e com nome de produto", () => {
    expect(traduzirErro("CEP não encontrado. Confira o número.", "en")).toBe("ZIP code not found. Please check the number.");
    expect(traduzirErro("Picanha acabou de esgotar. Ajuste os itens.", "es")).toBe("Picanha se acaba de agotar. Ajusta los productos.");
    expect(traduzirErro("Mensagem desconhecida", "en")).toBe("Mensagem desconhecida");
    expect(traduzirErro("CEP não encontrado. Confira o número.", "pt")).toBe("CEP não encontrado. Confira o número.");
  });
});

describe("Celular de turista (número estrangeiro)", () => {
  it("aceita +código do país e mantém o Brasil como antes", () => {
    expect(normalizarCelular("+1 (305) 555-0100")).toBe("+13055550100");
    expect(normalizarCelular("0054 11 5555 0100")).toBe("+541155550100");
    expect(normalizarCelular("+55 81 99899 0694")).toBe("81998990694");
    expect(normalizarCelular("(81) 99899-0694")).toBe("81998990694");
    expect(normalizarCelular("+1 23")).toBeNull();
  });
  it("monta o link do WhatsApp e a identidade do cliente para os dois casos", () => {
    expect(numeroWhatsapp("+13055550100")).toBe("13055550100");
    expect(numeroWhatsapp("(81) 99899-0694")).toBe("5581998990694");
    expect(formatarCelular("+13055550100")).toBe("+13055550100");
    expect(digitosCelular("+13055550100")).toBe("+13055550100");
    expect(digitosCelular("(81) 99899-0694")).toBe("81998990694");
  });
});
