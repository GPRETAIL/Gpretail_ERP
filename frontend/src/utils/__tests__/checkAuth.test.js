import { afterEach, beforeEach, expect, it, vi } from "vitest";
import checkAuth from "../checkAuth";
import api from "../../api/axios";
import { clearRuntimeRoutingConfig, fetchAndApplyRuntimeRoutingConfig } from "../../api/runtimeRouting";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../api/runtimeRouting", () => ({ clearRuntimeRoutingConfig: vi.fn(), fetchAndApplyRuntimeRoutingConfig: vi.fn().mockResolvedValue(null) }));
vi.mock("../../features/authSlice", () => ({ loginSuccess: payload => ({ type: "login", payload }), logout: () => ({ type: "logout" }) }));
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("token", "current"); localStorage.setItem("user", '{"id":1}');
});
afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

it.each([{ response: { status: 503 } }, { code: "ECONNABORTED" }, new Error("offline")])("retains the session after a temporary verification failure: %j", async error => {
  api.get.mockRejectedValue(error);
  const dispatch = vi.fn(); await checkAuth(dispatch);
  expect(localStorage.getItem("token")).toBe("current");
  expect(dispatch).not.toHaveBeenCalled(); expect(clearRuntimeRoutingConfig).not.toHaveBeenCalled();
});

it.each(["401", "malformed"])("rejects an expired or invalid identity response: %s", async reason => {
  if (reason === "401") api.get.mockRejectedValue({ response: { status: 401 } });
  else api.get.mockResolvedValue({ data: { data: {} } });
  const dispatch = vi.fn(); await checkAuth(dispatch);
  expect(localStorage.getItem("token")).toBeNull();
  expect(dispatch).toHaveBeenCalledWith({ type: "logout" });
});

it.each(["success", "failure"])("ignores late %s from a previous login", async outcome => {
  let resolve, reject;
  api.get.mockImplementation(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
  const dispatch = vi.fn(); const pending = checkAuth(dispatch);
  localStorage.setItem("token", "new-login");
  if (outcome === "success") resolve({ data: { data: { id: 1 } } });
  else reject({ response: { status: 401 } });
  await pending;
  expect(dispatch).not.toHaveBeenCalled(); expect(localStorage.getItem("token")).toBe("new-login");
});

it("does not reset a newly selected store with a previous store's auth result", async () => {
  let resolve;
  api.get.mockImplementation(() => new Promise(done => { resolve = done; }));
  const dispatch = vi.fn(); const pending = checkAuth(dispatch);
  sessionStorage.setItem("activeStoreId", "2"); resolve({ data: { data: { id: 1 } } }); await pending;
  expect(dispatch).not.toHaveBeenCalled();
});

it("verifies identity and initializes routing once on a valid session", async () => {
  api.get.mockResolvedValue({ data: { data: { id: 1 } } });
  const dispatch = vi.fn(); await checkAuth(dispatch);
  expect(dispatch).toHaveBeenCalledWith({ type: "login", payload: { token: "current", user: { id: 1 } } });
  expect(fetchAndApplyRuntimeRoutingConfig).toHaveBeenCalledTimes(1);
});
