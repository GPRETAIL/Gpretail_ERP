import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "../../api/axios";
import { applyRuntimeRoutingConfig, clearRuntimeRoutingConfig } from "../../api/runtimeRouting";
import { getMasterLookups, invalidateLookupCache } from "../lookupCache";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn() } }));
beforeEach(() => { invalidateLookupCache(); localStorage.clear(); sessionStorage.clear(); api.get.mockReset(); });
afterEach(() => clearRuntimeRoutingConfig());

it("reuses a lookup only within the same authenticated store and node", async () => {
  localStorage.setItem("token", "lookup-user-one"); sessionStorage.setItem("activeStoreId", "2");
  api.get.mockImplementation(async () => ({ data: { data: { sequence: api.get.mock.calls.length } } }));
  expect((await getMasterLookups("invoice_entry")).sequence).toBe(1);
  expect((await getMasterLookups("invoice_entry")).sequence).toBe(1);
  sessionStorage.setItem("activeStoreId", "3");
  expect((await getMasterLookups("invoice_entry")).sequence).toBe(2);
  localStorage.setItem("token", "lookup-user-two");
  expect((await getMasterLookups("invoice_entry")).sequence).toBe(3);
  applyRuntimeRoutingConfig({ enabled: true, localHealthy: true, currentTarget: "local", localBaseUrl: "http://127.0.0.1:8130/api" });
  expect((await getMasterLookups("invoice_entry")).sequence).toBe(4);
  invalidateLookupCache("invoice_entry");
  expect((await getMasterLookups("invoice_entry")).sequence).toBe(5);
});

it("does not mutate input keys or confuse a module name with a key list", async () => {
  api.get.mockResolvedValue({ data: { data: {} } });
  const keys = ["suppliers", "companies"];
  await getMasterLookups(keys);
  expect(keys).toEqual(["suppliers", "companies"]);
  expect(api.get).toHaveBeenLastCalledWith("/lookups", { params: { keys: "companies,suppliers" } });
  await getMasterLookups("companies");
  await getMasterLookups(["companies"]);
  expect(api.get).toHaveBeenCalledTimes(3);
});

it("invalidates cached lookups when the local server changes while the target remains local", async () => {
  api.get.mockResolvedValue({ data: { data: {} } });
  const config = { enabled: true, localHealthy: true, currentTarget: "local" };
  applyRuntimeRoutingConfig({ ...config, localBaseUrl: "http://127.0.0.1:8130/api" });
  await getMasterLookups("invoice_entry");
  applyRuntimeRoutingConfig({ ...config, localBaseUrl: "http://127.0.0.1:8140/api" });
  await getMasterLookups("invoice_entry");
  expect(api.get).toHaveBeenCalledTimes(2);
});
