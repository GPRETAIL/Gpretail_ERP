import React from "react";
import { BarChart3 } from "lucide-react";

export default function WarehouseStockMovementChart({ stockMovementChart = [] }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          Stock Movement Timeline (Inward vs Outward)
        </h3>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Inward
          </span>
          <span className="flex items-center gap-1 text-purple-600">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span> Outward
          </span>
        </div>
      </div>

      {stockMovementChart.length > 0 ? (
        <div className="grid grid-cols-7 gap-2 pt-4">
          {stockMovementChart.map((item) => {
            const maxVal = Math.max(
              ...stockMovementChart.map((d) => Math.max(d.incoming || 0, d.outgoing || 0)),
              10
            );
            const incHeight = Math.min(100, Math.round(((item.incoming || 0) / maxVal) * 100));
            const outHeight = Math.min(100, Math.round(((item.outgoing || 0) / maxVal) * 100));

            return (
              <div key={item.raw_date} className="flex flex-col items-center gap-1 text-center">
                <div className="flex h-28 w-full items-end justify-center gap-1 rounded bg-slate-50 p-1 dark:bg-gray-700/40">
                  <div
                    style={{ height: `${incHeight}%` }}
                    className="w-2.5 rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                    title={`Inward: ${item.incoming}`}
                  />
                  <div
                    style={{ height: `${outHeight}%` }}
                    className="w-2.5 rounded-t bg-purple-500 transition-all hover:bg-purple-600"
                    title={`Outward: ${item.outgoing}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">{item.date}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">No stock movements in range</div>
      )}
    </div>
  );
}
