import { versaoPedido } from "@/lib/versao-pedido";

export const dynamic = "force-dynamic";

/** Consulta leve usada pela página do pedido para saber se precisa se atualizar. */
export async function GET(_: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^PG-[A-Z0-9]{6}$/.test(codigo)) return Response.json({ v: null }, { status: 404 });
  const v = await versaoPedido(codigo);
  return Response.json({ v }, { status: v ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}
