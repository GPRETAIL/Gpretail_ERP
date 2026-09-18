import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurSx = (privacyMode) => (privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {});

const cardSx = (hoverColor) => ({
  height: "100%", cursor: "pointer", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
  bgcolor: "background.paper", p: 2, boxShadow: 1, transition: "border-color 0.2s, box-shadow 0.2s",
  "&:hover": { borderColor: hoverColor, boxShadow: 3 },
});

export function TotalStockUnitsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/warehouse/stock-item")} sx={cardSx((theme) => alpha(theme.palette.primary.main, 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Total Stock Units
        </Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Package className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : Number(summary.total_stock_qty || 0).toLocaleString()}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Avail: {Number(summary.total_available_qty || 0).toLocaleString()}</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Allocated: {Number(summary.total_allocated_qty || 0).toLocaleString()}</Typography>
      </Stack>
    </Box>
  );
}

export function TotalStockValueCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/warehouse/reports")} sx={cardSx((theme) => alpha(theme.palette.success.main, 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Total Stock Value
        </Typography>
        <Box sx={{ color: "success.main", display: "inline-flex" }}>
          <TrendingUp className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "success.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.total_cost_value)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Cost: {formatCurrency(summary.total_cost_value)}</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Retail: {formatCurrency(summary.total_retail_value)}</Typography>
      </Stack>
    </Box>
  );
}

export function IncomingGoodsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/warehouse/direct-purchase")} sx={cardSx((theme) => alpha(theme.palette.info.main, 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Incoming Goods
        </Typography>
        <Box sx={{ color: "info.main", display: "inline-flex" }}>
          <ArrowDownRight className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : `${summary.total_incoming || 0} Shipments`}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Pending: {summary.pending_purchases || 0}</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          Completed: {(summary.total_incoming || 0) - (summary.pending_purchases || 0)}
        </Typography>
      </Stack>
    </Box>
  );
}

export function StockOutwardCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/warehouse/stock-outward")} sx={cardSx(alpha("#9333ea", 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Stock Outward
        </Typography>
        <Box sx={{ color: "#9333ea", display: "inline-flex" }}>
          <ArrowUpRight className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : `${summary.total_outward || 0} Outwards`}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Today: {summary.outward_today || 0}</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Pending Dispatch: {summary.pending_dispatch || 0}</Typography>
      </Stack>
    </Box>
  );
}
