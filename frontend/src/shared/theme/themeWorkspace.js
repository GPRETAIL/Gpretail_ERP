import { getContrastRatio } from "@mui/material/styles";
import { DEFAULT_BRAND, DEFAULT_FONT, DEFAULT_THEME_STYLE, FONT_OPTIONS, THEME_STYLES, isHexColor } from "./themeRegistry";

export const COLOR_FIELDS = [
  ["background_color", "Background"], ["surface_color", "Surface"], ["text_color", "Text"],
  ["success_color", "Success"], ["warning_color", "Warning"], ["error_color", "Error"],
];
export const STYLE_OPTIONS = [
  ["classic", "Default", "Recommended for daily ERP work. Solid, restrained surfaces."],
  ["glass", "Liquid Glass", "Frosted, light-catching panels over a soft colour backdrop. Tables and inputs stay solid."],
  ["glassmorphism", "Glassmorphism", "Translucent blurred panels floating over vivid colour. Tables and inputs stay solid."],
  ["liquid_ai", "Liquid AI", "Subtle purple and cyan accents."],
];

// Curated, complete themes (colours + surface style + font + radius + light/dark tokens) for one-click
// switching. Every entry passes themeErrors (4.5:1 text contrast) and the server's theme rules.
export const ENTERPRISE_THEMES = [
  { id: "vynerix", name: "Vynerix Default", description: "The standard look. Calm blue, solid surfaces.",
    config: { primary_color: "#3a6ea5", secondary_color: "#10b981", border_radius: 12, theme_style: "classic", font_family: "system" } },
  { id: "corporate_blue", name: "Corporate Blue", description: "Head-office ERP: crisp navy, IBM Plex, tight corners.",
    config: { primary_color: "#1d4ed8", secondary_color: "#0ea5e9", border_radius: 8, theme_style: "classic", font_family: "ibm_plex_sans",
      light_colors: { background_color: "#f4f6fb" }, dark_colors: { background_color: "#0b1220", surface_color: "#111a2e" } } },
  { id: "slate_pro", name: "Slate Pro", description: "Neutral slate with a teal accent for long back-office days.",
    config: { primary_color: "#334155", secondary_color: "#0d9488", border_radius: 10, theme_style: "apple", font_family: "inter",
      light_colors: { background_color: "#f8fafc" }, dark_colors: { background_color: "#0f172a", surface_color: "#1e293b" } } },
  { id: "emerald_ledger", name: "Emerald Ledger", description: "Finance and accounts: deep green, Source Sans for figures.",
    config: { primary_color: "#047857", secondary_color: "#0f766e", border_radius: 8, theme_style: "classic", font_family: "source_sans_3",
      light_colors: { background_color: "#f3f8f5" }, dark_colors: { background_color: "#0a1512", surface_color: "#11211c" } } },
  { id: "retail_bright", name: "Retail Bright", description: "POS counters: warm orange, big friendly Manrope, round corners.",
    config: { primary_color: "#c2410c", secondary_color: "#15803d", border_radius: 16, theme_style: "apple", font_family: "manrope",
      light_colors: { background_color: "#fff8f3" } } },
  { id: "night_ops", name: "Night Ops", description: "Low-glare dark workstations: sky-blue accents on deep navy.",
    config: { primary_color: "#0369a1", secondary_color: "#7c3aed", border_radius: 10, theme_style: "classic", font_family: "segoe_ui",
      dark_colors: { background_color: "#070b14", surface_color: "#0f1724", text_color: "#e6edf7" } } },
  { id: "high_contrast", name: "High Contrast", description: "Accessibility: maximum legibility, strong borders, no effects.",
    config: { primary_color: "#1e3a8a", secondary_color: "#065f46", border_radius: 4, theme_style: "classic", font_family: "segoe_ui",
      light_colors: { background_color: "#ffffff", surface_color: "#ffffff", text_color: "#000000" },
      dark_colors: { background_color: "#000000", surface_color: "#0a0a0a", text_color: "#ffffff" } } },
  { id: "liquid_glass", name: "Liquid Glass", description: "Showroom style: frosted, light-catching panels in system blue.",
    config: { primary_color: "#0a6cdc", secondary_color: "#16a34a", border_radius: 18, theme_style: "glass", font_family: "system" } },
  { id: "aurora_glass", name: "Aurora Glass", description: "Glassmorphism over violet, pink and sky. Data stays solid.",
    config: { primary_color: "#6d28d9", secondary_color: "#db2777", border_radius: 16, theme_style: "glassmorphism", font_family: "poppins" } },
];

/** True when the draft is exactly this enterprise theme (so its card shows as selected). */
export const isEnterpriseTheme = (draft, theme) => JSON.stringify(draft) === JSON.stringify(normalizeTheme(theme.config));

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
