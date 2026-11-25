/**
 * Held bills: a customer's bill set aside at the counter so the next customer can be served, then picked up again.
 * A held bill is only a saved copy of the screen. It has no bill number, takes nothing out of stock, posts nothing to the
 * books and is never synced; it becomes a real bill when it is resumed and saved. It lives in this browser, for this
 * user in this store, and is dropped after a day.
 */
export const MAX_HELD_BILLS = 20;
const KEEP_MS = 24 * 60 * 60 * 1000;

export const heldBillsKey = (storeId, userId) => `vx:pos-held:${storeId || "0"}:${userId || "0"}`;

const readAll = (key) => {
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** Held bills of one user, newest first, without those older than a day. */
export const loadHeldBills = (key, now = Date.now()) => readAll(key)
  .filter((bill) => bill && Array.isArray(bill.snapshot?.cart) && now - Number(bill.heldAt) < KEEP_MS)
  .sort((a, b) => Number(b.heldAt) - Number(a.heldAt));

/** Returns false when the browser would not keep it (storage full or blocked), so the screen can say so. */
export const saveHeldBills = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
};

/** The words shown for a held bill: who it is for, how many items and the amount. */
export const heldBillLabel = (customerName, customerMobile) => String(customerName || "").trim() || String(customerMobile || "").trim() || "Walk-in customer";

export const makeHeldBill = ({ snapshot, label, amount, now = Date.now() }) => ({
  id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
  heldAt: now,
  label,
  items: snapshot.cart.length,
  amount: Math.round((Number(amount) || 0) * 100) / 100,
  snapshot,
});

/** Adds a bill to the list; when the list is full the oldest goes, so holding never fails at a busy counter. */
export const addHeldBill = (list, bill) => [bill, ...list].slice(0, MAX_HELD_BILLS);

export const removeHeldBill = (list, id) => list.filter((bill) => bill.id !== id);

/** "26 Nov, 12:31 am": the day and time a bill was put on hold. */
export const heldAtText = (heldAt) => new Date(Number(heldAt)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** "5 min ago", "2 h ago": how long a bill has waited. */
export const waitedText = (heldAt, now = Date.now()) => {
  const minutes = Math.max(0, Math.floor((now - Number(heldAt)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
};
