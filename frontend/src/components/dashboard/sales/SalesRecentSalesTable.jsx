import React from "react";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency } from "../../../utils/dashboardFormatters";

const Badge = ({ token, children }) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      bgcolor: (theme) => alpha(theme.palette[token].main, theme.palette.mode === "dark" ? 0.24 : 0.15),
      color: `${token}.main`,
    }}
  >
    {children}
  </Box>
);

export default function SalesRecentSalesTable({ recentSales = [] }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <Receipt size={16} />
          </Box>
          Recent Sales
        </Typography>
        <Button
          size="small"
          onClick={() => navigate("/sales/pos-sales")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View all sales
        </Button>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Invoice No</TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Customer</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Amount</TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Payment</TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentSales.length > 0 ? (
              recentSales.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => navigate("/sales/pos-sales")}
                  sx={{ cursor: "pointer", borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "primary.main" }}>{row.invoice_no}</TableCell>
                  <TableCell sx={{ py: 1.25, color: "text.secondary" }}>{row.customer_name}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{formatCurrency(row.grand_total)}</TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Badge token="primary">{row.payment_mode || "Cash"}</Badge>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Badge token="success">{row.status || "Completed"}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No sales recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
