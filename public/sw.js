// Minimal service worker: caches the app shell so a started workout can be
// reopened without signal. Network first; cache only as offline fallback.
const CACHE = "organizador-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
  if (!isPage && !isStatic) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (isStatic || isPage)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || (isPage ? (await caches.match("/entrenamiento/sesion")) : undefined) || Response.error()),
  );
});
