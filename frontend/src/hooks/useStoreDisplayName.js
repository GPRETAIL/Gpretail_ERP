import { useEffect, useState } from "react";
import api from "../api/axios";

export default function useStoreDisplayName(user) {
  const storeId = Number(user?.company_id || 0);
  const suppliedName = String(user?.company_name || "").trim();
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (!storeId || suppliedName) return;
    const controller = new AbortController();
    api.get(`/companies/${storeId}`, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setLoaded({ storeId, name: String(response.data?.data?.name || response.data?.name || "").trim() });
    }).catch(() => {
      if (!controller.signal.aborted) setLoaded({ storeId, name: "" });
    });
    return () => controller.abort();
  }, [storeId, suppliedName]);
  return suppliedName || (loaded?.storeId === storeId ? loaded.name : "");
}
