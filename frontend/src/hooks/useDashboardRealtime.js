import { useEffect, useRef } from "react";
import Pusher from "pusher-js";

// app_id/key/cluster aren't secret (the key ships in every client bundle regardless -
// that's how Pusher's client auth model works), so a hardcoded fallback here matches
// how runtimeRouting.js's CLOUD_BASE_URL falls back to "/api": no .env.production
// exists for the frontend build (frontend/.env is local-dev-only and gitignored), so
// baking in the known-good default is simpler than wiring a CI env var for a
// non-sensitive value.
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || "09ec1437c80a8afde725";
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || "ap2";

// Safety net once a Pusher channel is live -- catches anything a dropped/missed
// event would otherwise lose. Much longer than the old blind poll since it's a
// backstop, not the primary delivery mechanism anymore.
const FALLBACK_POLL_INTERVAL_MS = 180000;
// No single store to subscribe to (superadmin viewing "All Stores") -- same
// polling this hook used everywhere before Pusher was wired up.
const ALL_STORES_POLL_INTERVAL_MS = 30000;

let sharedClient = null;
const channelConsumers = new Map();
const getPusherClient = () => {
  if (!sharedClient) {
    sharedClient = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
  }
  return sharedClient;
};

/**
 * Keeps the dashboard "live" via a real Pusher push (store-{companyId} channel,
 * dashboard.updated event -- see DashboardBroadcastService on the backend) instead
 * of polling. Falls back to the original visibility-aware polling when there's no
 * single store to subscribe to (superadmin's "All Stores" view), and keeps a slow
 * poll running even with a live channel, in case an event is missed.
 * Signature is unchanged from the previous polling-only implementation.
 */
const useDashboardRealtime = ({ enabled = true, companyId = "", onUpdate } = {}) => {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || typeof onUpdateRef.current !== "function") return undefined;

    let timer = null;
    let channel = null;
    let eventTimer = null;
    const channelName = `store-${companyId}`;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        onUpdateRef.current?.({ silent: true });
      }
    };
    // A bulk import/checkout can publish many updates together. Refresh once
    // for that burst instead of starting a dashboard reload for every line.
    const handleUpdate = () => {
      if (document.visibilityState !== "visible" || eventTimer !== null) return;
      eventTimer = setTimeout(() => {
        eventTimer = null;
        refresh();
      }, 250);
    };

    const pollIntervalMs = companyId ? FALLBACK_POLL_INTERVAL_MS : ALL_STORES_POLL_INTERVAL_MS;

    const startPoll = () => {
      if (!timer) timer = setInterval(refresh, pollIntervalMs);
    };
    const stopPoll = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh(); // catch up immediately when the tab regains focus
        startPoll();
      } else {
        stopPoll();
      }
    };

    if (companyId) {
      try {
        channel = getPusherClient().subscribe(channelName);
        channel.bind("dashboard.updated", handleUpdate);
        channelConsumers.set(channelName, (channelConsumers.get(channelName) || 0) + 1);
      } catch {
        // Pusher unreachable (network blocks websockets, bad key, etc.) -- the poll
        // fallback below still keeps the dashboard "live enough" either way.
        channel = null;
      }
    }

    if (document.visibilityState === "visible") startPoll();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPoll();
      if (eventTimer !== null) clearTimeout(eventTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) {
        channel.unbind("dashboard.updated", handleUpdate);
        const remaining = (channelConsumers.get(channelName) || 1) - 1;
        if (remaining > 0) {
          channelConsumers.set(channelName, remaining);
        } else {
          channelConsumers.delete(channelName);
          sharedClient.unsubscribe(channelName);
        }
        if (channelConsumers.size === 0) {
          sharedClient.disconnect();
          sharedClient = null;
        }
      }
    };
  }, [enabled, companyId]);

  return null;
};

export default useDashboardRealtime;
