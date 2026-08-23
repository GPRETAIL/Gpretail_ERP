/**
 * Vynerix Mobile ERP — Offline Sync Manager
 * 
 * Manages background synchronization of queued mutations when network restores.
 */

import api from "../../api/axios";
import { getSyncQueue, removeSyncQueueItem } from "./db";

let isSyncing = false;

export async function processSyncQueue() {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { success: false, syncedCount: 0, reason: "offline_or_busy" };
  }

  isSyncing = true;
  let syncedCount = 0;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      isSyncing = false;
      return { success: true, syncedCount: 0 };
    }

    console.log(`[SyncManager] Processing ${queue.length} pending offline actions...`);

    for (const item of queue) {
      try {
        await api({
          method: item.method,
          url: item.endpoint,
          data: item.payload,
        });

        // Remove item from sync queue
        await removeSyncQueueItem(item.id);
        syncedCount++;
      } catch (err) {
        console.warn(`[SyncManager] Action ${item.action} failed:`, err);
        // If 4xx client error (except auth), remove to avoid poison pill
        if (err.response && err.response.status >= 400 && err.response.status < 500 && err.response.status !== 401) {
          await removeSyncQueueItem(item.id);
        }
      }
    }

    if (syncedCount > 0) {
      window.dispatchEvent(
        new CustomEvent("vx-sync-completed", {
          detail: { syncedCount },
        })
      );
      // Also notify active screens to refresh
      window.dispatchEvent(new CustomEvent("vx-network-restored"));
    }

    isSyncing = false;
    return { success: true, syncedCount };
  } catch (err) {
    console.error("[SyncManager] Sync processing failed:", err);
    isSyncing = false;
    return { success: false, syncedCount, error: err.message };
  }
}

// Auto-bind network restoration
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    setTimeout(processSyncQueue, 1500);
  });
  window.addEventListener("vx-network-restored", () => {
    setTimeout(processSyncQueue, 1000);
  });
}
