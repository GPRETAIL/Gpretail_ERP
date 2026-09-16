import React from "react";
import { LayoutGrid } from "lucide-react";
import { wholeNumber } from "../../../utils/dashboardFormatters";

const BREAKDOWN_COLORS = {
  products: "blue",
  brands: "indigo",
  categories: "purple",
  suppliers: "emerald",
  taxes: "amber",
  agents: "slate",
};

const COLOR_CLASSES = {
  blue: "border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  indigo:
    "border-indigo-200 bg-indigo-50/80 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400",
  purple:
    "border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  emerald:
    "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  amber:
    "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  slate: "border-slate-200 bg-slate-50/80 dark:border-gray-700 dark:bg-gray-700/40 text-slate-600 dark:text-gray-400",
};

export default function MastersBreakdown({ breakdown = {}, loading }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Master Data Overview</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(breakdown).map(([key, tile]) => (
          <div
            key={key}
            className={`flex flex-col items-start rounded-lg border p-3 ${COLOR_CLASSES[BREAKDOWN_COLORS[key] || "slate"]}`}
          >
            <span className="text-lg font-extrabold text-slate-900 dark:text-gray-100">
              {loading ? "..." : wholeNumber(tile.count)}
            </span>
            <span className="text-xs font-semibold">{tile.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
