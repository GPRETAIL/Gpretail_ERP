import { describe, expect, it } from "vitest";
import { createTheme } from "@mui/material/styles";
import { createTenantTheme } from "../themeRegistry";

describe("createTenantTheme", () => {
  it("falls back to the default brand when no tenant theme is set", () => {
    const theme = createTenantTheme(undefined, "light");

    expect(theme.palette.primary.main).toBe("#3a6ea5");
    expect(theme.palette.secondary.main).toBe("#10b981");
    expect(theme.shape.borderRadius).toBe(12);
  });

  it("uses a valid hex primary/secondary color and border radius from the brand", () => {
    const theme = createTenantTheme(
      { primary_color: "#e11d48", secondary_color: "#0ea5e9", border_radius: 20 },
      "light"
    );

    expect(theme.palette.primary.main).toBe("#e11d48");
    expect(theme.palette.secondary.main).toBe("#0ea5e9");
    expect(theme.shape.borderRadius).toBe(20);
  });

  it("accepts 3-digit hex colors", () => {
    const theme = createTenantTheme({ primary_color: "#f0a" }, "light");

    expect(theme.palette.primary.main).toBe("#f0a");
  });

  it("falls back to the default primary color when given a non-hex value", () => {
    const theme = createTenantTheme({ primary_color: "not-a-color" }, "light");

    expect(theme.palette.primary.main).toBe("#3a6ea5");
  });

  it("falls back to the default border radius when given a non-numeric value", () => {
    const theme = createTenantTheme({ border_radius: "big" }, "light");

    expect(theme.shape.borderRadius).toBe(12);
  });

  it("respects the mode passed in", () => {
    const theme = createTenantTheme(undefined, "dark");

    expect(theme.palette.mode).toBe("dark");
  });

  describe("advanced color tokens", () => {
    it("leaves MUI's own defaults untouched when none are set", () => {
      const withTokens = createTenantTheme(undefined, "light");
      const bare = createTheme();

      expect(withTokens.palette.background.default).toBe(bare.palette.background.default);
      expect(withTokens.palette.text.primary).toBe(bare.palette.text.primary);
      expect(withTokens.palette.success.main).toBe(bare.palette.success.main);
    });

    it("applies each token independently when set", () => {
      const theme = createTenantTheme(
        {
          background_color: "#111827",
          text_color: "#f9fafb",
          success_color: "#16a34a",
          warning_color: "#ca8a04",
          error_color: "#b91c1c",
        },
        "light"
      );

      expect(theme.palette.background.default).toBe("#111827");
      expect(theme.palette.text.primary).toBe("#f9fafb");
      expect(theme.palette.success.main).toBe("#16a34a");
      expect(theme.palette.warning.main).toBe("#ca8a04");
      expect(theme.palette.error.main).toBe("#b91c1c");
    });

    it("ignores an invalid hex value for one token without affecting the others", () => {
      const theme = createTenantTheme({ background_color: "not-a-color", text_color: "#f9fafb" }, "light");
      const bare = createTheme();

      expect(theme.palette.background.default).toBe(bare.palette.background.default);
      expect(theme.palette.text.primary).toBe("#f9fafb");
    });

    it("a custom background.default coexists with glass's background.paper -- neither clobbers the other", () => {
      const theme = createTenantTheme({ theme_style: "glass", background_color: "#111827" }, "light");

      expect(theme.palette.background.default).toBe("#111827");
      expect(theme.palette.background.paper).toBe("rgba(255,255,255,0.6)");
    });
  });

  describe("theme_style", () => {
    it("defaults to classic -- no pill buttons, no backdrop blur", () => {
      const theme = createTenantTheme(undefined, "light");

      expect(theme.components.MuiButton?.styleOverrides?.root).toBeUndefined();
      expect(theme.components.MuiCard?.styleOverrides?.root?.backdropFilter).toBeUndefined();
    });

    it("falls back to classic for an unrecognized style value", () => {
      const theme = createTenantTheme({ theme_style: "enterprise" }, "light");

      expect(theme.components.MuiButton?.styleOverrides?.root).toBeUndefined();
    });

    it("apple gives MuiCard a soft shadow and MuiButton a pill radius", () => {
      const theme = createTenantTheme({ theme_style: "apple" }, "light");

      expect(theme.components.MuiButton.styleOverrides.root.borderRadius).toBe(999);
      expect(theme.components.MuiCard.styleOverrides.root.boxShadow).toContain("rgba(0,0,0,0.06)");
    });

    it("glass gives MuiCard a translucent, blurred background", () => {
      const theme = createTenantTheme({ theme_style: "glass" }, "light");

      expect(theme.components.MuiCard.styleOverrides.root.backdropFilter).toBe("blur(20px)");
      expect(theme.components.MuiCard.styleOverrides.root.backgroundColor).toBe("rgba(255,255,255,0.6)");
    });

    it("glass uses a darker translucent background in dark mode", () => {
      const theme = createTenantTheme({ theme_style: "glass" }, "dark");

      expect(theme.components.MuiCard.styleOverrides.root.backgroundColor).toBe("rgba(31,41,55,0.55)");
    });

    it("glass also tints palette.background.paper, not just component styleOverrides", () => {
      // Regression: a consumer using the idiomatic sx={{ bgcolor: "background.paper" }} (Navbar's
      // AppBar does) resolves straight to this palette value, bypassing a components.MuiAppBar
      // styleOverrides background entirely -- confirmed live, the AppBar blurred but stayed solid
      // white until this palette token carried the same tint the Card/Paper overrides use.
      const theme = createTenantTheme({ theme_style: "glass" }, "light");

      expect(theme.palette.background.paper).toBe("rgba(255,255,255,0.6)");
    });

    it("style is independent of color -- a custom primary color still applies under apple", () => {
      const theme = createTenantTheme({ theme_style: "apple", primary_color: "#e11d48" }, "light");

      expect(theme.palette.primary.main).toBe("#e11d48");
      expect(theme.components.MuiButton.styleOverrides.root.borderRadius).toBe(999);
    });
  });
});
