/* Service worker do app Prime Grill (loja pública).
 * - Arquivos fixos (fontes, marca, ícones, JS/CSS do Next): guardados e reaproveitados.
 * - Páginas da loja: sempre busca na rede (preço e estoque atuais); sem internet, mostra a última versão guardada
 *   ou a página "sem conexão".
 * - Painel (/admin), ações e qualquer envio (POST) nunca passam pelo cache.
 */
const VERSAO = "pg-v1";
const FIXOS = `${VERSAO}-fixos`;
const PAGINAS = `${VERSAO}-paginas`;
const OFFLINE = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGINAS).then((c) => c.addAll([OFFLINE, "/"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api") || req.headers.get("next-action")) return;

  const fixo = /^\/(fonts|marca|icones|produtos)\//.test(url.pathname) || url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image");
  if (fixo) {
    e.respondWith(
      caches.open(FIXOS).then(async (c) => {
        const guardado = await c.match(req);
        if (guardado) return guardado;
        const r = await fetch(req);
        if (r.ok) c.put(req, r.clone());
        return r;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok && !url.pathname.startsWith("/pedido/")) caches.open(PAGINAS).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE))),
    );
  }
});
