import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, ShoppingCart, RotateCcw, Repeat, CreditCard, Undo2 } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

const TILES = [
  { key: "sales", label: "Sales", icon: ShoppingCart, color: "blue", route: "/sales/pos-sales" },
  { key: "returns", label: "Returns", icon: RotateCcw, color: "rose", route: "/sales/pos-sales-return" },
  { key: "exchanges", label: "Exchanges", icon: Repeat, color: "purple", route: "/sales/pos-sales-return" },
  { key: "credit", label: "Credit Sales", icon: CreditCard, color: "amber", route: "/sales/pos-sales?filter=credit" },
  { key: "refunds", label: "Refunds", icon: Undo2, color: "slate", route: "/sales/pos-sales-return" },
];

const COLOR_CLASSES = {
  blue: "border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  rose: "border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
  purple:
    "border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  amber:
    "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  slate: "border-slate-200 bg-slate-50/80 dark:border-gray-700 dark:bg-gray-700/40 text-slate-600 dark:text-gray-400",
};

export default function SalesModuleBreakdown({ transactionBreakdown = {}, loading }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Sales Module Breakdown</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((tile) => {
          const stats = transactionBreakdown[tile.key] || { count: 0, amount: 0 };
          const Icon = tile.icon;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => navigate(tile.route)}
              className={`flex flex-col items-start rounded-lg border p-3 text-left transition hover:scale-[1.02] ${COLOR_CLASSES[tile.color]}`}
            >
              <Icon className="h-4 w-4" />
              <span className="mt-2 text-lg font-extrabold text-slate-900 dark:text-gray-100">
                {loading ? "..." : formatCurrency(stats.amount)}
              </span>
              <span className="text-xs font-semibold">{tile.label}</span>
              <span className="text-[11px] text-slate-500 dark:text-gray-400">{stats.count} txns</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
