import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import authReducer from "../../../features/authSlice";
import { ThemeContext } from "../../../features/theme-context";
import Themes from "../Themes";

const mockPut = vi.fn(() => Promise.resolve({ data: { data: {} } }));
const mockPost = vi.fn(() => Promise.resolve({ data: { data: {} } }));
const mockDelete = vi.fn(() => Promise.resolve({ data: {} }));
// Defaults to an empty presets list -- most tests don't care about it; the ones that do override
// this per-test with mockGet.mockResolvedValueOnce(...) rather than every other test needing to
// know about the presets endpoint at all.
const mockGet = vi.fn(() => Promise.resolve({ data: { data: [] } }));
vi.mock("../../../api/axios", () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    put: (...args) => mockPut(...args),
    delete: (...args) => mockDelete(...args),
  },
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn(), warning: vi.fn() },
}));

// checkAuth independently round-trips /auth/me -- out of scope here, mocked wholesale so this
// file only asserts that Themes.jsx calls it after a successful save/reset.
const mockCheckAuth = vi.fn(async () => {});
vi.mock("../../../utils/checkAuth", () => ({ default: (...args) => mockCheckAuth(...args) }));

const renderThemes = (user) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { token: "t", user, isAuthenticated: true, loading: false, error: null },
    },
  });
  return render(
    <Provider store={store}>
      <ThemeContext.Provider value={{ theme: "light", setTheme: () => {} }}>
        <Themes />
      </ThemeContext.Provider>
    </Provider>
  );
};

const brandedUser = {
  company_id: 1,
  brand: { primary_color: "#111111", secondary_color: "#222222", border_radius: 8 },
};

describe("Themes settings page", () => {
  it("shows the tenant's saved brand colors and radius as the initial form values", () => {
    renderThemes(brandedUser);

    expect(screen.getByLabelText("Primary color hex")).toHaveValue("#111111");
    expect(screen.getByLabelText("Secondary color hex")).toHaveValue("#222222");
    expect(screen.getByLabelText("Corner radius value")).toHaveValue(8);
  });

  it("falls back to the default brand values when the tenant has none set", () => {
    renderThemes({ company_id: 1 });

    expect(screen.getByLabelText("Primary color hex")).toHaveValue("#3a6ea5");
    expect(screen.getByLabelText("Secondary color hex")).toHaveValue("#10b981");
    expect(screen.getByLabelText("Corner radius value")).toHaveValue(12);
  });

  it("flags an invalid hex color and disables Save until it's fixed", () => {
    renderThemes(brandedUser);
    const primaryField = screen.getByLabelText("Primary color hex");

    fireEvent.change(primaryField, { target: { value: "notacolor" } });
    expect(screen.getByText(/enter a valid hex color/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();

    fireEvent.change(primaryField, { target: { value: "#654321" } });
    expect(screen.queryByText(/enter a valid hex color/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled();
  });

  it("saves the edited colors to the dedicated theme endpoint and refreshes the live app theme", async () => {
    renderThemes(brandedUser);

    fireEvent.change(screen.getByLabelText("Primary color hex"), { target: { value: "#654321" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    const [url, body] = mockPut.mock.calls[0];
    // A dedicated theme-only endpoint, not the general PUT /companies/{id} -- that one requires an
    // admin email (from the body or an existing admin-role user row), which a branding-only save
    // has no reason to satisfy. See SettingsController::updateTheme.
    expect(url).toBe("/companies/1/theme");
    expect(body).toEqual({
      primary_color: "#654321",
      secondary_color: "#222222",
      border_radius: 8,
      theme_style: "classic",
      font_family: "system",
      background_color: null,
      text_color: null,
      success_color: null,
      warning_color: null,
      error_color: null,
    });
    await waitFor(() => expect(mockCheckAuth).toHaveBeenCalledTimes(1));
  });

  it("resets to default by sending an empty theme object, after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderThemes(brandedUser);

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
    renderThemes(brandedUser);

    fireEvent.click(screen.getByRole("button", { name: /reset to default/i }));

    expect(mockPut).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("shows an unsaved-changes banner only once a field has been edited", () => {
    renderThemes(brandedUser);

    expect(screen.queryByText(/unsaved branding changes/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Primary color hex"), { target: { value: "#654321" } });
    expect(screen.getByText(/unsaved branding changes/i)).toBeInTheDocument();
  });

  describe("theme style picker", () => {
    it("defaults to Classic when the tenant has no style saved", () => {
      renderThemes(brandedUser);

      expect(screen.getByRole("button", { name: /classic/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /apple/i })).toHaveAttribute("aria-pressed", "false");
    });

    it("shows the tenant's saved style as selected", () => {
      renderThemes({ company_id: 1, brand: { theme_style: "glass" } });

      expect(screen.getByRole("button", { name: /liquid glass/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /classic/i })).toHaveAttribute("aria-pressed", "false");
    });

    it("selecting a style marks it pressed, shows unsaved changes, and includes it on Save", async () => {
      renderThemes(brandedUser);

      fireEvent.click(screen.getByRole("button", { name: /apple/i }));

      expect(screen.getByRole("button", { name: /apple/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText(/unsaved branding changes/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
      const [, body] = mockPut.mock.calls[0];
      expect(body).toMatchObject({ theme_style: "apple" });
    });
  });

  describe("advanced colors", () => {
    it("starts blank when the tenant hasn't set any", () => {
      renderThemes(brandedUser);

      expect(screen.getByLabelText("Background color hex")).toHaveValue("");
      expect(screen.getByLabelText("Success color hex")).toHaveValue("");
    });

    it("shows the tenant's saved advanced colors", () => {
      renderThemes({ company_id: 1, brand: { success_color: "#16a34a" } });

      expect(screen.getByLabelText("Success color hex")).toHaveValue("#16a34a");
    });

    it("flags an invalid value but allows an empty one", () => {
      renderThemes(brandedUser);
      const errorField = screen.getByLabelText("Error color hex");

      fireEvent.change(errorField, { target: { value: "notacolor" } });
      expect(screen.getByText(/enter a valid hex color/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();

      fireEvent.change(errorField, { target: { value: "" } });
      expect(screen.queryByText(/enter a valid hex color/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled();
    });

    it("Clear resets a set field to blank and re-enables Save", () => {
      renderThemes({ company_id: 1, brand: { warning_color: "#ca8a04" } });

      fireEvent.click(screen.getByRole("button", { name: /clear/i }));

      expect(screen.getByLabelText("Warning color hex")).toHaveValue("");
    });

    it("sends set colors as their hex value and untouched ones as null, not empty string", async () => {
      renderThemes(brandedUser);

      fireEvent.change(screen.getByLabelText("Background color hex"), { target: { value: "#111827" } });
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
      const [, body] = mockPut.mock.calls[0];
      expect(body).toMatchObject({
        background_color: "#111827",
        text_color: null,
        success_color: null,
        warning_color: null,
        error_color: null,
      });
    });
  });

  describe("font picker", () => {
    it("defaults to System Default when the tenant has none saved", () => {
      renderThemes(brandedUser);

      expect(screen.getByRole("button", { name: /system default/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /^inter\b/i })).toHaveAttribute("aria-pressed", "false");
    });

    it("shows the tenant's saved font as selected", () => {
      renderThemes({ company_id: 1, brand: { font_family: "poppins" } });

      expect(screen.getByRole("button", { name: /poppins/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /system default/i })).toHaveAttribute("aria-pressed", "false");
    });

    it("selecting a font marks it pressed, shows unsaved changes, and includes it on Save", async () => {
      renderThemes(brandedUser);

      fireEvent.click(screen.getByRole("button", { name: /^inter\b/i }));

      expect(screen.getByRole("button", { name: /^inter\b/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText(/unsaved branding changes/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
      const [, body] = mockPut.mock.calls[0];
      expect(body).toMatchObject({ font_family: "inter" });
    });
  });

  describe("saved presets", () => {
    const samplePresets = [
      { id: 1, name: "Diwali Sale", config: { primary_color: "#f97316" } },
      { id: 2, name: "Ocean", config: { primary_color: "#0284c7", theme_style: "apple" } },
    ];

    it("shows an empty state when the tenant has none saved", async () => {
      renderThemes(brandedUser);

      expect(await screen.findByText(/no saved presets yet/i)).toBeInTheDocument();
    });

    it("lists saved presets once loaded", async () => {
      mockGet.mockResolvedValueOnce({ data: { data: samplePresets } });
      renderThemes(brandedUser);

      expect(await screen.findByText("Diwali Sale")).toBeInTheDocument();
      expect(screen.getByText("Ocean")).toBeInTheDocument();
    });

    it("blocks opening the save dialog while a field is invalid", async () => {
      renderThemes(brandedUser);
      await screen.findByText(/no saved presets yet/i);

      fireEvent.change(screen.getByLabelText("Primary color hex"), { target: { value: "notacolor" } });
      fireEvent.click(screen.getByRole("button", { name: /save current/i }));

      expect(screen.queryByText("Save Current Theme As...")).not.toBeInTheDocument();
    });

    it("saves the current theme as a new named preset", async () => {
      renderThemes(brandedUser);
      await screen.findByText(/no saved presets yet/i);

      fireEvent.click(screen.getByRole("button", { name: /save current/i }));
      fireEvent.change(screen.getByLabelText("Preset name"), { target: { value: "Diwali Sale" } });
      // The page's own Save button stays mounted behind the MUI dialog, so scope to the dialog --
      // both it and the dialog's own action are named exactly "Save".
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^save$/i }));

      await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
      const [url, body] = mockPost.mock.calls[0];
      expect(url).toBe("/companies/1/theme-presets");
      expect(body).toMatchObject({ name: "Diwali Sale", primary_color: "#111111" });
      await waitFor(() => expect(screen.queryByText("Save Current Theme As...")).not.toBeInTheDocument());
    });

    it("requires a name before saving a preset", async () => {
      renderThemes(brandedUser);
      await screen.findByText(/no saved presets yet/i);

      fireEvent.click(screen.getByRole("button", { name: /save current/i }));
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^save$/i }));

      expect(mockPost).not.toHaveBeenCalled();
    });

    it("applying a preset calls the apply endpoint, updates the form, and refreshes the live theme", async () => {
      mockGet.mockResolvedValueOnce({ data: { data: samplePresets } });
      renderThemes(brandedUser);
      await screen.findByText("Ocean");

      fireEvent.click(screen.getAllByRole("button", { name: /^apply$/i })[1]); // Ocean is the 2nd row

      await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/companies/1/theme-presets/2/apply"));
      await waitFor(() => expect(screen.getByLabelText("Primary color hex")).toHaveValue("#0284c7"));
      expect(screen.getByRole("button", { name: /apple/i })).toHaveAttribute("aria-pressed", "true");
      await waitFor(() => expect(mockCheckAuth).toHaveBeenCalledTimes(1));
    });

    it("deletes a preset after confirmation", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      mockGet.mockResolvedValueOnce({ data: { data: samplePresets } });
      renderThemes(brandedUser);
      await screen.findByText("Diwali Sale");

      fireEvent.click(screen.getByRole("button", { name: /delete diwali sale/i }));

      await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("/companies/1/theme-presets/1"));
      confirmSpy.mockRestore();
    });

    it("does not delete when the confirmation is declined", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      mockGet.mockResolvedValueOnce({ data: { data: samplePresets } });
      renderThemes(brandedUser);
      await screen.findByText("Diwali Sale");

      fireEvent.click(screen.getByRole("button", { name: /delete diwali sale/i }));

      expect(mockDelete).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });
});
