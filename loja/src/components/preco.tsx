import { TEXTOS, type Textos } from "@/modules/i18n/textos";
import { formatarReais, formatarValor } from "@/modules/dinheiro";
import { valorAproximadoPeca } from "@/modules/pedidos/calculo";

type P = { tipoVenda: "PECA" | "PACOTE"; precoCentavos: number; pesoMedioGramas: number | null };

/** Formato de preço do DS-001 §7: "R$ 119,40 KG" ou "R$ 89,90 · PACOTE". */
export function Preco({ p, grande, t = TEXTOS.pt }: { p: P; grande?: boolean; t?: Textos }) {
  return (
    <span className="preco num" style={grande ? { fontSize: 32 } : undefined}>
      R$ {formatarValor(p.precoCentavos)} <small>{p.tipoVenda === "PECA" ? t.produto.kg : t.produto.pacote}</small>
    </span>
  );
}

export function textoAproximado(p: P, t: Textos = TEXTOS.pt): string {
  if (p.tipoVenda === "PACOTE") return t.produto.precoFinal;
  const aprox = valorAproximadoPeca(p.precoCentavos, p.pesoMedioGramas);
  return aprox ? t.produto.aproxPeca(formatarReais(aprox)) : t.produto.pecaInteira;
}

export function textoDisponivel(p: { tipoVenda: "PECA" | "PACOTE"; disponivel: boolean; quantidadeDisponivel: number | null }, t: Textos = TEXTOS.pt) {
  if (!p.disponivel || p.quantidadeDisponivel === 0) return null;
  if (p.quantidadeDisponivel === null) return t.produto.disponivel;
  const n = p.quantidadeDisponivel;
  return p.tipoVenda === "PECA" ? t.produto.pecasDisponiveis(n) : t.produto.unidadesDisponiveis(n);
}
