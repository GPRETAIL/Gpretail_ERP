import React from "react";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function SalesRecentSalesTable({ recentSales = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <Receipt className="h-4 w-4 text-blue-600" />
          Recent Sales
        </h3>
        <button
          onClick={() => navigate("/sales/pos-sales")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View all sales
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Invoice No</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-center">Payment</th>
              <th className="pb-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {recentSales.length > 0 ? (
              recentSales.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate("/sales/pos-sales")}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">{row.invoice_no}</td>
                  <td className="py-2.5 text-slate-700 dark:text-gray-300">{row.customer_name}</td>
                  <td className="py-2.5 text-right font-mono">{formatCurrency(row.grand_total)}</td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {row.payment_mode || "Cash"}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {row.status || "Completed"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No sales recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
