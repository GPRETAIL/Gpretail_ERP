import React from "react";
import { Table2 } from "lucide-react";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency, wholeNumber } from "../../../utils/dashboardFormatters";

export default function StoreComparisonTable({ comparison = [] }) {
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Table2 size={16} />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Store Comparison</Typography>
      </Stack>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Store</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Sales (Period)</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Bills</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Stock Value</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Staff</TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comparison.length > 0 ? (
              comparison.map((row) => (
                <TableRow key={row.store_id} sx={{ borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}>
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "text.primary" }}>
                    {row.store_name}
                    <Typography component="span" sx={{ ml: 0.5, fontSize: 10, color: "text.disabled" }}>({row.store_code})</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", fontWeight: 600 }}>{formatCurrency(row.sales_amount)}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{wholeNumber(row.bills_count)}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{formatCurrency(row.stock_value)}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{wholeNumber(row.staff_count)}</TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25,
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        ...(row.is_active
                          ? { bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.24 : 0.15), color: "success.main" }
                          : { bgcolor: "action.selected", color: "text.secondary" }),
                      }}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No stores visible.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
