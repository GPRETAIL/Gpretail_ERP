import React from "react";
import { PieChart } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

const PAYMENT_MODE_COLOR = {
  CASH: "bg-emerald-500",
  CARD: "bg-blue-500",
  UPI: "bg-purple-500",
  CREDIT: "bg-amber-500",
};

export default function SalesPaymentBreakdown({ paymentBreakdown = [], performance = {} }) {
  const maxPaymentAmount = Math.max(...paymentBreakdown.map((p) => p.amount || 0), 1);

  return (
    <div className="h-full space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-700">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <PieChart className="h-4 w-4 text-blue-600" />
          Payment Mode Breakdown
        </h3>
      </div>

      <div className="space-y-3">
        {paymentBreakdown.length > 0 ? (
          paymentBreakdown.map((row) => (
            <div
              key={row.mode}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-gray-300">
                  <span className={`h-2.5 w-2.5 rounded-full ${PAYMENT_MODE_COLOR[row.mode] || "bg-slate-400"}`} />
                  {row.mode}
                </span>
                <span className="font-bold text-slate-900 dark:text-gray-100">{formatCurrency(row.amount)}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-gray-600">
                <div
                  className={`h-full rounded-full ${PAYMENT_MODE_COLOR[row.mode] || "bg-slate-400"}`}
                  style={{ width: `${Math.min(100, Math.round(((row.amount || 0) / maxPaymentAmount) * 100))}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">{row.bills} bills</div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-xs text-slate-400">No sales in range</div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-gray-300">
          <span>Avg Basket Value</span>
          <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(performance.avg_basket_value)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>Discount Rate</span>
          <span>{performance.discount_rate || "0%"}</span>
        </div>
      </div>
    </div>
  );
}
