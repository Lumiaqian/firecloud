const SHELL_CACHE = "firecloud-shell-v107";
const SHELL = [
  "./",
  "./index.html",
  "./css/sky-letter-tokens.css?v=4",
  "./css/fonts.css?v=1",
  "./css/sky-letter-cards.css?v=1",
  "./css/style.css?v=79",
  "./js/api.mjs?v=41",
  "./js/app.mjs?v=41",
  "./js/core/format.mjs?v=41",
  "./js/core/session.mjs?v=41",
  "./js/core/storage.mjs?v=41",
  "./js/forecast.mjs?v=41",
  "./js/frame-loop.mjs?v=41",
  "./js/ui/dom.mjs?v=41",
  "./js/ui/drawer.mjs?v=41",
  "./js/ui/factors.mjs?v=41",
  "./js/ui/hero.mjs?v=41",
  "./js/ui/loaders.mjs?v=41",
  "./js/ui/moon.mjs?v=41",
  "./js/ui/motion.mjs?v=41",
  "./js/ui/paper-fx.mjs?v=41",
  "./js/ui/paper.mjs?v=41",
  "./js/ui/places.mjs?v=41",
  "./js/ui/sky.mjs?v=41",
  "./js/ui/week.mjs?v=41",
  "./js/ui/welcome.mjs?v=41",
  "./js/weather-fx.mjs?v=41",
  "./assets/fonts/Xiaolai-core.woff2",
  "./assets/logo-a.png",
  "./assets/paper/clip.png",
  "./assets/paper/score-annotations.png",
  "./assets/paper/home-time-marks.png",
  "./assets/paper/supporting-paper-mask.svg",
  "./assets/paper/supporting-brace.png",
  "./assets/paper/supporting-pencil.png",
  "./assets/paper/supporting-leader.png",
  "./assets/paper/supporting-rule.png",
  "./assets/paper/outlook-focus.png",
  "./assets/paper/paper-grain-wide.png",
  "./manifest.webmanifest?v=6",
  "./icons/favicon-a-16.png",
  "./icons/favicon-a-32.png",
  "./icons/favicon-a-48.png",
  "./icons/icon-192.png?v=5",
  "./icons/icon-512.png?v=5",
  "./icons/apple-touch-icon.png?v=5"
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

  const networkResponse = fetch(event.request);
  const cacheUpdate = networkResponse.then(async (response) => {
    if (response.ok) {
      const copy = response.clone();
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(event.request, copy);
    }
  });
  const responseWithFallback = networkResponse.catch(async (error) => {
    if (event.request.mode === "navigate" && url.href.startsWith(self.registration.scope)) {
      const shell = await caches.match(new URL("./index.html", self.registration.scope).href)
        || await caches.match(self.registration.scope);
      if (shell) return shell;
    }
    throw error;
  });

  event.waitUntil(Promise.allSettled([cacheUpdate, responseWithFallback]));
  event.respondWith(caches.match(event.request).then((cached) => cached || responseWithFallback));
});
