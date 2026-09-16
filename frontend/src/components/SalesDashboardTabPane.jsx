import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import SalesKpiSummary from "./dashboard/sales/SalesKpiSummary";
import SalesSecondaryKpi from "./dashboard/sales/SalesSecondaryKpi";
import SalesActionRequiredBanner from "./dashboard/sales/SalesActionRequiredBanner";
import SalesModuleBreakdown from "./dashboard/sales/SalesModuleBreakdown";
import SalesPaymentBreakdown from "./dashboard/sales/SalesPaymentBreakdown";
import SalesTrendChart from "./dashboard/sales/SalesTrendChart";
import SalesTopProductsTable from "./dashboard/sales/SalesTopProductsTable";
import SalesLeaderboard from "./dashboard/sales/SalesLeaderboard";
import SalesRecentSalesTable from "./dashboard/sales/SalesRecentSalesTable";

const QUICK_ACTIONS = [
  { label: "+ New Sale", path: "/sales/pos-sales", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "+ Sales Return", path: "/sales/pos-sales-return", color: "bg-rose-600 hover:bg-rose-700 text-white" },
  { label: "+ Dealer Invoice", path: "/sales/dealer-invoice", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Sales on Approval", path: "/sales/sales-on-approval", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Cash Opening", path: "/sales/cash-opening", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "Cash Closing", path: "/sales/cash-closing", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  { label: "Settlement", path: "/sales/settlement", color: "bg-slate-700 hover:bg-slate-800 text-white" },
];

export default function SalesDashboardTabPane({ active, fromDate, toDate, companyId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!active) return;
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (fromDate) params.date_from = fromDate;
      if (toDate) params.date_to = toDate;
      if (companyId) params.warehouse_id = companyId;

      const res = await api.get("/sales/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load sales data.");
      }
    } catch (err) {
      console.error("Sales Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, fromDate, toDate, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const transactionBreakdown = data?.transaction_breakdown || {};
  const paymentBreakdown = data?.payment_breakdown || [];
  const topProducts = data?.top_products || [];
  const topSalesPersons = data?.top_sales_persons || [];
  const recentSales = data?.recent_sales || [];
  const performance = data?.performance || {};
  const salesTrendChart = data?.charts?.sales_trend || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-summary",
        title: "KPI Summary",
        component: SalesKpiSummary,
        props: { summary, performance, loading },
        defaultLayout: { x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "secondary-kpi",
        title: "Monthly / Invoices / Products",
        component: SalesSecondaryKpi,
        props: { summary, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: SalesActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 4, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "module-breakdown",
        title: "Sales Module Breakdown",
        component: SalesModuleBreakdown,
        props: { transactionBreakdown, loading },
        defaultLayout: { x: 0, y: 6, w: 12, h: 3, minW: 6, minH: 2 },
      },
      {
        key: "payment-breakdown",
        title: "Payment Mode Breakdown",
        component: SalesPaymentBreakdown,
        props: { paymentBreakdown, performance },
        defaultLayout: { x: 0, y: 9, w: 4, h: 6, minW: 3, minH: 4 },
      },
      {
        key: "trend-chart",
        title: "Sales vs Returns Timeline",
        component: SalesTrendChart,
        props: { salesTrendChart },
        defaultLayout: { x: 4, y: 9, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "top-products",
        title: "Top Selling Products",
        component: SalesTopProductsTable,
        props: { topProducts },
        defaultLayout: { x: 4, y: 12, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "leaderboard",
        title: "Sales Person Leaderboard",
        component: SalesLeaderboard,
        props: { topSalesPersons },
        defaultLayout: { x: 0, y: 15, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-sales",
        title: "Recent Sales",
        component: SalesRecentSalesTable,
        props: { recentSales },
        defaultLayout: { x: 4, y: 15, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [
      summary,
      performance,
      loading,
      actionRequired,
      transactionBreakdown,
      paymentBreakdown,
      salesTrendChart,
      topProducts,
      topSalesPersons,
      recentSales,
    ]
  );

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchData}
          className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Workflows Bar -- a toolbar, not a data widget, so it stays fixed above the grid */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-gray-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
          Quick Actions:
        </span>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.path)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium shadow-sm transition ${action.color}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      <DashboardGrid tabKey="sales" widgets={widgets} />
    </div>
  );
}
