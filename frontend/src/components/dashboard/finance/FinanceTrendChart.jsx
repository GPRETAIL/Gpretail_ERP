import React from "react";
import { BarChart3 } from "lucide-react";

export default function FinanceTrendChart({ trendChart = [] }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          Purchases vs Payments Timeline
        </h3>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1 text-purple-600">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span> Purchases
          </span>
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Payments
          </span>
        </div>
      </div>
      {trendChart.length > 0 ? (
        <div className="grid grid-cols-7 gap-2 pt-4 overflow-x-auto">
          {trendChart.map((item) => {
            const maxVal = Math.max(...trendChart.map((d) => Math.max(d.purchases || 0, d.payments || 0)), 10);
            const purchaseHeight = Math.min(100, Math.round(((item.purchases || 0) / maxVal) * 100));
            const paymentHeight = Math.min(100, Math.round(((item.payments || 0) / maxVal) * 100));
            return (
              <div key={item.raw_date} className="flex flex-col items-center gap-1 text-center">
                <div className="flex h-28 w-full items-end justify-center gap-1 rounded bg-slate-50 p-1 dark:bg-gray-700/40">
                  <div style={{ height: `${purchaseHeight}%` }} className="w-2.5 rounded-t bg-purple-500" title={`Purchases: ${item.purchases}`} />
                  <div style={{ height: `${paymentHeight}%` }} className="w-2.5 rounded-t bg-emerald-500" title={`Payments: ${item.payments}`} />
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">{item.date}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">No activity in range</div>
      )}
    </div>
  );
}
