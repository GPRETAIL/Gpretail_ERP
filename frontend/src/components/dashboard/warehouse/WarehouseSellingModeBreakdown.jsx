import React from "react";
import { PieChart } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function WarehouseSellingModeBreakdown({ inventory = {}, performance = {}, loading }) {
  const modes = inventory.selling_modes || {};

  return (
    <div className="h-full space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-700">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <PieChart className="h-4 w-4 text-blue-600" />
          Selling Mode Breakdown
        </h3>
        <span className="text-[11px] text-slate-400">Respects Pieces / Packs / Cut</span>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-gray-300">Piece Mode (Unit Stock)</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {loading ? "..." : `${Number(modes.piece?.total_qty || 0).toLocaleString()} Pcs`}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-gray-400">
            <span>{modes.piece?.product_count || 0} Products</span>
            <span>Value: {formatCurrency(modes.piece?.cost_value)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-gray-300">Pack Mode (Pack Stock)</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {loading ? "..." : `${Number(modes.pack?.total_qty || 0).toLocaleString()} Packs`}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-gray-400">
            <span>{modes.pack?.product_count || 0} Products</span>
            <span>Value: {formatCurrency(modes.pack?.cost_value)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-gray-300">Cut Mode (Fabric / Length)</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {loading ? "..." : `${Number(modes.cut?.total_qty || 0).toLocaleString()} Mtrs`}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-gray-400">
            <span>{modes.cut?.product_count || 0} Products</span>
            <span>Value: {formatCurrency(modes.cut?.cost_value)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-gray-300">
          <span>Physical Stock Accuracy</span>
          <span className="text-emerald-600 dark:text-emerald-400">{performance.stock_accuracy || "98.5%"}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>On-Time Dispatch Rate</span>
          <span>{performance.on_time_dispatch_rate || "96.2%"}</span>
        </div>
      </div>
    </div>
  );
}
