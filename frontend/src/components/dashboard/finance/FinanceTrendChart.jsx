import React from "react";
import { BarChart3 } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";

export default function FinanceTrendChart({ trendChart = [] }) {
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <BarChart3 className="h-4 w-4" />
          </Box>
          Purchases vs Payments Timeline
        </Typography>
        <Stack direction="row" spacing={2} sx={{ fontSize: 12, fontWeight: 600 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "#9333ea" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#a855f7" }} /> Purchases
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "success.main" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} /> Payments
          </Stack>
        </Stack>
      </Stack>
      {trendChart.length > 0 ? (
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(7, minmax(0, 1fr))", pt: 2, overflowX: "auto" }}>
          {trendChart.map((item) => {
            const maxVal = Math.max(...trendChart.map((d) => Math.max(d.purchases || 0, d.payments || 0)), 10);
            const purchaseHeight = Math.min(100, Math.round(((item.purchases || 0) / maxVal) * 100));
            const paymentHeight = Math.min(100, Math.round(((item.payments || 0) / maxVal) * 100));
            return (
              <Stack key={item.raw_date} spacing={0.5} sx={{ alignItems: "center", textAlign: "center" }}>
                <Stack direction="row" spacing={0.5} sx={{ height: 112, width: "100%", alignItems: "flex-end", justifyContent: "center", borderRadius: 1, bgcolor: "action.hover", p: 0.5 }}>
                  <Box title={`Purchases: ${item.purchases}`} sx={{ height: `${purchaseHeight}%`, width: 10, borderRadius: "2px 2px 0 0", bgcolor: "#a855f7" }} />
                  <Box title={`Payments: ${item.payments}`} sx={{ height: `${paymentHeight}%`, width: 10, borderRadius: "2px 2px 0 0", bgcolor: "success.main" }} />
                </Stack>
                <Typography sx={{ fontSize: 10, fontWeight: 500, color: "text.secondary" }}>{item.date}</Typography>
              </Stack>
            );
          })}
        </Box>
      ) : (
        <Typography sx={{ py: 4, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No activity in range</Typography>
      )}
    </Box>
  );
}
