/**
 * Where a dashboard card goes. Each card opens the report or page that shows what the card counts: a report in Sales
 * Reports or Warehouse Reports (opened straight onto it with ?report=), or the page where the work is done. The old links
 * sent every card to the module's main page with a filter that no page read.
 */
export const salesReport = (key) => `/sales/reports?report=${key}`;
export const warehouseReport = (key) => `/warehouse/reports?report=${key}`;

const CREDIT_OUTSTANDING = salesReport("credit_customer_outstanding_report");
const SETTLEMENT_SUMMARY = salesReport("day_end_settlement_summary");
const SUPPLIER_PENDING = warehouseReport("supplier_pending_bills");
const PURCHASE_RETURNS = warehouseReport("purchase_return_report");
const REORDER = "/analytical/reorder-status";

/** Action Required tiles, by module and the backend's item key. */
const ACTION_TARGETS = {
  sales: {
    open_registers: "/sales/cash-closing",
    register_variance: SETTLEMENT_SUMMARY,
    overdue_credit: CREDIT_OUTSTANDING,
    pending_approvals: "/sales/sales-on-approval",
    pending_returns: salesReport("sales_return_report"),
    pending_dealer_invoices: salesReport("dealer_invoice_report"),
  },
  warehouse: {
    grn_pending: "/warehouse/receive-goods",
    transport_issues: "/warehouse/transport-issue/search",
    low_stock: REORDER,
    physical_variance: warehouseReport("stock_audit_report"),
    purchase_returns: PURCHASE_RETURNS,
    goods_awaiting_receipt: warehouseReport("pending_inward_report"),
  },
  crm: {
    orders_due_today: "/crm/customer-orders",
    over_credit_limit: CREDIT_OUTSTANDING,
    ready_pending_balance: "/crm/customer-orders",
    draft_orders: "/crm/customer-orders",
    celebrations_today: salesReport("birthday_wishes"),
    loyalty_club_members: "/crm/loyalty-management",
  },
  finance: {
    overdue_payables: SUPPLIER_PENDING,
    customers_over_limit: CREDIT_OUTSTANDING,
    unpaid_invoices: SUPPLIER_PENDING,
    overdue_credit_sales: CREDIT_OUTSTANDING,
    pending_returns: PURCHASE_RETURNS,
    unpaid_dealer_invoices: "/sales/dealer-receipt",
  },
  store: {
    inactive_stores: "/settings/company",
    stale_registers: "/sales/cash-closing",
    dormant_stores: salesReport("sales_analysis_report"),
    stores_low_stock: REORDER,
  },
};

/** The page for an Action Required item. Masters, Settings and Analytical items open their list without a filter nothing reads. */
export const actionTarget = (module, item) => ACTION_TARGETS[module]?.[item?.key] || item?.route || "/dashboard";

/** Overview's Action Required items come from notifications with a ready link; the ones that carried a filter nothing reads are mapped here. */
const OVERVIEW_LINKS = {
  "/crm/customer?filter=has_dues": CREDIT_OUTSTANDING,
  "/sales/pos-sales?filter=overdue_credit": CREDIT_OUTSTANDING,
  "/warehouse/physical-stock?status=variance": warehouseReport("stock_audit_report"),
  "/warehouse/stock-item?stock_filter=low_stock": REORDER,
  "/sales/cash-closing?filter=variance": SETTLEMENT_SUMMARY,
  "/sales/cash-closing?filter=stale": "/sales/cash-closing",
  "/sales/pos-sales?filter=dormant": salesReport("sales_analysis_report"),
  "/settings/backup?filter=overdue": "/settings/backup",
  "/settings/backup?status=failed": "/settings/backup",
};

export const overviewTarget = (link) => OVERVIEW_LINKS[link] || link || "/notifications";

const PURCHASES = warehouseReport("purchase_report");
const SALES_INVOICES = salesReport("sales_report_invoice_wise");
const SALES_RETURNS = salesReport("sales_return_report");
const STOCK = warehouseReport("stock_report");

/**
 * Where a KPI card, table heading or "View all" goes: the report that lists the rows behind the number.
 * Cards for a record page (customer orders, loyalty, brands) and for settings keep their page.
 */
const KPI_TARGETS = {
  "sales.todays_sales": SALES_INVOICES,
  "sales.net_sales": salesReport("sales_report"),
  "sales.returns": SALES_RETURNS,
  "sales.credit_pending": CREDIT_OUTSTANDING,
  "sales.monthly_sales": salesReport("sales_report"),
  "sales.total_invoices": SALES_INVOICES,
  "sales.recent_sales": SALES_INVOICES,
  "sales.tile.sales": SALES_INVOICES,
  "sales.tile.returns": SALES_RETURNS,
  "sales.tile.exchanges": SALES_RETURNS,
  "sales.tile.credit": CREDIT_OUTSTANDING,
  "sales.tile.refunds": SALES_RETURNS,
  "warehouse.stock_units": STOCK,
  "warehouse.stock_value": STOCK,
  "warehouse.incoming_goods": PURCHASES,
  "warehouse.stock_outward": warehouseReport("outward_report"),
  "warehouse.low_stock": REORDER,
  "warehouse.incoming_shipments": PURCHASES,
  "crm.customers": salesReport("my_customers_report"),
  "crm.receivables": CREDIT_OUTSTANDING,
  "crm.top_customers": salesReport("my_customers_report"),
  "crm.celebrations": salesReport("birthday_wishes"),
  "finance.payables": SUPPLIER_PENDING,
  "finance.receivables": CREDIT_OUTSTANDING,
  "finance.purchase_value": PURCHASES,
  "finance.recent_payments": warehouseReport("supplier_payment_report"),
  "masters.products": warehouseReport("product_master_report"),
  "masters.recent_products": warehouseReport("product_master_report"),
  "masters.suppliers": warehouseReport("supplier_master_report"),
  "hr.present_today": "/hrms/attendance-register",
  "hr.attendance": "/hrms/attendance-register",
  "hr.payroll": "/hrms/payroll-reports",
};

/** The page for a KPI card or "View all" link, by the id above. An id it does not know goes to the dashboard. */
export const kpiTarget = (id) => KPI_TARGETS[id] || "/dashboard";

/** Every id, for the test that checks each one opens a report that exists. */
export const KPI_TARGET_IDS = Object.keys(KPI_TARGETS);
