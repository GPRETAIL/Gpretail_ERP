const CLOUD_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const STORAGE_KEY = "erp_runtime_routing";
const LOCAL_POLL_INTERVAL_MS = 5000;
const LOCAL_POLL_TIMEOUT_MS = 1500;
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
};

let runtimeState = { ...DEFAULT_STATE };
let healthTimer = null;
let boundApiClient = null;

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
  if (status >= 500) return true;
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

const persistState = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeState));
  } catch {
    // ignore
  }
};

const readStoredState = () => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
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

const pollLocalHealthOnce = async () => {
  if (!isBrowser() || !runtimeState.enabled || !runtimeState.localHealthUrl) return false;
  try {
    const payload = await fetchJsonWithTimeout(runtimeState.localHealthUrl);
    const data = payload?.data || payload || {};
    const localHealthy = Boolean(data.local_healthy ?? data.connector?.local_healthy ?? payload?.success);
    runtimeState.localHealthy = localHealthy;
    if (localHealthy) {
      switchTarget("local");
      runtimeState.blockedReason = "";
      persistState();
      return true;
    }
  } catch {
    runtimeState.localHealthy = false;
    persistState();
  }
  return false;
};

const startLocalHealthPolling = () => {
  stopLocalHealthPolling();
  if (!isBrowser() || !runtimeState.enabled || !runtimeState.localHealthUrl) return;

  healthTimer = window.setInterval(() => {
    if (runtimeState.currentTarget !== "cloud") return;
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

  persistState();
  applyClientDefaultBase();
  startLocalHealthPolling();
  return runtimeState;
};

const resolveFromLocalConnector = async () => {
  if (!isBrowser()) return null;
  try {
    const payload = await fetchJsonWithTimeout("/api/connector/web-config", { timeoutMs: 1200 });
    const data = payload?.data || {};
    const cloudBaseUrl = toApiBase(data.cloud_api_base_url);
    if (!cloudBaseUrl) return null;
    return {
      enabled: Boolean(data.enabled),
      tenantKey: normalize(data.tenant_key),
      blockedReason: "",
      currentTarget: data.local_healthy ? "local" : "cloud",
      localBaseUrl: "/api",
      cloudBaseUrl,
      localHealthUrl: "/api/connector/web-config",
      localHealthy: Boolean(data.local_healthy),
      runningOnLocalConnector: true,
    };
  } catch {
    return null;
  }
};

const resolveFromCloudRuntime = async ({ token } = {}) => {
  try {
    const payload = await fetchJsonWithTimeout(`${CLOUD_BASE_URL}/local-server-config/runtime`, {
      token,
      timeoutMs: 2500,
    });
    const data = payload?.data || {};
    const localRoot = stripTrailingSlash(data.local_server_url || "");
    if (!data.enabled || !isAbsoluteUrl(localRoot)) {
      return {
        enabled: false,
        blockedReason: normalize(data.local_server_url) ? "" : "Local server is not configured for this company.",
        currentTarget: "cloud",
        localBaseUrl: "",
        cloudBaseUrl: CLOUD_BASE_URL,
        localHealthUrl: "",
        localHealthy: false,
        runningOnLocalConnector: false,
      };
    }

    const localHealthUrl = `${localRoot}/api/connector/web-config`;
    const localHealthy = await fetchJsonWithTimeout(localHealthUrl, { timeoutMs: 1200 })
      .then((webConfig) => Boolean(webConfig?.data?.local_healthy ?? webConfig?.success))
      .catch(() => false);

    return {
      enabled: true,
      tenantKey: normalize(data.tenant_key),
      blockedReason: "",
      currentTarget: localHealthy ? "local" : "cloud",
      localBaseUrl: `${localRoot}/api`,
      cloudBaseUrl: CLOUD_BASE_URL,
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
  });
};

export const clearRuntimeRoutingConfig = () => {
  stopLocalHealthPolling();
  runtimeState = { ...DEFAULT_STATE };
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  applyClientDefaultBase();
};

export const fetchAndApplyRuntimeRoutingConfig = async ({ apiClient, token } = {}) => {
  if (apiClient) boundApiClient = apiClient;
  if (!isBrowser()) return null;

  const localState = await resolveFromLocalConnector();
  if (localState) return applyResolvedState(localState);

  const cloudState = await resolveFromCloudRuntime({ token });
  return applyResolvedState(cloudState || DEFAULT_STATE);
};

export const prepareRoutingForRequest = async (config = {}) => {
  const next = {
    ...config,
    headers: {
      ...(config.headers || {}),
    },
  };

  const path = pathFromRequestConfig(next);
  if (isAbsoluteUrl(next.url || "")) {
    next.__routingTarget = "absolute";
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
  const requestConfig = error?.config || {};
  if (!runtimeState.enabled) return false;
  if (requestConfig.__retriedOnCloud) return false;
  if (requestConfig.__routingTarget !== "local") return false;
  if (isAlwaysCloudPath(pathFromRequestConfig(requestConfig))) return false;

  const status = Number(error?.response?.status || 0);
  if (!error?.response) return true;
  if ([502, 503, 504].includes(status)) return true;
  if (isRetryableAuthFailure(error)) return true;
  if (isRetryableSetupFailure(error)) return true;
  return false;
};

export const buildCloudRetryConfig = (config = {}) => {
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

export const getCloudBaseUrl = () => {
  const stored = readStoredState();
  if (stored?.cloudBaseUrl) return stored.cloudBaseUrl;
  return CLOUD_BASE_URL;
};

const storedState = readStoredState();
if (storedState) {
  runtimeState = {
    ...DEFAULT_STATE,
    ...storedState,
  };
  if (runtimeState.runningOnLocalConnector) {
    runtimeState.currentTarget = "local";
  }
}
