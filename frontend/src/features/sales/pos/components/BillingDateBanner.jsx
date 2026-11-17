import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { CalendarClock } from "lucide-react";
import useBillingDate from "@/features/sales/pos/hooks/useBillingDate";
import { dayLabel } from "@/features/sales/pos/utils/billingDate";

/**
 * POS: which date this counter's bills go on (Sales Customisation > Billing date after cash closing). Shows a banner
 * when bills go on a later date than today. In Manual mode, whoever the tenant admin allows picks the date here
 * (today up to a week ahead). Renders nothing while bills go on today and nothing can be changed.
 */
export default function BillingDateBanner() {
  const { state, saving, change } = useBillingDate();
  const [picked, setPicked] = useState("");

  if (!state || (!state.shifted && !state.can_change)) return null;
  const value = picked || state.date;

  return (
    <Alert severity={state.shifted ? "warning" : "info"} icon={<CalendarClock size={18} />} sx={{ py: 0.25, alignItems: "center" }} role="status" aria-label="Billing date">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
        <Typography sx={{ fontSize: 13 }}>
          {state.shifted ? (state.reason || `New bills are dated ${dayLabel(state.date)}.`) : `Bills are dated today (${dayLabel(state.date)}).`}
        </Typography>
        {state.can_change && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TextField size="small" type="date" value={value} onChange={(e) => setPicked(e.target.value)}
              slotProps={{ htmlInput: { min: state.today, max: state.max_date, "aria-label": "Billing date to set", "data-enter-ignore": "true" } }}
              sx={{ width: 160, "& input": { py: 0.5 } }} />
            <Button size="small" variant="contained" disabled={saving || !value || value === state.date}
              onClick={() => { void change(value); setPicked(""); }}>Set date</Button>
            {state.shifted ? <Button size="small" disabled={saving} onClick={() => { void change("today"); setPicked(""); }}>Back to today</Button> : null}
          </Stack>
        )}
      </Stack>
    </Alert>
  );
}
