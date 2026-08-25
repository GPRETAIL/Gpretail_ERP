// The backend only ever assigns / enforces three role values in practice -
// "super_admin", "admin", and the default staff role "user" (see
// AuthController@login/me). The richer Sales/Warehouse/Accountant/Owner
// roles referenced elsewhere in the app are frontend-only preset labels
// that nothing on the server checks, so they can't be used to gate
// anything real yet. This is a coarse, honest cut using the one signal
// that actually exists: plain "user" accounts don't see the
// procurement/reporting-heavy sections that admin accounts do.
const RESTRICTED_ROLES = new Set(["user"]);

export const isRestrictedRole = (role) =>
  RESTRICTED_ROLES.has(String(role || "").toLowerCase());

// Pages a restricted-role user has no UI path to reach: Purchase, Suppliers
// and Reports plus their drill-down screens. Enforced both by hiding the
// entry points (BottomNav, ModulesScreen, SettingsScreen) and as a safety
// net in MobileAppV2's navigateTo, since Dashboard quick-action buttons and
// a couple of other shortcuts also link straight to these pages.
export const GATED_PAGES = new Set([
  "purchase",
  "purchase_summary",
  "suppliers",
  "supplier_dues",
  "reports",
  "report_profit_loss",
  "report_gst",
  "report_receivables",
]);

export const isPageGatedForRole = (page, role) =>
  isRestrictedRole(role) && GATED_PAGES.has(page);
