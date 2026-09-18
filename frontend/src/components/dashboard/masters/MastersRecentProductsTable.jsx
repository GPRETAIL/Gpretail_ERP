import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function MastersRecentProductsTable({ recentProducts = [] }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <Clock className="h-4 w-4" />
          </Box>
          <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Recently Added Products</Typography>
        </Stack>
        <Button
          size="small"
          onClick={() => navigate("/masters/product")}
          sx={{ p: 0, minWidth: "auto", fontSize: 12, fontWeight: 600, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View all products
        </Button>
      </Stack>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Product</TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Brand</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Price</TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentProducts.length > 0 ? (
              recentProducts.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => navigate("/masters/product")}
                  sx={{ cursor: "pointer", borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "text.primary" }}>{row.name}</TableCell>
                  <TableCell sx={{ py: 1.25, color: "text.secondary" }}>{row.brand_name}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>₹{Number(row.selling_price || 0).toLocaleString("en-IN")}</TableCell>
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
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No products recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
