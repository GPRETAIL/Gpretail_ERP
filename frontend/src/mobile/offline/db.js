/**
 * Vynerix Mobile ERP — IndexedDB Storage Engine
 * 
 * Provides robust offline storage for:
 * 1. Cache: Fast local storage for dashboard, catalog, customers, suppliers
 * 2. Drafts: Offline invoices and bills saved locally
 * 3. Sync Queue: Pending mutations to replay when network restores
 * 4. Notifications: Payment alerts and system push notifications
 */

const DB_NAME = "vynerix_mobile_v1";
const DB_VERSION = 1;

let dbInstance = null;

export function openDatabase() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Key-value offline cache
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }

      // 2. Offline drafts (invoices, bills)
      if (!db.objectStoreNames.contains("drafts")) {
        const draftStore = db.createObjectStore("drafts", {
          keyPath: "id",
          autoIncrement: true,
        });
        draftStore.createIndex("type", "type", { unique: false });
        draftStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // 3. Synchronization queue
      if (!db.objectStoreNames.contains("sync_queue")) {
        const syncStore = db.createObjectStore("sync_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        syncStore.createIndex("status", "status", { unique: false });
        syncStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // 4. Notifications & payment alerts
      if (!db.objectStoreNames.contains("notifications")) {
        const notifStore = db.createObjectStore("notifications", {
          keyPath: "id",
        });
        notifStore.createIndex("isRead", "isRead", { unique: false });
        notifStore.createIndex("type", "type", { unique: false });
        notifStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error || new Error("Failed to open IndexedDB"));
    };
  });
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

export async function setCachedData(key, data) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      const item = { key, data, updatedAt: Date.now() };
      const req = store.put(item);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] setCachedData error:", err);
    return false;
  }
}

export async function getCachedData(key) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ─── Drafts Helpers ──────────────────────────────────────────────────────────

export async function saveDraft(type, data, customId = null) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      const store = tx.objectStore("drafts");
      const item = {
        ...(customId ? { id: customId } : {}),
        type,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] saveDraft error:", err);
    return null;
  }
}

export async function getDrafts(type = null) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction("drafts", "readonly");
      const store = tx.objectStore("drafts");
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        if (type) {
          resolve(all.filter((d) => d.type === type));
        } else {
          resolve(all);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteDraft(id) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction("drafts", "readwrite");
      const store = tx.objectStore("drafts");
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ─── Sync Queue Helpers ───────────────────────────────────────────────────────

export async function addToSyncQueue(action, endpoint, method, payload) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const item = {
        action,
        endpoint,
        method: method.toUpperCase(),
        payload,
        status: "pending",
        retries: 0,
        createdAt: Date.now(),
      };
      const req = store.add(item);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent("vx-sync-queue-updated"));
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] addToSyncQueue error:", err);
    return null;
  }
}

export async function getSyncQueue() {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction("sync_queue", "readonly");
      const store = tx.objectStore("sync_queue");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeSyncQueueItem(id) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction("sync_queue", "readwrite");
      const store = tx.objectStore("sync_queue");
      const req = store.delete(id);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent("vx-sync-queue-updated"));
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ─── Notifications Helpers ───────────────────────────────────────────────────

export async function saveNotification(notification) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("notifications", "readwrite");
      const store = tx.objectStore("notifications");
      const item = {
        id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: notification.type || "system",
        title: notification.title,
        body: notification.body,
        amount: notification.amount || null,
        dueDate: notification.dueDate || null,
        supplier: notification.supplier || null,
        isRead: false,
        timestamp: notification.timestamp || Date.now(),
      };
      const req = store.put(item);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent("vx-notifications-updated"));
        resolve(item);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] saveNotification error:", err);
    return null;
  }
}

export async function getStoredNotifications() {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction("notifications", "readonly");
      const store = tx.objectStore("notifications");
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        // Sort descending by timestamp
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction("notifications", "readwrite");
      const store = tx.objectStore("notifications");
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (!getReq.result) return resolve(false);
        const updated = { ...getReq.result, isRead: true };
        const putReq = store.put(updated);
        putReq.onsuccess = () => {
          window.dispatchEvent(new CustomEvent("vx-notifications-updated"));
          resolve(true);
        };
        putReq.onerror = () => resolve(false);
      };
      getReq.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
