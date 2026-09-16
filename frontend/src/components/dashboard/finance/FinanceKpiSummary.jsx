import React from "react";
import { useNavigate } from "react-router-dom";
import { HandCoins, Wallet, ShoppingBag, Receipt } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function FinanceKpiSummary({ summary = {}, loading }) {
  const navigate = useNavigate();

  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        onClick={() => navigate("/warehouse/direct-purchase?filter=unpaid")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Payables Outstanding</span>
          <HandCoins className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-red-600 dark:text-red-400">
          {loading ? "..." : formatCurrency(summary.payables_outstanding)}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">Owed to suppliers</div>
      </div>

      <div
        onClick={() => navigate("/sales/pos-sales?filter=credit")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Receivables Outstanding</span>
          <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400">
          {loading ? "..." : formatCurrency(summary.receivables_outstanding)}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">Owed by credit customers</div>
      </div>

      <div
        onClick={() => navigate("/warehouse/direct-purchase")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Purchase Value (Period)</span>
          <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : formatCurrency(summary.purchase_value_range)}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
          Payments made: {formatCurrency(summary.payments_made_range)}
        </div>
      </div>

      <div
        onClick={() => navigate("/warehouse/purchase-return")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Net Position</span>
          <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div
          className={`mt-2 text-2xl font-extrabold ${
            (summary.net_position || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {loading ? "..." : formatCurrency(summary.net_position)}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
          Refunds due: {formatCurrency(summary.refunds_due)}
        </div>
      </div>
    </div>
  );
}
