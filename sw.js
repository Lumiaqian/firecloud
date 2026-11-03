const SHELL_CACHE = "firecloud-shell-v89";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=63",
  "./js/api.mjs?v=25",
  "./js/app.mjs?v=25",
  "./js/core/format.mjs?v=25",
  "./js/core/session.mjs?v=25",
  "./js/core/storage.mjs?v=25",
  "./js/forecast.mjs?v=25",
  "./js/frame-loop.mjs?v=25",
  "./js/ui/dev-lab.mjs?v=25",
  "./js/ui/dom.mjs?v=25",
  "./js/ui/drawer.mjs?v=25",
  "./js/ui/factors.mjs?v=25",
  "./js/ui/hero.mjs?v=25",
  "./js/ui/loaders.mjs?v=25",
  "./js/ui/moon.mjs?v=25",
  "./js/ui/motion.mjs?v=25",
  "./js/ui/paper-fx.mjs?v=25",
  "./js/ui/paper.mjs?v=25",
  "./js/ui/places.mjs?v=25",
  "./js/ui/sky.mjs?v=25",
  "./js/ui/week.mjs?v=25",
  "./js/ui/welcome.mjs?v=25",
  "./js/weather-fx.mjs?v=25",
  "./manifest.webmanifest?v=5",
  "./icons/icon.svg?v=4",
  "./icons/brand-mark.svg?v=1",
  "./icons/icon-192.png?v=4",
  "./icons/icon-512.png?v=4",
  "./icons/apple-touch-icon.png?v=4"
];

self.addEventListener("install", (event) => {
  // 新缓存不能复用 HTTP 缓存中的旧 HTML，否则离线入口仍会引用上一版模块。
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) =>
    cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" })))
  ));
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
  }, async (error) => {
    if (event.request.mode === "navigate" && url.href.startsWith(self.registration.scope)) {
      const shell = await caches.match(new URL("./index.html", self.registration.scope).href)
        || await caches.match(self.registration.scope);
      if (shell) return shell;
    }
    throw error;
  });

  event.waitUntil(networkResponse.catch(() => undefined));
  event.respondWith(caches.match(event.request).then((cached) => cached || networkResponse));
});
