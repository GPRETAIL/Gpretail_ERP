import { describe, expect, it } from "vitest";
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
});
