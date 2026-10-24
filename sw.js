const SHELL_CACHE = "firecloud-shell-v85";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=61",
  "./js/api.mjs?v=22",
  "./js/app.mjs?v=22",
  "./js/core/format.mjs?v=22",
  "./js/core/session.mjs?v=22",
  "./js/core/storage.mjs?v=22",
  "./js/forecast.mjs?v=22",
  "./js/frame-loop.mjs?v=22",
  "./js/ui/dev-lab.mjs?v=22",
  "./js/ui/dom.mjs?v=22",
  "./js/ui/drawer.mjs?v=22",
  "./js/ui/factors.mjs?v=22",
  "./js/ui/hero.mjs?v=22",
  "./js/ui/loaders.mjs?v=22",
  "./js/ui/moon.mjs?v=22",
  "./js/ui/motion.mjs?v=22",
  "./js/ui/paper-fx.mjs?v=22",
  "./js/ui/paper.mjs?v=22",
  "./js/ui/places.mjs?v=22",
  "./js/ui/sky.mjs?v=22",
  "./js/ui/week.mjs?v=22",
  "./js/ui/welcome.mjs?v=22",
  "./js/weather-fx.mjs?v=22",
  "./manifest.webmanifest?v=5",
  "./icons/icon.svg?v=4",
  "./icons/brand-mark.svg?v=1",
  "./icons/icon-192.png?v=4",
  "./icons/icon-512.png?v=4",
  "./icons/apple-touch-icon.png?v=4"
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
