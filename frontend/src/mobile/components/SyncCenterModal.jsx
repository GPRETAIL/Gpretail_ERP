import React, { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Trash2, CloudOff, Check } from "lucide-react";
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
    <div className="fixed inset-0 z-[87] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-900">Sync Center</h3>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              {queue.length} change{queue.length === 1 ? "" : "s"} waiting to sync
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-500" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <p className="text-center text-xs text-slate-400 py-8">Loading queue...</p>
          ) : queue.length === 0 ? (
            <div className="text-center py-10">
              <Check size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Everything is synced</p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{formatAction(item.action)}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.method} {item.endpoint} · {formatWhen(item.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDiscard(item.id)}
                  className="shrink-0 p-2 rounded-lg bg-white border border-slate-200 text-rose-500 active:scale-95 transition-all"
                  aria-label="Discard this change"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {queue.length > 0 && (
          <div className="p-4 border-t border-slate-100 shrink-0">
            {navigator.onLine ? (
              <button
                type="button"
                onClick={handleRetryAll}
                disabled={retrying}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
                {retrying ? "Syncing..." : "Retry Now"}
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5">
                <CloudOff size={14} />
                Offline - will sync automatically when reconnected
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
