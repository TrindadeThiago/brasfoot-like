// Service worker do brasfoot-like (R7): guarda todos os arquivos do build na primeira visita e
// serve do cache primeiro, para o jogo abrir sem rede. A versão é gravada pelo
// tools/src/precache.ts depois do build; versão nova → cache novo, o antigo é apagado.
const VERSION = "__PRECACHE_VERSION__";
const CACHE = `brasfoot-like-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch("/precache.json", { cache: "no-store" });
      const { files } = await response.json();
      const cache = await caches.open(CACHE);
      await cache.addAll(files);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // A carreira vai na query (?c=<id>); o arquivo é o mesmo para qualquer carreira.
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        if (request.mode === "navigate") {
          const home = await cache.match("/");
          if (home) return home;
        }
        throw error;
      }
    })(),
  );
});
