import axios from "axios";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "../axios";
import { applyRuntimeRoutingConfig, clearRuntimeRoutingConfig } from "../runtimeRouting";

const failure = (config, status, data = {}) => Promise.reject(new axios.AxiosError("failed", "ERR_BAD_RESPONSE", config, null, { status, data, config }));
const success = config => Promise.resolve({ status: 200, data: {}, headers: {}, config });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); clearRuntimeRoutingConfig();
  localStorage.setItem("token", "current");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { clearRuntimeRoutingConfig(); vi.restoreAllMocks(); });

it.each([502, 503, 504])("limits a local availability failure (%i) to one cloud read fallback", async status => {
  applyRuntimeRoutingConfig({ enabled: true, currentTarget: "local", localHealthy: true, localBaseUrl: "http://127.0.0.1:8130/api", cloudBaseUrl: "https://dev.gpsoftware.in/api" });
  const adapter = vi.fn(config => failure(config, status));
  await expect(api.get("/products", { adapter })).rejects.toMatchObject({ response: { status } });
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(adapter.mock.calls.map(([config]) => config.baseURL)).toEqual(["http://127.0.0.1:8130/api", "https://dev.gpsoftware.in/api"]);
});

it("does not replay a generic server error on the cloud", async () => {
  applyRuntimeRoutingConfig({ enabled: true, currentTarget: "local", localHealthy: true, localBaseUrl: "http://127.0.0.1:8130/api" });
  const adapter = vi.fn(config => failure(config, 500));
  await expect(api.get("/products", { adapter })).rejects.toMatchObject({ response: { status: 500 } });
  expect(adapter).toHaveBeenCalledTimes(1);
});

it("does not broadcast a mobile access failure back to the same validator", async () => {
  const listener = vi.fn(); window.addEventListener("vx:mobile-access-denied", listener);
  try {
    const adapter = config => failure(config, 403, { code: "MOBILE_SUBSCRIPTION_REQUIRED" });
    for (const url of ["/mobile/access", "/mobile/access?check=1", "https://dev.gpsoftware.in/api/mobile/access"]) await expect(api.get(url, { adapter })).rejects.toBeDefined();
    expect(listener).not.toHaveBeenCalled();
    await expect(api.get("/mobile/invoices", { adapter })).rejects.toBeDefined();
    expect(listener).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener("vx:mobile-access-denied", listener); }
});

it("expires a rejected session once even when an unrelated request succeeds", async () => {
  const listener = vi.fn(); window.addEventListener("vx-auth-expired", listener);
  try {
    await expect(api.get("/products", { adapter: config => failure(config, 401) })).rejects.toBeDefined();
    await api.get("/public", { adapter: success });
    await expect(api.get("/brands", { adapter: config => failure(config, 401) })).rejects.toBeDefined();
    expect(listener).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener("vx-auth-expired", listener); }
});

it("does not sign out a new login after a late 401 from the previous token", async () => {
  let rejectOld;
  const adapter = config => new Promise((_, reject) => { rejectOld = () => failure(config, 401).catch(reject); });
  const pending = api.get("/products", { adapter });
  await vi.waitFor(() => expect(rejectOld).toBeDefined());
  localStorage.setItem("token", "new-login"); rejectOld();
  await expect(pending).rejects.toBeDefined();
  expect(localStorage.getItem("token")).toBe("new-login");
});

it("does not perform a late local fallback under a newer login", async () => {
  applyRuntimeRoutingConfig({ enabled: true, currentTarget: "local", localHealthy: true, localBaseUrl: "http://127.0.0.1:8130/api" });
  let rejectOld;
  const adapter = vi.fn(config => new Promise((_, reject) => { rejectOld = () => failure(config, 503).catch(reject); }));
  const pending = api.get("/products", { adapter });
  await vi.waitFor(() => expect(rejectOld).toBeDefined());
  localStorage.setItem("token", "new-login"); rejectOld();
  await expect(pending).rejects.toBeDefined();
  expect(adapter).toHaveBeenCalledTimes(1);
});

it("does not retry an old store's failed read under the newly selected store", async () => {
  sessionStorage.setItem("activeStoreId", "2");
  applyRuntimeRoutingConfig({ enabled: true, currentTarget: "local", localHealthy: true, localBaseUrl: "http://127.0.0.1:8130/api" });
  let rejectOld;
  const adapter = vi.fn(config => new Promise((_, reject) => { rejectOld = () => failure(config, 503).catch(reject); }));
  const pending = api.get("/products", { adapter });
  await vi.waitFor(() => expect(rejectOld).toBeDefined());
  sessionStorage.setItem("activeStoreId", "3"); rejectOld();
  await expect(pending).rejects.toBeDefined(); expect(adapter).toHaveBeenCalledTimes(1);
});
