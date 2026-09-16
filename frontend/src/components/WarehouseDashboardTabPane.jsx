import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import WarehouseKpiSummary from "./dashboard/warehouse/WarehouseKpiSummary";
import WarehouseActionRequiredBanner from "./dashboard/warehouse/WarehouseActionRequiredBanner";
import WarehouseSellingModeBreakdown from "./dashboard/warehouse/WarehouseSellingModeBreakdown";
import WarehouseStockMovementChart from "./dashboard/warehouse/WarehouseStockMovementChart";
import WarehouseIncomingShipmentsTable from "./dashboard/warehouse/WarehouseIncomingShipmentsTable";
import WarehouseLowStockTable from "./dashboard/warehouse/WarehouseLowStockTable";

const QUICK_ACTIONS = [
  { label: "+ Direct Purchase", path: "/warehouse/direct-purchase", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "+ Inventory Entry", path: "/warehouse/inventory-entry", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "+ Create GRN", path: "/warehouse/receive-goods", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "+ Stock Outward", path: "/warehouse/stock-outward", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "+ Transport Entry", path: "/warehouse/transport-entry", color: "bg-sky-600 hover:bg-sky-700 text-white" },
  { label: "+ Physical Stock", path: "/warehouse/physical-stock", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  { label: "+ Purchase Return", path: "/warehouse/purchase-return", color: "bg-rose-600 hover:bg-rose-700 text-white" },
  { label: "+ Generate Barcode", path: "/warehouse/barcode", color: "bg-slate-700 hover:bg-slate-800 text-white" },
];

export default function WarehouseDashboardTabPane({ active, fromDate, toDate, companyId }) {
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

      const res = await api.get("/warehouse/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load warehouse data.");
      }
    } catch (err) {
      console.error("Warehouse Tab fetch error:", err);
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
  const inventory = data?.inventory || {};
  const incoming = data?.incoming || [];
  const alerts = data?.alerts || [];
  const performance = data?.performance || {};
  const stockMovementChart = data?.charts?.stock_movement || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-summary",
        title: "KPI Summary",
        component: WarehouseKpiSummary,
        props: { summary, loading },
        defaultLayout: { x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: WarehouseActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "selling-mode-breakdown",
        title: "Selling Mode Breakdown",
        component: WarehouseSellingModeBreakdown,
        props: { inventory, performance, loading },
        defaultLayout: { x: 0, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
      },
      {
        key: "stock-movement-chart",
        title: "Stock Movement Timeline",
        component: WarehouseStockMovementChart,
        props: { stockMovementChart },
        defaultLayout: { x: 4, y: 4, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "incoming-shipments",
        title: "Incoming Shipments",
        component: WarehouseIncomingShipmentsTable,
        props: { incoming },
        defaultLayout: { x: 4, y: 7, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "low-stock-alerts",
        title: "Low Stock & Reorder Alerts",
        component: WarehouseLowStockTable,
        props: { alerts },
        defaultLayout: { x: 0, y: 10, w: 12, h: 4, minW: 6, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, inventory, performance, stockMovementChart, incoming, alerts]
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

      <DashboardGrid tabKey="warehouse" widgets={widgets} />
    </div>
  );
}
