import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, expect, it, vi } from "vitest";
import authReducer from "../../features/authSlice";
import MobileLoginScreen from "./MobileLoginScreen";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("../../api/axios", () => ({ default: { post } }));
vi.mock("../../api/runtimeRouting", () => ({
  clearRuntimeRoutingConfig: vi.fn(), fetchAndApplyRuntimeRoutingConfig: vi.fn(),
}));
vi.mock("../../components/GoogleSignInButton", () => ({
  default: ({ onCredential, disabled }) => <button disabled={disabled} onClick={() => onCredential("google-credential")}>Sign in with Google</button>,
}));

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
const show = (onLoginSuccess) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  render(<Provider store={store}><MobileLoginScreen onLoginSuccess={onLoginSuccess} /></Provider>);
  return store;
};

it("uses the shared Google authentication flow and opens mobile ERP on success", async () => {
  post.mockResolvedValue({ data: { data: { token: "session", user: { id: 3, role: "admin", store_ids: [] } } } });
  const onSuccess = vi.fn();
  const store = show(onSuccess);
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  expect(post).toHaveBeenCalledWith("/auth/google", { id_token: "google-credential" });
  expect(store.getState().auth.isAuthenticated).toBe(true);
  expect(screen.queryByText("admin / password")).not.toBeInTheDocument();
});

it("keeps the login open and displays the account restriction on Google rejection", async () => {
  post.mockRejectedValue({ response: { data: { message: "Your company ERP activation is not active." } } });
  const onSuccess = vi.fn();
  const store = show(onSuccess);
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
  expect(await screen.findByText("Your company ERP activation is not active.")).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
  expect(store.getState().auth.isAuthenticated).toBe(false);
});
