import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import api from "@/shared/api/apiClient";
import { PAYMENT_CHOICES, VALID_DAY_CHOICES, sellPayload, sellProblem, voucherErrorMessage } from "../utils/voucherSlip";

const EMPTY = { amount: "", payment_mode: "CASH", payment_reference: "", buyer_name: "", buyer_phone: "", valid_days: "" };

/** Sells one gift voucher: the amount, how it was paid, who it is for, and how long it lasts. Calls onSold(voucher) once saved. */
export default function SellVoucherDialog({ open, onClose, onSold }) {
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
    const problem = sellProblem(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/gift-vouchers", sellPayload(form));
      setForm(EMPTY);
      onSold(res.data?.data, res.data?.message);
    } catch (err) {
      setError(voucherErrorMessage(err, "Could not sell the gift voucher. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Sell gift voucher</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, pt: 1 }}>
          {error && <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{error}</Alert>}
          <TextField size="small" type="number" label="Voucher amount" value={form.amount} onChange={set("amount")} autoFocus required
            slotProps={{ htmlInput: { min: 1, step: "1" } }} />
          <TextField select size="small" label="Paid by" value={form.payment_mode} onChange={set("payment_mode")}>
            {PAYMENT_CHOICES.map((choice) => <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>)}
          </TextField>
          {form.payment_mode !== "CASH" && (
            <TextField size="small" label={form.payment_mode === "CARD" ? "Card slip or approval no." : "UPI reference"} value={form.payment_reference}
              onChange={set("payment_reference")} sx={{ gridColumn: "1 / -1" }} slotProps={{ htmlInput: { maxLength: 100 } }} />
          )}
          <TextField size="small" label="Sold to (name)" value={form.buyer_name} onChange={set("buyer_name")} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField size="small" label="Phone" value={form.buyer_phone} onChange={set("buyer_phone")} slotProps={{ htmlInput: { maxLength: 30 } }} />
          <TextField select size="small" label="Valid for" value={form.valid_days} onChange={set("valid_days")} sx={{ gridColumn: "1 / -1" }}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            helperText="The store setting is in Sales Customisation, Gift voucher validity.">
            {VALID_DAY_CHOICES.map((choice) => <MenuItem key={choice.value || "default"} value={choice.value}>{choice.label}</MenuItem>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>Close</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Sell and print"}</Button>
      </DialogActions>
    </Dialog>
  );
}
