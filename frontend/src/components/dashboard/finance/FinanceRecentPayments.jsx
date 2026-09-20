import React from "react";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function FinanceRecentPayments({ recentPayments = [] }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <Receipt size={16} />
          </Box>
          Recent Supplier Payments
        </Typography>
        <Button
          size="small"
          onClick={() => navigate("/finance/supplier-payment")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View all payments
        </Button>
      </Stack>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Payment No</TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Supplier</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Amount</TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Mode</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentPayments.length > 0 ? (
              recentPayments.map((row) => (
                <TableRow key={row.id} sx={{ borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}>
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "primary.main" }}>{row.payment_no}</TableCell>
                  <TableCell sx={{ py: 1.25, color: "text.secondary" }}>{row.supplier_name}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{formatCurrency(row.amount)}</TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25,
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.15),
                        color: "primary.main",
                      }}
                    >
                      {row.payment_mode || "-"}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No supplier payments recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
