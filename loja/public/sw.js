/* Service worker do app Prime Grill (loja pública).
 * - Arquivos fixos (fontes, marca, ícones, JS/CSS do Next): guardados e reaproveitados.
 * - Páginas da loja: sempre busca na rede (preço e estoque atuais); sem internet, mostra a última versão guardada
 *   ou a página "sem conexão".
 * - Painel (/admin), ações e qualquer envio (POST) nunca passam pelo cache.
 */
const VERSAO = "pg-v3";
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
  // Em desenvolvimento (localhost) nada é guardado: o worker existe só para os avisos.
  if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") return;
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

/* ---------- Avisos no celular (Web Push) ---------- */
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { titulo: "Prime Grill", corpo: e.data ? e.data.text() : "" };
  }
  const titulo = d.titulo || "Prime Grill Paiva";
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(titulo, {
        body: d.corpo || "",
        icon: "/icones/icone-192.png",
        badge: "/icones/icone-192.png",
        tag: d.tag,
        renotify: !!d.tag,
        vibrate: [120, 60, 120],
        data: { url: d.url || "/" },
      }),
      self.navigator && "setAppBadge" in self.navigator ? self.navigator.setAppBadge(1).catch(() => {}) : Promise.resolve(),
      // Página do pedido aberta: avisa para ela se atualizar na hora.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ tipo: "pedido-atualizado" }))),
    ]),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    (async () => {
      if (self.navigator && "clearAppBadge" in self.navigator) self.navigator.clearAppBadge().catch(() => {});
      const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of abertas) {
        if (c.url === destino && "focus" in c) return c.focus();
      }
      for (const c of abertas) {
        if ("navigate" in c) {
          await c.navigate(destino);
          return c.focus();
        }
      }
      return self.clients.openWindow(destino);
    })(),
  );
});
