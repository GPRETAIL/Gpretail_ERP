import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { money, voucherErrorMessage } from "../utils/voucherSlip";

/** Cancels a gift voucher nobody has used. The reason is kept with the voucher; the money is given back to the buyer. */
export default function CancelVoucherDialog({ voucher, onClose, onCancelled }) {
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
      setError("Say why the voucher is cancelled.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/gift-vouchers/${voucher.id}/cancel`, { reason: reason.trim() });
      setReason("");
      onCancelled(res.data?.data, res.data?.message);
    } catch (err) {
      setError(voucherErrorMessage(err, "Could not cancel the gift voucher. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(voucher)} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Cancel gift voucher {voucher?.display_number}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, mb: 1.5 }}>
          Give ₹{money(voucher?.original_amount)} back to the customer. The voucher can no longer be used, and the sale is taken out of the books.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <TextField size="small" fullWidth autoFocus label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} slotProps={{ htmlInput: { maxLength: 255 } }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>Keep voucher</Button>
        <Button color="error" variant="contained" onClick={() => void confirm()} disabled={saving}>{saving ? "Cancelling..." : "Cancel voucher"}</Button>
      </DialogActions>
    </Dialog>
  );
}
