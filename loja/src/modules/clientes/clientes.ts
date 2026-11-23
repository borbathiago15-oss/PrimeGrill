/**
 * Clientes da loja: não há cadastro separado; o cliente é identificado pelo celular dos pedidos
 * (loja online, WhatsApp ou balcão).
 */

export const NOME_ANONIMO = "Cliente removido (LGPD)";

export function digitosCelular(celular: string): string {
  const d = celular.replace(/\D/g, "");
  return d.length === 13 && d.startsWith("55") ? d.slice(2) : d;
}

export type PedidoResumo = {
  id: number;
  clienteNome: string;
  clienteCelular: string;
  status: string;
  totalFinalCentavos: number | null;
  totalEstimadoCentavos: number;
  criadoEm: Date;
  anonimizadoEm: Date | null;
};

export type Cliente = { celular: string; nome: string; pedidos: number; concluidos: number; totalCentavos: number; ultimo: Date; abertos: number };

const ABERTOS = ["NOVO", "EM_SEPARACAO", "AGUARDANDO_CLIENTE", "CONFIRMADO"];

/** Agrupa os pedidos por celular; o nome mostrado é o do pedido mais recente. Pedidos anonimizados ficam de fora. */
export function agruparClientes(pedidos: PedidoResumo[]): Cliente[] {
  const mapa = new Map<string, Cliente>();
  for (const p of [...pedidos].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())) {
    if (p.anonimizadoEm) continue;
    const cel = digitosCelular(p.clienteCelular);
    if (!cel) continue;
    const c = mapa.get(cel) ?? { celular: cel, nome: p.clienteNome, pedidos: 0, concluidos: 0, totalCentavos: 0, ultimo: p.criadoEm, abertos: 0 };
    c.pedidos++;
    if (p.status === "CONCLUIDO") {
      c.concluidos++;
      c.totalCentavos += p.totalFinalCentavos ?? p.totalEstimadoCentavos;
    }
    if (ABERTOS.includes(p.status)) c.abertos++;
    mapa.set(cel, c);
  }
  return [...mapa.values()].sort((a, b) => b.ultimo.getTime() - a.ultimo.getTime());
}

/** Filtro da busca: por nome (sem acento) ou por parte do celular. */
export function filtrarClientes(lista: Cliente[], busca: string): Cliente[] {
  const b = busca.trim();
  if (!b) return lista;
  const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const dig = b.replace(/\D/g, "");
  return lista.filter((c) => semAcento(c.nome).includes(semAcento(b)) || (dig.length >= 3 && c.celular.includes(dig)));
}

/** O que vai no lugar dos dados pessoais do pedido (valores, itens e estoque ficam). */
export function camposAnonimos(agora: Date) {
  return {
    clienteNome: NOME_ANONIMO,
    clienteCelular: "",
    cep: null,
    endereco: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    observacao: "",
    optinWhatsapp: false,
    anonimizadoEm: agora,
  };
}
