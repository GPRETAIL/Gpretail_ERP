// Config for the Dashboard's module tabs (Warehouse/CRM/Finance/Masters/Settings/Sales/Store/
// Analytical). Each entry maps one module's dashboard-summary response onto a flat list of
// {label, value, subtitle?} cards for ModuleStatCards -- kept here, not inline in Dashboard.jsx,
// so adding a 9th module later is a config entry, not a new branch of markup.
//
// Every endpoint below was verified to exist and return these exact fields before this config was
// written (see the module tabs feature work) -- nothing here is speculative.

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

const wholeNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const currency = (value) => `₹${wholeNumber(value)}`;

export const MODULE_TABS = [
  {
    id: "crm",
    label: "CRM",
    endpoint: "/customers/dashboard-summary",
    mapToCards: (data) => [
      { label: "Total Customers", value: wholeNumber(data?.totalCustomers) },
      { label: "Active Customers", value: wholeNumber(data?.activeCustomers) },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    // Today's snapshot -- distinct from Overview, which is the selected date-range's totals.
    endpoint: "/dashboard/summary",
    mapToCards: (data) => [
      { label: "Total Bills Today", value: wholeNumber(data?.totalBillsToday) },
      { label: "Total Settlement Today", value: currency(data?.totalSettlementToday) },
      { label: "Unsettled Bills", value: wholeNumber(data?.unsettledBills) },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    endpoint: "/supplier-payments/dashboard-summary",
    mapToCards: (data) => [
      { label: "Payments This Month", value: wholeNumber(data?.totalPaymentsThisMonth) },
      { label: "Amount Paid This Month", value: currency(data?.totalAmountPaidThisMonth) },
      {
        label: "Pending Payments",
        value: wholeNumber(data?.pendingPayments),
        subtitle: "Not yet tracked by Finance",
      },
    ],
  },
  {
    id: "masters",
    label: "Masters",
    endpoint: "/products/dashboard-summary",
    mapToCards: (data) => [
      { label: "Total Products", value: wholeNumber(data?.totalProducts) },
      { label: "Total Brands", value: wholeNumber(data?.totalBrands) },
      { label: "Total Suppliers", value: wholeNumber(data?.totalSuppliers) },
      { label: "Total Taxes", value: wholeNumber(data?.totalTaxes) },
      { label: "Total Agents", value: wholeNumber(data?.totalAgents) },
      { label: "Total Configurations", value: wholeNumber(data?.totalConfigurations) },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    endpoint: "/employees/dashboard-summary",
    mapToCards: (data) => [
      { label: "Total Employees", value: wholeNumber(data?.totalEmployees) },
      { label: "Active Employees", value: wholeNumber(data?.activeEmployees) },
      { label: "Total Departments", value: wholeNumber(data?.totalDepartments) },
    ],
  },
];

export { wholeNumber, currency };
