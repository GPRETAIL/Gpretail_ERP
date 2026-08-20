import { useEffect, useState } from "react";
import api from "../api/axios";

// Shared store/warehouse id -> name resolver for the master list pages.
// Records carry a `company_id` (the owning store, an identity "company" of kind
// master). This hook fetches that list once and caches it at module scope so
// every master list page reuses the same map instead of re-fetching.
let cachedMap = null;
let inflight = null;

const loadStoreMap = () => {
  if (cachedMap) return Promise.resolve(cachedMap);
  if (!inflight) {
    inflight = api
      .get("/companies", { params: { includeInactive: true, limit: 500 } })
      .then((res) => {
        const map = {};
        (res.data?.data || []).forEach((c) => {
          if (c?.id != null) map[String(c.id)] = c.name || c.code || "";
        });
        cachedMap = map;
        return map;
      })
      .catch(() => {
        // Allow a retry on the next mount if the request failed.
        inflight = null;
        return {};
      });
  }
  return inflight;
};

// Returns an { [companyId]: storeName } map. Empty until the first fetch resolves.
export default function useStoreNameMap() {
  const [map, setMap] = useState(cachedMap || {});

  useEffect(() => {
    let active = true;
    loadStoreMap().then((resolved) => {
      if (active) setMap(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return map;
}

// Resolves a single company_id to its store/warehouse name (or "—").
export const resolveStoreName = (map, companyId) => {
  if (companyId == null || companyId === "") return "—";
  return map[String(companyId)] ?? "—";
};
