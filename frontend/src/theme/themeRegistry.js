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

// Advanced, optional-on-top-of-primary/secondary tokens -- unset by default (MUI's own light/dark
// defaults apply, same as before this existed), each independently overridable. Wire key -> the
// palette path it feeds; see buildAdvancedPalette below for how a partial set merges in without
// clobbering the paths a tenant left untouched.
const ADVANCED_COLOR_FIELDS = {
  background_color: ["background", "default"],
  text_color: ["text", "primary"],
  success_color: ["success", "main"],
  warning_color: ["warning", "main"],
  error_color: ["error", "main"],
};

function buildAdvancedPalette(brand) {
  const palette = {};
  for (const [wireKey, [group, token]] of Object.entries(ADVANCED_COLOR_FIELDS)) {
    if (!isHexColor(brand?.[wireKey])) continue;
    palette[group] = { ...palette[group], [token]: brand[wireKey] };
  }
  return palette;
}

// Surface *style* (shadow/border/blur character) is a separate axis from brand *color* above --
// every style still renders in whatever primary/secondary the tenant picked. Applied two ways:
// the MUI component overrides below reach every MUI-driven surface (Card/Paper/AppBar/Button)
// through TenantThemeProvider, already wrapping the whole app; themeStyles.css reaches the
// Tailwind-styled "rounded-xl/rounded-md border" card convention used throughout the rest of the
// app the same way, off the data-theme-style attribute TenantThemeProvider sets on <html>.
export const THEME_STYLES = ["classic", "apple", "glass"];
export const DEFAULT_THEME_STYLE = "classic";

const glassSurface = (mode) => ({
  backgroundImage: "none",
  backgroundColor: mode === "dark" ? "rgba(31,41,55,0.55)" : "rgba(255,255,255,0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.4)"}`,
  boxShadow: mode === "dark" ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 32px rgba(15,23,42,0.08)",
});

const appleSurface = (mode) => ({
  backgroundImage: "none",
  border: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"}`,
  boxShadow:
    mode === "dark"
      ? "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

// background.paper is MUI's own semantic "surface color" token -- glass needs it to actually be
// translucent, not just the Card/Paper/AppBar styleOverrides above, because any consumer using the
// idiomatic `sx={{ bgcolor: "background.paper" }}` (Navbar's AppBar does) resolves straight to
// this palette value, which otherwise wins over a components.MuiAppBar.styleOverrides background.
const STYLE_PALETTE = {
  classic: () => ({}),
  apple: () => ({}),
  glass: (mode) => ({ background: { paper: glassSurface(mode).backgroundColor } }),
};

const STYLE_COMPONENTS = {
  classic: () => ({}),
  apple: (mode) => ({
    MuiButton: { styleOverrides: { root: { borderRadius: 999, paddingLeft: 20, paddingRight: 20 } } },
    MuiCard: { styleOverrides: { root: appleSurface(mode) } },
    MuiPaper: { styleOverrides: { root: appleSurface(mode) } },
    MuiAppBar: { styleOverrides: { root: { ...appleSurface(mode), border: "none", borderBottom: appleSurface(mode).border } } },
  }),
  glass: (mode) => ({
    MuiCard: { styleOverrides: { root: glassSurface(mode) } },
    MuiPaper: { styleOverrides: { root: glassSurface(mode) } },
    MuiAppBar: { styleOverrides: { root: { ...glassSurface(mode), borderRadius: 0 } } },
    MuiMenu: { styleOverrides: { paper: glassSurface(mode) } },
    MuiDialog: { styleOverrides: { paper: glassSurface(mode) } },
  }),
};

// Shared by createTenantTheme (no basePalette -- brand-only, MUI's own success/warning/error/info
// defaults) and createNamedTheme (basePalette = a PALETTES entry, e.g. "finance"'s hand-tuned
// indigo/green/amber/red/blue -- these become the *defaults* a tenant's own choices layer over,
// instead of a named theme silently ignoring theme_style/secondary_color/border_radius/advanced
// colors the way createNamedTheme used to). Precedence per palette group, narrowest wins: named
// palette's own default (if any) < style preset (apple/glass surface tokens) < tenant's explicit
// advanced-color choice.
function resolveBrandTheme(brand, mode, basePalette = {}) {
  const { light, dark, ...modeIndependent } = basePalette;
  const modeTokens = (mode === "dark" ? dark : light) || {};

  const primaryColor = isHexColor(brand?.primary_color)
    ? brand.primary_color
    : modeIndependent.primary?.main || DEFAULT_BRAND.primary_color;
  const secondaryColor = isHexColor(brand?.secondary_color)
    ? brand.secondary_color
    : modeIndependent.secondary?.main || DEFAULT_BRAND.secondary_color;
  const borderRadius = Number.isFinite(brand?.border_radius) ? brand.border_radius : DEFAULT_BRAND.border_radius;
  const style = THEME_STYLES.includes(brand?.theme_style) ? brand.theme_style : DEFAULT_THEME_STYLE;

  const baseGroups = { ...modeIndependent, ...modeTokens };
  delete baseGroups.primary;
  delete baseGroups.secondary;

  const stylePalette = STYLE_PALETTE[style](mode);
  const advancedPalette = buildAdvancedPalette(brand);
  const mergedPalette = { ...baseGroups };
  for (const group of Object.keys(stylePalette)) {
    mergedPalette[group] = { ...baseGroups[group], ...stylePalette[group] };
  }
  for (const group of Object.keys(advancedPalette)) {
    mergedPalette[group] = { ...mergedPalette[group], ...advancedPalette[group] };
  }

  return createTheme({
    ...baseThemeOptions,
    shape: { borderRadius },
    palette: {
      mode,
      primary: { main: primaryColor },
      secondary: { main: secondaryColor },
      ...mergedPalette,
    },
    components: {
      ...baseThemeOptions.components,
      ...STYLE_COMPONENTS[style](mode),
    },
  });
}

export function createTenantTheme(brand, mode = "light") {
  return resolveBrandTheme(brand, mode);
}

// A named palette (e.g. "finance") is now just a set of *defaults* -- primary/success/warning/
// error/info and mode-specific background/text/divider a tenant hasn't otherwise chosen -- layered
// under the same style/secondary/radius/advanced-color handling createTenantTheme gives every
// other MUI surface in the app. `brand` is the same state.auth.user.brand payload
// TenantThemeProvider uses, not a raw palette-override object.
export function createNamedTheme(name, mode = "light", brand = {}) {
  const basePalette = PALETTES[name];
  if (!basePalette) {
    throw new Error(`Unknown theme "${name}" -- add it to PALETTES in themeRegistry.js`);
  }
  return resolveBrandTheme(brand, mode, basePalette);
}

export const adminTheme = createNamedTheme("admin");

// Font is a third, independent axis alongside color and surface style -- applied globally by
// setting the CSS font-family directly on <html> (see TenantThemeProvider), which every
// Tailwind-styled element without its own font utility class inherits naturally, and which MUI
// picks up for free via baseThemeOptions.typography.fontFamily: "inherit" above. `google` is the
// exact family=... segment for fonts.googleapis.com/css2 (the one allowed external stylesheet
// host); null for "system", which needs no network request at all.
export const FONT_OPTIONS = [
  {
    id: "system",
    label: "System Default",
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    google: null,
  },
  { id: "inter", label: "Inter", stack: '"Inter", sans-serif', google: "Inter:wght@400;500;600;700" },
  { id: "roboto", label: "Roboto", stack: '"Roboto", sans-serif', google: "Roboto:wght@400;500;700" },
  { id: "poppins", label: "Poppins", stack: '"Poppins", sans-serif', google: "Poppins:wght@400;500;600;700" },
  {
    id: "playfair",
    label: "Playfair Display",
    stack: '"Playfair Display", serif',
    google: "Playfair+Display:wght@400;600;700",
  },
];
export const DEFAULT_FONT = "system";

export function getFontOption(id) {
  return FONT_OPTIONS.find((opt) => opt.id === id) || FONT_OPTIONS.find((opt) => opt.id === DEFAULT_FONT);
}

// Module-level, not per-caller state -- a <link> this tab has already injected for a given Google
// Fonts family segment should never be added twice (TenantThemeProvider applying the saved font
// app-wide, and Themes.jsx's picker speculatively loading one to live-preview it before Save, both
// call this), since the browser keeps a font loaded either way and a duplicate <link> is pure
// waste.
const loadedGoogleFontLinks = new Set();

export function ensureGoogleFontLoaded(googleFamilySegment) {
  if (!googleFamilySegment || loadedGoogleFontLinks.has(googleFamilySegment)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${googleFamilySegment}&display=swap`;
  document.head.appendChild(link);
  loadedGoogleFontLinks.add(googleFamilySegment);
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
