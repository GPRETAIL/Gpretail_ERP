import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import CrmKpiSummary from "./dashboard/crm/CrmKpiSummary";
import CrmActionRequiredBanner from "./dashboard/crm/CrmActionRequiredBanner";
import CrmSegmentationBreakdown from "./dashboard/crm/CrmSegmentationBreakdown";
import CrmGrowthChart from "./dashboard/crm/CrmGrowthChart";
import CrmCelebrationsTable from "./dashboard/crm/CrmCelebrationsTable";
import CrmTopCustomersTable from "./dashboard/crm/CrmTopCustomersTable";
import CrmRecentOrdersTable from "./dashboard/crm/CrmRecentOrdersTable";

const QUICK_ACTIONS = [
  { label: "+ New Customer", path: "/crm/customer", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "+ New Customer Order", path: "/crm/customer-orders/new", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Customer Orders List", path: "/crm/customer-orders", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Loyalty Management", path: "/crm/loyalty", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  { label: "Bill & Receipts Print", path: "/crm/bill-print", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "Customer 360 Profiles", path: "/crm/customer", color: "bg-slate-700 hover:bg-slate-800 text-white" },
];

export default function CrmDashboardTabPane({ active, fromDate, toDate, companyId }) {
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
      if (companyId) params.store_id = companyId;

      const res = await api.get("/crm/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load CRM data.");
      }
    } catch (err) {
      console.error("CRM Tab fetch error:", err);
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
  const segmentation = data?.segmentation || {};
  const topCustomers = data?.top_customers || [];
  const recentOrders = data?.recent_orders || [];
  const upcomingEvents = data?.upcoming_events || [];
  const timelineChart = data?.charts?.timeline || [];
  const performance = data?.performance || {};

  const widgets = useMemo(
    () => [
      {
        key: "kpi-summary",
        title: "KPI Summary",
        component: CrmKpiSummary,
        props: { summary, loading },
        defaultLayout: { x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: CrmActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "segmentation",
        title: "Customer Segmentation",
        component: CrmSegmentationBreakdown,
        props: { summary, segmentation, performance },
        defaultLayout: { x: 0, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
      },
      {
        key: "growth-chart",
        title: "Customer Growth & Orders",
        component: CrmGrowthChart,
        props: { timelineChart },
        defaultLayout: { x: 4, y: 4, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "celebrations",
        title: "Celebrations & Engagement",
        component: CrmCelebrationsTable,
        props: { upcomingEvents },
        defaultLayout: { x: 4, y: 7, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "top-customers",
        title: "Top Valuable Customers",
        component: CrmTopCustomersTable,
        props: { topCustomers },
        defaultLayout: { x: 0, y: 10, w: 6, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-orders",
        title: "Recent Customer Orders",
        component: CrmRecentOrdersTable,
        props: { recentOrders },
        defaultLayout: { x: 6, y: 10, w: 6, h: 4, minW: 3, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, segmentation, performance, timelineChart, upcomingEvents, topCustomers, recentOrders]
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
          CRM Workflows:
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

      <DashboardGrid tabKey="crm" widgets={widgets} />
    </div>
  );
}
