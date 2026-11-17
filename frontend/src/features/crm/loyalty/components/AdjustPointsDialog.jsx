import { useState } from "react";
import { toast } from "react-toastify";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";

/** CRM: add or remove a customer's points by hand, with the reason (kept in the ledger). */
export default function AdjustPointsDialog({ customer, onDone, onClose }) {
  const [direction, setDirection] = useState("add");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const amount = Math.max(0, Math.floor(Number(points) || 0));

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/loyalty/adjust", { customer_id: customer.id, points: direction === "add" ? amount : -amount, reason: reason.trim() });
      toast.success("Points adjusted.");
      onDone();
    } catch (err) {
      const data = err?.response?.data;
      toast.error((data?.errors && Object.values(data.errors).flat()[0]) || data?.message || "Could not adjust the points.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="adjust-points-title"
      slotProps={{ paper: { component: "form", "data-enter-ignore": "true", onSubmit: (e) => { e.preventDefault(); if (amount > 0 && reason.trim()) void save(); } } }}>
      <DialogTitle id="adjust-points-title">Adjust points: {customer.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Current balance: {customer.loyalty_points} points</Typography>
          <Stack direction="row" spacing={1}>
            <TextField select size="small" label="Action" value={direction} onChange={(e) => setDirection(e.target.value)} sx={{ width: 140 }}>
              <MenuItem value="add">Add</MenuItem>
              <MenuItem value="remove">Remove</MenuItem>
            </TextField>
            <TextField size="small" type="number" label="Points" value={points} onChange={(e) => setPoints(e.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} autoFocus />
          </Stack>
          <TextField size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required slotProps={{ htmlInput: { maxLength: 255 } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving || amount <= 0 || !reason.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
