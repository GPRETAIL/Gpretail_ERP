// src/utils/checkAuth.js
import { loginSuccess, logout } from "../features/authSlice";
import api from "../api/axios";
import { clearRuntimeRoutingConfig, fetchAndApplyRuntimeRoutingConfig } from "../api/runtimeRouting";

const checkAuth = async (dispatch) => {
  const token = localStorage.getItem("token");
  if (!token) {
    clearRuntimeRoutingConfig();
    dispatch(logout());
    return;
  }

  try {
    const res = await api.get("/auth/me");
    const user = res.data?.data;
    if (!user) throw new Error("Invalid auth response");
    dispatch(loginSuccess({ token, user }));
    fetchAndApplyRuntimeRoutingConfig({ apiClient: api, token, user }).catch(() => {});
  } catch {
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
