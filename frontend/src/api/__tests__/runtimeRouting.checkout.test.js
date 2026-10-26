import { afterEach, beforeEach, expect, it } from "vitest";
import { applyRuntimeRoutingConfig, clearRuntimeRoutingConfig, prepareRoutingForRequest, shouldRetryOnCloud } from "../runtimeRouting";

beforeEach(() => applyRuntimeRoutingConfig({ enabled: true, currentTarget: "local", localBaseUrl: "http://127.0.0.1:8130/api", cloudBaseUrl: "https://dev.gpsoftware.in/api", localHealthy: true }));
afterEach(() => clearRuntimeRoutingConfig());
it("never falls back to cloud for an intentionally canceled search", () => {
  expect(shouldRetryOnCloud({ code: "ERR_CANCELED", config: { method: "get", url: "/pos-sales/stock-products", __routingTarget: "local" } })).toBe(false);
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
