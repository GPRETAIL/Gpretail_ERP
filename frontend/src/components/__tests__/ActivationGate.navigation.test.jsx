import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, expect, it, vi } from "vitest";
import ActivationGate from "../ActivationGate";
import authReducer from "../../features/authSlice";

vi.mock("../../pages/ActivationWizard", () => ({ default: ({ onCancel }) => <div>Activation form<button onClick={onCancel}>Return to login</button></div> }));

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("lets a signed-in user leave an unactivated installation and clears saved credentials", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { activated: false } }) }));
  localStorage.setItem("token", "old-session");
  localStorage.setItem("user", JSON.stringify({ id: 1 }));
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { isAuthenticated: true, token: "old-session", user: { id: 1 } } } });
  render(<Provider store={store}><ActivationGate><div>Login page</div></ActivationGate></Provider>);
  fireEvent.click(await screen.findByRole("button", { name: "Return to login" }));
  expect(store.getState().auth.isAuthenticated).toBe(false);
  expect(localStorage.getItem("token")).toBeNull();
  expect(await screen.findByText("Login page")).toBeInTheDocument();
});

it("shows login at the public login URL even with a saved legacy session", async () => {
  window.history.replaceState({}, "", "/login");
  localStorage.removeItem("vx_activated");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { activated: false } }) }));
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { isAuthenticated: true, token: "legacy-token", user: { id: 1 } } } });
  render(<Provider store={store}><ActivationGate><div>Login page</div></ActivationGate></Provider>);
  expect(await screen.findByText("Login page")).toBeInTheDocument();
  expect(screen.queryByText("Activation form")).not.toBeInTheDocument();
  expect(store.getState().auth.isAuthenticated).toBe(false);
});

it("moves between mobile and desktop gates without changing hook order", async () => {
  const fetchStatus = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { activated: true } }) });
  vi.stubGlobal("fetch", fetchStatus);
  const store = configureStore({ reducer: { auth: () => ({ isAuthenticated: true }) } });
  const content = <Provider store={store}><ActivationGate><div>ERP content</div></ActivationGate></Provider>;
  window.history.replaceState({}, "", "/app");
  const view = render(content);
  expect(screen.getByText("ERP content")).toBeInTheDocument();
  expect(fetchStatus).not.toHaveBeenCalled();
  window.history.replaceState({}, "", "/dashboard");
  view.rerender(<Provider store={store}><ActivationGate><div>ERP content</div></ActivationGate></Provider>);
  expect(await screen.findByText("ERP content")).toBeInTheDocument();
  expect(fetchStatus).toHaveBeenCalledTimes(1);
  window.history.replaceState({}, "", "/app");
  view.rerender(<Provider store={store}><ActivationGate><div>ERP content</div></ActivationGate></Provider>);
  expect(screen.getByText("ERP content")).toBeInTheDocument();
  expect(fetchStatus).toHaveBeenCalledTimes(1);
});
