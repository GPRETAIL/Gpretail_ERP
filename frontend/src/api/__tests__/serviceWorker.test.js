import fs from "node:fs";
import vm from "node:vm";
import { URL } from "node:url";
import { webcrypto } from "node:crypto";
import { expect, it, vi } from "vitest";

function worker() {
  const handlers = {};
  const saved = new Map();
  const cache = { put: vi.fn(async (key, value) => saved.set(key.url, value.clone())), match: vi.fn(async key => saved.get(key.url)?.clone()) };
  const fetch = vi.fn();
  const self = { crypto: webcrypto, location: { origin: "https://erp.example" }, addEventListener: (type, handler) => { handlers[type] = handler; } };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), {
    self, caches: { open: async () => cache }, fetch, URL, Request, Response, TextEncoder, Uint8Array, console,
  });
  const request = (token = "user-one", store = "2", options = {}) => new Request("https://erp.example/api/products", {
    headers: { Authorization: `Bearer ${token}`, "X-Company-Scope-Id": store }, ...options,
  });
  const run = async request => {
    let pending;
    const work = [];
    handlers.fetch({ request, respondWith: promise => { pending = promise; }, waitUntil: promise => work.push(promise) });
    if (!pending) return null;
    const response = await pending;
    await Promise.all(work);
    return response;
  };
  return { fetch, cache, saved, request, run };
}

it("makes one network attempt and falls back only within the same authenticated store", async () => {
  const { fetch, saved, request, run } = worker();
  fetch.mockResolvedValueOnce(Response.json({ data: [{ id: 42 }] })).mockRejectedValue(new Error("offline"));
  expect((await run(request())).status).toBe(200);
  expect((await run(request("user-two"))).status).toBe(503);
  expect((await run(request("user-one", "3"))).status).toBe(503);
  expect(await (await run(request())).json()).toEqual({ data: [{ id: 42 }] });
  expect(fetch).toHaveBeenCalledTimes(4);
  expect([...saved.keys()][0]).toMatch(/__vx_scope=[a-f0-9]{64}/);
  expect([...saved.keys()][0]).not.toContain("user-one");
});

it("does not cache or intercept authentication and mutation requests", async () => {
  const { fetch, run } = worker();
  expect(await run(new Request("https://erp.example/api/auth/me"))).toBeNull();
  expect(await run(new Request("https://erp.example/api/products", { method: "POST", body: "{}" }))).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("never treats missing offline data as a successful empty API response", async () => {
  const { fetch, request, run } = worker(); fetch.mockRejectedValue(new Error("offline"));
  const result = await run(request());
  expect(result.status).toBe(503); expect((await result.json()).success).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("does not turn cache storage failure into a failed online API response", async () => {
  const { fetch, cache, request, run } = worker();
  cache.put.mockRejectedValue(new Error("quota")); fetch.mockResolvedValue(Response.json({ data: [42] }));
  expect(await (await run(request())).json()).toEqual({ data: [42] });
  expect(fetch).toHaveBeenCalledTimes(1);
});
