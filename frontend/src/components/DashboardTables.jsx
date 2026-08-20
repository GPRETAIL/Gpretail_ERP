import React from "react";

const tableCardClass = "rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 min-h-[320px]";

const formatWholeAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatQuantity = (value) => `${formatWholeAmount(value)} pcs`;

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  const formatted = formatWholeAmount(Math.abs(amount));
  if (amount < 0) return `-₹${formatted}`;
  return `₹${formatted}`;
};

const amountClass = (value) => (Number(value || 0) < 0 ? "text-rose-600 dark:text-rose-400" : "text-teal-700 dark:text-teal-400");

const methodDotClass = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  violet: "bg-purple-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  orange: "bg-amber-500",
  rose: "bg-red-500",
  red: "bg-red-500",
  slate: "bg-slate-500",
};

export const DailySalesSummaryTable = ({ table, loading }) => {
  const rows = table?.rows || [];
  const totals = table?.totals || { count: 0, quantity: 0, value: 0 };

  return (
    <div className={tableCardClass}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{table?.title || "Daily Sales Summary"}</h2>
      </div>
      {loading ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-gray-400">Loading table...</div>
      ) : (
        <div className="dashboard-card-scroll max-h-[320px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left text-xs text-slate-500 dark:text-gray-400">
                <th className="pb-2 pr-3 font-medium">Company</th>
                <th className="pb-2 pr-3 font-medium">Location</th>
                <th className="pb-2 pr-3 text-right font-medium">Count</th>
                <th className="pb-2 pr-3 text-right font-medium">Quantity</th>
                <th className="pb-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={`${row.company}-${row.location}`} className="border-b border-slate-100 dark:border-gray-700">
                    <td className="py-2 pr-3 text-slate-800 dark:text-gray-200">{row.company}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-gray-300">{row.location}</td>
                    <td className="py-2 pr-3 text-right text-slate-800 dark:text-gray-200">{formatWholeAmount(row.count)}</td>
                    <td className="py-2 pr-3 text-right text-slate-800 dark:text-gray-200">{formatQuantity(row.quantity)}</td>
                    <td className={`py-2 text-right font-medium ${amountClass(row.value)}`}>
                      {formatCurrency(row.value)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-500 dark:text-gray-400">
                    No sales in this range
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length ? (
              <tfoot>
                {/* sticky bottom-0: the Total row must never require scrolling past the body rows
                    to see -- that's the whole point of a total. */}
                <tr className="sticky bottom-0 z-10 border-t-2 border-indigo-500 bg-white dark:bg-gray-800 text-sm font-semibold text-slate-900 dark:text-gray-100">
                  <td className="pt-3 pb-1 pr-3" colSpan={2}>
                    Total
                  </td>
                  <td className="pt-3 pb-1 pr-3 text-right">{formatWholeAmount(totals.count)}</td>
                  <td className="pt-3 pb-1 pr-3 text-right">{formatQuantity(totals.quantity)}</td>
                  <td className={`pt-3 pb-1 text-right ${amountClass(totals.value)}`}>{formatCurrency(totals.value)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </div>
  );
};

const SettlementDetailsTable = ({ table, loading }) => {
  const columns = table?.columns || [];
  const rows = table?.rows || [];
  const columnTotals = table?.columnTotals || {};
  const grandTotal = table?.grandTotal || 0;

  return (
    <div className={`${tableCardClass} min-w-0 flex flex-col`}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{table?.title || "Settlement Details"}</h2>
      </div>
      {loading ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-gray-400">Loading table...</div>
      ) : (
        <div className="dashboard-card-scroll max-h-[320px] overflow-x-auto overflow-y-auto w-full">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left text-xs text-slate-500 dark:text-gray-400">
                <th className="pb-2 pr-3 font-medium min-w-[130px]">Method</th>
                {columns.map((column) => (
                  <th key={column.key} className="pb-2 px-3 text-right font-medium min-w-[110px]">
                    {column.label}
                  </th>
                ))}
                <th className="pb-2 pl-3 text-right font-medium min-w-[110px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length && columns.length ? (
                rows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 dark:border-gray-700 hover:bg-slate-50/50 dark:hover:bg-gray-750/50">
                    <td className="py-2 pr-3 text-slate-800 dark:text-gray-200">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${methodDotClass[row.color] || "bg-slate-400"}`}
                        />
                        {row.label}
                      </span>
                    </td>
                    {columns.map((column) => (
                      <td
                        key={`${row.key}-${column.key}`}
                        className={`py-2 px-3 text-right ${amountClass(row.values?.[column.key])}`}
                      >
                        {formatCurrency(row.values?.[column.key])}
                      </td>
                    ))}
                    <td className={`py-2 pl-3 text-right font-medium ${amountClass(row.total)}`}>
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Math.max(columns.length + 2, 2)} className="py-8 text-center text-sm text-slate-500 dark:text-gray-400">
                    No settlements in this range
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length && columns.length ? (
              <tfoot>
                <tr className="sticky bottom-0 z-10 border-t-2 border-indigo-500 bg-white dark:bg-gray-800 text-sm font-semibold text-slate-900 dark:text-gray-100">
                  <td className="pt-3 pb-1 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
                      Total
                    </span>
                  </td>
                  {columns.map((column) => (
                    <td
                      key={`total-${column.key}`}
                      className={`pt-3 pb-1 px-3 text-right ${amountClass(columnTotals[column.key])}`}
                    >
                      {formatCurrency(columnTotals[column.key])}
                    </td>
                  ))}
                  <td className={`pt-3 pb-1 pl-3 text-right ${amountClass(grandTotal)}`}>{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </div>
  );
};

const DashboardTables = ({ tables, loading }) => (
  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
    <DailySalesSummaryTable table={tables?.dailySalesSummary} loading={loading} />
    <SettlementDetailsTable table={tables?.settlementDetails} loading={loading} />
  </div>
);

export default DashboardTables;
