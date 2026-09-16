import React from "react";
import { Trophy } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function SalesLeaderboard({ topSalesPersons = [] }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Sales Person Leaderboard</h3>
      </div>
      <div className="space-y-2">
        {topSalesPersons.length > 0 ? (
          topSalesPersons.map((row, idx) => (
            <div
              key={row.sales_man_name}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-700/50"
            >
              <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-gray-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {idx + 1}
                </span>
                {row.sales_man_name}
              </span>
              <span className="text-right">
                <div className="font-bold text-slate-900 dark:text-gray-100">{formatCurrency(row.amount)}</div>
                <div className="text-[10px] text-slate-500 dark:text-gray-400">{row.bills} bills</div>
              </span>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-xs text-slate-400">No sales-person data in range</div>
        )}
      </div>
    </div>
  );
}
