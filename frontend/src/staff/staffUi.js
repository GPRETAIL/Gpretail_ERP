import { TYPE, POS_TOUCH_TARGET } from "@/shared/theme/typeScale";

// The staff app's look: touch sizes from the shared type scale (16px body, 44px targets) and the
// same text colours as the ERP (#111827 / #4b5563).
export const STAFF_TEXT = {
  body: TYPE.posItem,
  label: TYPE.label,
  small: TYPE.small,
  heading: TYPE.heading,
  big: TYPE.posTotal,
};

export const STAFF_COLOR = {
  primary: "#0d9488",
  primaryDark: "#0f766e",
  primarySoft: "#f0fdfa",
  text: "#111827",
  muted: "#4b5563",
  faint: "#6b7280",
  line: "#e5e7eb",
  page: "#f3f4f6",
  danger: "#be123c",
  dangerSoft: "#fff1f2",
  success: "#047857",
};

export const TOUCH = POS_TOUCH_TARGET;

export const card = { p: 1.75, borderRadius: "16px", bgcolor: "#fff", border: `1px solid ${STAFF_COLOR.line}` };

export const sectionTitle = { fontSize: STAFF_TEXT.label, fontWeight: 800, color: STAFF_COLOR.muted, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 };

export const primaryButton = {
  minHeight: TOUCH, display: "flex", alignItems: "center", justifyContent: "center", gap: 1, px: 2, borderRadius: "14px", border: 0,
  bgcolor: STAFF_COLOR.primary, color: "#fff", fontSize: STAFF_TEXT.body, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  "&:disabled": { opacity: 0.5, cursor: "default" },
};

export const secondaryButton = {
  ...primaryButton, bgcolor: "#fff", color: STAFF_COLOR.primaryDark, border: `1px solid ${STAFF_COLOR.line}`,
};

export const rupee = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const errorText = (err, fallback) => {
  const data = err?.response?.data;
  const first = data?.errors && Object.values(data.errors)[0];
  return (Array.isArray(first) ? first[0] : first) || data?.message || fallback;
};
