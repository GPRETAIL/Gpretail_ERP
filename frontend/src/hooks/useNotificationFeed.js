import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../api/axios";
import useAsyncQuery from "./useAsyncQuery";
import { backgroundRequestIdentity } from "../utils/backgroundRequestIdentity";
import { notificationChannels } from "../utils/realtimeClient";
import useRealtimeRefresh from "./useRealtimeRefresh";

export function useNotificationRefresh(reload, enabled = true) {
  // New alerts and reads in other tabs are pushed; the poll is the safety net (as on the dashboard).
  useRealtimeRefresh({
    channels: enabled ? notificationChannels() : [],
    events: ["notifications.updated"],
    enabled,
    onUpdate: reload,
    fallbackPollMs: 180000,
    noChannelPollMs: 60000,
  });
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState !== "hidden") reload({ silent: true });
    };
    window.addEventListener("online", refresh);
    window.addEventListener("vx-notifications-updated", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("vx-notifications-updated", refresh);
    };
  }, [enabled, reload]);
}

export default function useNotificationFeed({ category = "all", unread = false, page = 1, limit = 25, enabled = true } = {}) {
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const identity = backgroundRequestIdentity(user, token);
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState("");
  const load = useCallback(async ({ signal }) => {
    if (!identity) return { data: [] };
    const response = await api.get("/notifications", {
      params: { category, unread: unread ? 1 : 0, page, limit }, signal,
    });
    return response.data;
    // Changing authenticated store/user must discard the previous scope's messages.
  }, [category, unread, page, limit, identity]);
  const query = useAsyncQuery(load, { enabled });
  useNotificationRefresh(query.reload, enabled);
  const markRead = async (id) => {
    if (pending !== null) return;
    setPending(id ?? "all");
    setFailure("");
    try {
      await api.post(id == null ? "/notifications/read-all" : `/notifications/${id}/read`);
      window.dispatchEvent(new Event("vx-notifications-updated"));
    } catch {
      setFailure("Could not mark notifications as read. Please try again.");
    } finally {
      setPending(null);
    }
  };
  return {
    ...query, rows: Array.isArray(query.data?.data) ? query.data.data : [],
    hasNext: Boolean(query.data?.pagination?.has_next ?? query.data?.meta?.has_more),
    pending, failure, markRead,
  };
}
