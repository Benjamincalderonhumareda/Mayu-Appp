const CACHE_NAME = "mayualert-shell-v20";
const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./cuentas.js",
  "./widget.js",
  "./mapa.js",
  "./usuario.js",
  "./push.js",
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

self.addEventListener("push", event => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; }
  catch { datos = { body: event.data?.text() || "Hay una actualización en un puente que sigues." }; }
  const opciones = {
    body: datos.body || datos.message || "Cambió el estado de un puente que sigues.",
    icon: "./Img/app-icon-512.png",
    badge: "./Img/app-icon-512.png",
    tag: datos.tag || (datos.bridgeId ? `mayualert-${datos.bridgeId}` : undefined),
    renotify: Boolean(datos.renotify),
    data: { bridgeId: datos.bridgeId || datos.bridge_id || datos.puenteId || null }
  };
  event.waitUntil(self.registration.showNotification(datos.title || "MayuAlert", opciones));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const bridgeId = event.notification.data?.bridgeId;
  const destino = new URL("./", self.registration.scope);
  if (bridgeId) destino.searchParams.set("puente", bridgeId);
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const ventana of ventanas) {
      if (new URL(ventana.url).origin === destino.origin) {
        await ventana.navigate(destino.href);
        return ventana.focus();
      }
    }
    return self.clients.openWindow(destino.href);
  })());
});
