import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Wallet, RotateCcw, CreditCard } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function SalesKpiSummary({ summary = {}, performance = {}, loading }) {
  const navigate = useNavigate();

  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        onClick={() => navigate("/sales/pos-sales")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Today's Sales</span>
          <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : formatCurrency(summary.today_sales_amount)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>Bills: {Number(summary.today_bills_count || 0).toLocaleString()}</span>
          <span>Qty: {Number(summary.today_qty_sold || 0).toLocaleString()}</span>
        </div>
      </div>

      <div
        onClick={() => navigate("/sales/reports")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Net Sales (Period)</span>
          <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
          {loading ? "..." : formatCurrency(summary.net_sales_amount)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>Gross: {formatCurrency(summary.range_sales_amount)}</span>
          <span>Bills: {summary.range_bills_count || 0}</span>
        </div>
      </div>

      <div
        onClick={() => navigate("/sales/pos-sales-return")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-rose-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Returns (Period)</span>
          <RotateCcw className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : formatCurrency(summary.returns_amount)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>{summary.returns_count || 0} Returns</span>
          <span>Rate: {performance.return_rate || "0%"}</span>
        </div>
      </div>

      <div
        onClick={() => navigate("/sales/pos-sales?filter=credit")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Credit Pending</span>
          <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
          {loading ? "..." : formatCurrency(summary.credit_pending_amount)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>Ratio: {performance.credit_sales_ratio || "0%"}</span>
          <span>Open Registers: {summary.open_registers_count || 0}</span>
        </div>
      </div>
    </div>
  );
}
