import { expect, it } from "vitest";
import { normalizeTheme, themeErrors, themePayload } from "../themeWorkspace";
import { createTenantTheme } from "../themeRegistry";

it("preserves legacy advanced colors in both modes until edited", () => {
  const theme = normalizeTheme({ theme_style: "apple", font_family: "playfair", text_color: "#123456" });
  expect(theme.light_colors.text_color).toBe("#123456");
  expect(theme.dark_colors.text_color).toBe("#123456");
  expect(theme.theme_style).toBe("apple");
  expect(theme.font_family).toBe("playfair");
});
it("accepts safe defaults and rejects low-contrast custom text", () => {
  expect(themeErrors(normalizeTheme({}))).toEqual([]);
  expect(themeErrors(normalizeTheme({ light_colors: { text_color: "#fff" } }))).toEqual([expect.stringContaining("4.5:1")]);
});
it("renders only the current mode's color overrides and opaque custom surfaces", () => {
  const brand = normalizeTheme({ light_colors: { surface_color: "#ffffff" }, dark_colors: { surface_color: "#101010", text_color: "#eeeeee" } });
  expect(createTenantTheme(brand, "light").palette.background.paper).toBe("#ffffff");
  const dark = createTenantTheme(brand, "dark");
  expect(dark.palette.background.paper).toBe("#101010");
  expect(dark.components.MuiMenu.styleOverrides.paper.backgroundColor).toBe("#101010");
  expect(dark.components.MuiOutlinedInput.styleOverrides.root.borderRadius).toBe("0.5rem");
  expect(themePayload({ ...brand, light_colors: { ...brand.light_colors, warning_color: "" } }).light_colors.warning_color).toBeUndefined();
});
