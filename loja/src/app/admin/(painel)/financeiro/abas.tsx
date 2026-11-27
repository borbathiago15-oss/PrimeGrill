import Link from "next/link";

const ABAS = [
  { href: "/admin/financeiro", texto: "Resumo" },
  { href: "/admin/financeiro/recebimentos", texto: "Recebimentos e conciliação" },
  { href: "/admin/financeiro/contas", texto: "Contas a pagar" },
  { href: "/admin/financeiro/caixa", texto: "Caixa" },
];

export function AbasFinanceiro({ atual }: { atual: string }) {
  return (
    <nav className="fin-abas" aria-label="Financeiro">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} aria-current={a.href === atual ? "page" : undefined}>
          {a.texto}
        </Link>
      ))}
    </nav>
  );
}

/** Filtro de período (GET): mantém o endereço compartilhável. */
export function FiltroPeriodo({ de, ate, extra }: { de: string; ate: string; extra?: React.ReactNode }) {
  return (
    <form className="fin-filtro" method="get">
      <label>
        De
        <input type="date" name="de" defaultValue={de} />
      </label>
      <label>
        Até
        <input type="date" name="ate" defaultValue={ate} />
      </label>
      {extra}
      <button className="btn btn-pq">Filtrar</button>
    </form>
  );
}
