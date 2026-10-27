import http from "node:http";
import axios from "axios";
import { expect, it, vi } from "vitest";
import { createReadCoalescer } from "../coalesceReads";

it("coalesces real HTTP reads, isolates cancellations and refreshes after a write", async () => {
  const waiting = [];
  let hits = 0;
  const server = http.createServer((request, response) => {
    hits++;
    response.setHeader("Content-Type", "application/json");
    if (request.method === "GET") waiting.push({ response, value: hits });
    else response.end('{"saved":true}');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const pool = createReadCoalescer(axios.getAdapter("fetch"));
  const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, adapter: pool.adapter });
  client.interceptors.request.use(config => {
    if (config.method !== "get") pool.invalidate();
    return config;
  });
  const release = () => waiting.splice(0).forEach(({ response, value }) => response.end(JSON.stringify({ value })));
  try {
    const reads = Array.from({ length: 10 }, () => client.get("/products"));
    await vi.waitFor(() => expect(hits).toBe(1));
    release();
    const results = await Promise.all(reads);
    expect(results.map(result => result.data.value)).toEqual(Array(10).fill(1));
    const cancel = new AbortController();
    const first = client.get("/products", { signal: cancel.signal });
    const second = client.get("/products");
    const canceled = expect(first).rejects.toMatchObject({ code: "ERR_CANCELED" });
    await vi.waitFor(() => expect(hits).toBe(2));
    cancel.abort();
    await canceled;
    release();
    expect((await second).data.value).toBe(2);
    const beforeWrite = client.get("/products");
    await vi.waitFor(() => expect(hits).toBe(3));
    expect((await client.post("/products", { name: "TEMP" })).data.saved).toBe(true);
    const afterWrite = client.get("/products");
    await vi.waitFor(() => expect(hits).toBe(5));
    release();
    expect((await beforeWrite).data.value).toBe(3);
    expect((await afterWrite).data.value).toBe(5);
  } finally {
    release();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}, 15000);
