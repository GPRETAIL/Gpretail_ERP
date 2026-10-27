import axios from "axios";
import { createReadCoalescer } from "./coalesceReads";
import { handleStoreSelectionError } from "../utils/storeSelection";
import {
  buildCloudRetryConfig,
  getCloudBaseUrl,
  prepareRoutingForRequest,
  shouldRetryOnCloud,
} from "./runtimeRouting";

// Wire contract with backend/vx-common StoreAssignment.SELECT_STORE_MESSAGE: writes made while
// viewing All Stores or multiple stores at once can't tell which store to save into, so the
// backend 422s with this exact message. Surface it as one clear alert instead of a raw API error.
const SELECT_STORE_MESSAGE = "Select a store first";
// The other store-scope 422. Distinct from the one above: there is no store to pick, so telling the
// user to choose one is a dead end -- the backend deliberately worded it to name who can help.
// Passed through verbatim rather than reworded, because it already reads as an instruction.
const NO_STORES_MESSAGE = "No stores are available";

// The login endpoints return 401 for a plain wrong-password attempt too, not
// just an expired/invalid session - excluded below so a mistyped password on
// the login screen doesn't get treated as "your session expired" and clear
// storage/redirect out from under the form the user is actively typing into.
const LOGIN_PATHS = ["/auth/login", "/auth/google", "/admin-auth/login"];

// Base URL: in Docker, nginx proxies /api → backend container.
// In local dev, vite.config.js proxies /api → VITE_API_PROXY_TARGET.
const api = axios.create({
  baseURL: getCloudBaseUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});
const sharedReads = createReadCoalescer(axios.getAdapter(api.defaults.adapter));
api.defaults.adapter = sharedReads.adapter;

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    if (!["get", "head", "options"].includes(String(config.method || "get").toLowerCase())) sharedReads.invalidate();
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // A form may provision a user in another authorized store without changing all open tabs.
    // The API checks this explicit scope against the operator's assignments.
    const activeStoreId = config.storeScopeId == null ? sessionStorage.getItem("activeStoreId") : String(config.storeScopeId);
    if (activeStoreId && !/^[1-9]\d*$/.test(activeStoreId)) throw new Error("Invalid store selection");
    if (activeStoreId) {
      config.headers["X-Company-Scope-Id"] = activeStoreId;
      config.headers["X-Company-Id"] = activeStoreId;
      config.headers["X-Store-Id"] = activeStoreId;
    }
    return prepareRoutingForRequest(config);
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Navigation and superseded searches deliberately abort requests.
    // Preserve cancellation for callers without retrying or reporting an outage.
    if (axios.isCancel(error) || error?.code === "ERR_CANCELED") return Promise.reject(error);
    const currentToken = localStorage.getItem("token");
    const sentHeaders = axios.AxiosHeaders.from(error.config?.headers);
    const sentToken = String(sentHeaders.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const sentStore = String(sentHeaders.get("X-Company-Scope-Id") || "");
    // An old tab request must not replay under a newer login/store or trigger
    // that newer workspace's session/access/selection handlers.
    if ((sentToken && sentToken !== currentToken) || (error.config?.storeScopeId == null &&
      sentStore !== (sessionStorage.getItem("activeStoreId") || ""))) return Promise.reject(error);
    if (shouldRetryOnCloud(error)) {
      const retryConfig = buildCloudRetryConfig(error.config);
      return api.request(retryConfig);
    }

    const requestUrl = error.config?.url || "";
    // A rejected access validation must not trigger its own validation again.
    if (error.response?.status === 403 && !/(?:^|\/)mobile\/access\/?(?:\?|$)/.test(requestUrl) && ["MOBILE_SUBSCRIPTION_REQUIRED", "STORE_SUBSCRIPTION_REQUIRED", "STORE_LICENCE_INVALID", "STORE_INACTIVE", "MOBILE_USER_ACCESS_DENIED", "CLIENT_ACCESS_DENIED"].includes(error.response?.data?.code)) {
      window.dispatchEvent(new CustomEvent("vx:mobile-access-denied"));
    }
    const isLoginRequest = LOGIN_PATHS.some((path) => requestUrl.includes(path));
    if (error.response?.status === 401 && !isLoginRequest && currentToken && sentToken === currentToken) {
      // Clear once for this session. A late response from an older login must
      // never sign out a newly authenticated session.
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("vx-auth-expired"));
    }

    let message =
      error.response?.data?.message || error.message || "Network error";
    handleStoreSelectionError(error);

    // Rewrite in place rather than toasting here too: nearly every call site already does its own
    // toast.error(err?.response?.data?.message || "..."), so a separate toast here was showing this
    // error TWICE (the raw backend message, then this friendlier one). Mutating the message means
    // whichever call site's own toast fires shows the friendly text exactly once; call sites that
    // stay silent on error are unaffected, same as before this existed.
    if (error.response?.status === 422 && message === SELECT_STORE_MESSAGE) {
      message = "Select a store before creating data.";
      if (error.response?.data) {
        error.response.data.message = message;
      }
    } else if (
      error.response?.status === 422
      && typeof message === "string"
      && message.startsWith(NO_STORES_MESSAGE)
    ) {
      // Matched on the prefix so the em dash and the exact trailing wording can change server-side
      // without silently falling back to a raw API error here, which is how this case was missed in
      // the first place -- only the select-a-store text was ever handled.
      if (error.response?.data) {
        error.response.data.message = message;
      }
    }

    console.error("[API Error]", message, error.response?.status);
    return Promise.reject(error);
  }
);

export default api;
