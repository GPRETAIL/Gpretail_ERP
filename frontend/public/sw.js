/**
 * Vynerix ERP — Enterprise Progressive Web Application (PWA) Service Worker
 * 
 * Features:
 * 1. Offline Startup — Immediate App Shell boot without internet
 * 2. Cached Pages — SPA route fallback for all /app/* navigation
 * 3. Offline Data — Network-First caching for read APIs (Dashboard, Sales, Inventory)
 * 4. Stale-While-Revalidate — Instant loading for JS, CSS, fonts, and images
 * 5. Lifecycle Updates — skipWaiting and client claim support
 */

const CACHE_VERSION = "vynerix-pwa-v3.0.1";
const CACHE_STATIC = `vynerix-static-${CACHE_VERSION}`;
const CACHE_API = `vynerix-api-${CACHE_VERSION}`;

// Core assets required for offline startup
const PRECACHE_ASSETS = [
  "/",
  "/app/",
  "/index.html",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/vite.svg"
];

// Read APIs that provide offline data fallback
const CACHEABLE_API_PATTERNS = [
  "/api/dashboard",
  "/api/warehouse/dashboard",
  "/api/pos-sales",
  "/api/direct-purchases",
  "/api/products",
  "/api/customers",
  "/api/suppliers",
  "/api/notifications",
  "/api/auth/me"
];

// ─── 1. INSTALL: Precache App Shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[PWA SW] Precache warning:", err);
      }))
      .then(() => self.skipWaiting())
  );
});

// ─── 2. ACTIVATE: Purge Old Caches & Claim Clients ───────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_STATIC && key !== CACHE_API)
            .map((key) => {
              console.log("[PWA SW] Removing old cache:", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── 3. FETCH: Smart Caching Strategies ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip WebSocket connections
  if (url.protocol === "ws:" || url.protocol === "wss:") {
    return;
  }

  // Cross-origin skip (except CDNs if needed)
  if (url.origin !== self.location.origin) return;

  // A. API REQUESTS — Network-First with Cache Fallback
  if (url.pathname.startsWith("/api/")) {
    const isCacheable = CACHEABLE_API_PATTERNS.some((pattern) =>
      url.pathname.startsWith(pattern)
    );

    if (!isCacheable) return;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_API).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Network failed (offline) — serve cached JSON if available
          const cached = await caches.match(request);
          if (cached) {
            console.log("[PWA SW] Serving cached API data for offline:", url.pathname);
            return cached;
          }
          return new Response(
            JSON.stringify({
              status: "offline",
              offline: true,
              data: null,
              message: "You are currently offline. Showing cached workspace data."
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        })
    );
    return;
  }

  // B. NAVIGATION REQUESTS (HTML Pages) — Network-First with Shell Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback for any route (/app, /app/sales, etc.)
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          const shell = (await caches.match("/app/")) || (await caches.match("/")) || (await caches.match("/index.html"));
          return shell || Response.error();
        })
    );
    return;
  }

  // C. STATIC ASSETS (JS, CSS, SVGs, Fonts, Images) — Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname.startsWith("/assets/") ||
              url.pathname.endsWith(".js") ||
              url.pathname.endsWith(".css") ||
              url.pathname.endsWith(".svg") ||
              url.pathname.endsWith(".png") ||
              url.pathname.endsWith(".jpg") ||
              url.pathname.endsWith(".woff2"))
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ─── 4. MESSAGE: Support In-App Skip Waiting ─────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[PWA SW] Skipping waiting and activating new version");
    self.skipWaiting();
  }
});
