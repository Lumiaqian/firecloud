const SHELL_CACHE = "firecloud-shell-v10";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=11",
  "./js/forecast.mjs?v=2",
  "./js/api.mjs?v=2",
  "./js/app.mjs?v=3",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("firecloud-shell-") && key !== SHELL_CACHE).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  const networkResponse = fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  });

  event.waitUntil(networkResponse.catch(() => undefined));
  event.respondWith(caches.match(event.request).then((cached) => cached || networkResponse));
});
