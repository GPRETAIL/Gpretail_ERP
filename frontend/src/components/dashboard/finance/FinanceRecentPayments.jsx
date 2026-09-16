import React from "react";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function FinanceRecentPayments({ recentPayments = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <Receipt className="h-4 w-4 text-blue-600" />
          Recent Supplier Payments
        </h3>
        <button
          onClick={() => navigate("/finance/supplier-payment")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View all payments
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Payment No</th>
              <th className="pb-2">Supplier</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-center">Mode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {recentPayments.length > 0 ? (
              recentPayments.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                  <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">{row.payment_no}</td>
                  <td className="py-2.5 text-slate-700 dark:text-gray-300">{row.supplier_name}</td>
                  <td className="py-2.5 text-right font-mono">{formatCurrency(row.amount)}</td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {row.payment_mode || "-"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  No supplier payments recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
