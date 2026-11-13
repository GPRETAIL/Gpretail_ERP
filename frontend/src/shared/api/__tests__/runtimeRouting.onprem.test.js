import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  applyRuntimeRoutingConfig,
  clearRuntimeRoutingConfig,
  fetchAndApplyRuntimeRoutingConfig,
  getAuthTokenFor,
  getRuntimeRoutingSnapshot,
  prepareRoutingForRequest,
  prepareRoutingForSignIn,
  setSessionHome,
} from "@/shared/api/runtimeRouting";
import { failoverNotice } from "@/shared/utils/failoverNotice";

const ok = data => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });
const down = () => ({ ok: false, status: 502, json: async () => null });
const CLOUD = "https://cloud.example/api";
const onPrem = (overrides = {}) => applyRuntimeRoutingConfig({
  enabled: true, runningOnLocalConnector: true, currentTarget: "local", localHealthy: true, localReachable: true,
  localBaseUrl: "/api", cloudBaseUrl: CLOUD, localHealthUrl: "/api/connector/web-config", handshakeState: "ready", ...overrides,
});

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); clearRuntimeRoutingConfig(); vi.useFakeTimers(); });
afterEach(() => { clearRuntimeRoutingConfig(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("moves an on-prem counter to the cloud after two missed health checks, not one", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => down()));
  onPrem();
  await vi.advanceTimersByTimeAsync(5000);
  expect(getRuntimeRoutingSnapshot().currentTarget).toBe("local");
  await vi.advanceTimersByTimeAsync(5000);
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ currentTarget: "cloud", localReachable: false });
  expect(failoverNotice(getRuntimeRoutingSnapshot())?.title).toBe("Cloud (on-prem server down)");
  expect((await prepareRoutingForRequest({ method: "post", url: "/pos-sales" })).baseURL).toBe(CLOUD);
});

it("stays on the cloud while the on-prem server catches up, and returns once both sides are up to date", async () => {
  let state = "catching_up";
  vi.stubGlobal("fetch", vi.fn(async () => ok({ enabled: true, local_healthy: true, state, cloud_api_base_url: CLOUD })));
  localStorage.setItem("token", "local-token");
  onPrem({ currentTarget: "cloud", localHealthy: false, localReachable: false, handshakeState: "" });

  await vi.advanceTimersByTimeAsync(5000);
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ currentTarget: "cloud", localReachable: true, handshakeState: "catching_up" });
  expect(failoverNotice(getRuntimeRoutingSnapshot())?.title).toBe("Cloud (on-prem server catching up)");

  state = "ready";
  await vi.advanceTimersByTimeAsync(5000);
  expect(getRuntimeRoutingSnapshot().currentTarget).toBe("local");
  expect(failoverNotice(getRuntimeRoutingSnapshot())).toBeNull();
});

it("signs in on the cloud while the on-prem server is down, using the remembered cloud address", async () => {
  localStorage.setItem("erp_onprem_cloud_api", CLOUD);
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
  await prepareRoutingForSignIn();
  const login = await prepareRoutingForRequest({ method: "post", url: "/auth/login" });
  expect(login).toMatchObject({ baseURL: CLOUD, __routingTarget: "cloud" });
});

it("uses the cloud failover sign-in for cloud requests and the home sign-in for on-prem ones", () => {
  onPrem();
  localStorage.setItem("token", "local-token");
  localStorage.setItem("erp_failover_session", JSON.stringify({ token: "cloud-failover", expiresAt: new Date(Date.now() + 86400000).toISOString() }));
  expect(getAuthTokenFor("local")).toBe("local-token");
  expect(getAuthTokenFor("cloud")).toBe("cloud-failover");
});

it("swaps a cloud sign-in made during the outage for an on-prem one before moving back", async () => {
  const exchanged = vi.fn();
  window.addEventListener("vx-session-exchanged", exchanged);
  const fetch = vi.fn(async (url) => (String(url).endsWith("/auth/failover-session/exchange")
    ? ok({ token: "new-local", user: { id: 7, username: "asha" } })
    : String(url).endsWith("/auth/logout") ? ok({}) : ok({ enabled: true, local_healthy: true, state: "ready", cloud_api_base_url: CLOUD })));
  vi.stubGlobal("fetch", fetch);
  onPrem({ currentTarget: "cloud", localHealthy: false, localReachable: false });
  localStorage.setItem("token", "cloud-token");
  setSessionHome("cloud");
  expect((await prepareRoutingForRequest({ url: "/auth/me" })).baseURL).toBe(CLOUD);

  await vi.advanceTimersByTimeAsync(5000);

  expect(getRuntimeRoutingSnapshot().currentTarget).toBe("local");
  expect(localStorage.getItem("token")).toBe("new-local");
  expect(getAuthTokenFor("local")).toBe("new-local");
  expect(fetch.mock.calls.find(([url]) => String(url).endsWith("/exchange"))[1].body).toContain("cloud-token");
  expect(fetch).toHaveBeenCalledWith(`${CLOUD}/auth/logout`, expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer cloud-token" }) }));
  expect(exchanged).toHaveBeenCalledTimes(1);
  window.removeEventListener("vx-session-exchanged", exchanged);
});

it("starts an on-prem page on the cloud when its server is already down at load", async () => {
  localStorage.setItem("erp_onprem_cloud_api", CLOUD);
  localStorage.setItem("token", "local-token");
  vi.stubGlobal("fetch", vi.fn(async () => down()));
  await fetchAndApplyRuntimeRoutingConfig({ token: "local-token" });
  expect(getRuntimeRoutingSnapshot()).toMatchObject({ runningOnLocalConnector: true, currentTarget: "cloud", cloudBaseUrl: CLOUD });
});
