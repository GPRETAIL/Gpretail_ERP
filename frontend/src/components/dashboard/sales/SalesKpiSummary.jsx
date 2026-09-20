import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Wallet, RotateCcw, CreditCard } from "lucide-react";
import { ButtonBase, Stack, Typography } from "@mui/material";
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

export function TodaysSalesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/pos-sales")} sx={cardSx("primary.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Today's Sales
        </Typography>
        <ShoppingCart size={20} style={{ color: "inherit" }} />
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.today_sales_amount)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>
          Bills: {Number(summary.today_bills_count || 0).toLocaleString()}
        </Typography>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>
          Qty: {Number(summary.today_qty_sold || 0).toLocaleString()}
        </Typography>
      </Stack>
    </ButtonBase>
  );
}

export function NetSalesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/reports")} sx={cardSx("success.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Net Sales (Period)
        </Typography>
        <Wallet size={20} style={{ color: "inherit" }} />
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "success.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.net_sales_amount)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>
          Gross: {formatCurrency(summary.range_sales_amount)}
        </Typography>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>
          Bills: {summary.range_bills_count || 0}
        </Typography>
      </Stack>
    </ButtonBase>
  );
}

export function ReturnsCard({ summary = {}, performance = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/pos-sales-return")} sx={cardSx("error.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Returns (Period)
        </Typography>
        <RotateCcw size={20} style={{ color: "inherit" }} />
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.returns_amount)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>{summary.returns_count || 0} Returns</Typography>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Rate: {performance.return_rate || "0%"}</Typography>
      </Stack>
    </ButtonBase>
  );
}

export function CreditPendingCard({ summary = {}, performance = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/pos-sales?filter=credit")} sx={cardSx("warning.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Credit Pending
        </Typography>
        <CreditCard size={20} style={{ color: "inherit" }} />
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "warning.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.credit_pending_amount)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Ratio: {performance.credit_sales_ratio || "0%"}</Typography>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Open Registers: {summary.open_registers_count || 0}</Typography>
      </Stack>
    </ButtonBase>
  );
}
