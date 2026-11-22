import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { comEstoqueReal } from "@/lib/estoque";
import { FormNovoPedido } from "./form";

export const dynamic = "force-dynamic";

export default async function NovoPedido() {
  await exigirPermissao("pedidos");
  const banco = await db();
  const lista = await comEstoqueReal(banco, await banco.select().from(schema.produtos).orderBy(asc(schema.produtos.nome)));
  return (
    <>
      <div className="topo">
        <h1>Novo pedido</h1>
        <span className="rotulo">WhatsApp ou balcão</span>
        <div className="esp" />
        <Link href="/admin" className="btn btn-pq">
          ‹ Pedidos
        </Link>
      </div>
      <div className="cont">
        <p style={{ fontSize: 14, color: "var(--texto-2)" }}>
          Lance aqui o pedido que chegou pelo WhatsApp ou no balcão. Ele entra no mesmo fluxo: pesagem, link do pedido para o cliente, pagamento e baixa no estoque.
        </p>
        <FormNovoPedido
          produtos={lista
            .filter((p) => p.ativo)
            .map((p) => ({ id: p.id, nome: p.nome + (p.pesoNominal ? ` ${p.pesoNominal}` : ""), tipoVenda: p.tipoVenda, precoCentavos: p.precoCentavos, disponivel: p.disponivel, estoque: p.controlaEstoque ? (p.quantidadeDisponivel ?? 0) : null }))}
        />
      </div>
    </>
  );
}
