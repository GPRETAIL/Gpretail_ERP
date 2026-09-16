import React from "react";
import { useNavigate } from "react-router-dom";
import { Cake } from "lucide-react";

export default function CrmCelebrationsTable({ upcomingEvents = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <Cake className="h-4 w-4 text-rose-500" />
          Celebrations & Loyalty Engagement
        </h3>
        <button
          onClick={() => navigate("/crm/customer")}
          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          View all customers
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-2">Customer</th>
              <th className="pb-2">Contact</th>
              <th className="pb-2">Occasion</th>
              <th className="pb-2 text-right">Points</th>
              <th className="pb-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                  <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">{row.name}</td>
                  <td className="py-2.5 font-mono text-slate-600 dark:text-gray-400">{row.phone}</td>
                  <td className="py-2.5">
                    <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      {row.event_type} ({row.event_date})
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-purple-600">
                    {Number(row.points || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-center">
                    <button
                      onClick={() => navigate(`/crm/customer/${row.id}/profile`)}
                      className="text-blue-600 hover:underline text-xs font-semibold"
                    >
                      360 Profile →
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No upcoming birthdays or anniversaries this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
