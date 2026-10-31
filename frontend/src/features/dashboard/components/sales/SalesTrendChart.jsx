import React from "react";
import { BarChart3 } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";

export default function SalesTrendChart({ salesTrendChart = [] }) {
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <BarChart3 size={16} />
          </Box>
          Sales vs Returns Timeline
        </Typography>
        <Stack direction="row" spacing={2} sx={{ fontSize: 12, fontWeight: 600 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "success.main" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} /> Sales
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "#e11d48" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f43f5e" }} /> Returns
          </Stack>
        </Stack>
      </Stack>

      {salesTrendChart.length > 0 ? (
        <Box sx={{ display: "grid", gap: 1, gridAutoFlow: "column", gridAutoColumns: "minmax(44px, 1fr)", gridTemplateRows: "1fr", pt: 2, overflowX: "auto" }}>
          {salesTrendChart.map((item) => {
            const maxVal = Math.max(...salesTrendChart.map((d) => Math.max(d.sales || 0, d.returns || 0)), 10);
            const salesHeight = Math.min(100, Math.round(((item.sales || 0) / maxVal) * 100));
            const returnsHeight = Math.min(100, Math.round(((item.returns || 0) / maxVal) * 100));

            return (
              <Stack key={item.raw_date} spacing={0.5} sx={{ alignItems: "center", textAlign: "center" }}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ height: 112, width: "100%", alignItems: "flex-end", justifyContent: "center", borderRadius: 1, bgcolor: "action.hover", p: 0.5 }}
                >
                  <Box
                    title={`Sales: ${item.sales}`}
                    sx={{ height: `${salesHeight}%`, width: 10, borderRadius: "2px 2px 0 0", bgcolor: "success.main", transition: "background-color 0.15s ease", "&:hover": { bgcolor: "success.dark" } }}
                  />
                  <Box
                    title={`Returns: ${item.returns}`}
                    sx={{ height: `${returnsHeight}%`, width: 10, borderRadius: "2px 2px 0 0", bgcolor: "#f43f5e", transition: "background-color 0.15s ease", "&:hover": { bgcolor: "#e11d48" } }}
                  />
                </Stack>
                <Typography sx={{ fontSize: 10, fontWeight: 500, color: "text.secondary" }}>{item.date}</Typography>
              </Stack>
            );
          })}
        </Box>
      ) : (
        <Typography sx={{ py: 4, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No sales movements in range</Typography>
      )}
    </Box>
  );
}
