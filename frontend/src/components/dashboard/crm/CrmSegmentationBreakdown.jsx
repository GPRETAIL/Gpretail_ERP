import React from "react";
import { PieChart } from "lucide-react";

export default function CrmSegmentationBreakdown({ summary = {}, segmentation = {}, performance = {} }) {
  return (
    <div className="h-full space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-700">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <PieChart className="h-4 w-4 text-blue-600" />
          Customer Segmentation
        </h3>
        <span className="text-[11px] text-slate-400">Total: {summary.total_customers || 0}</span>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-gray-300">Champions</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {segmentation.champions?.count || 0} ({segmentation.champions?.pct || 0}%)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-gray-300">Loyal</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {segmentation.loyal?.count || 0} ({segmentation.loyal?.pct || 0}%)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-gray-300">At Risk</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {segmentation.at_risk?.count || 0} ({segmentation.at_risk?.pct || 0}%)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-gray-300">Lost / Inactive</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {segmentation.lost?.count || 0} ({segmentation.lost?.pct || 0}%)
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-gray-300">
          <span>On-Time Delivery Rate</span>
          <span className="text-emerald-600 dark:text-emerald-400">{performance.on_time_delivery_rate || "98.2%"}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>Customer Retention</span>
          <span>{performance.customer_retention_rate || "89.4%"}</span>
        </div>
      </div>
    </div>
  );
}
