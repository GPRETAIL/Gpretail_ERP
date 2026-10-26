/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import api from "../api/axios";
import useAsyncQuery from "../hooks/useAsyncQuery";

const SubscriptionStatusContext = createContext(null);
const REFRESH_MS = 10 * 60 * 1000;
const FOCUS_REFRESH_MS = 60 * 1000;

// Footer and reminder share one request, one timer and one store-scoped result.
export function SubscriptionStatusProvider({ children }) {
  const user = useSelector(state => state.auth.user);
  const lastAttempt = useRef(0);
  const inFlight = useRef(false);
  const load = useCallback(async ({ signal }) => {
    if (!user?.id) return null;
    lastAttempt.current = Date.now();
    inFlight.current = true;
    try {
      const response = await api.get("/companies/subscription/status", { signal });
      return response.data?.data || null;
    } finally { inFlight.current = false; }
  }, [user]);
  const { data, reload } = useAsyncQuery(load, { enabled: Boolean(user?.id) });
  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => {
      if (document.visibilityState === "hidden" || inFlight.current || Date.now() - lastAttempt.current < FOCUS_REFRESH_MS) return;
      lastAttempt.current = Date.now();
      reload({ silent: true });
    };
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user?.id, reload]);
  return <SubscriptionStatusContext.Provider value={data ?? null}>{children}</SubscriptionStatusContext.Provider>;
}

export function useSubscriptionStatus() {
  return useContext(SubscriptionStatusContext);
}
