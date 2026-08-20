import { useEffect, useState } from "react";
import api from "../api/axios";

/**
 * Plan / trial / expiry for the signed-in user's stores, replicated from VX-Admin.
 *
 * <p>One hook feeding both the footer's trial marker and the due-reminder popup. They ask the same
 * question at different thresholds, so sharing the fetch keeps them from disagreeing about how many
 * days are left -- and keeps it to one request rather than two on the same interval.
 *
 * Refreshed on a long interval because the underlying data only changes when the tenant sync pulls a
 * new snapshot (every 5 minutes at most) and when a day rolls over. Polling faster would cost
 * requests without ever showing anything new.
 */
const REFRESH_MS = 10 * 60 * 1000;

export default function useSubscriptionStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const load = async () => {
      try {
        const res = await api.get("/companies/subscription/status");
        if (!cancelled) setStatus(res.data?.data || null);
      } catch {
        // Silent: this drives an advisory banner, and a failed poll must never interrupt work or
        // surface a toast on a screen the user is trying to bill from.
        if (!cancelled) setStatus(null);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    void load();
    timer = setInterval(() => {
      void load();
    }, REFRESH_MS);
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return status;
}
