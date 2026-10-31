import React from "react";
import { PieChart } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";

export default function CrmSegmentationBreakdown({ summary = {}, segmentation = {}, performance = {} }) {
  return (
    <Box
      sx={{
        height: "100%", display: "flex", flexDirection: "column", gap: 2,
        borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
        bgcolor: "background.paper", p: 2.5, boxShadow: 1,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}
      >
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <PieChart size={16} />
          </Box>
          Customer Segmentation
        </Typography>
        <Typography sx={{ fontSize: 11, color: "text.disabled" }}>Total: {summary.total_customers || 0}</Typography>
      </Stack>

      <Stack spacing={1.5}>
        <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Champions</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "primary.main" }}>
              {segmentation.champions?.count || 0} ({segmentation.champions?.pct || 0}%)
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Loyal</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>
              {segmentation.loyal?.count || 0} ({segmentation.loyal?.pct || 0}%)
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>At Risk</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#9333ea" }}>
              {segmentation.at_risk?.count || 0} ({segmentation.at_risk?.pct || 0}%)
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Lost / Inactive</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "success.main" }}>
              {segmentation.lost?.count || 0} ({segmentation.lost?.pct || 0}%)
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>On-Time Delivery Rate</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "success.main" }}>{performance.on_time_delivery_rate || "98.2%"}</Typography>
        </Stack>
        <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Customer Retention</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{performance.customer_retention_rate || "89.4%"}</Typography>
        </Stack>
      </Box>
    </Box>
  );
}
