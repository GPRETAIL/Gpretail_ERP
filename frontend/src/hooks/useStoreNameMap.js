import { useEffect, useState } from "react";
import api from "../api/axios";
import { requestCacheScope } from "../utils/requestCacheScope";

// Shared store/warehouse id -> name resolver for the master list pages.
// Records carry a `company_id` (the owning store, an identity "company" of kind
// master). This hook fetches that list once and caches it at module scope so
// every master list page reuses the same map instead of re-fetching.
let cachedMap = null;
let inflight = null;
let cachedScope = "";

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
        return map;
      })
      .catch(() => {
        // Allow a retry on the next mount if the request failed.
        if (cachedScope === scope) inflight = null;
        return {};
      });
  }
  return inflight;
};

// Returns an { [companyId]: storeName } map. Empty until the first fetch resolves.
export default function useStoreNameMap() {
  const token = localStorage.getItem("token");
  const scope = requestCacheScope();
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    if (!token) return;
    loadStoreMap(scope).then((resolved) => {
      if (active) setResult({ scope, map: resolved });
    });
    return () => {
      active = false;
    };
  }, [scope, token]);

  return token && result?.scope === scope ? result.map : {};
}

// Resolves a single company_id to its store/warehouse name (or "—").
export const resolveStoreName = (map, companyId) => {
  if (companyId == null || companyId === "") return "—";
  return map[String(companyId)] ?? "—";
};
