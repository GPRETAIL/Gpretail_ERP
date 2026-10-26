/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
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
  const user = useSelector(state => state.auth.user);
  const [result, setResult] = useState(null);
  const status = result?.user === user ? result.status : DEFAULT_STATE;

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    let pending = false;
    let enabled = true;
    let lastPollAt = 0;
    const controller = new AbortController();

    const refresh = async (force = false) => {
      if (document.visibilityState === "hidden" || pending) return;
      if (!force && Date.now() - lastPollAt < (enabled ? POLL_INTERVAL_MS : 300000)) return;
      pending = true;
      lastPollAt = Date.now();
      try {
        const res = await api.get("/local-server-config", { signal: controller.signal });
        const data = res.data?.data || {};
        if (!alive) return;
        enabled = Boolean(data.enabled);

        const routing = getRuntimeRoutingSnapshot();
        setResult({ user, status: {
          enabled: Boolean(data.enabled),
          target: routing.currentTarget === "local" ? "local" : "cloud",
          healthy: Boolean(routing.localHealthy),
          outboxPending: Number(data.outbox_pending || 0),
          outboxFailed: Number(data.outbox_failed || 0),
        } });
      } catch {
        // Non-critical: leave the previous status in place rather than flashing to a wrong state.
      } finally { pending = false; }
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
      setResult((prev) => ({ user, status: {
        ...(prev?.user === user ? prev.status : DEFAULT_STATE),
        target: routing.currentTarget === "local" ? "local" : "cloud",
        healthy: Boolean(routing.localHealthy),
      } }));
      if (typeof routing.enabled === "boolean" && routing.enabled !== enabled) void refresh(true);
    };
    const onVisible = () => { if (document.visibilityState !== "hidden") void refresh(); };
    window.addEventListener(RUNTIME_ROUTING_CHANGED_EVENT, onRoutingChanged);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener(RUNTIME_ROUTING_CHANGED_EVENT, onRoutingChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  return <SyncStatusContext.Provider value={status}>{children}</SyncStatusContext.Provider>;
};

export const useSyncStatus = () => {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error("useSyncStatus must be used within SyncStatusProvider");
  return ctx;
};
