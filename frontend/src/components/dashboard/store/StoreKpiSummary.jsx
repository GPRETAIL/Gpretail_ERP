import React from "react";
import { useNavigate } from "react-router-dom";
import { Store as StoreIcon, Boxes, Users, BarChart3 } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { formatCurrency, wholeNumber } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurSx = (privacyMode) => (privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {});

const staticCardSx = {
  height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
  bgcolor: "background.paper", p: 2, boxShadow: 1,
};

const cardSx = (hoverColor) => ({
  display: "block", width: "100%", textAlign: "left", cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  "&:hover": { borderColor: hoverColor, boxShadow: 2 },
  ...staticCardSx,
});

export function StoresCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/settings/configure-local-server")} sx={cardSx("primary.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stores</Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <StoreIcon size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_stores)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        Active: {wholeNumber(summary.active_stores)}
      </Typography>
    </ButtonBase>
  );
}

export function ConsolidatedSalesCard({ summary = {}, loading, privacyMode }) {
  return (
    <Box sx={staticCardSx}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Consolidated Sales
        </Typography>
        <Box sx={{ color: "success.main", display: "inline-flex" }}>
          <BarChart3 size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "success.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.consolidated_sales_range)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>Across all visible stores</Typography>
    </Box>
  );
}

export function ConsolidatedStockValueCard({ summary = {}, loading, privacyMode }) {
  return (
    <Box sx={staticCardSx}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Consolidated Stock Value
        </Typography>
        <Box sx={{ color: "#9333ea", display: "inline-flex" }}>
          <Boxes size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.consolidated_stock_value)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>At retail price</Typography>
    </Box>
  );
}

export function ActiveStaffCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/hrms/employee")} sx={cardSx("warning.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Staff</Typography>
        <Box sx={{ color: "warning.main", display: "inline-flex" }}>
          <Users size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_active_staff)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>Across all stores</Typography>
    </ButtonBase>
  );
}
