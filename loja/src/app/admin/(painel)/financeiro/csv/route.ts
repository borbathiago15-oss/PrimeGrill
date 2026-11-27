import { and, asc, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { usuarioAtual } from "@/lib/admin";
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, centavosCsv, formatarDia, linhaCsv, periodo, ROTULO_FORMA_FIN, type FormaFin } from "@/modules/financeiro/financeiro";
import { pode } from "@/modules/usuarios/permissoes";

export const dynamic = "force-dynamic";

/** Planilha dos lançamentos pagos/recebidos no período, para o contador. */
export async function GET(req: Request) {
  const u = await usuarioAtual();
  if (!u || !pode(u.papel, "financeiro")) return new Response("Sem permissão", { status: 403 });
  const url = new URL(req.url);
  const { de, ate } = periodo(url.searchParams.get("de") ?? undefined, url.searchParams.get("ate") ?? undefined);
  const { lancamentos } = schema;
  const lista = await (await db())
    .select()
    .from(lancamentos)
    .where(and(gte(lancamentos.quitadoEm, de), lte(lancamentos.quitadoEm, ate)))
    .orderBy(asc(lancamentos.quitadoEm), asc(lancamentos.id));
  const cats: Record<string, string> = { ...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA };
  const linhas = [
    linhaCsv(["Data", "Tipo", "Categoria", "Descrição", "Forma", "Valor bruto", "Taxa", "Valor líquido", "Situação", "Conferido no extrato", "Vencimento", "Observação"]),
    ...lista.map((l) =>
      linhaCsv([
        formatarDia(l.quitadoEm),
        l.tipo === "RECEITA" ? "Receita" : "Despesa",
        cats[l.categoria] ?? l.categoria,
        l.descricao,
        l.forma ? (ROTULO_FORMA_FIN[l.forma as FormaFin] ?? l.forma) : "",
        centavosCsv(l.tipo === "RECEITA" ? l.valorCentavos : -l.valorCentavos),
        centavosCsv(l.taxaCentavos),
        centavosCsv(l.tipo === "RECEITA" ? l.valorCentavos - l.taxaCentavos : -l.valorCentavos),
        l.status === "CANCELADO" ? "Cancelado" : "Pago/recebido",
        l.conciliadoEm ? "Sim" : "",
        formatarDia(l.vencimento),
        l.observacao,
      ]),
    ),
  ];
  // BOM para o Excel abrir com acentos.
  return new Response("﻿" + linhas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${de}-a-${ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
