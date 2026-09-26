const CACHE_NAME = "mayualert-shell-v6";
const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./widget.js",
  "./mapa.js",
  "./usuario.js",
  "./manifest.webmanifest",
  "./Img/app-icon-512.png",
  "./Img/puente carapongo.png",
  "./Img/Puente Chaclacayo.png",
  "./Img/Puente Los Angeles.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("mayualert-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") return caches.match(new URL("./index.html", self.registration.scope));
      return Response.error();
    })
  );
});
