const CACHE_NAME = "gpretail-pwa-v2";
const APP_SHELL = [
  "/",
  "/app/",
  "/manifest.webmanifest",
  "/pwa-icon.svg"
];

// Install: Cache core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch((err) => console.warn("[SW] Precache skipped:", err)))
      .then(() => self.skipWaiting())
  );
});

// Activate: Cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate for static assets, network-first for navigation
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API requests and WebSockets
  if (url.pathname.startsWith("/api/") || url.protocol === "ws:" || url.protocol === "wss:") {
    return;
  }

  // Cross-origin bypass
  if (url.origin !== self.location.origin) return;

  // For HTML navigation requests (SPAs)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallbackShell = await caches.match("/app/") || await caches.match("/");
          return fallbackShell || Response.error();
        })
    );
    return;
  }

  // For JS / CSS / Images / Fonts
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname.startsWith("/assets/") ||
              url.pathname.endsWith(".js") ||
              url.pathname.endsWith(".css") ||
              url.pathname.endsWith(".svg") ||
              url.pathname.endsWith(".png") ||
              url.pathname.endsWith(".woff2"))
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
