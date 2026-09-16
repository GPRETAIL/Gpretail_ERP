import React from "react";
import { Building2 } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function FinanceTopPayables({ topPayables = [] }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Top Outstanding Suppliers</h3>
      </div>
      <div className="space-y-2">
        {topPayables.length > 0 ? (
          topPayables.map((row, idx) => (
            <div
              key={`${row.supplier_id}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-700/50"
            >
              <span className="font-medium text-slate-700 dark:text-gray-300">{row.supplier_name}</span>
              <span className="text-right">
                <div className="font-bold text-red-600 dark:text-red-400">{formatCurrency(row.outstanding)}</div>
                <div className="text-[10px] text-slate-500 dark:text-gray-400">{row.bills} bills</div>
              </span>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-xs text-slate-400">No outstanding payables</div>
        )}
      </div>
    </div>
  );
}
