import { createTheme } from "@mui/material/styles";

// Shared MUI theme registry, usable by any part of the app that opts into MUI (currently the
// owner/admin portal components and the Finance module). A small shared base (shape/typography/
// component overrides) plus named palettes -- so a new theme is one PALETTES entry + one
// createNamedTheme(name) call, not a copy-pasted createTheme({...}) with the whole components
// block duplicated again.
//
// Palettes may optionally carry `light`/`dark` sub-objects for mode-dependent tokens
// (background/text/divider) -- `primary`/`secondary`/`success`/`warning`/`error`/`info` stay the
// same across modes. A palette with no `light`/`dark` keys (e.g. `admin`) is mode-independent.

export const BRAND = "#3a6ea5";
export const BRAND_DARK = "#27425f";

const baseThemeOptions = {
  shape: { borderRadius: 12 },
  // Match Tailwind's default breakpoint pixel values (the rest of the app's responsive layout),
  // not MUI's own defaults (sm:600/md:900/lg:1200/xl:1536) -- otherwise an sx/Stack `xl` here
  // triggers at a different viewport width than a Tailwind `xl:` class right next to it.
  breakpoints: { values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 } },
  // Inherit the app font already loaded globally instead of pulling MUI's Roboto.
  typography: { fontFamily: "inherit", button: { textTransform: "none", fontWeight: 600 } },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    // borderColor follows the active palette's divider token (mode-aware for palettes like
    // `finance` that define light/dark divider values) rather than a hardcoded hex -- for `admin`,
    // whose divider is mode-independent, this resolves to the same #e2e8f0 as before.
    MuiCard: { defaultProps: { variant: "outlined" }, styleOverrides: { root: ({ theme }) => ({ borderColor: theme.palette.divider }) } },
    // Same divider-token approach as MuiCard above -- #f1f5f9 was too light to read against a
    // dark Card background.
    MuiTableCell: { styleOverrides: { root: ({ theme }) => ({ borderColor: theme.palette.divider }) } },
  },
};

const PALETTES = {
  admin: {
    primary: { main: BRAND },
    secondary: { main: "#10b981" },
    success: { main: "#10b981" },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    info: { main: "#0284c7" },
    background: { default: "#f1f5f9", paper: "#ffffff" },
    text: { primary: "#0f172a", secondary: "#64748b" },
    divider: "#e2e8f0",
  },
  finance: {
    primary: { main: "#4f46e5" }, // indigo-600 -- matches focus:ring-indigo-500 / bg-indigo-600 used throughout SupplierPayment
    success: { main: "#059669" }, // green-600 (Paid)
    warning: { main: "#d97706" }, // amber-600 (Partial Paid / Pending)
    error: { main: "#dc2626" }, // red-600 (Balance / danger)
    info: { main: "#1d4ed8" }, // blue-700 (Invoice tag)
    light: {
      background: { default: "#f3f4f6", paper: "#ffffff" },
      text: { primary: "#1f2937", secondary: "#4b5563" },
      divider: "#e5e7eb",
    },
    dark: {
      background: { default: "#374151", paper: "#1f2937" },
      text: { primary: "#f3f4f6", secondary: "#9ca3af" },
      divider: "#4b5563",
    },
  },
};

export function createNamedTheme(name, mode = "light", overrides = {}) {
  const palette = PALETTES[name];
  if (!palette) {
    throw new Error(`Unknown theme "${name}" -- add it to PALETTES in themeRegistry.js`);
  }
  const { light, dark, ...modeIndependent } = palette;
  const modeTokens = (mode === "dark" ? dark : light) || {};
  return createTheme({
    ...baseThemeOptions,
    palette: { mode, ...modeIndependent, ...modeTokens, ...overrides },
  });
}

export const adminTheme = createNamedTheme("admin");

// Tenant white-label theme -- built from a per-company `brand` payload (see
// SanitizedUserResponse.BrandSummary on the backend), not from a named PALETTES entry. Unlike
// createNamedTheme, background/text/divider are deliberately left to MUI's own mode-based
// defaults rather than hand-picked per mode, keeping this factory genuinely minimal: it only
// needs to react to whatever a tenant sets, not curate a full palette.
export const DEFAULT_BRAND = {
  primary_color: BRAND, // "#3a6ea5" -- today's de facto default, so an unbranded tenant is
  secondary_color: "#10b981", // pixel-identical to before this feature existed.
  border_radius: 12,
};

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value) {
  return typeof value === "string" && HEX_COLOR_RE.test(value.trim());
}

export function createTenantTheme(brand, mode = "light") {
  const primaryColor = isHexColor(brand?.primary_color) ? brand.primary_color : DEFAULT_BRAND.primary_color;
  const secondaryColor = isHexColor(brand?.secondary_color) ? brand.secondary_color : DEFAULT_BRAND.secondary_color;
  const borderRadius = Number.isFinite(brand?.border_radius) ? brand.border_radius : DEFAULT_BRAND.border_radius;

  return createTheme({
    ...baseThemeOptions,
    shape: { borderRadius },
    palette: { mode, primary: { main: primaryColor }, secondary: { main: secondaryColor } },
  });
}

export const TONES = {
  primary: { bg: "rgba(58,110,165,0.10)", fg: BRAND },
  success: { bg: "rgba(16,185,129,0.12)", fg: "#059669" },
  warning: { bg: "rgba(245,158,11,0.14)", fg: "#d97706" },
  error: { bg: "rgba(239,68,68,0.12)", fg: "#dc2626" },
  violet: { bg: "rgba(139,92,246,0.12)", fg: "#7c3aed" },
  slate: { bg: "rgba(100,116,139,0.12)", fg: "#475569" },
  info: { bg: "rgba(29,78,216,0.12)", fg: "#1d4ed8" },
};
