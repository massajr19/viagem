const CACHE = "valecomprar-ghp-v14.3"; // troque a versão pra forçar update
const BASE = self.registration.scope; // https://.../viagem/
const CORE = [BASE, BASE + "index.html", BASE + "manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // só mesma origem
  if (url.origin !== self.location.origin) return;

  // navegação (HTML): network-first, fallback cache
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(BASE + "index.html", fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(BASE + "index.html")) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // demais: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (req.method === "GET") cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return cached || new Response("", { status: 504 });
    }
  })());
});
