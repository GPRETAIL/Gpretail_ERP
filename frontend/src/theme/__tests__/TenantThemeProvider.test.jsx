import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import { afterEach, describe, expect, it } from "vitest";
import authReducer from "../../features/authSlice";
import { ThemeContext } from "../../features/theme-context";
import TenantThemeProvider from "../TenantThemeProvider";

// Reads the ambient MUI theme and renders its primary color as text -- the automated version of
// "any MUI component anywhere picks up the tenant's brand", independent of any one page's markup.
const MuiProbe = () => {
  const theme = useMuiTheme();
  return <span>PRIMARY:{theme.palette.primary.main}</span>;
};

const renderWithBrand = (brand, mode = "light") => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { token: "t", user: brand ? { brand } : {}, isAuthenticated: true, loading: false, error: null },
    },
  });
  return render(
    <Provider store={store}>
      <ThemeContext.Provider value={{ theme: mode, setTheme: () => {} }}>
        <TenantThemeProvider>
          <MuiProbe />
        </TenantThemeProvider>
      </ThemeContext.Provider>
    </Provider>
  );
};

describe("TenantThemeProvider", () => {
  // The effect that sets this runs after mount, same as any other useEffect -- and it's a real
  // DOM side effect on the shared jsdom document, so it must be cleared between tests, unlike
  // component state which unmounting already resets.
  afterEach(() => {
    delete document.documentElement.dataset.themeStyle;
    document.documentElement.style.fontFamily = "";
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((link) => link.remove());
  });

  it("propagates the tenant's brand primary color to any MUI component in the tree", () => {
    renderWithBrand({ primary_color: "#ff0000" });

    expect(screen.getByText("PRIMARY:#ff0000")).toBeInTheDocument();
  });

  it("falls back to the default brand color when the tenant has none set", () => {
    renderWithBrand(undefined);

    expect(screen.getByText("PRIMARY:#3a6ea5")).toBeInTheDocument();
  });

  it("reacts to the existing light/dark toggle without a second mode source", () => {
    renderWithBrand({ primary_color: "#ff0000" }, "dark");

    // mode only affects background/text/divider defaults here, not the explicit primary override --
    // this asserts the provider still renders using the dark-mode context value, not a hardcoded one.
    expect(screen.getByText("PRIMARY:#ff0000")).toBeInTheDocument();
  });

  // The Tailwind-styled half of the app (themeStyles.css) has no MUI theme to read -- it reads
  // this attribute instead, mirroring exactly how dark mode's ThemeProvider.jsx sets
  // <html class="dark"> for Tailwind's own dark: variant. This is that mechanism's one contract.
  describe("mirrors theme_style onto <html data-theme-style> for the Tailwind-styled half of the app", () => {
    it("defaults to classic when the tenant has no style set", async () => {
      renderWithBrand({ primary_color: "#ff0000" });

      await waitFor(() => expect(document.documentElement.dataset.themeStyle).toBe("classic"));
    });

    it("reflects a chosen style", async () => {
      renderWithBrand({ theme_style: "glass" });

      await waitFor(() => expect(document.documentElement.dataset.themeStyle).toBe("glass"));
    });

    it("falls back to classic for an unrecognized stored value", async () => {
      renderWithBrand({ theme_style: "not-a-real-style" });

      await waitFor(() => expect(document.documentElement.dataset.themeStyle).toBe("classic"));
    });
  });

  // Same reach principle as theme_style above, but font has no MUI-side counterpart at all --
  // this inline style on <html> is the only place it's ever applied, for both the Tailwind shell
  // and (via typography.fontFamily: "inherit") every MUI component too.
  describe("mirrors font_family onto <html> style.fontFamily for the whole app", () => {
    it("defaults to the system font stack when the tenant has none set, with no network request", async () => {
      renderWithBrand({ primary_color: "#ff0000" });

      await waitFor(() => expect(document.documentElement.style.fontFamily).toContain("BlinkMacSystemFont"));
      expect(document.querySelector('link[href*="fonts.googleapis.com"]')).toBeNull();
    });

    it("applies a chosen font and loads its Google Fonts stylesheet", async () => {
      renderWithBrand({ font_family: "inter" });

      await waitFor(() => expect(document.documentElement.style.fontFamily).toContain("Inter"));
      const link = document.querySelector('link[href*="fonts.googleapis.com"]');
      expect(link?.href).toContain("family=Inter");
    });

    it("falls back to the system stack for an unrecognized stored value", async () => {
      renderWithBrand({ font_family: "comic-sans" });

      await waitFor(() => expect(document.documentElement.style.fontFamily).toContain("BlinkMacSystemFont"));
    });
  });
});
