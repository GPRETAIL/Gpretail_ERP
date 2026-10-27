// src/utils/checkAuth.js
import { loginSuccess, logout } from "../features/authSlice";
import api from "../api/axios";
import { clearRuntimeRoutingConfig, fetchAndApplyRuntimeRoutingConfig } from "../api/runtimeRouting";

const checkAuth = async (dispatch) => {
  const token = localStorage.getItem("token");
  const storeScope = sessionStorage.getItem("activeStoreId");
  if (!token) {
    clearRuntimeRoutingConfig();
    dispatch(logout());
    return;
  }

  try {
    const res = await api.get("/auth/me");
    if (localStorage.getItem("token") !== token || sessionStorage.getItem("activeStoreId") !== storeScope) return;
    const user = res.data?.data;
    if (!user?.id) throw Object.assign(new Error("Invalid auth response"), { invalidAuthResponse: true });
    dispatch(loginSuccess({ token, user }));
    fetchAndApplyRuntimeRoutingConfig({ apiClient: api, token, user }).catch(() => {});
  } catch (error) {
    if (localStorage.getItem("token") !== token || sessionStorage.getItem("activeStoreId") !== storeScope) return;
    // An unavailable database/network is not proof that the session expired.
    // Server-side authorization remains mandatory on every business request.
    if (error?.response?.status !== 401 && !error?.invalidAuthResponse) return;
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {
      // no-op
    }
    clearRuntimeRoutingConfig();
    dispatch(logout());
  }
};

export default checkAuth;
