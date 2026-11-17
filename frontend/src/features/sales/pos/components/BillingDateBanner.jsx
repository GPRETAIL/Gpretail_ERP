import { Alert, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { CalendarClock } from "lucide-react";
import useBillingDate from "@/features/sales/pos/hooks/useBillingDate";
import { dayLabel } from "@/features/sales/pos/utils/billingDate";

/**
 * POS: which date this counter's bills go on (Sales Customisation > Billing date after cash closing). Shows a banner
 * when bills go on a later date than today; in Manual mode a supervisor can switch the counter between Today and
 * Tomorrow here. Renders nothing while bills go on today and nothing can be changed.
 */
export default function BillingDateBanner() {
  const { state, saving, change } = useBillingDate();

  if (!state || (!state.shifted && !state.can_change)) return null;

  return (
    <Alert severity={state.shifted ? "warning" : "info"} icon={<CalendarClock size={18} />} sx={{ py: 0.25, alignItems: "center" }} role="status" aria-label="Billing date">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
        <Typography sx={{ fontSize: 13 }}>
          {state.shifted ? (state.reason || `New bills are dated ${dayLabel(state.date)}.`) : `Bills are dated today (${dayLabel(state.date)}).`}
        </Typography>
        {state.can_change && (
          <ToggleButtonGroup size="small" exclusive value={state.shifted ? "tomorrow" : "today"} onChange={(_e, value) => void change(value)} disabled={saving} aria-label="Billing date">
            <ToggleButton value="today" sx={{ py: 0.25 }}>Today</ToggleButton>
            <ToggleButton value="tomorrow" sx={{ py: 0.25 }}>Tomorrow</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
    </Alert>
  );
}
