import axios from "axios";
import { expect, it, vi } from "vitest";
import { createReadCoalescer } from "../coalesceReads";

const config = overrides => ({ method: "get", baseURL: "/api", url: "/products", headers: { Authorization: "Bearer test-one", "X-Company-Scope-Id": "2" }, timeout: 30000, ...overrides });
const lab = () => {
  const requests = [];
  const transport = vi.fn(settings => new Promise((resolve, reject) => {
    requests.push({ config: settings, resolve: data => resolve({ data, status: 200, headers: {}, config: settings }), reject });
    settings.signal?.addEventListener("abort", () => reject(new axios.CanceledError()));
  }));
  return { ...createReadCoalescer(transport), requests, transport };
};

it("shares simultaneous identical reads but never a completed response", async () => {
  const pool = lab();
  const a = pool.adapter(config()), b = pool.adapter(config());
  await Promise.resolve();
  expect(pool.transport).toHaveBeenCalledTimes(1);
  pool.requests[0].resolve({ rows: [{ id: 1 }] });
  const [one, two] = await Promise.all([a, b]);
  one.data.rows[0].id = 99;
  expect(two.data.rows[0].id).toBe(1);
  const c = pool.adapter(config());
  await Promise.resolve();
  expect(pool.transport).toHaveBeenCalledTimes(2);
  pool.requests[1].resolve({ fresh: true });
  expect((await c).data.fresh).toBe(true);
});

it("isolates authentication, store, node, parameters and status policies", async () => {
  const pool = lab();
  const promises = [
    config(), config({ headers: { Authorization: "Bearer test-two", "X-Company-Scope-Id": "2" } }),
    config({ headers: { Authorization: "Bearer test-one", "X-Company-Scope-Id": "3" } }),
    config({ baseURL: "http://127.0.0.1:8130/api" }), config({ params: { search: "coffee" } }),
    config({ validateStatus: () => true }),
  ].map(settings => pool.adapter(settings));
  await Promise.resolve();
  expect(pool.transport).toHaveBeenCalledTimes(6);
  pool.requests.forEach((request, index) => request.resolve(index));
  expect((await Promise.all(promises)).map(response => response.data)).toEqual([0, 1, 2, 3, 4, 5]);
});

it("cancels one consumer without aborting another screen's read", async () => {
  const pool = lab(), first = new AbortController();
  const a = pool.adapter(config({ signal: first.signal })), b = pool.adapter(config());
  const canceled = expect(a).rejects.toMatchObject({ code: "ERR_CANCELED" });
  await Promise.resolve();
  first.abort();
  await canceled;
  expect(pool.requests[0].config.signal.aborted).toBe(false);
  pool.requests[0].resolve("ok");
  expect((await b).data).toBe("ok");
});

it("aborts the network when all consumers leave, including after invalidation", async () => {
  const pool = lab(), controller = new AbortController();
  const read = pool.adapter(config({ signal: controller.signal }));
  const canceled = expect(read).rejects.toMatchObject({ code: "ERR_CANCELED" });
  await Promise.resolve();
  pool.invalidate();
  controller.abort();
  await canceled;
  expect(pool.requests[0].config.signal.aborted).toBe(true);
});

it("starts a fresh read after a write invalidates an older request", async () => {
  const pool = lab();
  const before = pool.adapter(config());
  pool.invalidate();
  const after = pool.adapter(config());
  await Promise.resolve();
  expect(pool.transport).toHaveBeenCalledTimes(2);
  pool.requests[0].resolve("old"); pool.requests[1].resolve("new");
  expect((await before).data).toBe("old");
  expect((await after).data).toBe("new");
});

it("does not merge writes, downloads, progress observers or opted-out requests", async () => {
  const pool = lab();
  const promises = ["post", "put", "delete"].flatMap(method => [pool.adapter(config({ method })), pool.adapter(config({ method }))]);
  for (const override of [{ responseType: "blob" }, { coalesce: false }, { onDownloadProgress: () => {} }]) {
    promises.push(pool.adapter(config(override)), pool.adapter(config(override)));
  }
  await Promise.resolve();
  expect(pool.transport).toHaveBeenCalledTimes(12);
  pool.requests.forEach(request => request.resolve("ok"));
  await Promise.all(promises);
});

it("preserves each caller's config on failures and allows a later retry", async () => {
  const pool = lab(), aConfig = config(), bConfig = config();
  const a = pool.adapter(aConfig), b = pool.adapter(bConfig);
  const failed = Promise.allSettled([a, b]);
  await Promise.resolve();
  pool.requests[0].reject(new axios.AxiosError("Unavailable", "ERR_NETWORK", pool.requests[0].config));
  const results = await failed;
  expect(results[0].reason.config).toBe(aConfig);
  expect(results[1].reason.config).toBe(bConfig);
  const retry = pool.adapter(config());
  await Promise.resolve();
  expect(pool.transport).toHaveBeenCalledTimes(2);
  pool.requests[1].resolve("recovered");
  expect((await retry).data).toBe("recovered");
});
