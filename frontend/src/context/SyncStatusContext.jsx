/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { getRuntimeRoutingSnapshot, RUNTIME_ROUTING_CHANGED_EVENT } from "../api/runtimeRouting";

const SyncStatusContext = createContext(null);

const POLL_INTERVAL_MS = 20000;

const DEFAULT_STATE = {
  enabled: false,
  target: "cloud",
  healthy: false,
  outboxPending: 0,
  outboxFailed: 0,
};

export const SyncStatusProvider = ({ children }) => {
  const [status, setStatus] = useState(DEFAULT_STATE);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const res = await api.get("/local-server-config");
        const data = res.data?.data || {};
        if (!alive) return;

        const routing = getRuntimeRoutingSnapshot();
        setStatus({
          enabled: Boolean(data.enabled),
          target: routing.currentTarget === "local" ? "local" : "cloud",
          healthy: Boolean(routing.localHealthy),
          outboxPending: Number(data.outbox_pending || 0),
          outboxFailed: Number(data.outbox_failed || 0),
        });
      } catch {
        // Non-critical: leave the previous status in place rather than flashing to a wrong state.
      }
    };

    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);

    // A local<->cloud switch (a failed health check, or a request failing over mid-flight) is
    // exactly the moment this status needs to be right -- reflect it the instant it happens
    // rather than leaving the footer showing the stale target for up to POLL_INTERVAL_MS.
    // outboxPending/outboxFailed aren't carried by this event, so they keep showing their
    // last-polled values until the next refresh() rather than being reset here.
    const onRoutingChanged = () => {
      if (!alive) return;
      const routing = getRuntimeRoutingSnapshot();
      setStatus((prev) => ({
        ...prev,
        target: routing.currentTarget === "local" ? "local" : "cloud",
        healthy: Boolean(routing.localHealthy),
      }));
    };
    window.addEventListener(RUNTIME_ROUTING_CHANGED_EVENT, onRoutingChanged);

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener(RUNTIME_ROUTING_CHANGED_EVENT, onRoutingChanged);
    };
  }, []);

  return <SyncStatusContext.Provider value={status}>{children}</SyncStatusContext.Provider>;
};

export const useSyncStatus = () => {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error("useSyncStatus must be used within SyncStatusProvider");
  return ctx;
};
