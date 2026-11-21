import { describe, expect, it } from "vitest";
import { dividirMeioPar, kgParaGramas, reaisParaCentavos, valorPorPeso } from "./dinheiro";
import { calcularPedido, type ProdutoParaCalculo } from "./pedidos/calculo";
import { linkWhatsapp, mensagemPedido, normalizarCelular } from "./pedidos/whatsapp";
import { CONFIG_PADRAO, situacaoLoja } from "./loja/horario";

const picanha: ProdutoParaCalculo = { id: 1, nome: "Picanha Argentina", tipoVenda: "PECA", precoCentavos: 11940, pesoMedioGramas: 1320, ativo: true, disponivel: true, quantidadeDisponivel: 9 };
const costela: ProdutoParaCalculo = { id: 2, nome: "Costela Suína", tipoVenda: "PACOTE", precoCentavos: 2690, pesoMedioGramas: null, ativo: true, disponivel: true, quantidadeDisponivel: null };
const semPeso: ProdutoParaCalculo = { ...picanha, id: 3, nome: "Maminha", pesoMedioGramas: null };
const mapa = new Map([picanha, costela, semPeso].map((p) => [p.id, p]));

describe("ADR-004 — dinheiro e peso", () => {
  it("1.500 g × R$ 159,90/kg = R$ 239,85", () => expect(valorPorPeso(1500, 15990)).toBe(23985));
  it("1.385 g × R$ 119,40/kg = R$ 165,37", () => expect(valorPorPeso(1385, 11940)).toBe(16537));
  it("custo médio: 40 kg por R$ 2.700,00 = R$ 67,50/kg", () => expect(Number(dividirMeioPar(270000n * 1000n, 40000n))).toBe(6750));
  it("arredonda meio-par", () => {
    expect(dividirMeioPar(5n, 2n)).toBe(2n);
    expect(dividirMeioPar(7n, 2n)).toBe(4n);
  });
  it("recusa peso fracionado", () => expect(() => valorPorPeso(1.5, 100)).toThrow());
  it("converte reais e kg do formulário", () => {
    expect(reaisParaCentavos("119,40")).toBe(11940);
    expect(reaisParaCentavos("1.234,5")).toBe(123450);
    expect(reaisParaCentavos("abc")).toBeNull();
    expect(kgParaGramas("1,32")).toBe(1320);
  });
});

describe("cálculo do pedido", () => {
  it("peça estimada pelo peso médio + pacote exato + frete", () => {
    const r = calcularPedido([{ produtoId: 1, quantidade: 1 }, { produtoId: 2, quantidade: 2 }], mapa, "ENTREGA", { taxaCentavos: 990, pedidoMinimoCentavos: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.itens[0].valorCentavos).toBe(15761); // 1.320 g × 119,40
    expect(r.subtotalCentavos).toBe(15761 + 5380);
    expect(r.totalCentavos).toBe(15761 + 5380 + 990);
    expect(r.temItemPesado).toBe(true);
  });
  it("peça sem peso médio deixa o subtotal incompleto", () => {
    const r = calcularPedido([{ produtoId: 3, quantidade: 1 }], mapa, "RETIRADA", null);
    expect(r.ok && r.subtotalIncompleto).toBe(true);
  });
  it("recusa produto indisponível e quantidade acima do estoque", () => {
    const m = new Map(mapa);
    m.set(2, { ...costela, disponivel: false });
    expect(calcularPedido([{ produtoId: 2, quantidade: 1 }], m, "RETIRADA", null).ok).toBe(false);
    expect(calcularPedido([{ produtoId: 1, quantidade: 10 }], mapa, "RETIRADA", null).ok).toBe(false);
  });
  it("entrega exige bairro e pedido mínimo", () => {
    expect(calcularPedido([{ produtoId: 2, quantidade: 1 }], mapa, "ENTREGA", null).ok).toBe(false);
    expect(calcularPedido([{ produtoId: 2, quantidade: 1 }], mapa, "ENTREGA", { taxaCentavos: 0, pedidoMinimoCentavos: 5000 }).ok).toBe(false);
  });
});

describe("WhatsApp", () => {
  it("monta mensagem com total estimado e aviso de pesagem", () => {
    const r = calcularPedido([{ produtoId: 1, quantidade: 1 }], mapa, "RETIRADA", null);
    if (!r.ok) throw new Error();
    const msg = mensagemPedido({ codigo: "PG-1001", modo: "RETIRADA", clienteNome: "Teste", clienteCelular: "(81) 99999-0000", observacao: "", ...r });
    expect(msg).toContain("PG-1001");
    expect(msg).toContain("R$ 119,40/kg");
    expect(msg).toContain("Total estimado");
    expect(msg).toContain("pesadas na separação");
    expect(linkWhatsapp("5581998990694", msg)).toMatch(/^https:\/\/wa\.me\/5581998990694\?text=/);
  });
  it("valida celular", () => {
    expect(normalizarCelular("(81) 99899-0694")).toBe("81998990694");
    expect(normalizarCelular("+55 81 99899 0694")).toBe("81998990694");
    expect(normalizarCelular("3333-4444")).toBeNull();
  });
});

describe("horário da loja (America/Recife)", () => {
  it("aberta às 10h de quarta, fechada às 20h, pausada sempre fechada", () => {
    const quarta10h = new Date("2026-11-18T13:00:00Z"); // 10:00 em Recife
    const quarta20h = new Date("2026-11-18T23:00:00Z"); // 20:00 em Recife
    expect(situacaoLoja(CONFIG_PADRAO, quarta10h).aberta).toBe(true);
    expect(situacaoLoja(CONFIG_PADRAO, quarta20h).aberta).toBe(false);
    expect(situacaoLoja({ ...CONFIG_PADRAO, pausada: true }, quarta10h).aberta).toBe(false);
  });
});
