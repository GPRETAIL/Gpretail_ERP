import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios";
import { clearRuntimeRoutingConfig, fetchAndApplyRuntimeRoutingConfig } from "../api/runtimeRouting";

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await api.post("/auth/login", credentials);
      const token = res.data?.data?.token;
      const user = res.data?.data?.user;

      if (!token || !user) {
        return rejectWithValue("Invalid login response from server");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      await fetchAndApplyRuntimeRoutingConfig({ apiClient: api, token, user });
      return { token, user };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

// VX-Admin (SaaS control plane) login — completely separate auth from tenant identity.
// Same response shape as /auth/login, so the fulfilled handling mirrors loginUser.
export const platformLoginUser = createAsyncThunk(
  "auth/platformLoginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await api.post("/admin-auth/login", credentials);
      const token = res.data?.data?.token;
      const user = res.data?.data?.user;

      if (!token || !user) {
        return rejectWithValue("Invalid login response from server");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      return { token, user };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

export const logoutUser = createAsyncThunk("/auth/logoutUser", async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // Best effort only.
  }
  clearRuntimeRoutingConfig();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
});

const initialState = {
  token: localStorage.getItem("token") || null,
  user: (() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })(),

  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem("token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.token = action.payload?.token || null;
      state.user = action.payload?.user || action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      if (state.token) localStorage.setItem("token", state.token);
      if (state.user) localStorage.setItem("user", JSON.stringify(state.user));
    },
    logout: (state) => {
      clearRuntimeRoutingConfig();
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
      })
      .addCase(platformLoginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(platformLoginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(platformLoginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
