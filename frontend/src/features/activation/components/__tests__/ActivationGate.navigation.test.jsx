import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, expect, it, vi } from "vitest";
import ActivationGate from "@/features/activation/components/ActivationGate";
import authReducer from "@/features/auth/authSlice";

vi.mock("@/features/activation/ActivationWizard", () => ({ default: ({ onCancel }) => <div>Activation form<button onClick={onCancel}>Return to login</button></div> }));

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

it("remembers login entry when an old activation cache briefly redirects the saved session", async () => {
  window.history.replaceState({}, "", "/login");
  localStorage.setItem("vx_activated", "1");
  let finish;
  const fetchStatus = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal("fetch", fetchStatus);
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { isAuthenticated: true, token: "legacy-token", user: { id: 1 } } } });
  render(<Provider store={store}><ActivationGate><div>Login page</div></ActivationGate></Provider>);
  await waitFor(() => expect(fetchStatus).toHaveBeenCalled());
  window.history.replaceState({}, "", "/dashboard");
  await act(async () => finish({ ok: true, json: async () => ({ data: { activated: false } }) }));
  expect(store.getState().auth.isAuthenticated).toBe(false);
  expect(screen.queryByText("Activation form")).not.toBeInTheDocument();
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

it("lets an on-prem counter reach sign-in through its cloud while the on-prem server is down", async () => {
  window.history.replaceState({}, "", "/login");
  localStorage.setItem("erp_onprem_cloud_api", "https://cloud.example/api");
  const fetch = vi.fn(async (url) => {
    if (String(url).startsWith("/api/")) throw new TypeError("Failed to fetch");
    return { ok: true, status: 200, json: async () => ({ data: { activated: true } }) };
  });
  vi.stubGlobal("fetch", fetch);
  const store = configureStore({ reducer: { auth: authReducer } });
  render(<Provider store={store}><ActivationGate><div>Login page</div></ActivationGate></Provider>);
  expect(await screen.findByText("Login page")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("https://cloud.example/api/activation/status", expect.anything());
  expect(screen.queryByText("Cannot verify activation")).not.toBeInTheDocument();
});

it("sets up a fresh on-prem server from its cloud: store choice, then sign-in", async () => {
  window.history.replaceState({}, "", "/login");
  let activated = false;
  const bootstrap = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ code: "CHOOSE_STORE", stores: [{ code: "C1", name: "Coffee 1" }, { code: "C2", name: "Coffee 2" }] }) })
    .mockImplementationOnce(async () => { activated = true; return { ok: true, status: 200, json: async () => ({ message: "This server is set up. 4 staff account(s) copied. Sign in with your cloud account." }) }; });
  vi.stubGlobal("fetch", vi.fn(async (url, options) => (String(url).endsWith("/local-server-config/bootstrap")
    ? bootstrap(url, options)
    : { ok: true, status: 200, json: async () => ({ data: activated ? { activated: true } : { activated: false, on_prem: true, cloud: "https://dev.gpsoftware.in" } }) })));
  const store = configureStore({ reducer: { auth: authReducer } });
  render(<Provider store={store}><ActivationGate><div>Login page</div></ActivationGate></Provider>);

  expect(await screen.findByRole("heading", { name: "Connect to cloud" })).toBeInTheDocument();
  expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Cloud")).toHaveValue("https://dev.gpsoftware.in");
  fireEvent.change(screen.getByLabelText(/Cloud admin username/), { target: { value: "owner" } });
  fireEvent.change(screen.getByLabelText(/Cloud admin password/), { target: { value: "pass" } });
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));

  fireEvent.mouseDown(await screen.findByLabelText(/Store this server runs/));
  fireEvent.click(await screen.findByRole("option", { name: "Coffee 2 (C2)" }));
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));

  expect(await screen.findByText(/4 staff account\(s\) copied/)).toBeInTheDocument();
  expect(JSON.parse(bootstrap.mock.calls[1][1].body)).toMatchObject({ username: "owner", password: "pass", store_code: "C2", counter_url: window.location.origin });
  fireEvent.click(screen.getByRole("button", { name: "Go to sign in" }));
  expect(await screen.findByText("Login page")).toBeInTheDocument();
});

it("shows the cloud's refusal on the on-prem setup screen", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url) => (String(url).endsWith("/local-server-config/bootstrap")
    ? { ok: false, status: 422, json: async () => ({ errors: { username: ["Cloud sign-in failed: wrong username or password."] } }) }
    : { ok: true, status: 200, json: async () => ({ data: { activated: false, on_prem: true, cloud: "https://dev.gpsoftware.in" } }) })));
  const store = configureStore({ reducer: { auth: authReducer } });
  render(<Provider store={store}><ActivationGate><div>Login page</div></ActivationGate></Provider>);
  fireEvent.change(await screen.findByLabelText(/Cloud admin username/), { target: { value: "owner" } });
  fireEvent.change(screen.getByLabelText(/Cloud admin password/), { target: { value: "bad" } });
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));
  expect(await screen.findByText("Cloud sign-in failed: wrong username or password.")).toBeInTheDocument();
});
