import api from "../api/axios";
import { requestCacheScope } from "./requestCacheScope";

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
  const keys = typeof keysOrModule === "string" ? keysOrModule : [...keysOrModule].sort();
  const lookupKey = typeof keys === "string" ? keys : keys.join(",");
  const cacheKey = `${requestCacheScope()}:${typeof keys === "string" ? "module" : "keys"}:${lookupKey}`;
  const cached = cacheStore.get(cacheKey);

  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = {};
  if (typeof keysOrModule === "string") {
    params.module = keysOrModule;
  } else {
    params.keys = keys.join(",");
  }

  try {
    const res = await api.get("/lookups", { params });
    const data = res.data?.data || {};
    cacheStore.set(cacheKey, {
      lookupKey,
      timestamp: Date.now(),
      data,
    });
    if (cacheStore.size > 50) cacheStore.delete(cacheStore.keys().next().value);
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
    for (const [cacheKey, entry] of cacheStore) if (entry.lookupKey === key) cacheStore.delete(cacheKey);
  } else {
    cacheStore.clear();
  }
}
