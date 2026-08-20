import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import authReducer from "../../features/authSlice";

/**
 * Regression coverage for the "UX" fix in 62846bd: ~25 unbuilt (or mistyped) nav items across
 * Masters/Analytical/Finance/CRM/Settings used to silently bounce to /dashboard with no feedback,
 * which read as the app being broken. The catch-all `*` route in protectedLayoutRoutes.jsx now
 * renders <ComingSoon/> instead.
 *
 * Importing protectedLayoutRoutes.jsx pulls in every registered page module (Dashboard, POS,
 * warehouse, CRM, etc.) because the route table is a static list — none of them actually mount
 * unless their path matches, but their module-level imports still execute, so api/axios and
 * react-toastify are mocked the same way src/pages/master/__tests__/masterForms.render.test.jsx
 * does it, and a real authReducer store is provided (react-redux throws at render time otherwise).
 */

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
  },
}));

import { ProtectedLayoutRouteRenderer } from "../protectedLayoutRoutes";

// Mirrors how MainLayout.jsx wires this up: a real react-router location from useLocation() is
// handed to the renderer, which internally scopes <Routes location={location}>.
const LocationBridge = () => {
  const location = useLocation();
  return <ProtectedLayoutRouteRenderer location={location} />;
};

const renderAtPath = (path) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <LocationBridge />
      </MemoryRouter>
    </Provider>
  );
};

describe("ProtectedLayoutRouteRenderer catch-all", () => {
  it("renders ComingSoon (not a blank bounce) for an unbuilt/mistyped path", async () => {
    renderAtPath("/finance/definitely-not-a-real-page");

    expect(await screen.findByText("Coming soon")).toBeInTheDocument();
    expect(await screen.findByText("/finance/definitely-not-a-real-page")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Back to Dashboard/i })).toBeInTheDocument();
  });

  it("does not render ComingSoon for a path that IS registered", async () => {
    renderAtPath("/profile");

    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
  });
});
