import { describe, expect, it } from "vitest";
import {
  centavosCsv,
  diaValido,
  esperadoNoCaixa,
  FINANCEIRO_PADRAO,
  linhaCsv,
  percentualParaBps,
  periodo,
  prazoDaForma,
  precisaConciliar,
  resumir,
  somarDias,
  taxaDaForma,
} from "./financeiro";

const cfg = { ...FINANCEIRO_PADRAO, taxaDebitoBps: 99, taxaCreditoBps: 299, taxaLinkBps: 449 };

describe("Taxas e prazos", () => {
  it("calcula a taxa por forma e arredonda no centavo", () => {
    expect(taxaDaForma(cfg, "CARTAO_CREDITO", 15761)).toBe(471); // 2,99% de R$ 157,61
    expect(taxaDaForma(cfg, "CARTAO_DEBITO", 10000)).toBe(99);
    expect(taxaDaForma(cfg, "DINHEIRO", 10000)).toBe(0);
    expect(taxaDaForma(cfg, "PIX", 10000)).toBe(0);
  });
  it("prazo para cair na conta", () => {
    expect(prazoDaForma(cfg, "CARTAO_CREDITO")).toBe(30);
    expect(prazoDaForma(cfg, "PIX")).toBe(0);
    expect(somarDias("2026-11-27", 30)).toBe("2026-12-27");
    expect(somarDias("2026-02-27", 2)).toBe("2026-03-01");
  });
  it("dinheiro se confere no caixa, o resto no extrato", () => {
    expect(precisaConciliar("DINHEIRO")).toBe(false);
    expect(precisaConciliar("PIX")).toBe(true);
    expect(precisaConciliar("CARTAO_LINK")).toBe(true);
  });
  it("lê percentual digitado", () => {
    expect(percentualParaBps("2,99")).toBe(299);
    expect(percentualParaBps("4.49%")).toBe(449);
    expect(percentualParaBps("")).toBe(0);
    expect(percentualParaBps("abc")).toBeNull();
    expect(percentualParaBps("150")).toBeNull();
  });
});

describe("Datas e período", () => {
  it("valida datas e usa o mês atual por padrão", () => {
    expect(diaValido("2026-02-30")).toBe(false);
    expect(diaValido("2026-11-27")).toBe(true);
    expect(periodo(undefined, undefined, "2026-11-27")).toEqual({ de: "2026-11-01", ate: "2026-11-27" });
    expect(periodo("2026-11-20", "2026-11-01", "2026-11-27")).toEqual({ de: "2026-11-01", ate: "2026-11-20" });
  });
});

describe("Caixa", () => {
  it("esperado na gaveta", () => {
    const v = esperadoNoCaixa(
      10000,
      [
        { tipo: "SUPRIMENTO", valorCentavos: 5000 },
        { tipo: "SANGRIA", valorCentavos: 20000 },
      ],
      [
        { tipo: "RECEITA", valorCentavos: 30000, status: "QUITADO" },
        { tipo: "RECEITA", valorCentavos: 9999, status: "CANCELADO" },
        { tipo: "DESPESA", valorCentavos: 1500, status: "QUITADO" },
      ],
    );
    expect(v).toBe(10000 + 5000 - 20000 + 30000 - 1500);
  });
});

describe("Resumo do período", () => {
  it("separa bruto, taxas, CMV, despesas e resultado", () => {
    const r = resumir(
      [
        { tipo: "RECEITA", categoria: "VENDA", forma: "PIX", valorCentavos: 20000, taxaCentavos: 0, status: "QUITADO", pedidoId: 1 },
        { tipo: "RECEITA", categoria: "VENDA", forma: "CARTAO_CREDITO", valorCentavos: 10000, taxaCentavos: 299, status: "QUITADO", pedidoId: 2 },
        { tipo: "RECEITA", categoria: "VENDA", forma: "PIX", valorCentavos: 5000, taxaCentavos: 0, status: "CANCELADO", pedidoId: 3 },
        { tipo: "DESPESA", categoria: "ENERGIA", forma: "PIX", valorCentavos: 4000, taxaCentavos: 0, status: "QUITADO", pedidoId: null },
        { tipo: "DESPESA", categoria: "ALUGUEL", forma: "BOLETO", valorCentavos: 90000, taxaCentavos: 0, status: "ABERTO", pedidoId: null },
      ],
      12000,
    );
    expect(r.bruto).toBe(30000);
    expect(r.taxas).toBe(299);
    expect(r.liquido).toBe(29701);
    expect(r.pedidos).toBe(2);
    expect(r.ticketMedio).toBe(15000);
    expect(r.margemBruta).toBe(18000);
    expect(r.despesas).toBe(4000);
    expect(r.resultado).toBe(29701 - 12000 - 4000);
    expect(r.porForma[0][0]).toBe("PIX");
  });
});

describe("CSV para o contador", () => {
  it("usa ; e protege contra fórmula", () => {
    expect(linhaCsv(["Venda; PG-1", "=HYPERLINK(1)", "-12,50", null])).toBe('"Venda; PG-1";\'=HYPERLINK(1);-12,50;');
    expect(centavosCsv(15761)).toBe("157,61");
    expect(centavosCsv(-5)).toBe("-0,05");
  });
});
