// IndexedDB storage for offline POS billing (see posOffline.js). Every key starts with a scope,
// "{userId}:{storeId}", so another login or store on the same browser never reads these rows.
//   catalog: sellable items by lower-cased barcode/code      bills: queued offline bills by checkout key
//   meta:    the downloaded offline pack, number sequences

const DB_NAME = "vynerix_pos_offline_v1";
let opening = null;

function openDb() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("This browser cannot store offline bills.")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("catalog", { keyPath: "key" }).createIndex("scope", "scope");
      db.createObjectStore("bills", { keyPath: "checkoutKey" }).createIndex("scope", "scope");
      db.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Offline storage is unavailable."));
  });
  opening.catch(() => { opening = null; });
  return opening;
}

// Runs fn(stores) in one transaction and resolves with its return value once the transaction commits.
async function transact(names, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    const stores = Object.fromEntries([].concat(names).map(name => [name, tx.objectStore(name)]));
    let result;
    Promise.resolve(fn(stores, tx)).then(value => { result = value; }, error => { tx.abort(); reject(error); });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Offline storage write was cancelled."));
  });
}

const asPromise = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const catalogKey = (scope, code) => `${scope}|${String(code || "").trim().toLowerCase()}`;

export function putCatalogEntries(scope, generation, entries) {
  return transact("catalog", "readwrite", ({ catalog }) => {
    for (const { code, row } of entries) catalog.put({ key: catalogKey(scope, code), scope, generation, row });
  });
}

/** Drops rows from earlier downloads (sold out or removed since). */
export function pruneCatalog(scope, generation) {
  return transact("catalog", "readwrite", ({ catalog }) => new Promise((resolve, reject) => {
    const cursor = catalog.index("scope").openCursor(IDBKeyRange.only(scope));
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) { resolve(); return; }
      if (current.value.generation !== generation) current.delete();
      current.continue();
    };
    cursor.onerror = () => reject(cursor.error);
  }));
}

export async function getCatalogRow(scope, code) {
  const entry = await transact("catalog", "readonly", ({ catalog }) => asPromise(catalog.get(catalogKey(scope, code))));
  return entry?.row || null;
}

export function findCatalogRows(scope, matches, limit = 50) {
  return transact("catalog", "readonly", ({ catalog }) => new Promise((resolve, reject) => {
    const found = [];
    const cursor = catalog.index("scope").openCursor(IDBKeyRange.only(scope));
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current || found.length >= limit) { resolve(found); return; }
      if (matches(current.value.row)) found.push(current.value.row);
      current.continue();
    };
    cursor.onerror = () => reject(cursor.error);
  }));
}

/** Applies sold quantities to the local catalog so the till does not oversell while offline. */
export function reduceCatalogStock(scope, sold) {
  return transact("catalog", "readwrite", async ({ catalog }) => {
    for (const { code, qty } of sold) {
      const entry = await asPromise(catalog.get(catalogKey(scope, code)));
      if (!entry) continue;
      const left = Number(entry.row.qty || 0) - Number(qty || 0);
      if (left <= 0.0005) catalog.delete(entry.key);
      else catalog.put({ ...entry, row: { ...entry.row, qty: left } });
    }
  });
}

export async function getMeta(key) {
  const entry = await transact("meta", "readonly", ({ meta }) => asPromise(meta.get(key)));
  return entry?.value ?? null;
}

export function setMeta(key, value) {
  return transact("meta", "readwrite", ({ meta }) => { meta.put({ key, value }); });
}

/** Next number in a sequence, never below `floor`; atomic across tabs of the same till. */
export function takeSequence(key, floor) {
  return transact("meta", "readwrite", async ({ meta }) => {
    const last = Number((await asPromise(meta.get(key)))?.value || 0);
    const next = Math.max(last + 1, Number(floor || 1));
    meta.put({ key, value: next });
    return next;
  });
}

export function putBill(bill) {
  return transact("bills", "readwrite", ({ bills }) => { bills.put(bill); });
}

export function getBills(scope) {
  return transact("bills", "readonly", ({ bills }) => asPromise(bills.index("scope").getAll(IDBKeyRange.only(scope))));
}

export function deleteBill(checkoutKey) {
  return transact("bills", "readwrite", ({ bills }) => { bills.delete(checkoutKey); });
}
