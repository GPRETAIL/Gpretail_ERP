import { getContrastRatio } from "@mui/material/styles";
import { DEFAULT_BRAND, DEFAULT_FONT, DEFAULT_THEME_STYLE, FONT_OPTIONS, THEME_STYLES, isHexColor } from "./themeRegistry";

export const COLOR_FIELDS = [
  ["background_color", "Background"], ["surface_color", "Surface"], ["text_color", "Text"],
  ["success_color", "Success"], ["warning_color", "Warning"], ["error_color", "Error"],
];
export const STYLE_OPTIONS = [
  ["classic", "Default", "Recommended for daily ERP work. Solid, restrained surfaces."],
  ["glass", "Liquid Glass", "Decorative glass panels with opaque controls and data."],
  ["glassmorphism", "Glassmorphism", "Soft violet panels with solid data surfaces."],
  ["liquid_ai", "Liquid AI", "Subtle purple and cyan accents."],
];

export function normalizeTheme(config = {}) {
  const legacy = Object.fromEntries(COLOR_FIELDS.filter(([key]) => isHexColor(config[key])).map(([key]) => [key, config[key]]));
  return {
    primary_color: isHexColor(config.primary_color) ? config.primary_color : DEFAULT_BRAND.primary_color,
    secondary_color: isHexColor(config.secondary_color) ? config.secondary_color : DEFAULT_BRAND.secondary_color,
    border_radius: Number.isFinite(config.border_radius) ? config.border_radius : DEFAULT_BRAND.border_radius,
    theme_style: THEME_STYLES.includes(config.theme_style) ? config.theme_style : DEFAULT_THEME_STYLE,
    font_family: FONT_OPTIONS.some(font => font.id === config.font_family) ? config.font_family : DEFAULT_FONT,
    light_colors: { ...legacy, ...config.light_colors }, dark_colors: { ...legacy, ...config.dark_colors },
  };
}

export function themeErrors(config) {
  const errors = [];
  for (const key of ["primary_color", "secondary_color"]) if (!isHexColor(config[key])) errors.push(`${key === "primary_color" ? "Primary" : "Secondary"}: enter a valid hex color.`);
  if (!Number.isInteger(config.border_radius) || config.border_radius < 0 || config.border_radius > 32) errors.push("Corner radius must be an integer between 0 and 32.");
  for (const mode of ["light", "dark"]) {
    const colors = config[`${mode}_colors`] || {};
    const invalid = Object.values(colors).some(value => value && !isHexColor(value));
    if (invalid) { errors.push(`${mode}: enter valid hex colors or clear the overrides.`); continue; }
    const text = colors.text_color || (mode === "dark" ? "#f3f4f6" : "#1f2937");
    const background = colors.background_color || (mode === "dark" ? "#121212" : "#ffffff");
    const surface = colors.surface_color || (mode === "dark" ? "#1e2030" : "#ffffff");
    if (getContrastRatio(text, background) < 4.5 || getContrastRatio(text, surface) < 4.5) errors.push(`${mode}: text needs at least 4.5:1 contrast against background and surface colors.`);
  }
  return errors;
}

export const themePayload = draft => ({ ...draft, light_colors: Object.fromEntries(Object.entries(draft.light_colors).filter(([, v]) => v)), dark_colors: Object.fromEntries(Object.entries(draft.dark_colors).filter(([, v]) => v)) });
