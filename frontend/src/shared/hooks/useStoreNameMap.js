import { useEffect, useState } from "react";
import api from "@/shared/api/apiClient";
import { requestCacheScope } from "@/shared/api/requestCacheScope";

// Shared store/warehouse id -> name resolver for the master list pages.
// Records carry a `company_id` (the owning store, an identity "company" of kind
// master). This hook fetches that list once and caches it at module scope so
// every master list page reuses the same map instead of re-fetching.
let cachedMap = null;
let inflight = null;
let cachedScope = "";
// The names last loaded for this sign-in. When the server in use changes (an on-prem counter failing over to its
// cloud and back) the list is read again; these stay on screen meanwhile, and if that read fails. Never shown to
// another sign-in.
let lastGood = { token: null, map: {} };

const RETRY_MS = 3000;
const MAX_RETRIES = 5;

/** Resolves to the map, or to null when the read failed (the hook then tries again shortly). */
const loadStoreMap = scope => {
  if (cachedScope !== scope) { cachedScope = scope; cachedMap = null; inflight = null; }
  if (cachedMap) return Promise.resolve(cachedMap);
  if (!inflight) {
    inflight = api
      .get("/companies", { params: { includeInactive: true, limit: 500 } })
      .then((res) => {
        const map = {};
        (res.data?.data || []).forEach((c) => {
          if (c?.id != null) map[String(c.id)] = c.name || c.code || "";
        });
        if (cachedScope === scope) cachedMap = map;
        if (Object.keys(map).length) lastGood = { token: localStorage.getItem("token"), map };
        return map;
      })
      .catch(() => {
        // Allow a retry if the request failed.
        if (cachedScope === scope) inflight = null;
        return null;
      });
  }
  return inflight;
};

// Returns an { [companyId]: storeName } map. Empty until the first fetch resolves.
export default function useStoreNameMap() {
  const token = localStorage.getItem("token");
  const scope = requestCacheScope();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState({ scope: "", count: 0 });
  const retries = attempt.scope === scope ? attempt.count : 0;

  useEffect(() => {
    let active = true;
    let timer = null;
    if (!token) return undefined;
    loadStoreMap(scope).then((resolved) => {
      if (!active) return;
      if (resolved) setResult({ scope, map: resolved });
      else if (retries < MAX_RETRIES) timer = setTimeout(() => setAttempt({ scope, count: retries + 1 }), RETRY_MS);
    });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [scope, token, retries]);

  if (!token) return {};
  if (result?.scope === scope) return result.map;
  return lastGood.token === token ? lastGood.map : {};
}

// Resolves a single company_id to its store/warehouse name (or "—").
export const resolveStoreName = (map, companyId) => {
  if (companyId == null || companyId === "") return "—";
  return map[String(companyId)] ?? "—";
};
