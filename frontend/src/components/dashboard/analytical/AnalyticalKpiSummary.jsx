import React from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Tag, FolderTree, Truck } from "lucide-react";
import { wholeNumber } from "../../../utils/dashboardFormatters";

export default function AnalyticalKpiSummary({ summary = {}, loading }) {
  const navigate = useNavigate();

  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  );
}
