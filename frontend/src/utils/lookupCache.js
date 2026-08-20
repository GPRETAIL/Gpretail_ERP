import api from "../api/axios";

// In-memory master lookup cache with TTL (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheStore = new Map();

/**
 * Fetch unified master lookups with client-side caching.
 * @param {string|string[]} keysOrModule - E.g. 'transport_entry', 'invoice_entry', or ['companies', 'suppliers']
 * @param {boolean} forceRefresh - If true, ignores cache and fetches fresh
 * @returns {Promise<Object>}
 */
export async function getMasterLookups(keysOrModule, forceRefresh = false) {
  const cacheKey = typeof keysOrModule === "string" ? keysOrModule : keysOrModule.sort().join(",");
  const cached = cacheStore.get(cacheKey);

  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = {};
  if (typeof keysOrModule === "string") {
    params.module = keysOrModule;
  } else {
    params.keys = keysOrModule.join(",");
  }

  try {
    const res = await api.get("/lookups", { params });
    const data = res.data?.data || {};
    cacheStore.set(cacheKey, {
      timestamp: Date.now(),
      data,
    });
    return data;
  } catch (err) {
    console.error("Failed to load master lookups:", err);
    // If request fails but we have stale cache, return it
    if (cached) return cached.data;
    return {};
  }
}

/**
 * Clear or invalidate lookup cache
 */
export function invalidateLookupCache(key) {
  if (key) {
    cacheStore.delete(key);
  } else {
    cacheStore.clear();
  }
}
