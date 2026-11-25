import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import api from "@/shared/api/apiClient";
import { VALID_DAY_CHOICES, issuePayload, issueProblem, voucherErrorMessage } from "../utils/couponSlip";

const EMPTY = { amount: "", reason: "", buyer_name: "", buyer_phone: "", valid_days: "", min_bill_amount: "" };

/** Gives a coupon by hand: the value, why, who it is for, how long it lasts and the smallest bill it can be used on. */
export default function IssueCouponDialog({ open, onClose, onIssued }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const close = () => {
    if (saving) return;
    setForm(EMPTY);
    setError("");
    onClose();
  };

  const save = async () => {
    const problem = issueProblem(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/gift-coupons", issuePayload(form));
      setForm(EMPTY);
      onIssued(res.data?.data, res.data?.message);
    } catch (err) {
      setError(voucherErrorMessage(err, "Could not issue the coupon. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Give a coupon</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, pt: 1 }}>
          {error && <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{error}</Alert>}
          <TextField size="small" type="number" label="Coupon value" value={form.amount} onChange={set("amount")} autoFocus required slotProps={{ htmlInput: { min: 1, step: "1" } }} />
          <TextField size="small" label="Why is it given" value={form.reason} onChange={set("reason")} required slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField size="small" label="Given to (name)" value={form.buyer_name} onChange={set("buyer_name")} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField size="small" label="Phone" value={form.buyer_phone} onChange={set("buyer_phone")} slotProps={{ htmlInput: { maxLength: 30 } }} />
          <TextField select size="small" label="Valid for" value={form.valid_days} onChange={set("valid_days")} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
            {VALID_DAY_CHOICES.map((choice) => <MenuItem key={choice.value || "rule"} value={choice.value}>{choice.label}</MenuItem>)}
          </TextField>
          <TextField size="small" type="number" label="Smallest bill it can be used on" value={form.min_bill_amount} onChange={set("min_bill_amount")}
            helperText="Blank uses the store rule. 0 means any bill." slotProps={{ htmlInput: { min: 0, step: "1" } }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>Close</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Give and print"}</Button>
      </DialogActions>
    </Dialog>
  );
}
