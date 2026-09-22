import React from "react";
import { BarChart3 } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";

export default function CrmGrowthChart({ timelineChart = [] }) {
  return (
    <Box
      sx={{
        height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
        bgcolor: "background.paper", p: 2.5, boxShadow: 1,
      }}
    >
      <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <BarChart3 size={16} />
          </Box>
          Customer Growth & Orders Activity
        </Typography>
        <Stack direction="row" sx={{ alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600 }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, color: "#3b82f6" }}>
            <Box sx={{ height: 8, width: 8, borderRadius: "50%", bgcolor: "#3b82f6" }} /> New Signups
          </Stack>
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, color: "#a855f7" }}>
            <Box sx={{ height: 8, width: 8, borderRadius: "50%", bgcolor: "#a855f7" }} /> Orders
          </Stack>
        </Stack>
      </Stack>

      {timelineChart.length > 0 ? (
        <Box sx={{ display: "grid", gap: 1, gridAutoFlow: "column", gridAutoColumns: "minmax(44px, 1fr)", gridTemplateRows: "1fr", pt: 2, overflowX: "auto" }}>
          {timelineChart.map((item) => {
            const maxVal = Math.max(
              ...timelineChart.map((d) => Math.max(d.new_customers || 0, d.orders_count || 0)),
              5
            );
            const custHeight = Math.min(100, Math.round(((item.new_customers || 0) / maxVal) * 100));
            const ordHeight = Math.min(100, Math.round(((item.orders_count || 0) / maxVal) * 100));

            return (
              <Stack key={item.raw_date} sx={{ alignItems: "center", gap: 0.5, textAlign: "center" }}>
                <Stack
                  direction="row"
                  sx={{
                    height: 98, width: "100%", alignItems: "flex-end", justifyContent: "center", gap: 0.5,
                    borderRadius: "3.5px", bgcolor: "action.hover", p: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      height: `${custHeight}%`, width: 10, borderRadius: "1.75px 1.75px 0 0", bgcolor: "#3b82f6",
                      transition: "background-color 0.15s", "&:hover": { bgcolor: "#2563eb" },
                    }}
                    title={`New Customers: ${item.new_customers}`}
                  />
                  <Box
                    sx={{
                      height: `${ordHeight}%`, width: 10, borderRadius: "1.75px 1.75px 0 0", bgcolor: "#a855f7",
                      transition: "background-color 0.15s", "&:hover": { bgcolor: "#9333ea" },
                    }}
                    title={`Orders: ${item.orders_count}`}
                  />
                </Stack>
                <Typography sx={{ fontSize: 10, fontWeight: 500, color: "text.secondary" }}>{item.date}</Typography>
              </Stack>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ py: 4, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No activity recorded in date range</Box>
      )}
    </Box>
  );
}
