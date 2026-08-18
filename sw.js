const CACHE = "riverton-football-hub-v2-6-1";
const APP_SHELL = ["./", "./index.html", "./styles.css?v=2.6.1", "./app.js?v=2.6.1", "./manifest.webmanifest?v=2.6.1", "./icon-512.png", "./apple-touch-icon.png", "./riverton-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.includes("api.weather.gov")) return;
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put("./index.html", response.clone());
      }
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(caches.match(event.request).then((saved) => saved || fetch(event.request).then(async (response) => {
    if (response.ok && url.origin === self.location.origin) {
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  })));
});
