import { afterEach, beforeEach, expect, it } from "vitest";
import { applyRuntimeRoutingConfig, buildCloudRetryConfig, clearRuntimeRoutingConfig, prepareRoutingForRequest, shouldRetryOnCloud } from "../runtimeRouting";

beforeEach(() => applyRuntimeRoutingConfig({ enabled: true, currentTarget: "local", localBaseUrl: "http://127.0.0.1:8130/api", cloudBaseUrl: "https://dev.gpsoftware.in/api", localHealthy: true }));
afterEach(() => clearRuntimeRoutingConfig());
it("never falls back to cloud for an intentionally canceled search", () => {
  expect(shouldRetryOnCloud({ code: "ERR_CANCELED", config: { method: "get", url: "/pos-sales/stock-products", __routingTarget: "local" } })).toBe(false);
});
it("never automatically repeats a write in any ERP module on another database", () => {
  for (const url of ["/brands", "/products", "/purchase-invoices/3", "/stock-outward/2", "/notifications/1/read"]) {
    for (const method of ["post", "put", "patch", "delete"]) {
      for (const status of [undefined, 500, 502, 503, 504]) {
        expect(shouldRetryOnCloud({ config: { method, url, __routingTarget: "local" }, ...(status ? { response: { status } } : {}) })).toBe(false);
      }
    }
  }
});

it("never automatically resends an ambiguous POS write to a different database", () => {
  for (const url of ["/pos-sales", "/pos-old-sales", "/api/pos-sales?retry=1"]) {
    for (const status of [undefined, 502, 503, 504]) {
      expect(shouldRetryOnCloud({ config: { method: "post", url, __routingTarget: "local" }, ...(status ? { response: { status } } : {}) })).toBe(false);
    }
  }
  expect(shouldRetryOnCloud({ config: { method: "get", url: "/pos-sales", __routingTarget: "local" } })).toBe(true);
});

it("pins a manually retried checkout to its original node after the health status changes", async () => {
  applyRuntimeRoutingConfig({ enabled: true, currentTarget: "cloud", localBaseUrl: "http://127.0.0.1:8130/api", cloudBaseUrl: "https://dev.gpsoftware.in/api" });
  const local = await prepareRoutingForRequest({ method: "post", url: "/pos-sales", __posRetryTarget: "local" });
  expect(local.baseURL).toBe("http://127.0.0.1:8130/api");
  expect(local.__routingTarget).toBe("local");
  const cloud = await prepareRoutingForRequest({ method: "post", url: "/pos-sales", __posRetryTarget: "cloud" });
  expect(cloud.baseURL).toBe("https://dev.gpsoftware.in/api");
  expect(cloud.headers["X-Bypass-Local"]).toBe("1");
});

it("refuses to move an uncertain local checkout to cloud when local configuration is removed", async () => {
  clearRuntimeRoutingConfig();
  await expect(prepareRoutingForRequest({ method: "post", url: "/pos-sales", __posRetryTarget: "local" })).rejects.toThrow("Restore the local server connection");
});

it("keeps a fallback read on cloud if local health recovers before the retry is sent", async () => {
  const retry = buildCloudRetryConfig({ method: "get", url: "/products" });
  applyRuntimeRoutingConfig({ enabled: true, currentTarget: "local", localHealthy: true, localBaseUrl: "http://127.0.0.1:8130/api", cloudBaseUrl: "https://dev.gpsoftware.in/api" });
  const request = await prepareRoutingForRequest(retry);
  expect(request.__routingTarget).toBe("cloud"); expect(request.baseURL).toBe("https://dev.gpsoftware.in/api");
});
