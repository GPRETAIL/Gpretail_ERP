import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../api/axios";
import authReducer, { loginUser } from "./authSlice";
import { fetchAndApplyRuntimeRoutingConfig } from "../api/runtimeRouting";

vi.mock("../api/axios", () => ({ default: { post: vi.fn() } }));
vi.mock("../api/runtimeRouting", () => ({ clearRuntimeRoutingConfig: vi.fn(), fetchAndApplyRuntimeRoutingConfig: vi.fn() }));
vi.mock("../utils/storeSelection", () => ({ initializeStoreSelection: vi.fn() }));
beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });

it("keeps company setup separate from authenticated sessions and persistent credentials", async () => {
  const setup = { activation_required: true, setup_token: "short-lived-setup", company_code: "CMP-FIRST" };
  localStorage.setItem("token", "stale-session");
  localStorage.setItem("user", JSON.stringify({ id: 99 }));
  sessionStorage.setItem("activeStoreId", "99");
  api.post.mockResolvedValue({ data: { data: setup } });
  const store = configureStore({ reducer: { auth: authReducer } });
  const response = await store.dispatch(loginUser({ email: "owner@example.test", password: "welcome" }));
  expect(response.payload).toEqual({ setup });
  expect(store.getState().auth.isAuthenticated).toBe(false);
  expect(store.getState().auth.user).toBeNull();
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
  expect(sessionStorage.getItem("activeStoreId")).toBeNull();
  expect(fetchAndApplyRuntimeRoutingConfig).not.toHaveBeenCalled();
});

it("continues normal local login when the ERP issues a real session", async () => {
  const user = { id: 1, email: "owner@example.test" };
  api.post.mockResolvedValue({ data: { data: { token: "erp-session", user } } });
  const store = configureStore({ reducer: { auth: authReducer } });
  await store.dispatch(loginUser({ email: user.email, password: "local" }));
  expect(store.getState().auth.isAuthenticated).toBe(true);
  expect(localStorage.getItem("token")).toBe("erp-session");
  expect(fetchAndApplyRuntimeRoutingConfig).toHaveBeenCalledTimes(1);
});
