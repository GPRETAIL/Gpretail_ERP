import React from "react";
import { Table2 } from "lucide-react";
import { formatCurrency, wholeNumber } from "../../../utils/dashboardFormatters";

export default function StoreComparisonTable({ comparison = [] }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
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
  );
}
