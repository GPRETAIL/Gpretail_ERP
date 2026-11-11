// Screen text sizes that follow the company's Text size choice (Themes > Typography: Compact,
// Comfortable, Large). The values are CSS variables set on <html> by TenantThemeProvider
// (applyTypographyPreset); the fallbacks are the Comfortable sizes. Use these in shared
// components instead of fixed pixel sizes. Print documents keep their own sizes.
export const TYPE = {
  body: "var(--erp-font-body, 14px)",
  label: "var(--erp-font-label, 13px)",
  small: "calc(var(--erp-font-label, 13px) - 1px)",
  heading: "var(--erp-font-heading, 18px)",
  // CRM: customer names in lists and profiles.
  name: "var(--erp-font-name, 16px)",
  // POS billing: item names and inputs, cart rows, totals, buttons (touch targets stay at least 44px tall).
  posItem: "var(--erp-font-pos-item, 16px)",
  posRow: "var(--erp-font-pos-row, 15px)",
  posTotal: "var(--erp-font-pos-total, 26px)",
  posButton: "var(--erp-font-pos-button, 16px)",
};
export const POS_TOUCH_TARGET = 44;
