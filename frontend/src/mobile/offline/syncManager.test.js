import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "../../api/axios";
import { getSyncQueue, removeSyncQueueItem } from "./db";
import { processSyncQueue } from "./syncManager";
vi.mock("../../api/axios", () => ({ default: vi.fn() }));
vi.mock("./db", () => ({ getSyncQueue: vi.fn(), removeSyncQueueItem: vi.fn() }));
const item = { id: 1, userId: 1, storeId: "2", target: "cloud", method: "POST", endpoint: "/pos-sales", payload: { checkoutKey: "existing-key", items: [] } };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("token", "current"); localStorage.setItem("user", '{"id":1}'); sessionStorage.setItem("activeStoreId", "2");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  getSyncQueue.mockResolvedValue([item]); removeSyncQueueItem.mockResolvedValue(true); api.mockResolvedValue({});
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

it("replays only the original account/store with a durable key and pinned server", async () => {
  getSyncQueue.mockResolvedValue([{ ...item, id: 2, userId: 99 }, { ...item, id: 3, storeId: "3" }, { ...item, id: 4, payload: {} }, item]);
  await processSyncQueue();
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith(expect.objectContaining({ data: item.payload, storeScopeId: "2", __posRetryTarget: "cloud" }));
  expect(removeSyncQueueItem).toHaveBeenCalledExactlyOnceWith(1);
});

it("keeps a failed invoice for review and stops the remaining retry burst", async () => {
  getSyncQueue.mockResolvedValue([item, { ...item, id: 2 }]); api.mockRejectedValue({ response: { status: 503 } });
  const result = await processSyncQueue();
  expect(result).toMatchObject({ success: false, syncedCount: 0, remainingCount: 2 });
  expect(api).toHaveBeenCalledTimes(1); expect(removeSyncQueueItem).not.toHaveBeenCalled();
});

it("does not overlap sync runs", async () => {
  let resolve; api.mockImplementation(() => new Promise(done => { resolve = done; }));
  const first = processSyncQueue(); await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  expect((await processSyncQueue()).reason).toBe("offline_or_busy");
  resolve({}); await first; expect(api).toHaveBeenCalledTimes(1);
});

it("does not run a second sync from its own completion event", async () => {
  vi.useFakeTimers(); await processSyncQueue(); await vi.advanceTimersByTimeAsync(5000);
  expect(getSyncQueue).toHaveBeenCalledTimes(1); expect(api).toHaveBeenCalledTimes(1);
});

it("coalesces native and app network restoration events into one scheduled sync", async () => {
  vi.useFakeTimers();
  window.dispatchEvent(new Event("online")); window.dispatchEvent(new Event("vx-network-restored"));
  await vi.advanceTimersByTimeAsync(1500);
  expect(api).toHaveBeenCalledTimes(1);
});

it("does not submit queued invoices while signed out", async () => {
  localStorage.removeItem("token"); await processSyncQueue(); expect(api).not.toHaveBeenCalled();
});
