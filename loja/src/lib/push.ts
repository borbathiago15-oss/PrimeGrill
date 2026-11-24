import { idiomaValido, type Idioma } from "@/modules/i18n/idiomas";
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import webpush from "web-push";
import { db, schema } from "@/db";

const { pushInscricoes, chavesSistema, pedidos } = schema;

type Chaves = { publica: string; privada: string };
let cache: Promise<Chaves> | null = null;

/**
 * Par de chaves VAPID do push. Usa as variáveis VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY se existirem;
 * senão gera uma vez e guarda no banco (assim funciona sem configuração extra na Vercel).
 */
export function chavesPush(): Promise<Chaves> {
  return (cache ??= (async () => {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const pri = process.env.VAPID_PRIVATE_KEY;
    if (pub && pri) return { publica: pub, privada: pri };
    const banco = await db();
    const linhas = await banco.select().from(chavesSistema).where(inArray(chavesSistema.nome, ["vapid_publica", "vapid_privada"]));
    const achar = (n: string) => linhas.find((l) => l.nome === n)?.valor;
    if (achar("vapid_publica") && achar("vapid_privada")) return { publica: achar("vapid_publica")!, privada: achar("vapid_privada")! };
    const novas = webpush.generateVAPIDKeys();
    await banco
      .insert(chavesSistema)
      .values([
        { nome: "vapid_publica", valor: novas.publicKey },
        { nome: "vapid_privada", valor: novas.privateKey },
      ])
      .onConflictDoNothing();
    // Se outra instância gravou primeiro, vale a dela.
    const finais = await banco.select().from(chavesSistema).where(inArray(chavesSistema.nome, ["vapid_publica", "vapid_privada"]));
    return { publica: finais.find((l) => l.nome === "vapid_publica")!.valor, privada: finais.find((l) => l.nome === "vapid_privada")!.valor };
  })().catch((e) => {
    cache = null;
    throw e;
  }));
}

export type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };

export function inscricaoValida(x: unknown): x is Inscricao {
  const s = x as Inscricao;
  return !!s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 && typeof s.keys?.p256dh === "string" && typeof s.keys?.auth === "string" && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;
}

export async function inscrever(sub: Inscricao, publico: "CLIENTE" | "LOJA", alvo: { pedidoId?: number; usuario?: string }) {
  const banco = await db();
  const cond = [eq(pushInscricoes.endpoint, sub.endpoint), eq(pushInscricoes.publico, publico)];
  if (publico === "CLIENTE") cond.push(eq(pushInscricoes.pedidoId, alvo.pedidoId!));
  await banco.delete(pushInscricoes).where(and(...cond));
  await banco.insert(pushInscricoes).values({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, publico, pedidoId: alvo.pedidoId ?? null, usuario: alvo.usuario ?? null });
}

export type Aviso = { titulo: string; corpo: string; url: string; tag?: string };

async function enviar(linhas: (typeof pushInscricoes.$inferSelect)[], aviso: Aviso) {
  if (!linhas.length) return;
  const { publica, privada } = await chavesPush();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://primegrill-loja.vercel.app", publica, privada);
  const carga = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url, tag: aviso.tag });
  const mortas: number[] = [];
  await Promise.all(
    linhas.map(async (l) => {
      try {
        await webpush.sendNotification({ endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } }, carga, { TTL: 60 * 60 * 12, urgency: "high" });
      } catch (e) {
        const st = (e as { statusCode?: number }).statusCode;
        if (st === 404 || st === 410) mortas.push(l.id); // inscrição expirada ou app desinstalado
        else console.error("push falhou", st);
      }
    }),
  );
  if (mortas.length) await (await db()).delete(pushInscricoes).where(inArray(pushInscricoes.id, mortas));
}

/** Dispara depois da resposta (não atrasa a tela de quem fez a ação). Falha de push nunca quebra o fluxo. */
function emSegundoPlano(fn: () => Promise<void>) {
  try {
    after(() => fn().catch((e) => console.error("aviso não enviado", e)));
  } catch {
    // Fora de uma requisição (ex.: script): envia direto.
    fn().catch((e) => console.error("aviso não enviado", e));
  }
}

/** Aviso para quem está acompanhando o pedido (cliente). */
async function pedidoPor(alvo: number | string) {
  const banco = await db();
  const [p] = await banco
    .select({ id: pedidos.id, codigo: pedidos.codigo, cliente: pedidos.clienteNome, idioma: pedidos.idioma })
    .from(pedidos)
    .where(typeof alvo === "number" ? eq(pedidos.id, alvo) : eq(pedidos.codigo, alvo));
  return p ?? null;
}

export function avisarCliente(alvo: number | string, aviso: (codigo: string, idioma: Idioma) => Omit<Aviso, "url">) {
  emSegundoPlano(async () => {
    const banco = await db();
    const p = await pedidoPor(alvo);
    if (!p) return;
    const linhas = await banco.select().from(pushInscricoes).where(and(eq(pushInscricoes.publico, "CLIENTE"), eq(pushInscricoes.pedidoId, p.id)));
    await enviar(linhas, { ...aviso(p.codigo, idiomaValido(p.idioma) ? p.idioma : "pt"), url: `/pedido/${p.codigo}`, tag: `pedido-${p.codigo}` });
  });
}

/** Aviso para a equipe da loja (todos os aparelhos que ativaram os avisos no painel). */
export function avisarLoja(alvo: number | string, aviso: (p: { codigo: string; cliente: string }) => Omit<Aviso, "url">) {
  emSegundoPlano(async () => {
    const banco = await db();
    const p = await pedidoPor(alvo);
    if (!p) return;
    const linhas = await banco.select().from(pushInscricoes).where(eq(pushInscricoes.publico, "LOJA"));
    await enviar(linhas, { ...aviso({ codigo: p.codigo, cliente: p.cliente.split(" ")[0] }), url: `/admin/pedidos/${p.id}`, tag: `loja-${p.codigo}` });
  });
}
