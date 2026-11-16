import { useCallback, useEffect, useState } from "react";
import { Alert, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { CalendarClock } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/shared/api/apiClient";

const REFRESH_MS = 60000;
const dayLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * POS: which date this counter's bills go on (Sales Customisation > Billing date after cash closing). Shows a banner
 * when bills go on a later date than today; in Manual mode a supervisor can switch the counter between Today and
 * Tomorrow here. Renders nothing while bills go on today and nothing can be changed.
 */
export default function BillingDateBanner() {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/pos-sales/billing-date");
      setState(res.data?.data || null);
    } catch {
      // Older servers or offline: bills simply go on today.
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    window.addEventListener("focus", load);
    return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener("focus", load); };
  }, [load]);

  const change = async (which) => {
    if (!which || saving) return;
    setSaving(true);
    try {
      const res = await api.post("/pos-sales/billing-date", { date: which });
      setState(res.data?.data || null);
      toast.success(res.data?.message || "Billing date changed.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not change the billing date.");
    } finally {
      setSaving(false);
    }
  };

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
