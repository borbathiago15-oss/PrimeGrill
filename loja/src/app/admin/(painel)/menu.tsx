"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Papel } from "@/db/schema";
import { pode, type Permissao } from "@/modules/usuarios/permissoes";

const ITENS: { href: string; texto: string; exato?: boolean; perm: Permissao }[] = [
  { href: "/admin", texto: "Pedidos", exato: true, perm: "pedidos" },
  { href: "/admin/produtos", texto: "Produtos e preços", perm: "produtosDisponibilidade" },
  { href: "/admin/clientes", texto: "Clientes", perm: "clientesVer" },
  { href: "/admin/estoque", texto: "Estoque", perm: "estoqueVer" },
  { href: "/admin/notas", texto: "Notas de entrada", perm: "notas" },
  { href: "/admin/configuracoes", texto: "Loja e entregas", perm: "lojaEntregas" },
  { href: "/admin/folder", texto: "Folder (PDF e imagem)", perm: "folder" },
  { href: "/admin/usuarios", texto: "Usuários", perm: "usuarios" },
];

export function Menu({ papel }: { papel: Papel }) {
  const caminho = usePathname();
  return (
    <>
      <div className="grupo">Loja online</div>
      {ITENS.filter((i) => pode(papel, i.perm)).map((i) => {
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
