import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import authReducer from "../../../features/authSlice";

/**
 * Render/smoke tests for the Store Groups feature on the User Access page.
 *
 * Store Groups (which stores a user may work in) are a new, separate concept from the
 * page's existing Access Groups (what a user may do). These tests cover: the management
 * drawer mounting and listing groups, creating a group, and that the two features stay
 * visibly distinct (labelled "(which stores)" vs "(what they can do)") wherever they
 * appear together, per the disambiguation requirement for this feature.
 *
 * Harness copied from src/pages/master/__tests__/masterForms.render.test.jsx: a real
 * authReducer store (react-redux throws at render time if a connected component mounts
 * outside a <Provider>) wrapped in MemoryRouter, with the axios instance and toast mocked.
 */

const mockCompanies = [
  { id: 1, name: "GP1", entitlements: null },
  { id: 2, name: "GP2", entitlements: null },
];

const mockStoreGroups = [
  { id: 5, name: "South Region", is_active: true, storeCompanyIds: [1, 2], storeNames: ["GP1", "GP2"] },
];

const mockGet = vi.fn((url) => {
  if (url === "/user-access") {
    return Promise.resolve({
      data: {
        data: { users: [], groups: [] },
        meta: { companies: mockCompanies, roles: ["user", "admin"] },
      },
    });
  }
  if (url === "/user-access/store-groups") {
    return Promise.resolve({ data: { data: mockStoreGroups } });
  }
  return Promise.resolve({ data: { data: [] } });
});
const mockPost = vi.fn(() => Promise.resolve({ data: { data: {} } }));
const mockPut = vi.fn(() => Promise.resolve({ data: { data: {} } }));
const mockDelete = vi.fn(() => Promise.resolve({ data: {} }));

vi.mock("../../../api/axios", () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    put: (...args) => mockPut(...args),
    delete: (...args) => mockDelete(...args),
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

import { toast } from "react-toastify";
import UserAccess from "../UserAccess";

const renderUserAccess = (authUserOverrides = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        token: "test-token",
        user: { id: 10, role: "super_admin", company_id: null, name: "Owner", ...authUserOverrides },
        loading: false,
        error: null,
        isAuthenticated: true,
      },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/user-access/user"]}>
        <UserAccess />
      </MemoryRouter>
    </Provider>
  );
};

describe("UserAccess store groups", () => {
  it("mounts without crashing for a super_admin operator", async () => {
    expect(() => renderUserAccess()).not.toThrow();
    await screen.findByText("Users");
  });

  it("shows the Store Groups (which stores) button for a super_admin operator", async () => {
    renderUserAccess();
    await screen.findByText("Users");
    expect(screen.getByRole("button", { name: /Store Groups \(which stores\)/i })).toBeInTheDocument();
  });

  it("hides the Store Groups button for a non-super-admin (single-store) operator", async () => {
    renderUserAccess({ role: "admin", company_id: 1 });
    await screen.findByText("Users");
    expect(screen.queryByRole("button", { name: /Store Groups \(which stores\)/i })).not.toBeInTheDocument();
  });

  it("opens the Store Groups drawer and lists existing groups with their member store names", async () => {
    renderUserAccess();
    await screen.findByText("Users");

    fireEvent.click(screen.getByRole("button", { name: /Store Groups \(which stores\)/i }));

    expect(await screen.findByText("South Region")).toBeInTheDocument();
    expect(screen.getByText("GP1, GP2")).toBeInTheDocument();
  });

  it("creates a new store group with the selected stores", async () => {
    renderUserAccess();
    await screen.findByText("Users");

    fireEvent.click(screen.getByRole("button", { name: /Store Groups \(which stores\)/i }));
    await screen.findByText("South Region");

    fireEvent.click(screen.getByRole("button", { name: /New Store Group/i }));

    // The underlying User Access list also has a search textbox, so scope to the last
    // textbox in the DOM (the drawer is rendered after the list, as a page-level overlay).
    const textboxes = screen.getAllByRole("textbox");
    const nameInput = textboxes[textboxes.length - 1];
    fireEvent.change(nameInput, { target: { value: "North Region" } });

    fireEvent.click(screen.getByText("Select stores"));
    fireEvent.click(screen.getByRole("checkbox", { name: "GP1" }));

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/user-access/store-groups", {
        name: "North Region",
        storeCompanyIds: [1],
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Store group created");
    // Save succeeded, so the drawer should have returned to its list view.
    await waitFor(() => expect(screen.getByRole("button", { name: /New Store Group/i })).toBeInTheDocument());
  });

  it("labels the Store Group dropdown distinctly from the Access Group dropdown on the create-user form", async () => {
    renderUserAccess();
    await screen.findByText("Users");

    fireEvent.click(screen.getByRole("button", { name: "New" }));

    expect(await screen.findByText("Access Group (what they can do)")).toBeInTheDocument();
    expect(screen.getByText("Store Group (which stores)")).toBeInTheDocument();
  });
});
