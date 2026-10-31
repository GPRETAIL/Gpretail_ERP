// Clear private offline data when a shared terminal changes identity. Static app
// assets remain available for offline startup.
export const clearPrivateApiCache = async () => {
  try {
    globalThis.navigator?.serviceWorker?.controller?.postMessage({ type: "VX_CLEAR_API_CACHE" });
  } catch { /* Direct CacheStorage cleanup also works without a controlling worker. */ }
  try {
    if (!globalThis.caches) return;
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("vynerix-api-")).map(name => caches.delete(name)));
  } catch { /* Storage may be unavailable; signing out must still succeed. */ }
};
