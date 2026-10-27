import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createMobileCheckout } from "./mobileCheckout";
import api from "../../api/axios";
import { addToSyncQueue, saveDraft } from "../offline/db";
vi.mock("../../api/axios", () => ({ default: { post: vi.fn() } }));
vi.mock("../../api/runtimeRouting", () => ({ getRuntimeRoutingSnapshot: () => ({ currentTarget: "cloud" }) }));
vi.mock("../offline/db", () => ({ addToSyncQueue: vi.fn(), saveDraft: vi.fn() }));
const basket = { items: [{ productId: 1, qty: 1, price: 100 }] };
const context = { userId: 1, storeId: "2" };
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(navigator, "onLine", "get").mockReturnValue(true); });
afterEach(() => vi.restoreAllMocks());

it("shares pending and confirmed saves between save, print and share", async () => {
  let resolve;
  api.post.mockImplementation(() => new Promise(done => { resolve = done; }));
  const submit = createMobileCheckout();
  const first = submit(basket, context); const second = submit(basket, context);
  expect(api.post).toHaveBeenCalledTimes(1);
  resolve({ data: { data: { id: 42 } } });
  expect(await first).toEqual({ id: 42 }); expect(await second).toEqual({ id: 42 });
  expect(await submit(basket, context)).toEqual({ id: 42 });
  expect(api.post).toHaveBeenCalledTimes(1);
});

it("keeps an ambiguous save out of the offline queue and retries with the same key and node", async () => {
  api.post.mockRejectedValueOnce(new Error("timeout")).mockResolvedValue({ data: { data: { id: 42 } } });
  const submit = createMobileCheckout();
  await expect(submit(basket, context)).rejects.toThrow("timeout");
  expect(addToSyncQueue).not.toHaveBeenCalled(); expect(saveDraft).not.toHaveBeenCalled();
  await submit(basket, context);
  expect(api.post.mock.calls[1][1].checkoutKey).toBe(api.post.mock.calls[0][1].checkoutKey);
  expect(api.post.mock.calls[1][2]).toEqual({ storeScopeId: "2", __posRetryTarget: "cloud" });
});

it("creates a different key for a different store or basket", async () => {
  api.post.mockResolvedValue({ data: { data: { id: 42 } } });
  const submit = createMobileCheckout();
  await submit(basket, context);
  await submit(basket, { ...context, storeId: "3" });
  expect(api.post.mock.calls[1][1].checkoutKey).not.toBe(api.post.mock.calls[0][1].checkoutKey);
});

it("queues an offline invoice once with its owner, store, checkout key and original node", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  addToSyncQueue.mockResolvedValue(7); saveDraft.mockResolvedValue(8);
  const submit = createMobileCheckout();
  expect(await submit(basket, context)).toBeNull();
  expect(await submit(basket, context)).toBeNull();
  expect(api.post).not.toHaveBeenCalled(); expect(addToSyncQueue).toHaveBeenCalledTimes(1);
  expect(addToSyncQueue).toHaveBeenCalledWith("create_invoice", "/pos-sales", "POST", expect.objectContaining({ checkoutKey: expect.any(String) }), { ...context, target: "cloud" });
});

it("does not claim an offline invoice was saved when durable queue storage failed", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false); addToSyncQueue.mockResolvedValue(null);
  await expect(createMobileCheckout()(basket, context)).rejects.toThrow("Could not save the offline invoice");
  expect(saveDraft).not.toHaveBeenCalled();
});

it("does not treat an invalid confirmation as a saved sale on the next attempt", async () => {
  api.post.mockResolvedValueOnce({ data: { data: {} } }).mockResolvedValue({ data: { data: { id: 42 } } });
  const submit = createMobileCheckout();
  await expect(submit(basket, context)).rejects.toThrow("Invoice confirmation is unavailable");
  expect(await submit(basket, context)).toEqual({ id: 42 });
  expect(api.post.mock.calls[1][1].checkoutKey).toBe(api.post.mock.calls[0][1].checkoutKey);
});
