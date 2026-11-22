import type { Papel } from "@/db/schema";

/**
 * O que cada papel pode fazer no painel.
 * - DONO: tudo, inclusive usuários e chave Pix.
 * - GERENTE: operação completa, sem usuários e sem dados de pagamento.
 * - ATENDENTE: pedidos do dia a dia e marcar produto esgotado; vê o estoque.
 */
export const PERMISSOES = {
  pedidos: ["DONO", "GERENTE", "ATENDENTE"],
  /** Mudar status à mão e cancelar (cancelar devolve estoque). */
  pedidosAjusteManual: ["DONO", "GERENTE"],
  produtosEditar: ["DONO", "GERENTE"],
  produtosDisponibilidade: ["DONO", "GERENTE", "ATENDENTE"],
  estoqueVer: ["DONO", "GERENTE", "ATENDENTE"],
  estoqueAjustar: ["DONO", "GERENTE"],
  notas: ["DONO", "GERENTE"],
  lojaEntregas: ["DONO", "GERENTE"],
  pagamento: ["DONO"],
  usuarios: ["DONO"],
  /** Studio: folder automático (STU-002). */
  folder: ["DONO", "GERENTE"],
} as const satisfies Record<string, readonly Papel[]>;

export type Permissao = keyof typeof PERMISSOES;

export function pode(papel: Papel, p: Permissao): boolean {
  return (PERMISSOES[p] as readonly Papel[]).includes(papel);
}

export const ROTULO_PAPEL: Record<Papel, { texto: string; descricao: string }> = {
  DONO: { texto: "Dono", descricao: "Tudo, inclusive usuários e chave Pix" },
  GERENTE: { texto: "Gerente", descricao: "Pedidos, produtos, estoque, notas e entregas" },
  ATENDENTE: { texto: "Atendente", descricao: "Pedidos, pesagem, cobrança e marcar esgotado" },
};

/** Regra de senha do painel. Devolve o motivo quando não serve. */
export function problemaNaSenha(senha: string, email = ""): string | null {
  if (senha.length < 10) return "A senha precisa ter pelo menos 10 caracteres.";
  if (senha.length > 72) return "A senha pode ter no máximo 72 caracteres.";
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  if (email && senha.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "A senha não pode conter o seu e-mail.";
  return null;
}
