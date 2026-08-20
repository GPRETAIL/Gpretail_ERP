import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import authReducer from "../../../features/authSlice";
import { ThemeContext } from "../../../features/theme-context";
import Branding from "../Branding";

const mockPut = vi.fn(() => Promise.resolve({ data: { data: {} } }));
vi.mock("../../../api/axios", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: (...args) => mockPut(...args),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn(), warning: vi.fn() },
}));

// checkAuth independently round-trips /auth/me -- out of scope here, mocked wholesale so this
// file only asserts that Branding.jsx calls it after a successful save/reset.
const mockCheckAuth = vi.fn(async () => {});
vi.mock("../../../utils/checkAuth", () => ({ default: (...args) => mockCheckAuth(...args) }));

const renderBranding = (user) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { token: "t", user, isAuthenticated: true, loading: false, error: null },
    },
  });
  return render(
    <Provider store={store}>
      <ThemeContext.Provider value={{ theme: "light", setTheme: () => {} }}>
        <Branding />
      </ThemeContext.Provider>
    </Provider>
  );
};

const brandedUser = {
  company_id: 1,
  brand: { primary_color: "#111111", secondary_color: "#222222", border_radius: 8 },
};

describe("Branding settings page", () => {
  it("shows the tenant's saved brand colors and radius as the initial form values", () => {
    renderBranding(brandedUser);

    expect(screen.getByLabelText("Primary color hex")).toHaveValue("#111111");
    expect(screen.getByLabelText("Secondary color hex")).toHaveValue("#222222");
    expect(screen.getByLabelText("Corner radius value")).toHaveValue(8);
  });

  it("falls back to the default brand values when the tenant has none set", () => {
    renderBranding({ company_id: 1 });

    expect(screen.getByLabelText("Primary color hex")).toHaveValue("#3a6ea5");
    expect(screen.getByLabelText("Secondary color hex")).toHaveValue("#10b981");
    expect(screen.getByLabelText("Corner radius value")).toHaveValue(12);
  });

  it("flags an invalid hex color and disables Save until it's fixed", () => {
    renderBranding(brandedUser);
    const primaryField = screen.getByLabelText("Primary color hex");

    fireEvent.change(primaryField, { target: { value: "notacolor" } });
    expect(screen.getByText(/enter a valid hex color/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();

    fireEvent.change(primaryField, { target: { value: "#654321" } });
    expect(screen.queryByText(/enter a valid hex color/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
  });

  it("saves the edited colors to the dedicated theme endpoint and refreshes the live app theme", async () => {
    renderBranding(brandedUser);

    fireEvent.change(screen.getByLabelText("Primary color hex"), { target: { value: "#654321" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    const [url, body] = mockPut.mock.calls[0];
    // A dedicated theme-only endpoint, not the general PUT /companies/{id} -- that one requires an
    // admin email (from the body or an existing admin-role user row), which a branding-only save
    // has no reason to satisfy. See CompanyService.updateTheme.
    expect(url).toBe("/companies/1/theme");
    expect(body).toEqual({
      primary_color: "#654321",
      secondary_color: "#222222",
      border_radius: 8,
    });
    await waitFor(() => expect(mockCheckAuth).toHaveBeenCalledTimes(1));
  });

  it("resets to default by sending an empty theme object, after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderBranding(brandedUser);

    fireEvent.click(screen.getByRole("button", { name: /reset to default/i }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    const [url, body] = mockPut.mock.calls[0];
    expect(url).toBe("/companies/1/theme");
    expect(body).toEqual({});
    await waitFor(() => expect(mockCheckAuth).toHaveBeenCalledTimes(1));

    confirmSpy.mockRestore();
  });

  it("does not save when the reset confirmation is declined", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderBranding(brandedUser);

    fireEvent.click(screen.getByRole("button", { name: /reset to default/i }));

    expect(mockPut).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("shows an unsaved-changes banner only once a field has been edited", () => {
    renderBranding(brandedUser);

    expect(screen.queryByText(/unsaved branding changes/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Primary color hex"), { target: { value: "#654321" } });
    expect(screen.getByText(/unsaved branding changes/i)).toBeInTheDocument();
  });
});
