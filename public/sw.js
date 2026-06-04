/* Service worker minimale per MyTrainApp — abilita l'uso offline.
   Strategia:
   - navigazioni (HTML): network-first con fallback alla cache (e all'index)
   - asset statici same-origin (JS/CSS/icone/font): cache-first, popolata al volo
   I dati utente restano in localStorage; questo SW serve solo lo shell dell'app. */

const CACHE = 'mytrainapp-v1';
const SCOPE_URL = self.registration.scope; // es. https://.../MyTrainApp/

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigazioni: prova la rete, ripiega sulla cache (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await fetch(request);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return (await cache.match(request)) || (await cache.match(SCOPE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // Asset statici: cache-first, poi rete (e popola la cache).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
