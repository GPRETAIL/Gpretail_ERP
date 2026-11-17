import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import { CalendarClock } from "lucide-react";
import { canAccessPath } from "@/features/auth/utils/accessControl";
import useBillingDate from "@/features/sales/pos/hooks/useBillingDate";
import { dayLabel } from "@/features/sales/pos/utils/billingDate";

function BillingDateTag() {
  // The POS banner announces changes at once; this refresh catches the automatic switch after cash closing.
  const { state } = useBillingDate({ refreshMs: 120000 });
  if (!state?.shifted) return null;

  return (
    <Box role="status" aria-label="Billing date" title={state.reason || undefined}
      sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5, px: 1, py: 0.25, mr: 1, borderRadius: 1,
        bgcolor: "warning.light", color: "warning.contrastText", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      <CalendarClock size={14} />
      Billing date {dayLabel(state.date)}
    </Box>
  );
}

/**
 * App footer: the date this counter's bills go on, shown next to the clock whenever it is not today (after cash
 * closing, or set by hand in Manual mode), for users who can bill. Nothing while bills go on today.
 */
export default function FooterBillingDate() {
  const user = useSelector((state) => state.auth.user);
  return user && canAccessPath("/sales/pos-sales", user) ? <BillingDateTag /> : null;
}
