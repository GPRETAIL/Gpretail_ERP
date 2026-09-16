/**
 * The Dashboard's tabs, as assignable pages.
 *
 * Tabs are client-side state, not routes, so they have no natural permission key. These synthetic
 * `/dashboard/<id>` paths are that key: the Page Access catalog offers them as Dashboard's pages and
 * the Dashboard filters its tab bar by them. They are deliberately NOT registered as routes -- there
 * is nothing to navigate to, and the router's catch-all already handles a hand-typed URL.
 *
 * Single source of truth on purpose: Dashboard.jsx renders from this list and
 * pagePermissionCatalog.js grants from it, so a tab can never be visible-but-ungrantable (or the
 * reverse) the way it would if each file kept its own copy.
 *
 * Every tab now has its own dedicated *DashboardTabPane component (Warehouse/CRM/Sales/Finance/
 * Store/Masters/Settings/Analytical) backed by its own service+controller -- there is no more
 * generic flat-card fallback (the old MODULE_TABS config) to keep in sync with this list.
 */
export const DASHBOARD_PAGES = [
  { id: "overview", name: "Overview" },
  { id: "warehouse", name: "Warehouse" },
  { id: "crm", name: "CRM" },
  { id: "sales", name: "Sales" },
  { id: "finance", name: "Finance" },
  { id: "store", name: "Store" },
  { id: "analytical", name: "Analytical" },
  { id: "masters", name: "Masters" },
  { id: "settings", name: "Settings" },
].map((tab) => ({ ...tab, path: `/dashboard/${tab.id}` }));
