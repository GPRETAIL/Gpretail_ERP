import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Box, Button, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { Save } from "lucide-react";
import api from "@/shared/api/apiClient";
import { DEFAULT_SETTINGS } from "../utils/loyaltyTypes";

const FIELDS = [
  { key: "spend_per_point", label: "Spend per point (₹)", help: "1 point for every this much paid in money.", step: 1 },
  { key: "redeem_value", label: "Value of 1 point (₹)", help: "What a point is worth when redeemed at POS.", step: 0.01 },
  { key: "min_points", label: "Minimum points to redeem", help: "Fewer than this cannot be redeemed at a time.", step: 1 },
  { key: "max_percent", label: "Most of a bill paid by points (%)", help: "The rest is paid in money.", step: 1 },
  { key: "expiry_months", label: "Points expire after (months)", help: "Counted from the day they were earned.", step: 1 },
];

/** CRM > Loyalty Management > Settings: how points are earned and redeemed in this store. */
export default function LoyaltySettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/loyalty/settings").then((res) => alive && setForm({ ...DEFAULT_SETTINGS, ...(res.data?.data || {}) }))
      .catch(() => alive && setForm({ ...DEFAULT_SETTINGS }));
    return () => { alive = false; };
  }, []);

  if (!form) return null;
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/loyalty/settings", { ...form, ...Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key])])) });
      setForm({ ...DEFAULT_SETTINGS, ...(res.data?.data || {}) });
      toast.success("Loyalty settings saved.");
    } catch (err) {
      const data = err?.response?.data;
      toast.error((data?.errors && Object.values(data.errors).flat()[0]) || data?.message || "Could not save the settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); void save(); }} data-enter-ignore="true" sx={{ p: 2, maxWidth: 820 }}>
      <Stack spacing={2}>
        <FormControlLabel control={<Switch checked={Boolean(form.enabled)} onChange={(e) => set("enabled", e.target.checked)} />} label="Customers earn and redeem loyalty points" />
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          {FIELDS.map((f) => (
            <TextField key={f.key} size="small" type="number" label={f.label} value={form[f.key]} helperText={f.help}
              onChange={(e) => set(f.key, e.target.value)} slotProps={{ htmlInput: { min: 0, step: f.step } }} disabled={!form.enabled} />
          ))}
        </Box>
        <Box>
          <FormControlLabel control={<Switch checked={Boolean(form.otp_required)} onChange={(e) => set("otp_required", e.target.checked)} disabled={!form.enabled} />}
            label="Customer approves each redemption with an OTP" />
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", ml: 6 }}>
            Sent by SMS, WhatsApp or email (set up in Settings &gt; Messaging). When none can be sent, a supervisor approves. Supervisors redeem without an OTP.
          </Typography>
        </Box>
        {form.enabled && Number(form.spend_per_point) > 0 && (
          <Alert severity="info" sx={{ py: 0.25 }}>
            A ₹1,000 bill earns {Math.floor(1000 / Number(form.spend_per_point))} points, worth ₹{(Math.floor(1000 / Number(form.spend_per_point)) * Number(form.redeem_value || 0)).toFixed(2)} when redeemed.
          </Alert>
        )}
        <Box><Button type="submit" variant="contained" startIcon={<Save size={16} />} disabled={saving}>{saving ? "Saving..." : "Save settings"}</Button></Box>
      </Stack>
    </Box>
  );
}
