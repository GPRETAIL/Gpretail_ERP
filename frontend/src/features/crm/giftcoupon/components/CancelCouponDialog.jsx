import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { money, voucherErrorMessage } from "../utils/couponSlip";

/** Cancels a coupon nobody has used. The reason is kept with it. */
export default function CancelCouponDialog({ coupon, onClose, onCancelled }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (saving) return;
    setReason("");
    setError("");
    onClose();
  };

  const confirm = async () => {
    if (!reason.trim()) {
      setError("Say why the coupon is cancelled.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/gift-coupons/${coupon.id}/cancel`, { reason: reason.trim() });
      setReason("");
      onCancelled(res.data?.data, res.data?.message);
    } catch (err) {
      setError(voucherErrorMessage(err, "Could not cancel the coupon. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(coupon)} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Cancel coupon {coupon?.display_number}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, mb: 1.5 }}>The ₹{money(coupon?.amount)} coupon can no longer be used on a bill.</Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <TextField size="small" fullWidth autoFocus label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} slotProps={{ htmlInput: { maxLength: 255 } }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>Keep coupon</Button>
        <Button color="error" variant="contained" onClick={() => void confirm()} disabled={saving}>{saving ? "Cancelling..." : "Cancel coupon"}</Button>
      </DialogActions>
    </Dialog>
  );
}
