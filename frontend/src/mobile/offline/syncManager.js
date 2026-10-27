/**
 * Vynerix Mobile ERP — Offline Sync Manager
 * 
 * Manages background synchronization of queued mutations when network restores.
 */

import api from "../../api/axios";
import { getSyncQueue, removeSyncQueueItem } from "./db";

let isSyncing = false;
let scheduledSync = null;

export async function processSyncQueue() {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { success: false, syncedCount: 0, reason: "offline_or_busy" };
  }
  let user;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { /* Invalid cached identity cannot own a queued invoice. */ }
  const token = localStorage.getItem("token");
  const storeId = sessionStorage.getItem("activeStoreId") || String(user?.store_id || user?.company_id || "");
  if (!token || !user?.id || !storeId) return { success: false, syncedCount: 0, reason: "select_authenticated_store" };

  isSyncing = true;
  let syncedCount = 0;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      isSyncing = false;
      return { success: true, syncedCount: 0 };
    }

    for (const item of queue) {
      // Legacy entries without an owner/key need manual review; never guess
      // their tenant or replay an ambiguous write against another database.
      if (String(item.userId) !== String(user.id) || String(item.storeId) !== String(storeId) ||
        item.endpoint !== "/pos-sales" || item.method !== "POST" || !item.payload?.checkoutKey || !["local", "cloud"].includes(item.target)) continue;
      if (localStorage.getItem("token") !== token || (sessionStorage.getItem("activeStoreId") || String(user.store_id || user.company_id || "")) !== storeId) break;
      try {
        await api({
          method: item.method,
          url: item.endpoint,
          data: item.payload,
          storeScopeId: item.storeId,
          __posRetryTarget: item.target,
        });

        // Remove item from sync queue
        await removeSyncQueueItem(item.id);
        syncedCount++;
      } catch (err) {
        console.warn("[SyncManager] Invoice remains queued for review:", err?.response?.status || "connection unavailable");
        // Preserve failed invoices for review. Stop a burst of requests against
        // an unavailable server or an expired/revoked account.
        break;
      }
    }

    if (syncedCount > 0) {
      window.dispatchEvent(
        new CustomEvent("vx-sync-completed", {
          detail: { syncedCount },
        })
      );
      // Also notify active screens to refresh
      window.dispatchEvent(new CustomEvent("vx-network-restored", { detail: { source: "sync" } }));
    }

    isSyncing = false;
    return { success: syncedCount === queue.length, syncedCount, remainingCount: queue.length - syncedCount };
  } catch (err) {
    console.error("[SyncManager] Sync processing failed:", err);
    isSyncing = false;
    return { success: false, syncedCount, error: err.message };
  }
}

// Auto-bind network restoration
if (typeof window !== "undefined") {
  const schedule = event => {
    if (event.detail?.source === "sync") return;
    if (scheduledSync) clearTimeout(scheduledSync);
    scheduledSync = setTimeout(() => { scheduledSync = null; void processSyncQueue(); }, 1500);
  };
  window.addEventListener("online", schedule);
  window.addEventListener("vx-network-restored", schedule);
}
