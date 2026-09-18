import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShoppingBag, CreditCard, Award } from "lucide-react";
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

export function TotalCustomersCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/crm/customer")} sx={cardSx((theme) => alpha(theme.palette.primary.main, 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Total Customers
        </Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Users className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : Number(summary.total_customers || 0).toLocaleString()}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Active: {Number(summary.active_customers || 0).toLocaleString()}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "success.main" }}>+{summary.new_customers || 0} New</Typography>
      </Stack>
    </Box>
  );
}

export function CustomerOrdersCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/crm/customer-orders")} sx={cardSx(alpha("#4f46e5", 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Customer Orders
        </Typography>
        <Box sx={{ color: "#4f46e5", display: "inline-flex" }}>
          <ShoppingBag className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "#4f46e5", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.total_order_value)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{summary.total_orders || 0} Orders</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Advance: {formatCurrency(summary.advance_received)}</Typography>
      </Stack>
    </Box>
  );
}

export function CustomerReceivablesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/crm/customer?filter=has_dues")} sx={cardSx((theme) => alpha(theme.palette.warning.main, 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Customer Receivables
        </Typography>
        <Box sx={{ color: "warning.main", display: "inline-flex" }}>
          <CreditCard className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.total_receivables)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Order Balance: {formatCurrency(summary.balance_receivable)}</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{summary.customers_with_dues || 0} Clients Due</Typography>
      </Stack>
    </Box>
  );
}

export function LoyaltyPointsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => navigate("/crm/loyalty-management")} sx={cardSx(alpha("#9333ea", 0.5))}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Loyalty Points
        </Typography>
        <Box sx={{ color: "#9333ea", display: "inline-flex" }}>
          <Award className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "#9333ea", ...blurSx(privacyMode) }}>
        {loading ? "..." : Number(summary.total_loyalty_points || 0).toLocaleString()} Pts
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{summary.loyalty_members_count || 0} Members</Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Redeemed: {Number(summary.total_points_redeemed || 0).toLocaleString()}</Typography>
      </Stack>
    </Box>
  );
}
