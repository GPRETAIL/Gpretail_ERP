import React from "react";
import { PieChart } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function WarehouseSellingModeBreakdown({ inventory = {}, performance = {}, loading }) {
  const modes = inventory.selling_modes || {};

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
            <PieChart className="h-4 w-4" />
          </Box>
          Selling Mode Breakdown
        </Typography>
        <Typography sx={{ fontSize: 11, color: "text.disabled" }}>Respects Pieces / Packs / Cut</Typography>
      </Stack>

      <Stack spacing={1.5}>
        <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Piece Mode (Unit Stock)</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "primary.main" }}>
              {loading ? "..." : `${Number(modes.piece?.total_qty || 0).toLocaleString()} Pcs`}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ mt: 0.5, justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{modes.piece?.product_count || 0} Products</Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Value: {formatCurrency(modes.piece?.cost_value)}</Typography>
          </Stack>
        </Box>

        <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Pack Mode (Pack Stock)</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>
              {loading ? "..." : `${Number(modes.pack?.total_qty || 0).toLocaleString()} Packs`}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ mt: 0.5, justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{modes.pack?.product_count || 0} Products</Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Value: {formatCurrency(modes.pack?.cost_value)}</Typography>
          </Stack>
        </Box>

        <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Cut Mode (Fabric / Length)</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#9333ea" }}>
              {loading ? "..." : `${Number(modes.cut?.total_qty || 0).toLocaleString()} Mtrs`}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ mt: 0.5, justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{modes.cut?.product_count || 0} Products</Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Value: {formatCurrency(modes.cut?.cost_value)}</Typography>
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Physical Stock Accuracy</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "success.main" }}>{performance.stock_accuracy || "98.5%"}</Typography>
        </Stack>
        <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>On-Time Dispatch Rate</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{performance.on_time_dispatch_rate || "96.2%"}</Typography>
        </Stack>
      </Box>
    </Box>
  );
}
