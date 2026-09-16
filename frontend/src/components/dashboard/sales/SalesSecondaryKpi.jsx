import React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Receipt, Package } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function SalesSecondaryKpi({ summary = {}, loading }) {
  const navigate = useNavigate();

  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-3">
      <div
        onClick={() => navigate("/sales/reports")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Monthly Sales</span>
          <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : formatCurrency(summary.month_sales_amount)}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
          {summary.month_bills_count || 0} bills this calendar month
        </div>
      </div>

      <div
        onClick={() => navigate("/sales/pos-sales")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Total Invoices (Period)</span>
          <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : Number(summary.range_bills_count || 0).toLocaleString()}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
          {Number(summary.today_bills_count || 0).toLocaleString()} today
        </div>
      </div>

      <div
        onClick={() => navigate("/sales/reports")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Products Sold (Period)</span>
          <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : Number(summary.distinct_products_sold || 0).toLocaleString()}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
          {Number(summary.range_qty_sold || 0).toLocaleString()} units sold
        </div>
      </div>
    </div>
  );
}
