import { describe, expect, it } from "vitest";
import type { ItemFolder } from "@/db/schema";
import { montarPaginas, mudancasDesde, precoFolder, validarProdutos, type ProdutoCandidato } from "./folder";

const item = (id: number, tipoVenda: "PECA" | "PACOTE" = "PECA"): ItemFolder => ({ id, nome: `P${id}`, tipoVenda, precoCentavos: 10000 + id, fotoUrl: `/f${id}.webp`, pesoNominal: null });
const lista = (n: number) => Array.from({ length: n }, (_, i) => item(i + 1));
const forma = (n: number) => montarPaginas(lista(n), "ENCARTE").map((p) => p.linhas.map((l) => `${l.tipo[0]}${l.itens.length}`).join(" "));

describe("Grade automática do encarte (STU-002 §4)", () => {
  it("11 produtos: 2 linhas de 4 verticais + 1 linha de 3 horizontais", () => {
    expect(forma(11)).toEqual(["v4 v4 h3"]);
  });
  it("4 a 8 em linhas de 4; 12 vira 3 linhas de 4", () => {
    expect(forma(6)).toEqual(["v4 v2"]);
    expect(forma(8)).toEqual(["v4 v4"]);
    expect(forma(12)).toEqual(["v4 v4 v4"]);
  });
  it("até 3 produtos em cards grandes; acima de 12 abre nova página", () => {
    expect(forma(2)).toEqual(["g2"]);
    expect(forma(14)).toEqual(["v4 v4 v4", "g2"]);
  });
  it("feed e story levam no máximo 4", () => {
    expect(montarPaginas(lista(7), "FEED")[0].linhas.flatMap((l) => l.itens)).toHaveLength(4);
  });
});

describe("Preço e validação", () => {
  it("pacote sai com '· PACOTE' e sem KG", () => {
    expect(precoFolder({ tipoVenda: "PACOTE", precoCentavos: 8990 })).toEqual({ valor: "89,90", unidade: "· PACOTE" });
    expect(precoFolder({ tipoVenda: "PECA", precoCentavos: 11940 })).toEqual({ valor: "119,40", unidade: "KG" });
  });
  it("exclui sem preço, sem estoque, sem foto ou indisponível, dizendo o motivo", () => {
    const base: ProdutoCandidato = { id: 1, nome: "A", tipoVenda: "PECA", precoCentavos: 100, fotoUrl: "/a.webp", pesoNominal: null, ativo: true, disponivel: true, controlaEstoque: false, quantidadeDisponivel: null };
    const r = validarProdutos([
      base,
      { ...base, id: 2, nome: "B", precoCentavos: 0 },
      { ...base, id: 3, nome: "C", controlaEstoque: true, quantidadeDisponivel: 0 },
      { ...base, id: 4, nome: "D", fotoUrl: null },
      { ...base, id: 5, nome: "E", disponivel: false },
    ]);
    expect(r.ok.map((x) => x.id)).toEqual([1]);
    expect(r.fora.map((x) => x.motivo)).toEqual(["sem preço", "sem estoque", "sem foto", "marcado como indisponível"]);
  });
  it("aponta folder desatualizado quando o preço muda", () => {
    const g = [item(1)];
    const atual: ProdutoCandidato = { ...g[0], ativo: true, disponivel: true, controlaEstoque: false, quantidadeDisponivel: null, precoCentavos: 12000 };
    expect(mudancasDesde(g, [atual])[0]).toMatch(/preço mudou/);
    expect(mudancasDesde(g, [{ ...atual, precoCentavos: g[0].precoCentavos }])).toEqual([]);
  });
});
