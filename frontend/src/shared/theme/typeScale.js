// Screen text sizes that follow the company's Text size choice (Themes > Typography: Compact,
// Comfortable, Large). The values are CSS variables set on <html> by TenantThemeProvider
// (applyTypographyPreset); the fallbacks are the Comfortable sizes. Use these in shared
// components instead of fixed pixel sizes. Print documents keep their own sizes.
export const TYPE = {
  body: "var(--erp-font-body, 14px)",
  label: "var(--erp-font-label, 13px)",
  small: "calc(var(--erp-font-label, 13px) - 1px)",
  heading: "var(--erp-font-heading, 18px)",
};
