import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Stack, Table, TableBody, TableCell, TableFooter, TableHead, TableRow, Typography } from "@mui/material";

const tableCardSx = { height: "100%", borderRadius: "5.25px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 1.5 };

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

const amountColor = (value) =>
  Number(value || 0) < 0 ? "error.main" : (theme) => (theme.palette.mode === "dark" ? "#2dd4bf" : "#0f766e");

const methodDotColor = {
  emerald: "success.main",
  blue: "info.main",
  violet: "#8b5cf6",
  purple: "#8b5cf6",
  amber: "warning.main",
  orange: "warning.main",
  rose: "error.main",
  red: "error.main",
  slate: "text.disabled",
};

export const DailySalesSummaryTable = ({ table, loading, privacyMode }) => {
  const navigate = useNavigate();
  const rows = table?.rows || [];
  const totals = table?.totals || { count: 0, quantity: 0, value: 0 };
  const blurSx = privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {};

  return (
    <Box sx={tableCardSx}>
      <Stack direction="row" sx={{ mb: 1, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>{table?.title || "Daily Sales Summary"}</Typography>
        <Button
          size="small"
          onClick={() => navigate("/sales/reports")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View All
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "text.secondary" }}>Loading table...</Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ "& .MuiTableCell-root": { py: 0.5 }, "& tbody tr:last-child td": { borderBottom: 0 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>Company</TableCell>
                <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>Location</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, color: "text.secondary" }}>Count</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, color: "text.secondary" }}>Quantity</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, color: "text.secondary" }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={`${row.company}-${row.location}`}>
                    <TableCell sx={{ color: "text.primary" }}>{row.company}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{row.location}</TableCell>
                    <TableCell align="right" sx={{ color: "text.primary", ...blurSx }}>{formatWholeAmount(row.count)}</TableCell>
                    <TableCell align="right" sx={{ color: "text.primary", ...blurSx }}>{formatQuantity(row.quantity)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: amountColor(row.value), ...blurSx }}>
                      {formatCurrency(row.value)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, fontSize: 14, color: "text.secondary" }}>
                    No sales in this range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {rows.length ? (
              <TableFooter>
                <TableRow sx={{ "& td": { borderTop: 2, borderTopColor: "#6366f1", fontWeight: 600 } }}>
                  <TableCell colSpan={2} sx={{ color: "text.primary" }}>Total</TableCell>
                  <TableCell align="right" sx={{ color: "text.primary", ...blurSx }}>{formatWholeAmount(totals.count)}</TableCell>
                  <TableCell align="right" sx={{ color: "text.primary", ...blurSx }}>{formatQuantity(totals.quantity)}</TableCell>
                  <TableCell align="right" sx={{ color: amountColor(totals.value), ...blurSx }}>{formatCurrency(totals.value)}</TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </Box>
      )}
    </Box>
  );
};

export const SettlementDetailsTable = ({ table, loading, privacyMode }) => {
  const navigate = useNavigate();
  const columns = table?.columns || [];
  const rows = table?.rows || [];
  const columnTotals = table?.columnTotals || {};
  const grandTotal = table?.grandTotal || 0;
  const blurSx = privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {};

  return (
    <Box sx={{ ...tableCardSx, minWidth: 0 }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>{table?.title || "Settlement Details"}</Typography>
        <Button
          size="small"
          onClick={() => navigate("/sales/reports")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View All
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "text.secondary" }}>Loading table...</Box>
      ) : (
        <Box sx={{ overflowX: "auto", width: "100%" }}>
          <Table size="small" sx={{ width: "100%", minWidth: "max-content", "& .MuiTableCell-root": { py: 0.5 }, "& tbody tr:last-child td": { borderBottom: 0 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12, color: "text.secondary", minWidth: 130 }}>Method</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key} align="right" sx={{ fontSize: 12, color: "text.secondary", minWidth: 110 }}>
                    {column.label}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontSize: 12, color: "text.secondary", minWidth: 110 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length && columns.length ? (
                rows.map((row) => (
                  <TableRow key={row.key} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell sx={{ color: "text.primary" }}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ height: 10, width: 10, flexShrink: 0, borderRadius: "50%", bgcolor: methodDotColor[row.color] || "text.disabled" }} />
                        {row.label}
                      </Box>
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell
                        key={`${row.key}-${column.key}`}
                        align="right"
                        sx={{ color: amountColor(row.values?.[column.key]), ...blurSx }}
                      >
                        {formatCurrency(row.values?.[column.key])}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 500, color: amountColor(row.total), ...blurSx }}>
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length + 2, 2)} align="center" sx={{ py: 4, fontSize: 14, color: "text.secondary" }}>
                    No settlements in this range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {rows.length && columns.length ? (
              <TableFooter>
                <TableRow sx={{ "& td": { borderTop: 2, borderTopColor: "#6366f1", fontWeight: 600 } }}>
                  <TableCell sx={{ color: "text.primary" }}>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ height: 10, width: 10, flexShrink: 0, borderRadius: "50%", bgcolor: "#2563eb" }} />
                      Total
                    </Box>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={`total-${column.key}`}
                      align="right"
                      sx={{ color: amountColor(columnTotals[column.key]), ...blurSx }}
                    >
                      {formatCurrency(columnTotals[column.key])}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ color: amountColor(grandTotal), ...blurSx }}>{formatCurrency(grandTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </Box>
      )}
    </Box>
  );
};

