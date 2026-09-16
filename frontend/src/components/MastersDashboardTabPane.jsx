import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Tag,
  FolderTree,
  Truck,
  AlertOctagon,
  LayoutGrid,
  BarChart3,
  AlertTriangle,
  Clock,
} from "lucide-react";
import api from "../api/axios";

const wholeNumber = (val) => Number(val || 0).toLocaleString("en-IN");

const QUICK_ACTIONS = [
  { label: "+ New Product", path: "/masters/product/new", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "+ New Brand", path: "/masters/brand/new", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "+ New Supplier", path: "/masters/supplier/new", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Products List", path: "/masters/product", color: "bg-slate-700 hover:bg-slate-800 text-white" },
  { label: "Suppliers List", path: "/masters/supplier", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "Item Barcode", path: "/warehouse/barcode", color: "bg-amber-600 hover:bg-amber-700 text-white" },
];

export default function MastersDashboardTabPane({ active, companyId }) {
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
      if (companyId) params.warehouse_id = companyId;

      const res = await api.get("/masters/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load masters data.");
      }
    } catch (err) {
      console.error("Masters Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, companyId]);

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
  const breakdown = data?.breakdown || {};
  const categoryChart = data?.charts?.products_by_category || [];
  const recentProducts = data?.recent_products || [];

  const maxCategoryCount = Math.max(...categoryChart.map((c) => c.count || 0), 1);

  const breakdownColors = {
    products: "blue",
    brands: "indigo",
    categories: "purple",
    suppliers: "emerald",
    taxes: "amber",
    agents: "slate",
  };
  const colorClasses = {
    blue: "border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    indigo: "border-indigo-200 bg-indigo-50/80 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400",
    purple: "border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
    emerald: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    amber: "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
    slate: "border-slate-200 bg-slate-50/80 dark:border-gray-700 dark:bg-gray-700/40 text-slate-600 dark:text-gray-400",
  };

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
        <div
          onClick={() => navigate("/masters/product")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Products</span>
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.total_products)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Active: {wholeNumber(summary.active_products)}</span>
            <span>Inactive: {wholeNumber(summary.inactive_products)}</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/masters/brand")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Brands & Categories</span>
            <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {loading ? "..." : wholeNumber(summary.total_brands)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Brands</span>
            <span>{wholeNumber(summary.total_categories)} Categories</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/masters/supplier")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Suppliers</span>
            <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.total_suppliers)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Active: {wholeNumber(summary.active_suppliers)}</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/masters/product?filter=missing_hsn")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Data Quality Gaps</span>
            <FolderTree className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {loading ? "..." : wholeNumber(summary.missing_hsn_count)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Missing HSN</span>
            <span>{wholeNumber(summary.missing_barcode_count)} Missing Barcode</span>
          </div>
        </div>
      </div>

      {/* ACTION REQUIRED Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Action Required (Master Data Health)
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

      {/* Master Data Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Master Data Overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(breakdown).map(([key, tile]) => (
            <div
              key={key}
              className={`flex flex-col items-start rounded-lg border p-3 ${colorClasses[breakdownColors[key] || "slate"]}`}
            >
              <span className="text-lg font-extrabold text-slate-900 dark:text-gray-100">
                {loading ? "..." : wholeNumber(tile.count)}
              </span>
              <span className="text-xs font-semibold">{tile.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Chart & Recently Added Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Products by Category</h3>
          </div>
          <div className="space-y-2">
            {categoryChart.length > 0 ? (
              categoryChart.map((row) => (
                <div key={row.category_name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-gray-300">{row.category_name}</span>
                    <span className="font-bold text-slate-900 dark:text-gray-100">{wholeNumber(row.count)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-gray-600">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, Math.round((row.count / maxCategoryCount) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">No category data</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
              <Clock className="h-4 w-4 text-blue-600" />
              Recently Added Products
            </h3>
            <button
              onClick={() => navigate("/masters/product")}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              View all products
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Brand</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {recentProducts.length > 0 ? (
                  recentProducts.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate("/masters/product")}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">{row.name}</td>
                      <td className="py-2.5 text-slate-600 dark:text-gray-400">{row.brand_name}</td>
                      <td className="py-2.5 text-right font-mono">₹{Number(row.selling_price || 0).toLocaleString("en-IN")}</td>
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
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No products recorded.
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
