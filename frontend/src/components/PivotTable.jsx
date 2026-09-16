import React, { useMemo } from "react";
import ExportBottomSheet from "./ExportBottomSheet";

/**
 * Bounded rows x columns cross-tab -- one row-dimension column, one column per
 * column-dimension value, one measure per cell, row/column/grand totals.
 * Modeled directly on DashboardTables.jsx's SettlementDetailsTable (the one
 * genuine cross-tab in the app before this), parameterized instead of
 * hardcoded to 6 payment methods x stores.
 *
 * Consumes the {rows,columns,cells,rowTotals,colTotals,grandTotal} shape both
 * GroupAggregationService::crossTab() and ProductPurchaseAnalyticsController
 * return, so callers don't need to know which backend path produced the data.
 *
 * Deliberately not a drag/drop pivot builder -- no client-side dimension
 * reassignment. That's what a future "Report Builder" would be; this is a
 * curated set of flagship reports each with a fixed pair of pickable axes.
 */
const formatValue = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const PivotTable = ({
  title,
  rowLabel = "",
  measureLabel = "Value",
  rows = [],
  columns = [],
  cells = {},
  rowTotals = {},
  colTotals = {},
  grandTotal = 0,
  loading = false,
  emptyText = "No data for this selection",
  exportFileName = "pivot",
}) => {
  const cellValue = (rowKey, colKey) => Number(cells?.[rowKey]?.[colKey] || 0);
  const fmtRaw = (v) => Number(v || 0);

  const exportColumns = useMemo(() => {
    const cols = [{ key: "dimension", label: rowLabel || "Row" }];
    columns.forEach((c) => cols.push({ key: c.key, label: c.label }));
    cols.push({ key: "total", label: "Total" });
    return cols;
  }, [columns, rowLabel]);

  const exportRows = useMemo(() => {
    const body = rows.map((r) => {
      const row = { dimension: r.label, total: fmtRaw(rowTotals[r.key]) };
      columns.forEach((c) => {
        row[c.key] = fmtRaw(cellValue(r.key, c.key));
      });
      return row;
    });
    const totalsRow = { dimension: "TOTAL", total: fmtRaw(grandTotal) };
    columns.forEach((c) => {
      totalsRow[c.key] = fmtRaw(colTotals[c.key]);
    });
    body.push(totalsRow);
    return body;
  }, [rows, columns, cells, rowTotals, colTotals, grandTotal]);

  const hasData = rows.length > 0 && columns.length > 0;

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm px-3 pt-3 pb-0.5">
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-gray-100">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Measure: <span className="font-medium text-indigo-600 dark:text-indigo-400">{measureLabel}</span>
            {" "}— {rows.length} row{rows.length !== 1 ? "s" : ""} × {columns.length} column{columns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ExportBottomSheet
          columns={exportColumns}
          rows={exportRows}
          rowKey="dimension"
          fileName={exportFileName}
          title={title}
          sheetName="Pivot"
          buttonClassName="glass-btn glass-btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto border border-gray-100 dark:border-gray-700 rounded-md">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 py-12">
            Loading pivot...
          </div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 py-12">
            {emptyText}
          </div>
        ) : (
          <table className="w-full min-w-max text-xs">
            <thead>
              <tr className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 min-w-[160px] sticky left-0 bg-gray-50 dark:bg-gray-700/80 z-20">
                  {rowLabel || "Row"}
                </th>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 min-w-[110px] whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200 min-w-[110px] bg-gray-100 dark:bg-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium sticky left-0 bg-white dark:bg-gray-800">
                    {r.label}
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {formatValue(cellValue(r.key, c.key))}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-gray-100 tabular-nums bg-gray-50 dark:bg-gray-700/40">
                    {formatValue(rowTotals[r.key])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="sticky bottom-0 z-10 bg-gray-100 dark:bg-gray-700/60 border-t-2 border-indigo-500 font-bold">
                <td className="px-3 py-2.5 text-gray-800 dark:text-gray-100 sticky left-0 bg-gray-100 dark:bg-gray-700/60">
                  TOTAL
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 text-right text-gray-800 dark:text-gray-100 tabular-nums">
                    {formatValue(colTotals[c.key])}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right text-indigo-700 dark:text-indigo-400 tabular-nums">
                  {formatValue(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default PivotTable;
