import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  Tag,
  FolderTree,
  Truck,
  AlertOctagon,
  Sparkles,
  Compass,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import api from "../api/axios";

const formatCurrency = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};
const wholeNumber = (val) => Number(val || 0).toLocaleString("en-IN");

export default function AnalyticalDashboardTabPane({ active, fromDate, toDate, companyId }) {
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

      const res = await api.get("/analytical/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load analytical data.");
      }
    } catch (err) {
      console.error("Analytical Tab fetch error:", err);
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
  const dataQuality = data?.data_quality || [];
  const insights = data?.insights || {};
  const quickLinks = data?.quick_links || [];

  return (
    <div className="space-y-6">
      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => navigate("/analytical/stock-analyzer")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Products With Stock</span>
            <Boxes className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.products_with_stock)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Brands Tracked</span>
            <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.brands_tracked)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Categories Tracked</span>
            <FolderTree className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.categories_tracked)}
          </div>
        </div>

        <div
          onClick={() => navigate("/analytical/purchase-analyzer")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Suppliers With Purchases</span>
            <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.suppliers_with_purchases)}
          </div>
        </div>
      </div>

      {/* DATA QUALITY Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Analytics Data Quality
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Gaps that skew pivot reports into "(Blank)" buckets
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {dataQuality.map((item) => {
            const isOrange = item.severity === "warning";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(`${item.route}?${item.filter_param}`)}
                className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition hover:scale-[1.02] ${
                  isOrange
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

      {/* Cross-Module Insights & Quick Links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Cross-Module Insights</h3>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-gray-400">Top Brand by Stock Value</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-gray-200">{loading ? "..." : insights.top_brand_by_stock_value?.name}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{loading ? "" : formatCurrency(insights.top_brand_by_stock_value?.value)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-gray-400">Top Category by Sales</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-gray-200">{loading ? "..." : insights.top_category_by_sales?.name}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{loading ? "" : formatCurrency(insights.top_category_by_sales?.value)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-gray-400">Top Supplier by Purchase Value</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-gray-200">{loading ? "..." : insights.top_supplier_by_purchase?.name}</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{loading ? "" : formatCurrency(insights.top_supplier_by_purchase?.value)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Compass className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Analytics Launchpad</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => navigate(link.path)}
                className="group flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:bg-blue-950/30"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-gray-200">{link.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-gray-400">{link.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
