import axios from "axios";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "@/shared/api/apiClient";
import { applyRuntimeRoutingConfig, clearRuntimeRoutingConfig } from "@/shared/api/runtimeRouting";

const CLOUD = "https://cloud.example/api";
const failure = (config, status, headers = {}) => Promise.reject(new axios.AxiosError("failed", "ERR_BAD_RESPONSE", config, null, { status, data: {}, headers, config }));
const success = config => Promise.resolve({ status: 201, data: { success: true }, headers: {}, config });
const onPrem = () => applyRuntimeRoutingConfig({ enabled: true, runningOnLocalConnector: true, currentTarget: "local", localHealthy: true,
  localReachable: true, localBaseUrl: "/api", cloudBaseUrl: CLOUD, localHealthUrl: "/api/connector/web-config" });

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); clearRuntimeRoutingConfig();
  localStorage.setItem("token", "local-token");
  localStorage.setItem("erp_failover_session", JSON.stringify({ token: "cloud-failover", expiresAt: new Date(Date.now() + 86400000).toISOString() }));
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ data: {} }) })));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { clearRuntimeRoutingConfig(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("sends a bill the on-prem proxy could not deliver to the cloud once, with the cloud sign-in", async () => {
  onPrem();
  const adapter = vi.fn(config => (config.baseURL === "/api" ? failure(config, 502, { "x-proxy-error": "ECONNREFUSED" }) : success(config)));
  await expect(api.post("/pos-sales", { items: [] }, { adapter })).resolves.toMatchObject({ status: 201 });
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(adapter.mock.calls.map(([config]) => config.baseURL)).toEqual(["/api", CLOUD]);
  expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer local-token");
  expect(adapter.mock.calls[1][0].headers.Authorization).toBe("Bearer cloud-failover");
});

it("never repeats an ambiguous bill on the cloud", async () => {
  onPrem();
  const adapter = vi.fn(config => failure(config, 502));
  await expect(api.post("/pos-sales", { items: [] }, { adapter })).rejects.toBeDefined();
  expect(adapter).toHaveBeenCalledTimes(1);
});

it("does not sign the counter out when the cloud refuses its failover sign-in", async () => {
  onPrem();
  applyRuntimeRoutingConfig({ enabled: true, runningOnLocalConnector: true, currentTarget: "cloud", localBaseUrl: "/api", cloudBaseUrl: CLOUD,
    localHealthUrl: "/api/connector/web-config" });
  const expired = vi.fn(); const failoverExpired = vi.fn();
  window.addEventListener("vx-auth-expired", expired);
  window.addEventListener("vx-failover-session-expired", failoverExpired);
  try {
    await expect(api.get("/products", { adapter: config => failure(config, 401) })).rejects.toBeDefined();
    expect(localStorage.getItem("token")).toBe("local-token");
    expect(localStorage.getItem("erp_failover_session")).toBeNull();
    expect(expired).not.toHaveBeenCalled();
    expect(failoverExpired).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener("vx-auth-expired", expired);
    window.removeEventListener("vx-failover-session-expired", failoverExpired);
  }
});
