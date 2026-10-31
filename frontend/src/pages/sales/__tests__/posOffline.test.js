import { beforeEach, expect, it, vi } from "vitest";
import * as store from "../posOfflineStore";
import {
  buildOfflineSale, isNetworkFailure, mintOfflineNumber, offlineBlockReason, queueOfflineBill, refreshOfflinePack, syncOfflineBills,
} from "../posOffline";

vi.mock("../posOfflineStore", () => ({
  getMeta: vi.fn(), setMeta: vi.fn(), takeSequence: vi.fn(), putCatalogEntries: vi.fn(), pruneCatalog: vi.fn(),
  getBills: vi.fn(), putBill: vi.fn(), deleteBill: vi.fn(), getCatalogRow: vi.fn(), findCatalogRows: vi.fn(), reduceCatalogStock: vi.fn(),
}));

const scope = "7:2";
const pack = { series: { code: "F3", prefix: "INV-SBT_01-", period: "20261031", next: 5, utc_offset_minutes: 0 }, max_discount_percent: 5 };
const item = { productId: 1, variantId: 2, barcodeId: 3, barcode: "SC00001", productName: "Shirt", qty: 2, price: 500, tax: 5, discount: 0 };
const paid = { saleSaveAs: "paid_settled", cashAmount: 1050, items: [item] };

beforeEach(() => {
  vi.clearAllMocks();
  store.getBills.mockResolvedValue([]);
  store.getMeta.mockResolvedValue(null);
});

it("numbers offline bills from the counter's series on the server's calendar", async () => {
  store.takeSequence.mockResolvedValue(5);
  const number = await mintOfflineNumber(scope, pack, Date.parse("2026-10-31T10:00:00Z"));
  expect(number).toEqual({ invoiceNo: "INV-SBT_01-20261031-F3-0005", billNo: "261031-F3-0005" });
  expect(store.takeSequence).toHaveBeenCalledWith("7:2|seq|F3|20261031", 5);

  // A later day starts that day's sequence at 1; the offset follows the server's timezone.
  await mintOfflineNumber(scope, { ...pack, series: { ...pack.series, utc_offset_minutes: 330 } }, Date.parse("2026-10-31T20:00:00Z"));
  expect(store.takeSequence).toHaveBeenLastCalledWith("7:2|seq|F3|20261101", 1);
  await expect(mintOfflineNumber(scope, {})).rejects.toThrow(/offline bill series/);
});

it("allows only fully paid bills within the cashier's discount limit offline", () => {
  const line = { ...item, listPrice: 500 };
  expect(offlineBlockReason(paid, [line], pack)).toBeNull();
  expect(offlineBlockReason({ ...paid, isCredit: true }, [line], pack)).toMatch(/Credit/);
  expect(offlineBlockReason({ ...paid, appliedPosReturnId: 9 }, [line], pack)).toMatch(/return credit/);
  expect(offlineBlockReason({ ...paid, cashAmount: 1000 }, [line], pack)).toMatch(/fully paid/);
  expect(offlineBlockReason({ ...paid, saleSaveAs: "unsettled" }, [line], pack)).toMatch(/fully paid/);
  expect(offlineBlockReason(paid, [{ ...line, discount: 100 }], pack)).toMatch(/10% discount, above your 5% limit/);
  expect(offlineBlockReason(paid, [{ ...line, price: 450 }], { ...pack, max_discount_percent: null })).toBeNull(); // No limit set.
  expect(offlineBlockReason(paid, [line], { max_discount_percent: 5 })).toMatch(/offline bill series/);
});

it("builds a receipt-ready sale with the server's totals", () => {
  const sale = buildOfflineSale({ ...paid, customerName: "Walking Customer", items: [{ ...item, discount: 100 }] },
    { invoiceNo: "INV-X-20261031-F3-0005", billNo: "261031-F3-0005", billedAt: "2026-10-31T10:00:00Z", storeId: "2", lines: [{ hsnCode: "6205" }] });
  expect(sale).toMatchObject({ bill_no: "261031-F3-0005", subtotal: 900, tax_amount: 45, grand_total: 945, paid_amount: 1050, change_amount: 105, payment_mode: "CASH", offline: true });
  expect(sale.items[0]).toMatchObject({ quantity: 2, selling_price: 500, discount: 100, tax_amount: 45, subtotal: 945, product: { name: "Shirt", hsn_code: "6205" }, barcode: { barcode: "SC00001" } });
});

it("tells a lost connection apart from a server answer", () => {
  expect(isNetworkFailure({ config: {}, code: "ERR_NETWORK" })).toBe(true);
  expect(isNetworkFailure({ config: {}, code: "ERR_CANCELED" })).toBe(false);
  expect(isNetworkFailure({ config: {}, response: { status: 503, data: { offline: true } } })).toBe(true); // Service worker fallback.
  expect(isNetworkFailure({ config: {}, response: { status: 422, data: {} } })).toBe(false);
  expect(isNetworkFailure(new Error("IndexedDB failed"))).toBe(false);
});

it("syncs oldest first, keeps refused bills for a person and stops when the server is unreachable", async () => {
  const bill = (key, createdAt) => ({ checkoutKey: key, scope, storeId: "2", target: "cloud", status: "pending", createdAt, payload: { checkoutKey: key } });
  store.getBills.mockResolvedValue([bill("c", 3), bill("a", 1), bill("b", 2)]);
  const api = { post: vi.fn()
    .mockResolvedValueOnce({ data: { data: { id: 11, bill_no: "261031-F3-0001", sync_review: [{ type: "stock_short" }] } } })
    .mockRejectedValueOnce({ config: {}, response: { status: 422, data: { errors: { offline: ["Only fully paid bills can be saved offline."] } } } })
    .mockRejectedValueOnce({ config: {}, code: "ERR_NETWORK" }) };

  const result = await syncOfflineBills(api, scope);
  expect(result).toEqual({ synced: 1, attention: 1, flagged: 1, stopped: true });
  expect(api.post.mock.calls.map(call => call[1].checkoutKey)).toEqual(["a", "b", "c"]);
  expect(api.post).toHaveBeenCalledWith("/pos-sales", { checkoutKey: "a" }, { __posRetryTarget: "cloud", storeScopeId: "2" });
  expect(store.putBill).toHaveBeenCalledWith(expect.objectContaining({ checkoutKey: "a", status: "synced", savedBillNo: "261031-F3-0001", review: 1 }));
  expect(store.putBill).toHaveBeenCalledWith(expect.objectContaining({ checkoutKey: "b", status: "attention", error: "Only fully paid bills can be saved offline." }));
  expect(store.putBill).not.toHaveBeenCalledWith(expect.objectContaining({ checkoutKey: "c" })); // Still pending.
});

it("queues a bill under its owner and store", async () => {
  await queueOfflineBill({ scope, userId: 7, storeId: 2, target: null, payload: { checkoutKey: "k" }, sale: { bill_no: "x" } });
  expect(store.putBill).toHaveBeenCalledWith(expect.objectContaining({ checkoutKey: "k", scope, userId: 7, storeId: "2", status: "pending" }));
});

it("downloads every catalog page before replacing the old catalog", async () => {
  const api = { get: vi.fn(async (url, config) => {
    if (url === "/pos-sales/offline/series") return { data: { data: pack } };
    if (config.params.kind === "barcodes") return config.params.after === 0
      ? { data: { data: [{ barcode: "SC1", code: "P1" }], meta: { next: 10 } } }
      : { data: { data: [{ barcode: "SC2", code: "P1" }], meta: { next: null } } };
    return { data: { data: [{ barcode: "8901", code: "P9" }], meta: { next: null } } };
  }) };
  const result = await refreshOfflinePack(api, scope);
  expect(result).toMatchObject({ catalogCount: 3, series: pack.series });
  const codes = store.putCatalogEntries.mock.calls.flatMap(call => call[2].map(entry => entry.code));
  expect(codes).toEqual(["SC1", "SC2", "8901", "P9"]); // Unit barcodes by barcode; product stock by barcode and code.
  expect(store.pruneCatalog).toHaveBeenCalledTimes(1);
  expect(store.pruneCatalog.mock.invocationCallOrder[0]).toBeGreaterThan(store.putCatalogEntries.mock.invocationCallOrder[2]);
});
