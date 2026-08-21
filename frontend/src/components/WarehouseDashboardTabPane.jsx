import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Package,
  Boxes,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertOctagon,
  PieChart,
  BarChart3,
  ShieldAlert,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
} from "lucide-react";
import api from "../api/axios";

const formatCurrency = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

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

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const inventory = data?.inventory || {};
  const incoming = data?.incoming || [];
  const alerts = data?.alerts || [];
  const performance = data?.performance || {};
  const stockMovementChart = data?.charts?.stock_movement || [];

  return (
    <div className="space-y-6">
      {/* Quick Workflows Bar */}
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

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Stock Qty */}
        <div
          onClick={() => navigate("/warehouse/item-locator")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Units</span>
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : Number(summary.total_stock_qty || 0).toLocaleString()}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Avail: {Number(summary.total_available_qty || 0).toLocaleString()}</span>
            <span>Allocated: {Number(summary.total_allocated_qty || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Stock Cost & Retail Value */}
        <div
          onClick={() => navigate("/warehouse/reports")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Value</span>
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : formatCurrency(summary.total_cost_value)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Cost: {formatCurrency(summary.total_cost_value)}</span>
            <span>Retail: {formatCurrency(summary.total_retail_value)}</span>
          </div>
        </div>

        {/* Card 3: Incoming / Pending Purchases */}
        <div
          onClick={() => navigate("/warehouse/direct-purchase")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Incoming Goods</span>
            <ArrowDownRight className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : `${summary.total_incoming || 0} Shipments`}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Pending: {summary.pending_purchases || 0}</span>
            <span>Completed: {(summary.total_incoming || 0) - (summary.pending_purchases || 0)}</span>
          </div>
        </div>

        {/* Card 4: Outgoing / Stock Outwards */}
        <div
          onClick={() => navigate("/warehouse/stock-outward")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Outward</span>
            <ArrowUpRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : `${summary.total_outward || 0} Outwards`}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Today: {summary.outward_today || 0}</span>
            <span>Pending Dispatch: {summary.pending_dispatch || 0}</span>
          </div>
        </div>
      </div>

      {/* ACTION REQUIRED Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Action Required (Attention Needed)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Click any card to open the filtered workflow
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {actionRequired.map((item) => {
            const isRed = item.severity === "critical";
            const isOrange = item.severity === "warning";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(`${item.route}?${item.filter_param}`)}
                className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition hover:scale-[1.02] ${
                  isRed
                    ? "border-red-200 bg-red-50/80 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30"
                    : isOrange
                    ? "border-amber-200 bg-amber-50/80 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30"
                    : "border-blue-200 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30"
                }`}
              >
                <span className="text-xl font-extrabold text-slate-900 dark:text-gray-100">
                  {loading ? "..." : item.count}
                </span>
                <span className="mt-1 text-xs font-semibold text-slate-700 dark:text-gray-300">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selling Mode Awareness & Stock Movement Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Selling Mode Awareness */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
              <PieChart className="h-4 w-4 text-blue-600" />
              Selling Mode Breakdown
            </h3>
            <span className="text-[11px] text-slate-400">Respects Pieces / Packs / Cut</span>
          </div>

          <div className="space-y-3">
            {/* Pieces */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-gray-300">Piece Mode (Unit Stock)</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {loading ? "..." : `${Number(inventory.selling_modes?.piece?.total_qty || 0).toLocaleString()} Pcs`}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400 flex justify-between">
                <span>{inventory.selling_modes?.piece?.product_count || 0} Products</span>
                <span>Value: {formatCurrency(inventory.selling_modes?.piece?.cost_value)}</span>
              </div>
            </div>

            {/* Packs */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-gray-300">Pack Mode (Pack Stock)</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {loading ? "..." : `${Number(inventory.selling_modes?.pack?.total_qty || 0).toLocaleString()} Packs`}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400 flex justify-between">
                <span>{inventory.selling_modes?.pack?.product_count || 0} Products</span>
                <span>Value: {formatCurrency(inventory.selling_modes?.pack?.cost_value)}</span>
              </div>
            </div>

            {/* Cut Stock */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-gray-300">Cut Mode (Fabric / Length)</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {loading ? "..." : `${Number(inventory.selling_modes?.cut?.total_qty || 0).toLocaleString()} Mtrs`}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400 flex justify-between">
                <span>{inventory.selling_modes?.cut?.product_count || 0} Products</span>
                <span>Value: {formatCurrency(inventory.selling_modes?.cut?.cost_value)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-gray-300">
              <span>Physical Stock Accuracy</span>
              <span className="text-emerald-600 dark:text-emerald-400">{performance.stock_accuracy || "98.5%"}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
              <span>On-Time Dispatch Rate</span>
              <span>{performance.on_time_dispatch_rate || "96.2%"}</span>
            </div>
          </div>
        </div>

        {/* Middle & Right: Incoming Stream & Stock Movement Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Movement Daily Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Stock Movement Timeline (Inward vs Outward)
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Inward
                </span>
                <span className="flex items-center gap-1 text-purple-600">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span> Outward
                </span>
              </div>
            </div>

            {stockMovementChart.length > 0 ? (
              <div className="grid grid-cols-7 gap-2 pt-4">
                {stockMovementChart.map((item) => {
                  const maxVal = Math.max(
                    ...stockMovementChart.map((d) => Math.max(d.incoming || 0, d.outgoing || 0)),
                    10
                  );
                  const incHeight = Math.min(100, Math.round(((item.incoming || 0) / maxVal) * 100));
                  const outHeight = Math.min(100, Math.round(((item.outgoing || 0) / maxVal) * 100));

                  return (
                    <div key={item.raw_date} className="flex flex-col items-center gap-1 text-center">
                      <div className="flex h-28 w-full items-end justify-center gap-1 rounded bg-slate-50 p-1 dark:bg-gray-700/40">
                        <div
                          style={{ height: `${incHeight}%` }}
                          className="w-2.5 rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                          title={`Inward: ${item.incoming}`}
                        />
                        <div
                          style={{ height: `${outHeight}%` }}
                          className="w-2.5 rounded-t bg-purple-500 transition-all hover:bg-purple-600"
                          title={`Outward: ${item.outgoing}`}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No stock movements in range</div>
            )}
          </div>

          {/* Incoming Goods Stream */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
                <Truck className="h-4 w-4 text-blue-600" />
                Recent Inward Shipments & Direct Purchases
              </h3>
              <button
                onClick={() => navigate("/warehouse/direct-purchase")}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View all incoming
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Purchase / Inv No</th>
                    <th className="pb-2">Supplier</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {incoming.length > 0 ? (
                    incoming.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => navigate(`/warehouse/direct-purchase`)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">
                          {row.purchase_no || row.invoice_no || `PUR-${row.id}`}
                        </td>
                        <td className="py-2.5 text-slate-700 dark:text-gray-300">{row.supplier_name}</td>
                        <td className="py-2.5 text-right font-mono font-semibold">
                          {Number(row.total_qty || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono">{formatCurrency(row.total_amount)}</td>
                        <td className="py-2.5 text-center">
                          <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {row.status || "Completed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No incoming shipments recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock & Reorder Alerts Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">
              Low Stock & Reorder Level Alerts
            </h3>
          </div>
          <button
            onClick={() => navigate("/warehouse/item-locator?stock_filter=low_stock")}
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Open Item Locator
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2">Product Name</th>
                <th className="pb-2">Size / Color</th>
                <th className="pb-2">Barcode</th>
                <th className="pb-2">Store</th>
                <th className="pb-2 text-right">Available</th>
                <th className="pb-2 text-right">Reorder Level</th>
                <th className="pb-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {alerts.length > 0 ? (
                alerts.map((row) => {
                  const isOut = Number(row.current_stock || 0) <= 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                      <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">
                        {row.product_name}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-gray-400">
                        {row.size} / {row.color}
                      </td>
                      <td className="py-2.5 font-mono text-slate-500">{row.barcode}</td>
                      <td className="py-2.5 text-slate-600 dark:text-gray-400">{row.store_name}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-gray-100">
                        {Number(row.current_stock || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-500">
                        {row.reorder_level || 10}
                      </td>
                      <td className="py-2.5 text-center">
                        {isOut ? (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            OUT OF STOCK
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            LOW STOCK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    🎉 All product stocks are healthy and above reorder levels!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
