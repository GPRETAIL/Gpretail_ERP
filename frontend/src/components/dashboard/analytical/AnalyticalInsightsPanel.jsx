import React from "react";
import { Sparkles } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function AnalyticalInsightsPanel({ insights = {}, loading }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Cross-Module Insights</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-gray-400">Top Brand by Stock Value</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-medium text-slate-800 dark:text-gray-200">
              {loading ? "..." : insights.top_brand_by_stock_value?.name}
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {loading ? "" : formatCurrency(insights.top_brand_by_stock_value?.value)}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-gray-400">Top Category by Sales</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-medium text-slate-800 dark:text-gray-200">
              {loading ? "..." : insights.top_category_by_sales?.name}
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? "" : formatCurrency(insights.top_category_by_sales?.value)}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-gray-400">Top Supplier by Purchase Value</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-medium text-slate-800 dark:text-gray-200">
              {loading ? "..." : insights.top_supplier_by_purchase?.name}
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {loading ? "" : formatCurrency(insights.top_supplier_by_purchase?.value)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
