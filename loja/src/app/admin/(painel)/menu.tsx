"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/admin", texto: "Pedidos", exato: true },
  { href: "/admin/produtos", texto: "Produtos e preços" },
  { href: "/admin/estoque", texto: "Estoque" },
  { href: "/admin/notas", texto: "Notas de entrada" },
  { href: "/admin/configuracoes", texto: "Loja e entregas" },
];

export function Menu() {
  const caminho = usePathname();
  return (
    <>
      <div className="grupo">Loja online</div>
      {ITENS.map((i) => {
        const ativo = i.exato ? caminho === i.href || caminho.startsWith("/admin/pedidos") : caminho.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={ativo ? "page" : undefined}>
            {i.texto}
          </Link>
        );
      })}
      <div className="grupo">Atalhos</div>
      <a href="/" target="_blank" rel="noopener">
        Ver a loja ↗
      </a>
    </>
  );
}
