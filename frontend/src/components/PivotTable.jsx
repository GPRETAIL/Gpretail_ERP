import React, { useMemo } from "react";
import { Box, Table, TableBody, TableCell, TableFooter, TableHead, TableRow, Typography } from "@mui/material";
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

const stickyFirstColSx = { position: "sticky", left: 0, zIndex: 1 };

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
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0, bgcolor: "background.paper", borderRadius: "5.25px", border: 1, borderColor: "divider", boxShadow: 1, px: 1.5, pt: 1.5, pb: 0.0625 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, color: "text.primary" }}>{title}</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
            Measure: <Box component="span" sx={{ fontWeight: 500, color: "#4f46e5" }}>{measureLabel}</Box>
            {" "}— {rows.length} row{rows.length !== 1 ? "s" : ""} × {columns.length} column{columns.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
        <ExportBottomSheet
          columns={exportColumns}
          rows={exportRows}
          rowKey="dimension"
          fileName={exportFileName}
          title={title}
          sheetName="Pivot"
          buttonClassName="glass-btn glass-btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", border: 1, borderColor: "divider", borderRadius: "3.5px" }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "text.secondary", py: 6 }}>
            Loading pivot...
          </Box>
        ) : !hasData ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "text.disabled", py: 6 }}>
            {emptyText}
          </Box>
        ) : (
          <Table size="small" sx={{ width: "100%", minWidth: "max-content", fontSize: 12 }} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...stickyFirstColSx, textAlign: "left", fontWeight: 600, color: "text.secondary", minWidth: 160, bgcolor: "action.hover" }}>
                  {rowLabel || "Row"}
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} align="right" sx={{ fontWeight: 600, color: "text.secondary", minWidth: 110, whiteSpace: "nowrap" }}>
                    {c.label}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 600, color: "text.primary", minWidth: 110, bgcolor: "action.hover" }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                  <TableCell sx={{ ...stickyFirstColSx, color: "text.primary", fontWeight: 500, bgcolor: "background.paper" }}>
                    {r.label}
                  </TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.key} align="right" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {formatValue(cellValue(r.key, c.key))}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums", bgcolor: "action.hover" }}>
                    {formatValue(rowTotals[r.key])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ "& td": { borderTop: 2, borderTopColor: "#6366f1", fontWeight: 700 }, bgcolor: "action.hover" }}>
                <TableCell sx={{ ...stickyFirstColSx, color: "text.primary", bgcolor: "action.hover" }}>
                  TOTAL
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} align="right" sx={{ color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
                    {formatValue(colTotals[c.key])}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ color: "#4338ca", fontVariantNumeric: "tabular-nums" }}>
                  {formatValue(grandTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Box>
    </Box>
  );
};

export default PivotTable;
