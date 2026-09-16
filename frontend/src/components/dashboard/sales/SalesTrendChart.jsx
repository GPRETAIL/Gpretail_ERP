import React from "react";
import { BarChart3 } from "lucide-react";

export default function SalesTrendChart({ salesTrendChart = [] }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          Sales vs Returns Timeline
        </h3>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Sales
          </span>
          <span className="flex items-center gap-1 text-rose-600">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Returns
          </span>
        </div>
      </div>

      {salesTrendChart.length > 0 ? (
        <div className="grid grid-cols-7 gap-2 pt-4 overflow-x-auto">
          {salesTrendChart.map((item) => {
            const maxVal = Math.max(...salesTrendChart.map((d) => Math.max(d.sales || 0, d.returns || 0)), 10);
            const salesHeight = Math.min(100, Math.round(((item.sales || 0) / maxVal) * 100));
            const returnsHeight = Math.min(100, Math.round(((item.returns || 0) / maxVal) * 100));

            return (
              <div key={item.raw_date} className="flex flex-col items-center gap-1 text-center">
                <div className="flex h-28 w-full items-end justify-center gap-1 rounded bg-slate-50 p-1 dark:bg-gray-700/40">
                  <div
                    style={{ height: `${salesHeight}%` }}
                    className="w-2.5 rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                    title={`Sales: ${item.sales}`}
                  />
                  <div
                    style={{ height: `${returnsHeight}%` }}
                    className="w-2.5 rounded-t bg-rose-500 transition-all hover:bg-rose-600"
                    title={`Returns: ${item.returns}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">{item.date}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">No sales movements in range</div>
      )}
    </div>
  );
}
