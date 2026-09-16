import React from "react";
import { BarChart3 } from "lucide-react";
import { wholeNumber } from "../../../utils/dashboardFormatters";

export default function MastersCategoryChart({ categoryChart = [] }) {
  const maxCategoryCount = Math.max(...categoryChart.map((c) => c.count || 0), 1);

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
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
  );
}
