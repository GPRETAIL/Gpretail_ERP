import React from "react";
import { BarChart3 } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function StoreSalesChart({ salesChart = [] }) {
  const maxStoreSales = Math.max(...salesChart.map((s) => s.amount || 0), 1);

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <BarChart3 className="h-4 w-4" />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Sales by Store</Typography>
      </Stack>
      <Stack spacing={1.5}>
        {salesChart.length > 0 ? (
          salesChart.map((row) => (
            <Box key={row.store_name}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 500, color: "text.secondary" }}>{row.store_name}</Typography>
                <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 700, color: "text.primary" }}>{formatCurrency(row.amount)}</Typography>
              </Stack>
              <Box sx={{ mt: 0.5, height: 6, width: "100%", overflow: "hidden", borderRadius: "50px", bgcolor: "divider" }}>
                <Box
                  sx={{ height: "100%", borderRadius: "50px", bgcolor: "success.main", width: `${Math.min(100, Math.round((row.amount / maxStoreSales) * 100))}%` }}
                />
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ py: 2, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No sales in range</Typography>
        )}
      </Stack>
    </Box>
  );
}
