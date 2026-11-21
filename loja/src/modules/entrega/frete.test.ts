import { describe, expect, it } from "vitest";
import { distanciaEntregaMetros, distanciaRetaMetros, entregaDisponivel, ENTREGA_PADRAO, escolherFaixa, normalizarCep, raioMaximoKm, type Faixa } from "./frete";

const faixas: Faixa[] = [
  { ateKm: 6, taxaCentavos: 800, prazo: "até 60 min", pedidoMinimoCentavos: 0 },
  { ateKm: 3, taxaCentavos: 500, prazo: "até 40 min", pedidoMinimoCentavos: 0 },
  { ateKm: 10, taxaCentavos: 1200, prazo: "até 90 min", pedidoMinimoCentavos: 10000 },
];

describe("frete por distância", () => {
  it("haversine: 1 grau de latitude ≈ 111 km", () => {
    const m = distanciaRetaMetros({ lat: -8, lng: -35 }, { lat: -9, lng: -35 });
    expect(m).toBeGreaterThan(110_000);
    expect(m).toBeLessThan(112_000);
  });
  it("aplica o fator de rota e protege valores absurdos", () => {
    const a = { lat: -8.1, lng: -34.9 };
    const b = { lat: -8.12, lng: -34.9 };
    const reta = distanciaRetaMetros(a, b);
    expect(distanciaEntregaMetros(a, b, 1.5)).toBe(Math.round(reta * 1.5));
    expect(distanciaEntregaMetros(a, b, 99)).toBe(Math.round(reta * 1.3));
  });
  it("escolhe a menor faixa que cobre a distância, independentemente da ordem cadastrada", () => {
    expect(escolherFaixa(2_000, faixas)?.taxaCentavos).toBe(500);
    expect(escolherFaixa(3_000, faixas)?.taxaCentavos).toBe(500);
    expect(escolherFaixa(3_001, faixas)?.taxaCentavos).toBe(800);
    expect(escolherFaixa(9_500, faixas)?.taxaCentavos).toBe(1200);
  });
  it("fora do raio máximo não atende", () => {
    expect(escolherFaixa(10_001, faixas)).toBeNull();
    expect(raioMaximoKm(faixas)).toBe(10);
  });
  it("entrega só fica disponível com loja localizada e faixas", () => {
    expect(entregaDisponivel(ENTREGA_PADRAO)).toBe(false);
    expect(entregaDisponivel({ ...ENTREGA_PADRAO, ativa: true, lat: -8, lng: -35, faixas })).toBe(true);
    expect(entregaDisponivel({ ...ENTREGA_PADRAO, ativa: true, lat: null, lng: null, faixas })).toBe(false);
  });
  it("normaliza CEP", () => {
    expect(normalizarCep("54.420-010")).toBe("54420010");
    expect(normalizarCep("123")).toBeNull();
  });
});
