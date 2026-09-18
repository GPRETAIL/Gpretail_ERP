import React from "react";
import { useNavigate } from "react-router-dom";
import { Store as StoreIcon, Boxes, Users, BarChart3 } from "lucide-react";
import { formatCurrency, wholeNumber } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurClass = (privacyMode) => (privacyMode ? "blur-sm select-none" : "");

export function StoresCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/settings/configure-local-server")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Stores</span>
        <StoreIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_stores)}
      </div>
      <div className={`mt-1 text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>Active: {wholeNumber(summary.active_stores)}</div>
    </div>
  );
}

export function ConsolidatedSalesCard({ summary = {}, loading, privacyMode }) {
  return (
    <div className="group h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Consolidated Sales</span>
        <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 ${blurClass(privacyMode)}`}>
        {loading ? "..." : formatCurrency(summary.consolidated_sales_range)}
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">Across all visible stores</div>
    </div>
  );
}

export function ConsolidatedStockValueCard({ summary = {}, loading, privacyMode }) {
  return (
    <div className="group h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Consolidated Stock Value</span>
        <Boxes className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : formatCurrency(summary.consolidated_stock_value)}
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">At retail price</div>
    </div>
  );
}

export function ActiveStaffCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/hrms/employee")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Active Staff</span>
        <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_active_staff)}
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">Across all stores</div>
    </div>
  );
}
