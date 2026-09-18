import React from "react";
import { useNavigate } from "react-router-dom";
import { HandCoins, Wallet, ShoppingBag, Receipt } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { formatCurrency } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurSx = (privacyMode) => (privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {});

const cardSx = (hoverColor) => ({
  display: "block", width: "100%", height: "100%", textAlign: "left", cursor: "pointer",
  borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper",
  p: 2, boxShadow: 1, transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  "&:hover": { borderColor: hoverColor, boxShadow: 2 },
});

export function PayablesOutstandingCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/warehouse/direct-purchase?filter=unpaid")} sx={cardSx("error.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Payables Outstanding
        </Typography>
        <Box sx={{ color: "error.main", display: "inline-flex" }}>
          <HandCoins className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "error.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.payables_outstanding)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>Owed to suppliers</Typography>
    </ButtonBase>
  );
}

export function ReceivablesOutstandingCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/pos-sales?filter=credit")} sx={cardSx("primary.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Receivables Outstanding
        </Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Wallet className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "primary.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.receivables_outstanding)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>Owed by credit customers</Typography>
    </ButtonBase>
  );
}

export function PurchaseValueCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/warehouse/direct-purchase")} sx={cardSx("#d8b4fe")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Purchase Value (Period)
        </Typography>
        <Box sx={{ color: "#9333ea", display: "inline-flex" }}>
          <ShoppingBag className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.purchase_value_range)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        Payments made: {formatCurrency(summary.payments_made_range)}
      </Typography>
    </ButtonBase>
  );
}

export function NetPositionCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  const positive = (summary.net_position || 0) >= 0;
  return (
    <ButtonBase onClick={() => navigate("/warehouse/purchase-return")} sx={cardSx("success.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Net Position
        </Typography>
        <Box sx={{ color: "success.main", display: "inline-flex" }}>
          <Receipt className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: positive ? "success.main" : "error.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.net_position)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        Refunds due: {formatCurrency(summary.refunds_due)}
      </Typography>
    </ButtonBase>
  );
}
