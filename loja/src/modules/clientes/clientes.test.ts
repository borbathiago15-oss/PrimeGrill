import { describe, expect, it } from "vitest";
import { agruparClientes, camposAnonimos, digitosCelular, filtrarClientes, NOME_ANONIMO, type PedidoResumo } from "./clientes";

const ped = (id: number, nome: string, cel: string, status: string, dia: number, total = 10000, anon = false): PedidoResumo => ({
  id,
  clienteNome: nome,
  clienteCelular: cel,
  status,
  totalFinalCentavos: total,
  totalEstimadoCentavos: total,
  criadoEm: new Date(2026, 10, dia),
  anonimizadoEm: anon ? new Date() : null,
});

describe("Clientes pelo celular dos pedidos", () => {
  it("normaliza celular com ou sem DDI e máscara", () => {
    expect(digitosCelular("(81) 99999-0000")).toBe("81999990000");
    expect(digitosCelular("5581999990000")).toBe("81999990000");
  });
  it("agrupa pedidos do mesmo celular, usa o nome mais recente e soma só os concluídos", () => {
    const l = agruparClientes([
      ped(1, "Joana", "(81) 99999-0000", "CONCLUIDO", 1, 20000),
      ped(2, "Joana Lima", "81999990000", "EM_SEPARACAO", 5, 15000),
      ped(3, "Pedro", "(81) 98888-1111", "CANCELADO", 3),
    ]);
    expect(l).toHaveLength(2);
    expect(l[0]).toMatchObject({ celular: "81999990000", nome: "Joana Lima", pedidos: 2, concluidos: 1, totalCentavos: 20000, abertos: 1 });
  });
  it("pedidos já anonimizados não aparecem como cliente", () => {
    expect(agruparClientes([ped(1, NOME_ANONIMO, "", "CONCLUIDO", 1, 100, true)])).toEqual([]);
  });
  it("busca por nome sem acento ou por parte do celular", () => {
    const l = agruparClientes([ped(1, "José Antônio", "(81) 99999-0000", "CONCLUIDO", 1), ped(2, "Ana", "(81) 98888-1111", "CONCLUIDO", 2)]);
    expect(filtrarClientes(l, "jose").map((c) => c.nome)).toEqual(["José Antônio"]);
    expect(filtrarClientes(l, "8888").map((c) => c.nome)).toEqual(["Ana"]);
  });
  it("anonimização apaga nome, celular, endereço e observação", () => {
    const c = camposAnonimos(new Date());
    expect(c).toMatchObject({ clienteNome: NOME_ANONIMO, clienteCelular: "", endereco: null, bairro: null, cep: null, observacao: "", optinWhatsapp: false });
  });
});
