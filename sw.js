const CACHE = "riverton-football-hub-v2-1-polish";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./lunch-menu.json", "./manifest.webmanifest", "./icon-512.png", "./apple-touch-icon.png", "./riverton-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.includes("api.weather.gov")) return;
  event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response; }).catch(async () => {
    const saved = await caches.match(event.request);
    if (!saved) throw new Error("No saved response");
    const headers = new Headers(saved.headers);
    headers.set("X-Riverton-Cache", "saved");
    return new Response(await saved.blob(), { status: saved.status, statusText: saved.statusText, headers });
  }));
});
