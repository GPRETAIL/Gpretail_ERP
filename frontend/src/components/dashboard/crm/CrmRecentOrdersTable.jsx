import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency } from "../../../utils/dashboardFormatters";

// Literal hex for statuses that don't have a matching semantic theme token (draft/in_progress/
// ready use slate/indigo/teal, none of which map cleanly onto primary/success/warning/error/info)
// so each status keeps its own distinct color instead of collapsing several statuses onto the
// same token.
const STATUS_COLORS = {
  pending: "warning.main",
  draft: "#64748b",
  confirmed: "primary.main",
  in_progress: "#4f46e5",
  ready: "#0d9488",
  ready_for_delivery: "#0d9488",
  delivered: "success.main",
  completed: "success.main",
  cancelled: "error.main",
};

const statusBadgeSx = (status) => {
  const token = STATUS_COLORS[status] || "#64748b";
  const isThemeToken = token.includes(".");
  return {
    bgcolor: (theme) =>
      alpha(
        isThemeToken ? theme.palette[token.split(".")[0]].main : token,
        theme.palette.mode === "dark" ? 0.24 : 0.15
      ),
    color: token,
  };
};

export default function CrmRecentOrdersTable({ recentOrders = [] }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
        bgcolor: "background.paper", p: 2.5, boxShadow: 1,
      }}
    >
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Box sx={{ color: "#4f46e5", display: "inline-flex" }}>
            <ShoppingBag className="h-5 w-5" />
          </Box>
          <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
            Recent Customer Orders
          </Typography>
        </Stack>
        <Button
          size="small"
          onClick={() => navigate("/crm/customer-orders")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View all orders
        </Button>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Order No
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Customer
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Amount
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Balance
              </TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentOrders.length > 0 ? (
              recentOrders.map((ord) => (
                <TableRow
                  key={ord.id}
                  onClick={() => navigate(`/crm/customer-orders/${ord.id}`)}
                  sx={{ cursor: "pointer", borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "primary.main" }}>
                    {ord.order_no || `#${ord.id}`}
                  </TableCell>
                  <TableCell sx={{ py: 1.25, color: "text.primary" }}>{ord.customer_name}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", fontWeight: 600 }}>
                    {formatCurrency(ord.net_amount)}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", color: "warning.main" }}>
                    {Number(ord.balance_due || 0) > 0 ? formatCurrency(ord.balance_due) : "₹0.00"}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25, fontSize: 10, fontWeight: 700,
                        textTransform: "uppercase", ...statusBadgeSx(ord.status),
                      }}
                    >
                      {ord.status || "Pending"}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No recent customer orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
