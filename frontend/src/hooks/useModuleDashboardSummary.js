import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";

// Fetches one module's dashboard-summary endpoint on demand. `active` should only be true while
// the tab showing it is actually open -- with 8 module tabs on one page, fetching all of them
// eagerly on mount would fire 8 requests nobody may ever look at. Once loaded, the result is
// cached for the life of this hook instance, so switching away and back doesn't refetch.
export default function useModuleDashboardSummary(endpoint, { active = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint);
      setData(res.data?.data || res.data || null);
      fetchedRef.current = true;
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (active && !fetchedRef.current) {
      load();
    }
  }, [active, load]);

  return { data, loading, error, reload: load };
}
