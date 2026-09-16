import React from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck } from "lucide-react";

export default function CrmTopCustomersTable({ topCustomers = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Top Valuable Customers</h3>
        </div>
        <button
          onClick={() => navigate("/crm/customer")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View Directory
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Name</th>
              <th className="pb-2">Phone</th>
              <th className="pb-2 text-right">Points</th>
              <th className="pb-2 text-right">Orders</th>
              <th className="pb-2 text-center">360 View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {topCustomers.length > 0 ? (
              topCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => navigate(`/crm/customer/${cust.id}/profile`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">{cust.name}</td>
                  <td className="py-2.5 font-mono text-slate-600 dark:text-gray-400">{cust.phone}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-purple-600">
                    {Number(cust.loyalty_points || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono">{cust.orders_count || 0}</td>
                  <td className="py-2.5 text-center">
                    <span className="text-xs font-semibold text-blue-600 hover:underline">View →</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No customer records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
