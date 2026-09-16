import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { formatCurrency } from "../../../utils/dashboardFormatters";

const STATUS_BADGES = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  ready: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  ready_for_delivery: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function CrmRecentOrdersTable({ recentOrders = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Recent Customer Orders</h3>
        </div>
        <button
          onClick={() => navigate("/crm/customer-orders")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View all orders
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Order No</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-right">Balance</th>
              <th className="pb-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {recentOrders.length > 0 ? (
              recentOrders.map((ord) => (
                <tr
                  key={ord.id}
                  onClick={() => navigate(`/crm/customer-orders/${ord.id}`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">
                    {ord.order_no || `#${ord.id}`}
                  </td>
                  <td className="py-2.5 text-slate-800 dark:text-gray-200">{ord.customer_name}</td>
                  <td className="py-2.5 text-right font-mono font-semibold">{formatCurrency(ord.net_amount)}</td>
                  <td className="py-2.5 text-right font-mono text-amber-600">
                    {Number(ord.balance_due || 0) > 0 ? formatCurrency(ord.balance_due) : "₹0.00"}
                  </td>
                  <td className="py-2.5 text-center">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        STATUS_BADGES[ord.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ord.status || "Pending"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No recent customer orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
