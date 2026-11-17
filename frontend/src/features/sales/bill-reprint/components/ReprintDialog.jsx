import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { MessageCircle, Printer } from "lucide-react";
import { COPY_LABELS } from "@/features/printing/utils/reprintStamp";

/**
 * Before a reprint: which copy (when the store prints copy labels), and the reason once the bill has been reprinted
 * before. rows has one row, or several for a bulk print. onConfirm({ copyLabel, reason }).
 */
export default function ReprintDialog({ rows, mode = "print", busy = false, onConfirm, onClose }) {
  const [copyLabel, setCopyLabel] = useState("");
  const [reason, setReason] = useState("");
  const single = rows.length === 1 ? rows[0] : null;
  const needsReason = rows.some((r) => r.reason_required);
  const needsApproval = rows.filter((r) => r.approval_required);
  const copyLabels = rows.some((r) => r.copy_labels);
  const canConfirm = !busy && !(needsReason && !reason.trim());
  const confirm = () => onConfirm({ copyLabel, reason: reason.trim() });
  const title = single ? `${mode === "share" ? "Share" : "Reprint"} ${single.type_label} ${single.number}` : `Reprint ${rows.length} documents`;

  return (
    // A form, so Enter in the reason box prints; data-enter-ignore keeps the app's Enter-to-next-field handler out.
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="reprint-dialog-title"
      slotProps={{ paper: { component: "form", noValidate: true, "data-enter-ignore": "true", onSubmit: (e) => { e.preventDefault(); if (canConfirm) confirm(); } } }}>
      <DialogTitle id="reprint-dialog-title" sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {single && (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {single.customer_name || "Walk-in Customer"} · ₹{Number(single.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              {single.print_count ? ` · reprinted ${single.print_count} time${single.print_count === 1 ? "" : "s"} before` : " · first reprint"}
            </Typography>
          )}
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>It prints in the store&apos;s format with a small &quot;DUPLICATE&quot; mark at the top right.</Typography>
          {copyLabels && (
            <TextField select size="small" label="Copy" value={copyLabel} onChange={(e) => setCopyLabel(e.target.value)}>
              <MenuItem value="">No copy label</MenuItem>
              {COPY_LABELS.map((label) => <MenuItem key={label} value={label}>{label}</MenuItem>)}
            </TextField>
          )}
          <TextField size="small" label={needsReason ? "Reason for reprint" : "Reason (optional)"} value={reason} required={needsReason}
            onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 255 } }}
            helperText={needsReason ? "This bill was already reprinted, so a reason is needed." : " "} autoFocus />
          {needsApproval.length > 0 && (
            <Alert severity="info">
              {single ? "This bill is from an earlier day, so a supervisor must approve the reprint." : `${needsApproval.length} of these are from an earlier day and need a supervisor's approval; they are skipped in a bulk print.`}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!canConfirm}
          startIcon={mode === "share" ? <MessageCircle size={15} /> : <Printer size={15} />}>
          {busy ? "Working..." : mode === "share" ? "Share PDF" : single?.approval_required ? "Ask approval & print" : "Print"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
