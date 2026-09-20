import React from "react";
import { Sparkles } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency } from "../../../utils/dashboardFormatters";

const ROWS = [
  { key: "top_brand_by_stock_value", label: "Top Brand by Stock Value", color: "primary.main" },
  { key: "top_category_by_sales", label: "Top Category by Sales", color: "success.main" },
  { key: "top_supplier_by_purchase", label: "Top Supplier by Purchase Value", color: "#9333ea" },
];

export default function AnalyticalInsightsPanel({ insights = {}, loading }) {
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Sparkles size={16} />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Cross-Module Insights</Typography>
      </Stack>
      <Stack spacing={1.5}>
        {ROWS.map((row) => {
          const entry = insights[row.key];
          return (
            <Box key={row.key} sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>{row.label}</Typography>
              <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between" }}>
                <Typography component="span" sx={{ fontWeight: 500, color: "text.primary" }}>
                  {loading ? "..." : entry?.name}
                </Typography>
                <Typography component="span" sx={{ fontWeight: 700, color: row.color }}>
                  {loading ? "" : formatCurrency(entry?.value)}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
