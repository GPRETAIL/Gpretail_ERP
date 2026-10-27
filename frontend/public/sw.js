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

const CACHE_VERSION = "vynerix-pwa-v3.0.4";
const CACHE_STATIC = `vynerix-static-${CACHE_VERSION}`;
const CACHE_API = `vynerix-api-${CACHE_VERSION}`;

// Core assets required for offline startup
const PRECACHE_ASSETS = [
  "/",
  "/app/",
  "/index.html",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
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
  "/api/suppliers"
];

// Cache matching normally ignores Authorization/store headers. Use an opaque
// scope in the cache key so another login/store can never read this fallback.
async function apiCacheKey(request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization || !self.crypto?.subtle) return null;
  const scope = JSON.stringify([authorization, request.headers.get("X-Company-Scope-Id"),
    request.headers.get("X-Company-Id"), request.headers.get("X-Store-Id"), request.headers.get("X-Bypass-Local")]);
  const digest = await self.crypto.subtle.digest("SHA-256", new TextEncoder().encode(scope));
  const key = new URL(request.url);
  key.searchParams.set("__vx_scope", Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join(""));
  return new Request(key.href);
}

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
      url.pathname === pattern || url.pathname.startsWith(`${pattern}/`)
    );

    if (!isCacheable) return;

    const scopedKey = apiCacheKey(request).catch(() => null);
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response?.status === 200) {
          const clone = response.clone();
          event.waitUntil(scopedKey.then(async key => {
            if (key) await (await caches.open(CACHE_API)).put(key, clone);
          }).catch(() => {}));
        }
        return response;
      } catch {
        const key = await scopedKey;
        const cached = key ? await caches.open(CACHE_API).then(cache => cache.match(key)).catch(() => null) : null;
        if (cached) return cached;
        return new Response(JSON.stringify({
          success: false, status: "offline", offline: true, data: null,
          message: "The server is unavailable and no data is cached for this account and store."
        }), { status: 503, headers: { "Content-Type": "application/json", "Retry-After": "5" } });
      }
    })());
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

// Payload-free Web Push: keep subscription/account details off locked screens.
self.addEventListener("push", event => {
  event.waitUntil(self.registration.showNotification("Vynerix", {
    body: "An account or service update is available. Open ERP to review it.",
    icon: "/pwa-icon.svg", badge: "/pwa-icon.svg", tag: "vynerix-inbox",
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    const target = self.location.origin + "/notifications";
    if (existing) { await existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow(target);
  })());
});
