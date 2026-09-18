import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurClass = (privacyMode) => (privacyMode ? "blur-sm select-none" : "");

export function TotalStockUnitsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/warehouse/stock-item")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Total Stock Units</span>
        <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : Number(summary.total_stock_qty || 0).toLocaleString()}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Avail: {Number(summary.total_available_qty || 0).toLocaleString()}</span>
        <span>Allocated: {Number(summary.total_allocated_qty || 0).toLocaleString()}</span>
      </div>
    </div>
  );
}

export function TotalStockValueCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/warehouse/reports")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Total Stock Value</span>
        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 ${blurClass(privacyMode)}`}>
        {loading ? "..." : formatCurrency(summary.total_cost_value)}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Cost: {formatCurrency(summary.total_cost_value)}</span>
        <span>Retail: {formatCurrency(summary.total_retail_value)}</span>
      </div>
    </div>
  );
}

export function IncomingGoodsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/warehouse/direct-purchase")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Incoming Goods</span>
        <ArrowDownRight className="h-5 w-5 text-sky-600 dark:text-sky-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : `${summary.total_incoming || 0} Shipments`}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Pending: {summary.pending_purchases || 0}</span>
        <span>Completed: {(summary.total_incoming || 0) - (summary.pending_purchases || 0)}</span>
      </div>
    </div>
  );
}

export function StockOutwardCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/warehouse/stock-outward")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Stock Outward</span>
        <ArrowUpRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : `${summary.total_outward || 0} Outwards`}
      </div>
      <div className={`mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        <span>Today: {summary.outward_today || 0}</span>
        <span>Pending Dispatch: {summary.pending_dispatch || 0}</span>
      </div>
    </div>
  );
}
