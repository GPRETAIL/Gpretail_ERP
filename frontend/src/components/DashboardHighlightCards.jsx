import React from "react";
import { Package, Users } from "lucide-react";

const cardClass = "rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 min-h-[320px]";

const formatWholeAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatCurrency = (value) => `₹${formatWholeAmount(value)}`;

const LeaderboardCard = ({ table, loading, icon: Icon, emptyMessage }) => {
  const rows = table?.rows || [];

  return (
    <div className={cardClass}>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{table?.title || "Summary"}</h2>
      </div>
      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-gray-400">Loading...</div>
      ) : (
        <div className="dashboard-card-scroll max-h-[260px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-left text-xs text-slate-500 dark:text-gray-400">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 text-center font-medium">Sale Qty</th>
                <th className="px-2 py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.name} className="border-b border-slate-100 dark:border-gray-700">
                    <td className="px-2 py-2 text-slate-800 dark:text-gray-200">{row.name}</td>
                    <td className="px-2 py-2 text-center font-medium text-emerald-600 dark:text-emerald-400">
                      {formatWholeAmount(row.saleQty)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-blue-600 dark:text-blue-400">{formatCurrency(row.value)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-2 py-8 text-center text-sm text-slate-500 dark:text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const DashboardHighlightCards = ({ tables, loading }) => (
  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
    <LeaderboardCard
      table={tables?.fastMovingSection}
      loading={loading}
      icon={Package}
      emptyMessage="No product sales in this range"
    />
    <LeaderboardCard
      table={tables?.salesPersonOfTheDay}
      loading={loading}
      icon={Users}
      emptyMessage="No salesman sales in this range"
    />
  </div>
);

export default DashboardHighlightCards;
