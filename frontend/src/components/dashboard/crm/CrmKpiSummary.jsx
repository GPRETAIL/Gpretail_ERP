import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShoppingBag, CreditCard, Award } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function CrmKpiSummary({ summary = {}, loading }) {
  const navigate = useNavigate();

  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        onClick={() => navigate("/crm/customer")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : Number(summary.total_customers || 0).toLocaleString()}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>Active: {Number(summary.active_customers || 0).toLocaleString()}</span>
          <span className="text-emerald-600 font-semibold">+{summary.new_customers || 0} New</span>
        </div>
      </div>

      <div
        onClick={() => navigate("/crm/customer-orders")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Customer Orders</span>
          <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
          {loading ? "..." : formatCurrency(summary.total_order_value)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>{summary.total_orders || 0} Orders</span>
          <span>Advance: {formatCurrency(summary.advance_received)}</span>
        </div>
      </div>

      <div
        onClick={() => navigate("/crm/customer?filter=has_dues")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Customer Receivables</span>
          <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
          {loading ? "..." : formatCurrency(summary.total_receivables)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>Order Balance: {formatCurrency(summary.balance_receivable)}</span>
          <span>{summary.customers_with_dues || 0} Clients Due</span>
        </div>
      </div>

      <div
        onClick={() => navigate("/crm/loyalty-management")}
        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
          <span className="text-xs font-bold uppercase tracking-wider">Loyalty Points</span>
          <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="mt-2 text-2xl font-extrabold text-purple-600 dark:text-purple-400">
          {loading ? "..." : Number(summary.total_loyalty_points || 0).toLocaleString()} Pts
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
          <span>{summary.loyalty_members_count || 0} Members</span>
          <span>Redeemed: {Number(summary.total_points_redeemed || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
