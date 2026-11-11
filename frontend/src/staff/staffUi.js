import { TYPE, POS_TOUCH_TARGET } from "@/shared/theme/typeScale";

// The staff app's look: touch sizes from the shared type scale (16px body, 44px targets) and the
// same text colours as the ERP (#111827 / #4b5563 in light, #f3f4f6 / #cbd5e1 in dark).
export const STAFF_TEXT = {
  body: TYPE.posItem,
  label: TYPE.label,
  small: TYPE.small,
  heading: TYPE.heading,
  big: TYPE.posTotal,
};

/**
 * Colours as CSS variables, set on the app's root by StaffApp for the light or dark theme. The
 * reused phone HR screens (src/mobile) read the same --hr-* variables, falling back to their
 * light colours elsewhere (the business /app).
 */
export const STAFF_THEMES = {
  light: {
    page: "#f3f4f6", surface: "#ffffff", surfaceAlt: "#e5e7eb", text: "#111827", muted: "#4b5563", "muted-strong": "#475569", faint: "#6b7280",
    border: "#e5e7eb", "border-strong": "#d1d5db", primary: "#0d9488", "teal-text": "#0f766e", "teal-bg": "#f0fdfa", "teal-border": "#99f6e4",
    danger: "#be123c", "danger-bg": "#fff1f2", "danger-border": "#fecdd3", "info-text": "#3730a3", "info-bg": "#eef2ff",
    "warn-text": "#92400e", "warn-bg": "#fffbeb", "warn-border": "#fde68a", "amber-text": "#b45309", "green-text": "#047857",
    "accent-text": "#4338ca", "sky-text": "#0369a1", knob: "#ffffff", scrim: "rgba(17,24,39,0.45)",
  },
  dark: {
    page: "#0b1120", surface: "#151d2e", surfaceAlt: "#24304a", text: "#f3f4f6", muted: "#cbd5e1", "muted-strong": "#cbd5e1", faint: "#94a3b8",
    border: "#26324a", "border-strong": "#3b4a66", primary: "#14b8a6", "teal-text": "#5eead4", "teal-bg": "#0f2e2b", "teal-border": "#14524c",
    danger: "#fda4af", "danger-bg": "#3a1620", "danger-border": "#7f1d1d", "info-text": "#c7d2fe", "info-bg": "#1e1b4b",
    "warn-text": "#fcd34d", "warn-bg": "#2b2210", "warn-border": "#6b4e16", "amber-text": "#fbbf24", "green-text": "#6ee7b7",
    "accent-text": "#a5b4fc", "sky-text": "#7dd3fc", knob: "#e5e7eb", scrim: "rgba(0,0,0,0.6)",
  },
};

/** The CSS variables for one theme, for a root element's style. */
export const staffThemeVars = (mode) => Object.fromEntries(Object.entries(STAFF_THEMES[mode]).map(([key, value]) => [`--hr-${key}`, value]));

const v = (name) => `var(--hr-${name})`;
export const STAFF_COLOR = {
  primary: v("primary"),
  primaryDark: v("teal-text"),
  primarySoft: v("teal-bg"),
  primaryBorder: v("teal-border"),
  text: v("text"),
  muted: v("muted"),
  faint: v("faint"),
  line: v("border"),
  inputLine: v("border-strong"),
  page: v("page"),
  surface: v("surface"),
  surfaceAlt: v("surfaceAlt"),
  danger: v("danger"),
  dangerSoft: v("danger-bg"),
  dangerBorder: v("danger-border"),
  warnSoft: v("warn-bg"),
  warnBorder: v("warn-border"),
  warnText: v("warn-text"),
  amber: v("amber-text"),
  success: v("green-text"),
  knob: v("knob"),
  scrim: v("scrim"),
};

export const TOUCH = POS_TOUCH_TARGET;

export const card = { p: 1.75, borderRadius: "16px", bgcolor: STAFF_COLOR.surface, border: `1px solid ${STAFF_COLOR.line}` };

export const sectionTitle = { fontSize: STAFF_TEXT.label, fontWeight: 800, color: STAFF_COLOR.muted, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 };

export const primaryButton = {
  minHeight: TOUCH, display: "flex", alignItems: "center", justifyContent: "center", gap: 1, px: 2, borderRadius: "14px", border: 0,
  bgcolor: "#0d9488", color: "#fff", fontSize: STAFF_TEXT.body, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  "&:disabled": { opacity: 0.5, cursor: "default" },
};

export const secondaryButton = {
  ...primaryButton, bgcolor: STAFF_COLOR.surface, color: STAFF_COLOR.primaryDark, border: `1px solid ${STAFF_COLOR.line}`,
};

export const rupee = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const errorText = (err, fallback) => {
  const data = err?.response?.data;
  const first = data?.errors && Object.values(data.errors)[0];
  return (Array.isArray(first) ? first[0] : first) || data?.message || fallback;
};
