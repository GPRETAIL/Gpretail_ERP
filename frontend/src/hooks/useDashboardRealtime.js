import { useEffect, useRef } from "react";

// There is no backend WebSocket endpoint for the dashboard, so "live" updates are delivered by
// polling the REST snapshot on an interval instead of an (always-failing) WebSocket. Polling
// pauses while the browser tab is hidden and refreshes immediately when it becomes visible again.
// A silent refresh also self-heals transient per-section failures — they recover on the next poll.
const POLL_INTERVAL_MS = 30000;

/**
 * Periodically refreshes the dashboard so it stays "live" without a WebSocket server.
 * Signature is unchanged from the previous WebSocket implementation.
 */
const useDashboardRealtime = ({ enabled = true, companyId = "", onUpdate } = {}) => {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || typeof onUpdateRef.current !== "function") return undefined;

    let timer = null;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        onUpdateRef.current?.({ silent: true });
      }
    };

    const start = () => {
      if (!timer) timer = setInterval(refresh, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh(); // catch up immediately when the tab regains focus
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, companyId]);

  return null;
};

export default useDashboardRealtime;
