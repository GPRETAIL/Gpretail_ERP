import React from "react";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function WarehouseIncomingShipmentsTable({ incoming = [] }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
        bgcolor: "background.paper", p: 2.5, boxShadow: 1,
      }}
    >
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <Truck className="h-4 w-4" />
          </Box>
          Recent Inward Shipments & Direct Purchases
        </Typography>
        <Button
          size="small"
          onClick={() => navigate("/warehouse/direct-purchase")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View all incoming
        </Button>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Purchase / Inv No
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Supplier
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Qty
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Amount
              </TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {incoming.length > 0 ? (
              incoming.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => navigate(`/warehouse/direct-purchase`)}
                  sx={{ cursor: "pointer", borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "primary.main" }}>
                    {row.purchase_no || row.invoice_no || `PUR-${row.id}`}
                  </TableCell>
                  <TableCell sx={{ py: 1.25, color: "text.secondary" }}>{row.supplier_name}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", fontWeight: 600 }}>
                    {Number(row.total_qty || 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{formatCurrency(row.total_amount)}</TableCell>
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
                      {row.status || "Completed"}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No incoming shipments recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
