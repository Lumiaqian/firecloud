const SHELL_CACHE = "firecloud-shell-v63";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=54",
  "./css/journal-stationery.css?v=15",
  "./js/forecast.mjs?v=11",
  "./js/api.mjs?v=8",
  "./js/weather-fx.mjs?v=9",
  "./js/journal-weather-engine.mjs?v=4",
  "./js/app.mjs?v=stationery_v8",
  "./manifest.webmanifest?v=3",
  "./icons/icon.svg?v=2",
  "./icons/icon-192.png?v=2",
  "./icons/icon-512.png?v=2",
  "./icons/apple-touch-icon.png?v=2"
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
