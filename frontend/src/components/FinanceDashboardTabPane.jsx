import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import FinanceKpiSummary from "./dashboard/finance/FinanceKpiSummary";
import FinanceActionRequiredBanner from "./dashboard/finance/FinanceActionRequiredBanner";
import FinanceBreakdown from "./dashboard/finance/FinanceBreakdown";
import FinanceTrendChart from "./dashboard/finance/FinanceTrendChart";
import FinanceTopPayables from "./dashboard/finance/FinanceTopPayables";
import FinanceRecentPayments from "./dashboard/finance/FinanceRecentPayments";

const QUICK_ACTIONS = [
  { label: "+ Supplier Payment", path: "/finance/supplier-payment", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "Purchase Invoices", path: "/warehouse/purchase-invoice", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Direct Purchases", path: "/warehouse/direct-purchase", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Purchase Returns", path: "/warehouse/purchase-return", color: "bg-rose-600 hover:bg-rose-700 text-white" },
  { label: "Settlement", path: "/sales/settlement", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
];

export default function FinanceDashboardTabPane({ active, fromDate, toDate, companyId }) {
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

      const res = await api.get("/finance/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load finance data.");
      }
    } catch (err) {
      console.error("Finance Tab fetch error:", err);
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
  const breakdown = data?.breakdown || {};
  const topPayables = data?.top_payables || [];
  const recentPayments = data?.recent_payments || [];
  const trendChart = data?.charts?.purchase_payment_trend || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-summary",
        title: "KPI Summary",
        component: FinanceKpiSummary,
        props: { summary, loading },
        defaultLayout: { x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: FinanceActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "breakdown",
        title: "Finance Breakdown",
        component: FinanceBreakdown,
        props: { breakdown, loading },
        defaultLayout: { x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 },
      },
      {
        key: "trend-chart",
        title: "Purchases vs Payments",
        component: FinanceTrendChart,
        props: { trendChart },
        defaultLayout: { x: 0, y: 7, w: 8, h: 4, minW: 4, minH: 3 },
      },
      {
        key: "top-payables",
        title: "Top Outstanding Suppliers",
        component: FinanceTopPayables,
        props: { topPayables },
        defaultLayout: { x: 8, y: 7, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-payments",
        title: "Recent Supplier Payments",
        component: FinanceRecentPayments,
        props: { recentPayments },
        defaultLayout: { x: 0, y: 11, w: 12, h: 4, minW: 6, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, breakdown, trendChart, topPayables, recentPayments]
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

      <DashboardGrid tabKey="finance" widgets={widgets} />
    </div>
  );
}
