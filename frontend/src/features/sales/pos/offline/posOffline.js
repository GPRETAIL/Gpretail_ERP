// Offline POS billing. While online the till downloads an "offline pack": its counter's offline
// number series, the cashier's discount limit and the store's sellable catalog. When the server
// can't be reached, bills are numbered from that series (261031-F2-0001 is final, not temporary),
// printed, and queued here; they sync oldest first once the server answers. The server keeps the
// printed number and lists anything it had to accept as-is for a manager (Sales > Offline Bills).
import * as store from "./posOfflineStore";

export const OFFLINE_CHANGED_EVENT = "vx-pos-offline-changed";
const CATALOG_PAGE_KINDS = ["barcodes", "products"];
const SYNCED_KEEP_MS = 2 * 24 * 60 * 60 * 1000;

export const offlineScope = (userId, storeId) => (userId && storeId ? `${userId}:${storeId}` : null);

const notify = () => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OFFLINE_CHANGED_EVENT)); };
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

/** The request never reached the server (or only the service worker answered). */
export const isNetworkFailure = error => !error?.response
  ? Boolean(error?.config) && error.code !== "ERR_CANCELED"
  : error.response.status === 503 && Boolean(error.response.data?.offline);

const refreshing = new Map();

/** Downloads the offline pack. Rows from an earlier download are replaced only once this one completes. */
export function refreshOfflinePack(api, scope) {
  if (!scope) return Promise.resolve(null);
  if (refreshing.has(scope)) return refreshing.get(scope);
  const run = (async () => {
    const { data } = await api.get("/pos-sales/offline/series");
    const pack = { ...(await store.getMeta(`${scope}|pack`)), ...data.data, seriesAt: Date.now() };
    await store.setMeta(`${scope}|pack`, pack);
    const generation = Date.now();
    let count = 0;
    for (const kind of CATALOG_PAGE_KINDS) {
      let after = 0;
      do {
        const res = await api.get("/pos-sales/offline/catalog", { params: { kind, after } });
        const rows = res.data?.data || [];
        const entries = rows.flatMap(row => [...new Set([row.barcode, row.code].filter(Boolean).map(String))]
          .filter((code, index) => index === 0 || kind === "products").map(code => ({ code, row })));
        await store.putCatalogEntries(scope, generation, entries);
        count += rows.length;
        after = res.data?.meta?.next;
      } while (after);
    }
    await store.pruneCatalog(scope, generation);
    const done = { ...pack, catalogAt: Date.now(), catalogCount: count };
    await store.setMeta(`${scope}|pack`, done);
    notify();
    return done;
  })();
  refreshing.set(scope, run);
  run.finally(() => refreshing.delete(scope)).catch(() => {});
  return run;
}

/** Records only the series/limit (cheap), e.g. when probing whether the server is back. */
export async function refreshOfflineSeries(api, scope) {
  const { data } = await api.get("/pos-sales/offline/series");
  const pack = { ...(await store.getMeta(`${scope}|pack`)), ...data.data, seriesAt: Date.now() };
  await store.setMeta(`${scope}|pack`, pack);
  return pack;
}

export const getOfflinePack = scope => (scope ? store.getMeta(`${scope}|pack`) : Promise.resolve(null));
export const lookupOfflineItem = (scope, code) => store.getCatalogRow(scope, code);

export function searchOfflineItems(scope, text, limit = 50) {
  const needle = String(text || "").trim().toLowerCase();
  if (!needle) return Promise.resolve([]);
  return store.findCatalogRows(scope, row => [row.productName, row.code, row.barcode].some(value => String(value || "").toLowerCase().includes(needle)), limit);
}

/** Sold lines leave the local catalog too, so an offline till cannot sell the same piece twice. */
export const reduceOfflineStock = (scope, lines) => (scope ? store.reduceCatalogStock(scope, lines
  .filter(line => line.barcode).map(line => ({ code: line.barcode, qty: line.qty }))) : Promise.resolve());

const pad = (value, size) => String(value).padStart(size, "0");

/** Next number from this counter's offline series, e.g. INV-SBT_01-20261031-F2-0001 / 261031-F2-0001. */
export async function mintOfflineNumber(scope, pack, now = Date.now()) {
  const series = pack?.series;
  if (!series?.code) throw new Error("This till has not downloaded its offline bill series. Open POS once while online with a counter assigned.");
  // Same calendar as the server's invoice numbers.
  const period = new Date(now + Number(series.utc_offset_minutes || 0) * 60000).toISOString().slice(0, 10).replace(/-/g, "");
  const seq = await store.takeSequence(`${scope}|seq|${series.code}|${period}`, series.period === period ? series.next : 1);
  return {
    invoiceNo: `${series.prefix}${period}-${series.code}-${pad(seq, 4)}`,
    billNo: `${period.slice(2)}-${series.code}-${pad(seq, 4)}`,
  };
}

const lineAmounts = item => {
  const qty = Number(item.qty) || 0;
  const base = qty * (Number(item.price) || 0) - (Number(item.discount) || 0);
  const tax = base * (Number(item.tax) || 0) / 100;
  return { qty, base, tax };
};

export const offlineBillTotal = items => round2(items.reduce((sum, item) => { const { base, tax } = lineAmounts(item); return sum + base + tax; }, 0));

/** Why this bill can't be saved offline, or null. These checks need the server or a supervisor. */
export function offlineBlockReason(payload, lines, pack) {
  if (!pack?.series?.code) return "This till has not downloaded its offline bill series yet. Open POS once while online with a counter assigned.";
  if (payload.isCredit) return "Credit sales need the internet to check the customer's credit.";
  if (payload.appliedPosReturnId) return "Using a return credit needs the internet.";
  const paid = (Number(payload.cashAmount) || 0) + (Number(payload.cardAmount) || 0) + (Number(payload.upiAmount) || 0);
  if (payload.saleSaveAs !== "paid_settled" || paid + 0.005 < offlineBillTotal(payload.items || [])) return "Offline bills must be fully paid (cash, card or UPI).";
  const limit = pack.max_discount_percent;
  if (limit != null) {
    for (const line of lines) {
      const listPrice = Number(line.listPrice) || 0;
      const qty = Math.max(0.0001, Number(line.qty) || 0);
      const effective = ((Number(line.price) || 0) * qty - (Number(line.discount) || 0)) / qty;
      const percent = listPrice > 0 ? round2((1 - effective / listPrice) * 100) : 0;
      if (percent > limit + 0.001) return `${line.productName || "An item"} has a ${percent}% discount, above your ${limit}% limit. A supervisor's approval needs the internet.`;
    }
  }
  return null;
}

/** A sale shaped like the server's response, so the normal receipt prints it. Mirrors PosSaleController::store. */
export function buildOfflineSale(payload, { invoiceNo, billNo, billedAt, storeId, counterName, lines = [] }) {
  let subtotal = 0, taxTotal = 0, discount = 0, totalQty = 0;
  const items = (payload.items || []).map((item, index) => {
    const { qty, base, tax } = lineAmounts(item);
    subtotal += base; taxTotal += tax; discount += Number(item.discount) || 0; totalQty += qty;
    return {
      product_id: item.productId, variant_id: item.variantId, barcode_id: item.barcodeId, quantity: qty,
      selling_price: Number(item.price) || 0, discount: Number(item.discount) || 0, tax_rate: Number(item.tax) || 0,
      tax_amount: round2(tax), subtotal: round2(base + tax), tax_name: item.taxName, tax_type: item.taxType,
      sales_man_name: item.salesManName, product: { name: item.productName, barcode: item.barcode, hsn_code: lines[index]?.hsnCode || "" },
      barcode: item.barcode ? { barcode: item.barcode } : null,
    };
  });
  const grandTotal = round2(subtotal + taxTotal);
  const cash = Number(payload.cashAmount) || 0, card = Number(payload.cardAmount) || 0, upi = Number(payload.upiAmount) || 0;
  const paid = round2(cash + card + upi);
  return {
    id: null, offline: true, store_id: storeId, invoice_no: invoiceNo, bill_no: billNo, sale_date: billedAt,
    counter_name: counterName, customer_name: payload.customerName, items, total_items: items.length, total_qty: totalQty,
    subtotal: round2(subtotal), discount_amount: round2(discount), tax_amount: round2(taxTotal), grand_total: grandTotal,
    paid_amount: paid, change_amount: round2(Math.max(0, paid - grandTotal)), status: "PAID",
    payment_mode: cash > 0 ? "CASH" : card > 0 ? "CARD" : "UPI", payments: [],
  };
}

export async function queueOfflineBill({ scope, userId, storeId, target, payload, sale }) {
  await store.putBill({
    checkoutKey: payload.checkoutKey, scope, userId, storeId: String(storeId), target: target || null, payload, sale,
    status: "pending", error: null, createdAt: Date.now(),
  });
  notify();
}

export async function listOfflineBills(scope) {
  if (!scope) return [];
  const bills = await store.getBills(scope);
  const stale = bills.filter(bill => bill.status === "synced" && Date.now() - bill.syncedAt > SYNCED_KEEP_MS);
  await Promise.all(stale.map(bill => store.deleteBill(bill.checkoutKey)));
  return bills.filter(bill => !stale.includes(bill)).sort((a, b) => a.createdAt - b.createdAt);
}

/** Bills the server answered as "can't save this" need a person; anything else is retried later. */
const needsAttention = error => {
  const status = error?.response?.status;
  return status >= 400 && status < 500 && ![401, 408, 419, 429].includes(status);
};
const errorMessage = error => {
  const data = error?.response?.data || {};
  const first = data.errors && Object.values(data.errors).flat()[0];
  return String(first || data.message || error?.message || "The server did not accept this bill.");
};

let syncing = null;

/** Sends queued bills oldest first; stops at the first one the server cannot be reached for. */
export function syncOfflineBills(api, scope) {
  if (!scope) return Promise.resolve({ synced: 0, attention: 0, stopped: false });
  if (syncing) return syncing;
  syncing = (async () => {
    const result = { synced: 0, attention: 0, flagged: 0, stopped: false };
    for (const bill of await listOfflineBills(scope)) {
      if (bill.status !== "pending") continue;
      try {
        const res = await api.post("/pos-sales", bill.payload, { __posRetryTarget: bill.target, storeScopeId: bill.storeId });
        const saved = res.data?.data || {};
        const review = (saved.sync_review || []).length;
        await store.putBill({ ...bill, status: "synced", syncedAt: Date.now(), error: null, savedId: saved.id,
          savedBillNo: saved.bill_no, review });
        result.synced += 1;
        if (review) result.flagged += 1;
      } catch (error) {
        if (!needsAttention(error)) { result.stopped = true; break; }
        await store.putBill({ ...bill, status: "attention", error: errorMessage(error), triedAt: Date.now() });
        result.attention += 1;
      }
    }
    notify();
    return result;
  })();
  syncing.finally(() => { syncing = null; }).catch(() => {});
  return syncing;
}

/** Puts a bill that needed attention back in the queue (e.g. after assigning its counter again). */
export async function retryOfflineBill(bill) {
  await store.putBill({ ...bill, status: "pending", error: null });
  notify();
}

export async function discardOfflineBill(checkoutKey) {
  await store.deleteBill(checkoutKey);
  notify();
}
