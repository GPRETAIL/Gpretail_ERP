import React, { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Trash2, CloudOff, Check } from "lucide-react";
import { Box, Typography } from "@mui/material";
import { getSyncQueue, removeSyncQueueItem } from "../offline/db";
import { processSyncQueue } from "../offline/syncManager";

const formatAction = (action) =>
  String(action || "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "Queued Change";

const formatWhen = (ts) => {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/**
 * Sync Center - inspects the local offline sync queue (drafts/mutations
 * saved while offline, waiting to reach the server), with manual retry and
 * per-item discard. The Dashboard's "Unsynced Changes" badge (added
 * earlier) opens this instead of just being an inert count.
 */
export default function SyncCenterModal({ isOpen, onClose }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const items = await getSyncQueue();
    setQueue(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    load();

    const handleUpdate = () => load();
    window.addEventListener("vx-sync-queue-updated", handleUpdate);
    window.addEventListener("vx-sync-completed", handleUpdate);
    return () => {
      window.removeEventListener("vx-sync-queue-updated", handleUpdate);
      window.removeEventListener("vx-sync-completed", handleUpdate);
    };
  }, [isOpen, load]);

  if (!isOpen) return null;

  const handleRetryAll = async () => {
    if (!navigator.onLine) return;
    setRetrying(true);
    await processSyncQueue();
    await load();
    setRetrying(false);
  };

  const handleDiscard = async (id) => {
    await removeSyncQueueItem(id);
    await load();
  };

  return (
    <Box
      className="animate-in fade-in duration-150"
      sx={{ position: "fixed", inset: 0, zIndex: 87, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
    >
      <Box
        className="animate-in slide-in-from-bottom duration-200"
        sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: 24, display: "flex", flexDirection: "column", maxHeight: "80vh", overflow: "hidden" }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <Box>
            <Typography component="h3" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Sync Center</Typography>
            <Typography component="p" sx={{ fontSize: 10.5, color: "#64748b", mt: 0.25 }}>
              {queue.length} change{queue.length === 1 ? "" : "s"} waiting to sync
            </Typography>
          </Box>
          <Box component="button" type="button" onClick={onClose} sx={{ p: 0.75, color: "#64748b" }} aria-label="Close">
            <X size={20} />
          </Box>
        </Box>

        <Box sx={{ p: 1.5, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          {loading ? (
            <Typography component="p" sx={{ textAlign: "center", fontSize: 12, color: "#94a3b8", py: 4 }}>Loading queue...</Typography>
          ) : queue.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <Check size={28} style={{ color: "#10b981", margin: "0 auto 8px" }} />
              <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Everything is synced</Typography>
            </Box>
          ) : (
            queue.map((item) => (
              <Box
                key={item.id}
                sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatAction(item.action)}</Typography>
                  <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.method} {item.endpoint} · {formatWhen(item.createdAt)}
                  </Typography>
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() => handleDiscard(item.id)}
                  sx={{ flexShrink: 0, p: 1, borderRadius: "8px", bgcolor: "#fff", border: "1px solid #e2e8f0", color: "#f43f5e", transition: "all 0.15s", "&:active": { transform: "scale(0.95)" } }}
                  aria-label="Discard this change"
                >
                  <Trash2 size={14} />
                </Box>
              </Box>
            ))
          )}
        </Box>

        {queue.length > 0 && (
          <Box sx={{ p: 2, borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
            {navigator.onLine ? (
              <Box
                component="button"
                type="button"
                onClick={handleRetryAll}
                disabled={retrying}
                sx={{
                  width: "100%", py: 1.5, borderRadius: "12px", bgcolor: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, "&:disabled": { opacity: 0.5 },
                }}
              >
                <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
                {retrying ? "Syncing..." : "Retry Now"}
              </Box>
            ) : (
              <Box sx={{ width: "100%", py: 1.5, borderRadius: "12px", bgcolor: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
                <CloudOff size={14} />
                Offline - will sync automatically when reconnected
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
