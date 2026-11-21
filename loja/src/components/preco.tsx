import { formatarReais, formatarValor } from "@/modules/dinheiro";
import { valorAproximadoPeca } from "@/modules/pedidos/calculo";

type P = { tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; pesoMedioGramas: number | null };

/** Formato de preço do DS-001 §7: "R$ 119,40 KG" ou "R$ 89,90 · PACOTE". */
export function Preco({ p, grande }: { p: P; grande?: boolean }) {
  return (
    <span className="preco num" style={grande ? { fontSize: 32 } : undefined}>
      R$ {formatarValor(p.precoCentavos)} <small>{p.tipoVenda === "PECA" ? "KG" : "· PACOTE"}</small>
    </span>
  );
}

export function textoAproximado(p: P): string {
  if (p.tipoVenda === "PACOTE") return "preço final";
  const aprox = valorAproximadoPeca(p.precoCentavos, p.pesoMedioGramas);
  return aprox ? `aprox. ${formatarReais(aprox)} a peça · valor final após pesagem` : "peça inteira · valor final após pesagem";
}

export function textoDisponivel(p: { tipoVenda: "PECA" | "PACOTE"; disponivel: boolean; quantidadeDisponivel: number | null }) {
  if (!p.disponivel || p.quantidadeDisponivel === 0) return null;
  if (p.quantidadeDisponivel === null) return "Disponível";
  const n = p.quantidadeDisponivel;
  return p.tipoVenda === "PECA" ? `${n} ${n === 1 ? "peça disponível" : "peças disponíveis"}` : `${n} ${n === 1 ? "disponível" : "disponíveis"}`;
}
