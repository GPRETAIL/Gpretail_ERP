import React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Receipt, Package } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { formatCurrency } from "../../../utils/dashboardFormatters";

// Three separate widgets (not one bundled row) so DashboardGrid can drag/resize each card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurSx = (privacyMode) => (privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {});

// indigo/blue/purple here are decorative per-card accents, not status colors -- kept as literal
// hex (Tailwind's own shade values) rather than forced onto primary/success/error/warning tokens.
const cardSx = (hoverColor) => ({
  display: "block", width: "100%", height: "100%", textAlign: "left", cursor: "pointer",
  borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper",
  p: 2, boxShadow: 1, transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  "&:hover": { borderColor: hoverColor, boxShadow: 2 },
});

export function MonthlySalesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/reports")} sx={cardSx("#a5b4fc")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Monthly Sales
        </Typography>
        <Box sx={{ color: "#6366f1", display: "inline-flex" }}>
          <CalendarDays size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : formatCurrency(summary.month_sales_amount)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        {summary.month_bills_count || 0} bills this calendar month
      </Typography>
    </ButtonBase>
  );
}

export function TotalInvoicesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/pos-sales")} sx={cardSx("primary.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Total Invoices (Period)
        </Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Receipt size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : Number(summary.range_bills_count || 0).toLocaleString()}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        {Number(summary.today_bills_count || 0).toLocaleString()} today
      </Typography>
    </ButtonBase>
  );
}

export function ProductsSoldCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/sales/reports")} sx={cardSx("#d8b4fe")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Products Sold (Period)
        </Typography>
        <Box sx={{ color: "#9333ea", display: "inline-flex" }}>
          <Package size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : Number(summary.distinct_products_sold || 0).toLocaleString()}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        {Number(summary.range_qty_sold || 0).toLocaleString()} units sold
      </Typography>
    </ButtonBase>
  );
}
