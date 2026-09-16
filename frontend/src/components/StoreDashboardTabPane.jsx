import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store as StoreIcon,
  Boxes,
  Users,
  AlertOctagon,
  BarChart3,
  AlertTriangle,
  Table2,
} from "lucide-react";
import api from "../api/axios";

const formatCurrency = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};
const wholeNumber = (val) => Number(val || 0).toLocaleString("en-IN");

export default function StoreDashboardTabPane({ active, fromDate, toDate }) {
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

      const res = await api.get("/store/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load store data.");
      }
    } catch (err) {
      console.error("Store Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, fromDate, toDate]);

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
  const comparison = data?.comparison || [];
  const salesChart = data?.charts?.sales_by_store || [];

  const maxStoreSales = Math.max(...salesChart.map((s) => s.amount || 0), 1);

  return (
    <div className="space-y-6">
      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => navigate("/settings/configure-local-server")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Stores</span>
            <StoreIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.total_stores)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Active: {wholeNumber(summary.active_stores)}
          </div>
        </div>

        <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Consolidated Sales</span>
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : formatCurrency(summary.consolidated_sales_range)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">Across all visible stores</div>
        </div>

        <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Consolidated Stock Value</span>
            <Boxes className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : formatCurrency(summary.consolidated_stock_value)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">At retail price</div>
        </div>

        <div
          onClick={() => navigate("/hrms/employee")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Staff</span>
            <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.total_active_staff)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">Across all stores</div>
        </div>
      </div>

      {/* ACTION REQUIRED Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Action Required (Cross-Store Operations)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Click any card to open the filtered workflow
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* Sales by Store Chart & Comparison Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Sales by Store</h3>
          </div>
          <div className="space-y-3">
            {salesChart.length > 0 ? (
              salesChart.map((row) => (
                <div key={row.store_name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-gray-300">{row.store_name}</span>
                    <span className="font-bold text-slate-900 dark:text-gray-100">{formatCurrency(row.amount)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-gray-600">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.round((row.amount / maxStoreSales) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">No sales in range</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2">
            <Table2 className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Store Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2">Store</th>
                  <th className="pb-2 text-right">Sales (Period)</th>
                  <th className="pb-2 text-right">Bills</th>
                  <th className="pb-2 text-right">Stock Value</th>
                  <th className="pb-2 text-right">Staff</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {comparison.length > 0 ? (
                  comparison.map((row) => (
                    <tr key={row.store_id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                      <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">
                        {row.store_name}
                        <span className="ml-1 text-[10px] text-slate-400">({row.store_code})</span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold">{formatCurrency(row.sales_amount)}</td>
                      <td className="py-2.5 text-right font-mono">{wholeNumber(row.bills_count)}</td>
                      <td className="py-2.5 text-right font-mono">{formatCurrency(row.stock_value)}</td>
                      <td className="py-2.5 text-right font-mono">{wholeNumber(row.staff_count)}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            row.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No stores visible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
