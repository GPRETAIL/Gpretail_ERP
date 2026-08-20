import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import authReducer from "../../features/authSlice";

/**
 * Guard coverage for the "unbuilt vs unauthorized" fix in ProtectedRoute.jsx.
 *
 * ProtectedRoute redirects home when canAccessPath denies a path — but only when that path is a
 * REAL, registered route. A path that maps to no route (unbuilt/mistyped) must fall through to the
 * ComingSoon catch-all instead of bouncing. This must hold for both access modes: RBAC
 * (getCapability) and page-permission mode.
 *
 * ProtectedRoute imports the full route table (via isRegisteredProtectedPath), which pulls in every
 * page module, so api/axios and react-toastify are mocked exactly as
 * protectedLayoutRoutes.catchAll.test.jsx / masterForms.render.test.jsx do.
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

import ProtectedRoute from "../ProtectedRoute";

// Stands in for the layout's ComingSoon catch-all: whatever <Outlet/> resolves to for a path with
// no registered route. Renders the live pathname so we can assert we stayed on the unbuilt path.
const ComingSoonProbe = () => {
  const { pathname } = useLocation();
  return (
    <div>
      <span>COMINGSOON</span>
      <span>{pathname}</span>
    </div>
  );
};

// Renders the real ProtectedRoute as a layout guard. Its child catch-all is the ComingSoon probe.
// The home destinations live OUTSIDE the guard (and are more specific than the guard's "*"), so a
// bounce lands on a distinct sentinel instead of being re-swallowed by the guard.
const renderGuarded = (path, user) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { token: "test-token", user, isAuthenticated: true, loading: false, error: null },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="*" element={<ComingSoonProbe />} />
          </Route>
          <Route path="/dashboard" element={<div>BOUNCED:/dashboard</div>} />
          <Route path="/sales/pos-sales" element={<div>BOUNCED:/sales/pos-sales</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

// RBAC user entitled to Sales only (canSales true, canFinance/canWarehouse/... false).
const SALES_ONLY_USER = { role: "user", access_roles: ["sales"] };

// Page-permission user: role "user" carrying an explicit page grant (POS Sales, view). This flips
// accessControl into hasPagePermissionMode.
const PAGE_PERMISSION_USER = {
  role: "user",
  page_permissions: { "/sales/pos-sales": { view: true, add: false, edit: false, delete: false } },
};

describe("ProtectedRoute — unbuilt vs unauthorized (RBAC mode)", () => {
  it("(a) renders ComingSoon (does NOT bounce) for an unbuilt path, even under a non-entitled module", () => {
    // /finance/* is not entitled for a sales-only user AND this exact path has no registered route.
    // "Unbuilt" must win: no real finance page exists here, so show ComingSoon, do not bounce.
    renderGuarded("/finance/definitely-not-a-real-page", SALES_ONLY_USER);

    expect(screen.getByText("COMINGSOON")).toBeInTheDocument();
    expect(screen.getByText("/finance/definitely-not-a-real-page")).toBeInTheDocument();
    expect(screen.queryByText("BOUNCED:/dashboard")).not.toBeInTheDocument();
  });

  it("(b) renders ComingSoon for an unbuilt subpath of an ENTITLED module", () => {
    renderGuarded("/sales/definitely-not-a-real-page", SALES_ONLY_USER);

    expect(screen.getByText("COMINGSOON")).toBeInTheDocument();
    expect(screen.getByText("/sales/definitely-not-a-real-page")).toBeInTheDocument();
    expect(screen.queryByText("BOUNCED:/dashboard")).not.toBeInTheDocument();
  });

  it("(c) still bounces home for a REAL registered page the user is NOT entitled to", () => {
    // /finance/supplier-payment IS a registered route; a sales-only user must be denied it.
    renderGuarded("/finance/supplier-payment", SALES_ONLY_USER);

    expect(screen.getByText("BOUNCED:/dashboard")).toBeInTheDocument();
    expect(screen.queryByText("COMINGSOON")).not.toBeInTheDocument();
  });
});

describe("ProtectedRoute — unbuilt vs unauthorized (page-permission mode)", () => {
  it("(d1) renders ComingSoon for an unbuilt path", () => {
    renderGuarded("/sales/definitely-not-a-real-page", PAGE_PERMISSION_USER);

    expect(screen.getByText("COMINGSOON")).toBeInTheDocument();
    expect(screen.getByText("/sales/definitely-not-a-real-page")).toBeInTheDocument();
    expect(screen.queryByText("BOUNCED:/sales/pos-sales")).not.toBeInTheDocument();
  });

  it("(d2) still bounces home for a REAL registered page they lack permission for", () => {
    // Granted only /sales/pos-sales; /finance/supplier-payment is a real route they cannot read.
    renderGuarded("/finance/supplier-payment", PAGE_PERMISSION_USER);

    // Home for this page-permission user resolves to their single granted page.
    expect(screen.getByText("BOUNCED:/sales/pos-sales")).toBeInTheDocument();
    expect(screen.queryByText("COMINGSOON")).not.toBeInTheDocument();
  });
});
