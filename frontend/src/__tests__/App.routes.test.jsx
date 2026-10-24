import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import authReducer, { logout } from "../features/authSlice";
import checkAuth from "../utils/checkAuth";

/**
 * Route-shape coverage for App.jsx.
 *
 * MainLayout renders its own DESCENDANT <Routes> (ProtectedLayoutRouteRenderer). React Router keeps
 * a parent route matched as the URL goes deeper only when that parent's path ends in "*", and it
 * warns on every page load otherwise:
 *
 *   "You rendered descendant <Routes> (or called `useRoutes()`) at "/" (under <Route path="">) but
 *    the parent route path has no trailing "*"."
 *
 * These tests pin the fix: one splat route mounts the guarded layout, and the public routes
 * (/login, /register, /activate, /set-password) plus "/" still outrank that splat.
 */

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn(), warning: vi.fn() },
}));

// AuthInitializer blocks on checkAuth() before it renders the route tree. The store below already
// carries the auth state under test, so the round-trip is not wanted here.
vi.mock("../utils/checkAuth", () => ({ default: vi.fn(async () => {}) }));

// The guard's own allow/bounce logic is covered by ProtectedRoute.access.test.jsx; here it is a
// transparent pass-through so these tests isolate the route SHAPE.
vi.mock("../components/ProtectedRoute", async () => {
  const { Outlet } = await import("react-router-dom");
  const { createElement } = await import("react");
  return { default: () => createElement(Outlet) };
});

// Stand-in for MainLayout. The property that matters is that it renders a DESCENDANT <Routes>,
// exactly as the real layout does through ProtectedLayoutRouteRenderer — that is what makes React
// Router check the parent route for a trailing splat. It also reports the live pathname, so these
// tests can assert which branch matched.
vi.mock("../components/MainLayout", async () => {
  const { Routes, Route, useLocation } = await import("react-router-dom");
  const { createElement } = await import("react");
  const LayoutProbe = () => {
    const { pathname } = useLocation();
    return createElement("div", null, `LAYOUT@${pathname}`);
  };
  return {
    default: () =>
      createElement(
        Routes,
        null,
        createElement(Route, { path: "*", element: createElement(LayoutProbe) })
      ),
  };
});

import App from "../App";

vi.mock("../mobile/MobileAppV2", async () => {
  const { useLocation } = await import("react-router-dom");
  const { createElement } = await import("react");
  const MobileWorkspaceProbe = () => { const location = useLocation(); return createElement("div", null, `MOBILE@${location.pathname}${location.search}`); };
  return { default: MobileWorkspaceProbe };
});

const AUTHED_USER = { role: "super_admin", access_roles: [] };

const renderApp = (path, { authenticated = true, user = AUTHED_USER } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        token: authenticated ? "test-token" : null,
        user: authenticated ? user : null,
        isAuthenticated: authenticated,
        loading: false,
        error: null,
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>
  );
};

let warnSpy;
let errorSpy;

beforeEach(() => {
  // Short-circuits ActivationGate's /api/activation/status probe so the route tree mounts at once.
  localStorage.setItem("vx_activated", "1");
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const consoleOutput = () =>
  [...warnSpy.mock.calls, ...errorSpy.mock.calls].map((args) => args.join(" ")).join("\n");

describe("App route shape", () => {
  it.each(["/notifications", "/notifications?tab=preferences", "/store-activation", "/profile"])("keeps %s inside the ERP layout", async path => {
    renderApp(path);
    expect(await screen.findByText(`LAYOUT@${path.split("?")[0]}`)).toBeInTheDocument();
    expect(screen.queryByText("Return to ERP")).not.toBeInTheDocument();
  });

  it("opens a mobile-only push notification in the mobile workspace", async () => {
    renderApp("/notifications", { user: { ...AUTHED_USER, web_access: false } });
    expect(await screen.findByText("MOBILE@/app?notifications=1")).toBeInTheDocument();
    expect(screen.queryByText(/^LAYOUT@/)).not.toBeInTheDocument();
  });
  it("validates an old session before an unactivated deployment can block the login route", async () => {
    localStorage.removeItem("vx_activated");
    localStorage.setItem("token", "expired-token");
    vi.mocked(checkAuth).mockImplementationOnce(async dispatch => { dispatch(logout()); });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { activated: false } }) }));
    renderApp("/login");
    expect(await screen.findByRole("heading", { name: "Welcome back", exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Activate this deployment" })).not.toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
  // React Router emits this one through `warningOnce`, keyed by the parent pathname, so only the
  // FIRST render in this module can ever observe it — keep the console assertion in this first
  // test and do not rely on later tests to catch a regression.
  it("mounts the guarded layout without React Router's descendant-<Routes> warning", async () => {
    renderApp("/dashboard");

    expect(await screen.findByText("LAYOUT@/dashboard")).toBeInTheDocument();
    expect(consoleOutput()).not.toMatch(/descendant <Routes>/);
  });

  it("keeps mounting the layout for an unbuilt path, so the ComingSoon catch-all can render", async () => {
    renderApp("/finance/definitely-not-a-real-page");

    expect(
      await screen.findByText("LAYOUT@/finance/definitely-not-a-real-page")
    ).toBeInTheDocument();
  });

  it('sends "/" to the home path instead of letting the layout swallow it', async () => {
    renderApp("/");

    expect(await screen.findByText("LAYOUT@/dashboard")).toBeInTheDocument();
  });

  it("still serves the public /login route rather than the splat layout", async () => {
    renderApp("/login", { authenticated: false });

    expect(await screen.findByRole("heading", { name: "Welcome back", exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/^LAYOUT@/)).not.toBeInTheDocument();
  });
});
