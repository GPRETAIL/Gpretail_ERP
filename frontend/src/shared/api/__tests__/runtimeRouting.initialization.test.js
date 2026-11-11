import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyRuntimeRoutingConfig, clearRuntimeRoutingConfig, fetchAndApplyRuntimeRoutingConfig, getRuntimeRoutingSnapshot, prepareRoutingForRequest } from "@/shared/api/runtimeRouting";

const response = data => ({ ok: true, json: async () => ({ data }) });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); clearRuntimeRoutingConfig(); });
afterEach(() => { clearRuntimeRoutingConfig(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("shares concurrent connector and runtime initialization without caching completed configuration", async () => {
  sessionStorage.setItem("activeStoreId", "2");
  const fetch = vi.fn().mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ enabled: false }));
  vi.stubGlobal("fetch", fetch);
  await Promise.all([fetchAndApplyRuntimeRoutingConfig({ token: "one" }), fetchAndApplyRuntimeRoutingConfig({ token: "one" })]);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/api/connector/web-config", "/api/local-server-config/runtime"]);
  expect(fetch.mock.calls[1][1].headers["X-Company-Scope-Id"]).toBe("2");
  fetch.mockResolvedValue(response({}));
  await fetchAndApplyRuntimeRoutingConfig({ token: "one" });
  expect(fetch).toHaveBeenCalledTimes(4);
});

it("uses the store's saved cloud URL when local fallback is configured", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ enabled: true, local_server_url: "http://192.168.1.5:8130", cloud_server_url: "https://alternate.example" }))
    .mockResolvedValueOnce(response({ local_healthy: true }));
  vi.stubGlobal("fetch", fetch);
  await fetchAndApplyRuntimeRoutingConfig({ token: "one" });
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ cloudBaseUrl: "https://alternate.example/api", currentTarget: "local" });
});

it("discards a pending configuration when the selected store changes without a new initialization", async () => {
  let resolve;
  const fetch = vi.fn(() => new Promise(done => { resolve = done; }));
  vi.stubGlobal("fetch", fetch);
  const pending = fetchAndApplyRuntimeRoutingConfig({ token: "old" });
  sessionStorage.setItem("activeStoreId", "2");
  resolve(response({ enabled: true, local_healthy: true, cloud_api_base_url: "https://old.example/api" }));
  expect(await pending).toBeNull();
  expect(getRuntimeRoutingSnapshot().enabled).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("does not restore routing or start a cloud request after logout", async () => {
  let resolve;
  const fetch = vi.fn(() => new Promise(done => { resolve = done; }));
  vi.stubGlobal("fetch", fetch);
  const pending = fetchAndApplyRuntimeRoutingConfig({ token: "old" });
  clearRuntimeRoutingConfig();
  resolve(response({ enabled: true, local_healthy: true, cloud_api_base_url: "https://old.example/api" }));
  expect(await pending).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ enabled: false, cloudBaseUrl: "/api" });
});

it("ignores an old initialization that completes after a newer login", async () => {
  let resolve;
  const fetch = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }))
    .mockResolvedValue(response({ enabled: true, local_healthy: true, cloud_api_base_url: "https://new.example/api" }));
  vi.stubGlobal("fetch", fetch);
  const old = fetchAndApplyRuntimeRoutingConfig({ token: "old" });
  await fetchAndApplyRuntimeRoutingConfig({ token: "new" });
  resolve(response({ enabled: true, local_healthy: true, cloud_api_base_url: "https://old.example/api" }));
  await old;
  expect(getRuntimeRoutingSnapshot().cloudBaseUrl).toBe("https://new.example/api");
});

it("ignores a previous server's pending health response after configuration changes", async () => {
  vi.useFakeTimers();
  let resolve;
  vi.stubGlobal("fetch", vi.fn(() => new Promise(done => { resolve = done; })));
  const config = { enabled: true, currentTarget: "cloud", localBaseUrl: "http://127.0.0.1:8130/api", localHealthUrl: "http://127.0.0.1:8130/health" };
  applyRuntimeRoutingConfig(config);
  await vi.advanceTimersByTimeAsync(5000);
  applyRuntimeRoutingConfig({ ...config, localBaseUrl: "http://127.0.0.1:8140/api", localHealthUrl: "http://127.0.0.1:8140/health" });
  resolve(response({ local_healthy: true }));
  await vi.advanceTimersByTimeAsync(0);
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ currentTarget: "cloud", localHealthy: false, localBaseUrl: "http://127.0.0.1:8140/api" });
});

it("ignores an old frontend failover address instead of sending local sessions to the hosted ERP", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ enabled: true, local_server_url: "http://127.0.0.1:5173", cloud_server_url: "https://dev.gpsoftware.in" }));
  vi.stubGlobal("fetch", fetch);
  await fetchAndApplyRuntimeRoutingConfig({ token: "local-session" });
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ enabled: false, cloudBaseUrl: "/api", localBaseUrl: "" });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("does not enable failover when a reachable backend explicitly reports connector disabled", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ enabled: true, local_server_url: "http://192.168.31.246:8001", cloud_server_url: "https://dev.gpsoftware.in" })).mockResolvedValueOnce(response({ enabled: false })));
  await fetchAndApplyRuntimeRoutingConfig({ token: "local-session" });
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ enabled: false, cloudBaseUrl: "/api" });
});
it("keeps authentication and routing configuration on the issuing deployment", async () => {
  applyRuntimeRoutingConfig({ enabled: true, currentTarget: "cloud", cloudBaseUrl: "https://other.example/api" });
  for (const url of ["/auth/login", "/auth/me", "/local-server-config/runtime"]) {
    expect(await prepareRoutingForRequest({ url })).toMatchObject({ baseURL: "/api", __routingTarget: "deployment" });
  }
});
