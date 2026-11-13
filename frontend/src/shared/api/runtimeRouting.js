import { serverUrlProblem } from "./serverUrlCheck";
const CLOUD_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
// On-prem frontends set this (e.g. https://dev.gpsoftware.in/api) so counters can reach the cloud even when the
// on-prem backend is down from the start and never told them where the cloud is.
const FAILOVER_CLOUD_API_URL = import.meta.env.VITE_FAILOVER_CLOUD_API_URL || "";
const STORAGE_KEY = "erp_runtime_routing";
const FAILOVER_SESSION_KEY = "erp_failover_session";
const SESSION_HOME_KEY = "erp_session_home";
// The cloud address of an on-prem page. Not session data, so it survives sign-out: the next sign-in during an
// outage still knows where the cloud is.
const ONPREM_CLOUD_KEY = "erp_onprem_cloud_api";
const LOCAL_POLL_INTERVAL_MS = 5000;
const LOCAL_POLL_TIMEOUT_MS = 1500;
// Two missed health checks in a row (about 10 s) before counters move to the cloud: one slow answer is not an outage.
const FAILURES_BEFORE_FAILOVER = 2;
const FAILOVER_REFRESH_MS = 30 * 60 * 1000;
const FAILOVER_RENEW_BEFORE_MS = 6 * 60 * 60 * 1000;
// Vite's proxy marks a 502 with the connection error (vite.config.js). These mean the on-prem backend never got the request.
const UNREACHED_PROXY_ERRORS = ["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND", "EAI_AGAIN"];
const DEFAULT_STATE = {
  enabled: false,
  tenantKey: "",
  blockedReason: "",
  currentTarget: "cloud",
  localBaseUrl: "",
  cloudBaseUrl: CLOUD_BASE_URL,
  localHealthUrl: "",
  localHealthy: false,
  runningOnLocalConnector: false,
  // On-prem pages only: whether the on-prem backend answers, and whether both sides are caught up
  // (ready | catching_up | cloud_unreachable). Counters on the cloud return only when it is not catching_up.
  localReachable: false,
  handshakeState: "",
};

let runtimeState = { ...DEFAULT_STATE };
let healthTimer = null;
let boundApiClient = null;
let healthPending = false;
let configurationAttempt = null;
let configurationVersion = 0;
let consecutiveFailures = 0;
let failoverRefreshAt = 0;
let failoverPending = null;
let returnPending = null;
// Whether the last check of this page's own server got an answer (as opposed to no answer at all).
let localAnswered = false;

const isBrowser = () => typeof window !== "undefined";

const normalize = (value = "") => String(value || "").trim();

const stripTrailingSlash = (value = "") => normalize(value).replace(/\/+$/, "");

const isAbsoluteUrl = (value = "") => /^https?:\/\//i.test(normalize(value));

const toApiBase = (value = "") => {
  const text = normalize(value);
  if (!text) return "";
  if (text === "/api") return "/api";
  if (text.endsWith("/api")) return stripTrailingSlash(text);
  return `${stripTrailingSlash(text)}/api`;
};

const readJson = (storage, key) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const pathFromRequestConfig = (config = {}) => {
  const raw = normalize(config.url || "");
  if (!raw) return "/";
  if (isAbsoluteUrl(raw)) {
    try {
      const parsed = new URL(raw);
      return `${parsed.pathname || "/"}${parsed.search || ""}`;
    } catch {
      return raw;
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
};

const withoutQuery = (value = "") => String(value || "").split("?")[0] || "/";

const isPosCheckout = config => String(config.method || "get").toLowerCase() === "post" &&
  /^\/(?:api\/)?pos-(?:old-)?sales\/?$/i.test(withoutQuery(pathFromRequestConfig(config)));
const isBackupPath = config => /^\/(?:api\/)?backups(?:\/|$)/i.test(withoutQuery(pathFromRequestConfig(config)));
const isSessionPath = path => /^\/(?:api\/)?(?:auth\/|local-server-config(?:\/|$))/.test(path);

const isAlwaysCloudPath = (value = "") => {
  const path = withoutQuery(value).toLowerCase();
  return (
    path.startsWith("/auth/") ||
    path.startsWith("/local-server-config") ||
    path.startsWith("/owner-portal") ||
    path.startsWith("/taxes")
  );
};

const isRetryableAuthFailure = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status !== 401 && status !== 403) return false;
  const message = normalize(
    error?.response?.data?.message || error?.response?.data?.error || error?.message || ""
  ).toLowerCase();
  if (!message) return true;
  return (
    message.includes("unauthorized") ||
    message.includes("invalid token") ||
    message.includes("invalid or expired token")
  );
};

const isRetryableSetupFailure = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status !== 400 && status !== 422) return false;
  const message = normalize(
    error?.response?.data?.message || error?.response?.data?.error || error?.response?.data?.detail || ""
  ).toLowerCase();
  if (!message) return false;
  return (
    message.includes("invalid reference") ||
    message.includes("foreign key") ||
    message.includes("no company is assigned")
  );
};

/** True when the on-prem proxy answered that it could not reach the backend at all: the request never arrived. */
const neverReachedLocal = (error) => {
  if (Number(error?.response?.status || 0) !== 502) return false;
  const headers = error?.response?.headers || {};
  const code = String((typeof headers.get === "function" ? headers.get("x-proxy-error") : headers["x-proxy-error"]) || "").toUpperCase();
  return UNREACHED_PROXY_ERRORS.includes(code);
};

// Every mutation path funnels through here, so this is the one place that needs to notify
// listeners (e.g. a navbar status badge) -- no separate "did the target actually change" check,
// since re-rendering on an identical snapshot is harmless and simpler than tracking a diff.
export const RUNTIME_ROUTING_CHANGED_EVENT = "erp:runtime-routing-changed";
export const FAILOVER_SESSION_EXPIRED_EVENT = "vx-failover-session-expired";
/** A sync was started by hand on this page: the footer shows its progress at once instead of on its next check. */
export const SYNC_STARTED_EVENT = "vx-sync-started";

const persistState = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeState));
    if (runtimeState.runningOnLocalConnector && isAbsoluteUrl(runtimeState.cloudBaseUrl)) window.localStorage.setItem(ONPREM_CLOUD_KEY, runtimeState.cloudBaseUrl);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(RUNTIME_ROUTING_CHANGED_EVENT));
};

const readStoredState = () => {
  if (!isBrowser()) return null;
  const parsed = readJson(window.localStorage, STORAGE_KEY);
  return parsed && typeof parsed === "object" ? parsed : null;
};

// ─── The two sign-ins of an on-prem counter ──────────────────────────────────
// "home" is the server the counter signed in on (localStorage "token"). The other server's sign-in is kept in
// erp_failover_session: a cloud sign-in made by the on-prem server, used only while it is down.

const readFailoverSession = () => (isBrowser() ? readJson(window.localStorage, FAILOVER_SESSION_KEY) : null);

const writeFailoverSession = (session) => {
  if (!isBrowser()) return;
  try {
    if (session?.token) window.localStorage.setItem(FAILOVER_SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(FAILOVER_SESSION_KEY);
  } catch {
    // ignore
  }
};

export const getSessionHome = () => {
  if (!isBrowser()) return "local";
  try {
    return window.localStorage.getItem(SESSION_HOME_KEY) === "cloud" ? "cloud" : "local";
  } catch {
    return "local";
  }
};

/** Called after a sign-in: on an on-prem page, remembers whether it happened on the cloud (during an outage). */
export const setSessionHome = (target) => {
  if (!isBrowser()) return;
  try {
    if (runtimeState.runningOnLocalConnector && target === "cloud") window.localStorage.setItem(SESSION_HOME_KEY, "cloud");
    else window.localStorage.removeItem(SESSION_HOME_KEY);
  } catch {
    // ignore
  }
};

/** The sign-in to send to a target: the home sign-in, or the failover one for the other server. */
export const getAuthTokenFor = (target) => {
  const token = isBrowser() ? window.localStorage.getItem("token") : null;
  if (!runtimeState.runningOnLocalConnector || !["local", "cloud"].includes(target)) return token;
  if (target === getSessionHome()) return token;
  return readFailoverSession()?.token || token;
};

/**
 * Whether a request went to the server the counter did not sign in on. Its 401 never signs the counter out: the
 * failover sign-in is dropped instead and the counter is asked to sign in again on the cloud.
 */
export const usedFailoverSession = (config = {}) => runtimeState.runningOnLocalConnector
  && ["local", "cloud"].includes(config.__routingTarget) && config.__routingTarget !== getSessionHome();

export const discardFailoverSession = () => {
  writeFailoverSession(null);
  failoverRefreshAt = 0;
  if (isBrowser()) window.dispatchEvent(new CustomEvent(FAILOVER_SESSION_EXPIRED_EVENT));
};

/** Asks the on-prem server for a cloud sign-in for this counter, at most every 30 min, sooner when it nears expiry. */
const refreshFailoverSession = async ({ force = false } = {}) => {
  if (!isBrowser() || !boundApiClient || !runtimeState.runningOnLocalConnector || !runtimeState.localReachable) return;
  if (getSessionHome() !== "local" || !window.localStorage.getItem("token")) return;
  const current = readFailoverSession();
  const expiresSoon = !current?.expiresAt || new Date(current.expiresAt).getTime() - Date.now() < FAILOVER_RENEW_BEFORE_MS;
  if (!force && current?.token && !expiresSoon && Date.now() < failoverRefreshAt) return;
  if (failoverPending) return failoverPending;
  failoverPending = (async () => {
    try {
      const res = await boundApiClient.post("/auth/failover-session", null, { __routingTarget: "local" });
      const data = res?.data?.data || {};
      if (data.token) {
        writeFailoverSession({ token: data.token, expiresAt: data.expires_at || null, cloudBaseUrl: toApiBase(data.cloud_api_base_url) });
        if (data.cloud_api_base_url && toApiBase(data.cloud_api_base_url) !== runtimeState.cloudBaseUrl) {
          runtimeState.cloudBaseUrl = toApiBase(data.cloud_api_base_url);
          persistState();
        }
      }
      failoverRefreshAt = Date.now() + FAILOVER_REFRESH_MS;
    } catch {
      // The cloud may be unreachable (internet down); the counter keeps working on-prem and retries later.
      failoverRefreshAt = Date.now() + 60 * 1000;
    } finally {
      failoverPending = null;
    }
  })();
  return failoverPending;
};

/** Signs the failover sign-in out on the cloud (best effort), e.g. on logout. */
export const revokeFailoverSession = async () => {
  const session = readFailoverSession();
  writeFailoverSession(null);
  if (!session?.token || !isBrowser() || typeof fetch !== "function") return;
  const base = session.cloudBaseUrl || runtimeState.cloudBaseUrl;
  if (!isAbsoluteUrl(base)) return;
  try {
    await fetch(`${base}/auth/logout`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${session.token}` } });
  } catch {
    // It expires by itself within a day.
  }
};

/**
 * Someone signed in on the cloud during the outage: before the counter moves back, the on-prem server confirms
 * that sign-in with the cloud and issues its own. Their cloud sign-in is then signed out.
 */
const exchangeCloudSession = async () => {
  if (getSessionHome() !== "cloud") return true;
  const cloudToken = window.localStorage.getItem("token");
  if (!cloudToken) return false;
  try {
    const response = await fetch(`${stripTrailingSlash(runtimeState.localBaseUrl || "/api")}/auth/failover-session/exchange`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ cloud_token: cloudToken }),
    });
    const payload = await response.json().catch(() => null);
    const localToken = payload?.data?.token;
    if (!response.ok || !localToken) return false;
    window.localStorage.setItem("token", localToken);
    if (payload?.data?.user) window.localStorage.setItem("user", JSON.stringify(payload.data.user));
    window.localStorage.removeItem(SESSION_HOME_KEY);
    writeFailoverSession({ token: cloudToken, expiresAt: new Date(Date.now() + 60 * 1000).toISOString(), cloudBaseUrl: runtimeState.cloudBaseUrl });
    void revokeFailoverSession();
    window.dispatchEvent(new CustomEvent("vx-session-exchanged", { detail: { token: localToken, user: payload?.data?.user || null } }));
    return true;
  } catch {
    return false;
  }
};

const applyClientDefaultBase = () => {
  if (!boundApiClient) return;
  boundApiClient.defaults.baseURL =
    runtimeState.enabled && runtimeState.currentTarget === "local" && runtimeState.localBaseUrl
      ? runtimeState.localBaseUrl
      : runtimeState.cloudBaseUrl || CLOUD_BASE_URL;
};

const stopLocalHealthPolling = () => {
  if (healthTimer) {
    clearInterval(healthTimer);
    healthTimer = null;
  }
};

const fetchJsonWithTimeout = async (url, { token, timeoutMs = LOCAL_POLL_TIMEOUT_MS, headers = {} } = {}) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), Math.max(300, Number(timeoutMs || LOCAL_POLL_TIMEOUT_MS)));

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(new Error(payload?.message || `HTTP ${response.status}`), {
        response: { status: response.status, data: payload },
      });
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
};

const switchTarget = (target = "cloud") => {
  runtimeState.currentTarget = target === "local" ? "local" : "cloud";
  persistState();
  applyClientDefaultBase();
};

/** On-prem page: one health check of the on-prem backend, moving the counter between it and the cloud. */
const pollOnPremOnce = async () => {
  const healthUrl = runtimeState.localHealthUrl;
  const version = configurationVersion;
  const data = await fetchJsonWithTimeout(healthUrl).then(payload => payload?.data || {}, () => null);
  if (version !== configurationVersion || !runtimeState.enabled || runtimeState.localHealthUrl !== healthUrl) return false;

  if (data && data.enabled === false) {
    // Failover was switched off on the on-prem server: it is just the store's server now.
    applyResolvedState({ ...DEFAULT_STATE });
    return false;
  }
  if (!data) {
    consecutiveFailures++;
    if (runtimeState.currentTarget === "local" && consecutiveFailures < FAILURES_BEFORE_FAILOVER) return false;
    runtimeState.localReachable = false;
    runtimeState.localHealthy = false;
    runtimeState.handshakeState = "";
    switchTarget("cloud");
    return false;
  }

  consecutiveFailures = 0;
  runtimeState.localReachable = true;
  runtimeState.handshakeState = normalize(data.state) || "ready";
  if (data.cloud_api_base_url) runtimeState.cloudBaseUrl = toApiBase(data.cloud_api_base_url);
  if (runtimeState.currentTarget === "local") {
    runtimeState.localHealthy = true;
    persistState();
    void refreshFailoverSession();
    return true;
  }
  // On the cloud: come back only when both sides are caught up (or the cloud can't be reached from on-prem).
  if (runtimeState.handshakeState === "catching_up") {
    runtimeState.localHealthy = false;
    persistState();
    return false;
  }
  if (returnPending) return false;
  returnPending = exchangeCloudSession().finally(() => { returnPending = null; });
  const exchanged = await returnPending;
  if (version !== configurationVersion || !exchanged) {
    persistState();
    return false;
  }
  runtimeState.localHealthy = true;
  runtimeState.blockedReason = "";
  switchTarget("local");
  void refreshFailoverSession({ force: true });
  return true;
};

const pollLocalHealthOnce = async () => {
  if (!isBrowser() || !runtimeState.enabled || !runtimeState.localHealthUrl) return false;
  if (healthPending || document.visibilityState === "hidden") return false;
  healthPending = true;
  try {
    if (runtimeState.runningOnLocalConnector) return await pollOnPremOnce();
    const healthUrl = runtimeState.localHealthUrl;
    const version = configurationVersion;
    try {
      const payload = await fetchJsonWithTimeout(healthUrl);
      if (version !== configurationVersion || !runtimeState.enabled || runtimeState.localHealthUrl !== healthUrl) return false;
      const data = payload?.data || payload || {};
      const localHealthy = Boolean(data.local_healthy ?? data.connector?.local_healthy ?? payload?.success);
      runtimeState.localHealthy = localHealthy;
      if (localHealthy) {
        runtimeState.blockedReason = "";
        switchTarget("local");
        return true;
      }
    } catch {
      if (version !== configurationVersion || !runtimeState.enabled || runtimeState.localHealthUrl !== healthUrl) return false;
      runtimeState.localHealthy = false;
      persistState();
    }
    return false;
  } finally { healthPending = false; }
};

const startLocalHealthPolling = () => {
  stopLocalHealthPolling();
  if (!isBrowser() || !runtimeState.enabled || !runtimeState.localHealthUrl) return;

  healthTimer = window.setInterval(() => {
    // An on-prem page watches both ways (down → cloud, caught up → back); a cloud page only waits to switch over.
    if (!runtimeState.runningOnLocalConnector && runtimeState.currentTarget !== "cloud") return;
    pollLocalHealthOnce().catch(() => {});
  }, LOCAL_POLL_INTERVAL_MS);
};

const applyResolvedState = (next = {}) => {
  runtimeState = {
    ...DEFAULT_STATE,
    ...runtimeState,
    ...next,
  };

  if (!runtimeState.enabled) {
    runtimeState.currentTarget = "cloud";
    runtimeState.localHealthy = false;
  } else if (!runtimeState.localHealthy) {
    runtimeState.currentTarget = "cloud";
  }
  consecutiveFailures = 0;

  persistState();
  applyClientDefaultBase();
  startLocalHealthPolling();
  if (runtimeState.runningOnLocalConnector) void refreshFailoverSession();
  return runtimeState;
};

const resolveFromLocalConnector = async () => {
  if (!isBrowser()) return null;
  localAnswered = false;
  try {
    const payload = await fetchJsonWithTimeout("/api/connector/web-config", { timeoutMs: 1200 });
    localAnswered = true;
    const data = payload?.data || {};
    const cloudBaseUrl = toApiBase(data.cloud_api_base_url);
    if (!cloudBaseUrl) return null;
    const state = normalize(data.state) || "ready";
    // A counter signed in on the cloud stays there until the on-prem server has caught up (and swapped its sign-in).
    const local = Boolean(data.local_healthy) && getSessionHome() === "local";
    return {
      enabled: Boolean(data.enabled),
      tenantKey: normalize(data.tenant_key),
      blockedReason: "",
      currentTarget: local ? "local" : "cloud",
      localBaseUrl: "/api",
      cloudBaseUrl,
      localHealthUrl: "/api/connector/web-config",
      localHealthy: local,
      runningOnLocalConnector: true,
      localReachable: true,
      handshakeState: state,
    };
  } catch {
    // The on-prem backend is down. If this page is an on-prem one (it said so before, or its build names the
    // cloud), the counter works on the cloud until the backend is back.
    const stored = readStoredState();
    const remembered = (() => { try { return window.localStorage.getItem(ONPREM_CLOUD_KEY) || ""; } catch { return ""; } })();
    const cloudBaseUrl = toApiBase(FAILOVER_CLOUD_API_URL) || toApiBase(remembered)
      || (stored?.runningOnLocalConnector ? toApiBase(stored.cloudBaseUrl) : "");
    if (!isAbsoluteUrl(cloudBaseUrl)) return null;
    return {
      enabled: true,
      tenantKey: normalize(stored?.tenantKey),
      blockedReason: "",
      currentTarget: "cloud",
      localBaseUrl: "/api",
      cloudBaseUrl,
      localHealthUrl: "/api/connector/web-config",
      localHealthy: false,
      runningOnLocalConnector: true,
      localReachable: false,
      handshakeState: "",
    };
  }
};

const resolveFromCloudRuntime = async ({ token, storeId } = {}) => {
  try {
    const payload = await fetchJsonWithTimeout(`${CLOUD_BASE_URL}/local-server-config/runtime`, {
      token,
      headers: storeId ? { "X-Company-Scope-Id": storeId } : {},
      timeoutMs: 2500,
    });
    const data = payload?.data || {};
    const localRoot = stripTrailingSlash(data.local_server_url || "");
    const cloudBaseUrl = toApiBase(data.cloud_server_url) || CLOUD_BASE_URL;
    const invalidLocalServer = isAbsoluteUrl(localRoot) && Boolean(serverUrlProblem(localRoot, { local: true }));
    if (!data.enabled || !isAbsoluteUrl(localRoot) || invalidLocalServer) {
      return {
        enabled: false,
        blockedReason: invalidLocalServer ? "The saved local server is a frontend or loopback address. Configure a reachable backend LAN address." : normalize(data.local_server_url) ? "" : "Local server is not configured for this company.",
        currentTarget: "cloud",
        localBaseUrl: "",
        cloudBaseUrl: CLOUD_BASE_URL,
        localHealthUrl: "",
        localHealthy: false,
        runningOnLocalConnector: false,
      };
    }

    const localHealthUrl = `${localRoot}/api/connector/web-config`;
    const webConfig = await fetchJsonWithTimeout(localHealthUrl, { timeoutMs: 1200 }).catch(() => null);
    if (webConfig?.data?.enabled === false) {
      return { ...DEFAULT_STATE, blockedReason: "The saved backend is not configured as a local sync connector." };
    }
    const localHealthy = Boolean(webConfig?.data?.local_healthy ?? webConfig?.success);

    return {
      enabled: true,
      tenantKey: normalize(data.tenant_key),
      blockedReason: "",
      currentTarget: localHealthy ? "local" : "cloud",
      localBaseUrl: `${localRoot}/api`,
      cloudBaseUrl,
      localHealthUrl,
      localHealthy,
      runningOnLocalConnector: false,
    };
  } catch {
    return {
      enabled: false,
      blockedReason: "",
      currentTarget: "cloud",
      localBaseUrl: "",
      cloudBaseUrl: CLOUD_BASE_URL,
      localHealthUrl: "",
      localHealthy: false,
      runningOnLocalConnector: false,
    };
  }
};

export const applyRuntimeRoutingConfig = (input = {}) => {
  configurationVersion++;
  configurationAttempt = null;
  return applyResolvedState({
    enabled: Boolean(input.enabled),
    tenantKey: normalize(input.tenantKey),
    blockedReason: normalize(input.blockedReason),
    currentTarget: input.currentTarget === "local" ? "local" : "cloud",
    localBaseUrl: normalize(input.localBaseUrl),
    cloudBaseUrl: normalize(input.cloudBaseUrl) || CLOUD_BASE_URL,
    localHealthUrl: normalize(input.localHealthUrl),
    localHealthy: Boolean(input.localHealthy),
    runningOnLocalConnector: Boolean(input.runningOnLocalConnector),
    localReachable: Boolean(input.localReachable ?? input.localHealthy),
    handshakeState: normalize(input.handshakeState),
  });
};

export const clearRuntimeRoutingConfig = () => {
  // A counter's cloud failover sign-in ends with its session.
  void revokeFailoverSession();
  configurationVersion++;
  configurationAttempt = null;
  stopLocalHealthPolling();
  consecutiveFailures = 0;
  failoverRefreshAt = 0;
  runtimeState = { ...DEFAULT_STATE };
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_HOME_KEY);
    } catch {
      // ignore
    }
  }
  applyClientDefaultBase();
};

/**
 * Before any sign-in on a page: find out whether it is served by an on-prem server and whether that server is up,
 * so the sign-in goes to the cloud during an outage. Sign-out keeps routing cleared.
 */
export const prepareRoutingForSignIn = async ({ apiClient } = {}) => {
  if (apiClient) boundApiClient = apiClient;
  if (!isBrowser()) return runtimeState;
  const version = ++configurationVersion;
  const localState = await resolveFromLocalConnector();
  if (version !== configurationVersion) return runtimeState;
  // This page's own server answered and is not (yet) an on-prem failover server: whatever this browser
  // remembered from an earlier setup on this address must not send the sign-in to some cloud.
  if (!localState && localAnswered) return applyResolvedState({ ...DEFAULT_STATE });
  if (!localState) return runtimeState;
  return applyResolvedState({ ...localState, currentTarget: localState.localReachable ? "local" : "cloud", localHealthy: localState.localReachable });
};

export const fetchAndApplyRuntimeRoutingConfig = async ({ apiClient, token } = {}) => {
  if (apiClient) boundApiClient = apiClient;
  if (!isBrowser()) return null;

  const storeId = sessionStorage.getItem("activeStoreId");
  const storedToken = localStorage.getItem("token");
  const key = JSON.stringify([token || "", storedToken, storeId]);
  if (configurationAttempt?.key === key) return configurationAttempt.promise;
  const attempt = { key, version: ++configurationVersion, promise: null };
  configurationAttempt = attempt;
  const isCurrent = () => configurationAttempt === attempt && configurationVersion === attempt.version &&
    localStorage.getItem("token") === storedToken && sessionStorage.getItem("activeStoreId") === storeId;
  attempt.promise = (async () => {
    const localState = await resolveFromLocalConnector();
    if (!isCurrent()) return null;
    if (localState) return applyResolvedState(localState);
    const cloudState = await resolveFromCloudRuntime({ token, storeId });
    return isCurrent() ? applyResolvedState(cloudState || DEFAULT_STATE) : null;
  })().finally(() => { if (configurationAttempt === attempt) configurationAttempt = null; });
  return attempt.promise;
};

export const prepareRoutingForRequest = async (config = {}) => {
  const next = {
    ...config,
    headers: {
      ...(config.headers || {}),
    },
  };

  const path = pathFromRequestConfig(next);
  if (isSessionPath(path)) {
    if (runtimeState.runningOnLocalConnector && runtimeState.enabled) {
      // On-prem page: sign-in and session checks go to the server that holds the session. Before sign-in, that is
      // the on-prem server unless it is down, in which case the counter signs in on the cloud.
      const signedIn = isBrowser() && Boolean(window.localStorage.getItem("token"));
      const target = next.__routingTarget === "local" ? "local"
        : signedIn ? getSessionHome() : runtimeState.currentTarget === "local" ? "local" : "cloud";
      next.__routingTarget = target;
      next.baseURL = target === "local" ? runtimeState.localBaseUrl || CLOUD_BASE_URL : runtimeState.cloudBaseUrl || CLOUD_BASE_URL;
      return next;
    }
    // Keep credentials/session checks on the deployment which issued the session.
    // A saved failover destination is not an authentication authority.
    next.baseURL = CLOUD_BASE_URL;
    next.__routingTarget = "deployment";
    return next;
  }

  if (isBackupPath(next) && ["local", "cloud"].includes(next.__backupTarget)) {
    if (next.__backupTarget === "local" && !runtimeState.localBaseUrl) throw new Error("Reconnect the local server or reopen Backup Center before accessing its archives.");
    next.__routingTarget = next.__backupTarget;
    next.baseURL = next.__backupTarget === "local" ? runtimeState.localBaseUrl : runtimeState.cloudBaseUrl || CLOUD_BASE_URL;
    if (next.__backupBaseURL && next.__backupBaseURL !== next.baseURL) throw new Error("The backup server address changed. Reopen Backup Center before accessing its archives.");
    if (next.__backupTarget === "cloud") next.headers["X-Bypass-Local"] = "1";
    return next;
  }
  if (isPosCheckout(next) && ["local", "cloud"].includes(next.__posRetryTarget)) {
    next.__routingTarget = next.__posRetryTarget;
    if (next.__posRetryTarget === "local" && !runtimeState.localBaseUrl) {
      throw new Error("Restore the local server connection and check the sales list before retrying this checkout.");
    }
    next.baseURL = next.__posRetryTarget === "local" ? runtimeState.localBaseUrl : runtimeState.cloudBaseUrl || CLOUD_BASE_URL;
    if (next.__posRetryTarget === "cloud") next.headers["X-Bypass-Local"] = "1";
    return next;
  }
  if (isAbsoluteUrl(next.url || "")) {
    next.__routingTarget = "absolute";
    return next;
  }

  if (next.__retriedOnCloud) {
    next.baseURL = runtimeState.cloudBaseUrl || CLOUD_BASE_URL;
    next.__routingTarget = "cloud";
    next.headers["X-Bypass-Local"] = "1";
    return next;
  }

  if (!runtimeState.enabled) {
    next.baseURL = CLOUD_BASE_URL;
    next.__routingTarget = "cloud";
    return next;
  }

  const target = isAlwaysCloudPath(path)
    ? "cloud"
    : runtimeState.currentTarget === "local" && runtimeState.localBaseUrl
      ? "local"
      : "cloud";

  next.__routingTarget = target;
  if (target === "local") {
    next.baseURL = runtimeState.localBaseUrl || CLOUD_BASE_URL;
    return next;
  }

  next.baseURL = runtimeState.cloudBaseUrl || CLOUD_BASE_URL;
  next.headers["X-Bypass-Local"] = "1";
  return next;
};

export const shouldRetryOnCloud = (error) => {
  if (error?.code === "ERR_CANCELED" || error?.__CANCEL__) return false;
  const requestConfig = error?.config || {};
  if (!runtimeState.enabled) return false;
  if (requestConfig.__retriedOnCloud) return false;
  if (requestConfig.__routingTarget !== "local") return false;
  if (isBackupPath(requestConfig)) return false; // Archive IDs are local to their originating server.
  if (isAlwaysCloudPath(pathFromRequestConfig(requestConfig))) return false;
  // An ambiguous write may already have committed on the local database. A write the on-prem proxy could not
  // deliver at all (backend down) never arrived, so the cloud makes it exactly once.
  if (!["get", "head", "options"].includes(String(requestConfig.method || "get").toLowerCase())) {
    return runtimeState.runningOnLocalConnector && neverReachedLocal(error);
  }

  const status = Number(error?.response?.status || 0);
  if (!error?.response) return true;
  if ([502, 503, 504].includes(status)) return true;
  if (isRetryableAuthFailure(error)) return true;
  if (isRetryableSetupFailure(error)) return true;
  return false;
};

export const buildCloudRetryConfig = (config = {}) => {
  if (runtimeState.runningOnLocalConnector) {
    // The on-prem backend didn't answer: treat it as down now rather than after the next health checks.
    consecutiveFailures = FAILURES_BEFORE_FAILOVER;
    runtimeState.localReachable = false;
    runtimeState.localHealthy = false;
  }
  switchTarget("cloud");
  startLocalHealthPolling();

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      "X-Bypass-Local": "1",
    },
    __retriedOnCloud: true,
    __routingTarget: "cloud",
    baseURL: runtimeState.cloudBaseUrl || CLOUD_BASE_URL,
  };
};

/**
 * The cloud an on-prem page fails over to, known even while its own server is down (build setting, or what the
 * server said earlier). Empty on a page that is not an on-prem one.
 */
export const getFailoverCloudApiBase = () => {
  const remembered = (() => { try { return window.localStorage.getItem(ONPREM_CLOUD_KEY) || ""; } catch { return ""; } })();
  const base = toApiBase(FAILOVER_CLOUD_API_URL) || toApiBase(remembered);
  return isAbsoluteUrl(base) ? base : "";
};

export const getCloudBaseUrl = () => {
  const stored = readStoredState();
  if (stored?.cloudBaseUrl) return stored.cloudBaseUrl;
  return CLOUD_BASE_URL;
};

// Read-only snapshot of the live routing state for UI that just wants to display it (e.g. a
// navbar status badge) without participating in routing decisions itself. Pair with
// RUNTIME_ROUTING_CHANGED_EVENT to re-read this on every state change instead of polling.
export const getRuntimeRoutingSnapshot = () => ({
  enabled: runtimeState.enabled,
  currentTarget: runtimeState.currentTarget,
  localHealthy: runtimeState.localHealthy,
  blockedReason: runtimeState.blockedReason,
  localBaseUrl: runtimeState.localBaseUrl,
  cloudBaseUrl: runtimeState.cloudBaseUrl,
  runningOnLocalConnector: runtimeState.runningOnLocalConnector,
  localReachable: runtimeState.localReachable,
  handshakeState: runtimeState.handshakeState,
});


const storedState = readStoredState();
if (storedState) {
  runtimeState = {
    ...DEFAULT_STATE,
    ...storedState,
  };
  // An on-prem page starts on the server it was last on; the first health check corrects it within seconds.
}
