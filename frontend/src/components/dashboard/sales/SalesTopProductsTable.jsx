import React from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function SalesTopProductsTable({ topProducts = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <Trophy className="h-4 w-4 text-blue-600" />
          Top Selling Products
        </h3>
        <button
          onClick={() => navigate("/sales/reports")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View sales reports
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Product</th>
              <th className="pb-2 text-right">Qty Sold</th>
              <th className="pb-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {topProducts.length > 0 ? (
              topProducts.map((row) => (
                <tr key={row.product_id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                  <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">{row.product_name}</td>
                  <td className="py-2.5 text-right font-mono font-semibold">{Number(row.qty || 0).toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono">{formatCurrency(row.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate-400">
                  No product-level sales recorded in range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
