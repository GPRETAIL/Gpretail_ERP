import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function WarehouseLowStockTable({ alerts = [] }) {
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
          <Box sx={{ color: "warning.main", display: "inline-flex" }}>
            <ShieldAlert size={20} />
          </Box>
          <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
            Low Stock & Reorder Level Alerts
          </Typography>
        </Stack>
        <Button
          size="small"
          onClick={() => navigate("/warehouse/stock-item?stock_filter=low_stock")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          Open Item Locator
        </Button>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Product Name
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Size / Color
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Barcode
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Store
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Available
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Reorder Level
              </TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.length > 0 ? (
              alerts.map((row) => {
                const isOut = Number(row.current_stock || 0) <= 0;
                return (
                  <TableRow
                    key={row.id}
                    sx={{ borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ py: 1.25, fontWeight: 500, color: "text.primary" }}>{row.product_name}</TableCell>
                    <TableCell sx={{ py: 1.25, color: "text.secondary" }}>
                      {row.size} / {row.color}
                    </TableCell>
                    <TableCell sx={{ py: 1.25, fontFamily: "monospace", color: "text.secondary" }}>{row.barcode}</TableCell>
                    <TableCell sx={{ py: 1.25, color: "text.secondary" }}>{row.store_name}</TableCell>
                    <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", fontWeight: 700, color: "text.primary" }}>
                      {Number(row.current_stock || 0).toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", color: "text.secondary" }}>
                      {row.reorder_level || 10}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.25 }}>
                      {isOut ? (
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25, fontSize: 10, fontWeight: 700,
                            bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.24 : 0.15),
                            color: "error.main",
                          }}
                        >
                          OUT OF STOCK
                        </Box>
                      ) : (
                        <Box
                          component="span"
                          sx={{
                            display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25, fontSize: 10, fontWeight: 700,
                            bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.24 : 0.15),
                            color: "warning.main",
                          }}
                        >
                          LOW STOCK
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  🎉 All product stocks are healthy and above reorder levels!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
