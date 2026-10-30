import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { KeyRound, Send, ShieldAlert } from "lucide-react";
import api from "../api/axios";
import { APPROVAL_REASONS } from "../utils/approvals";

const POLL_MS = 3000;

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Asks for approval of an over-limit discount or refund. Two routes, as in retail practice:
 * a supervisor types their login + PIN on this screen (works with the customer waiting), or the
 * cashier sends a request to the Approval Inbox and waits. Calls onApproved(token) once granted;
 * the caller retries its save with that single-use token.
 */
export default function ApprovalDialog({ requirement, onApproved, onClose }) {
  const open = Boolean(requirement);
  const action = requirement?.action;
  const details = requirement?.details || {};
  const [mode, setMode] = useState("pin");
  const [reason, setReason] = useState(action === "pos_refund" ? "wrong_item" : "damaged_item");
  const [note, setNote] = useState("");
  const [approver, setApprover] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const pollTimer = useRef(null);

  // Callers mount this only while a requirement is open, so state starts fresh each time.
  useEffect(() => () => clearTimeout(pollTimer.current), []);

  const requestBody = () => ({
    action,
    reason_code: reason,
    note: note.trim() || undefined,
    ...(action === "pos_discount"
      ? { requested_percent: details.requested_percent, payload: { lines: details.lines || [] } }
      : { amount: details.amount, payload: { without_receipt: Boolean(details.without_receipt) } }),
  });

  const submitPin = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.post("/approvals/pin-approve", { ...requestBody(), approver: approver.trim(), pin });
      onApproved(res.data?.data?.token, res.data?.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Approval failed.");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  const poll = (id) => {
    pollTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/approvals/requests/${id}`);
        const data = res.data?.data;
        if (data?.status === "approved" && data.token) { onApproved(data.token, data); return; }
        if (data?.status === "pending") { poll(id); return; }
        setPending(null);
        setError(data?.status === "rejected"
          ? `Request rejected${data.decision_note ? `: ${data.decision_note}` : "."}`
          : "Request expired. Send it again or use a supervisor PIN.");
      } catch {
        poll(id);
      }
    }, POLL_MS);
  };

  const submitRequest = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.post("/approvals/requests", requestBody());
      setPending(res.data?.data);
      poll(res.data?.data?.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send the request.");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    clearTimeout(pollTimer.current);
    if (pending?.id) await api.post(`/approvals/requests/${pending.id}/withdraw`).catch(() => {});
    onClose();
  };

  const summary = action === "pos_discount"
    ? `Discount of ${details.requested_percent}% is above your limit of ${details.your_limit_percent ?? 0}%.`
    : details.without_receipt
      ? `Refund of ₹${money(details.amount)} without the original bill needs approval.`
      : `Refund of ₹${money(details.amount)} is above your limit of ₹${money(details.your_limit_amount)}.`;

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="approval-dialog-title">
      <DialogTitle id="approval-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <ShieldAlert size={20} /> Approval required
      </DialogTitle>
      <DialogContent sx={{ pt: "4px !important" }}>
        <Alert severity="warning" sx={{ mb: 1.5 }}>{summary}</Alert>
        {action === "pos_discount" && Array.isArray(details.lines) && details.lines.length > 0 && (
          <Box sx={{ mb: 1.5, maxHeight: 110, overflowY: "auto", fontSize: 12, color: "text.secondary" }}>
            {details.lines.map((line) => (
              <div key={line.index}>{line.product || "Item"}: ₹{money(line.reference_price)} → ₹{money(line.unit_price)} ({line.discount_percent}%)</div>
            ))}
          </Box>
        )}

        {pending ? (
          <Stack spacing={1.5} sx={{ alignItems: "center", py: 2 }} role="status">
            <CircularProgress size={28} />
            <Typography sx={{ fontWeight: 600 }}>Waiting for a supervisor or manager…</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              Request #{pending.id} is in the Approval Inbox. Keep this screen open; the sale continues automatically once approved.
            </Typography>
          </Stack>
        ) : (
          <>
            <Tabs value={mode} onChange={(_, value) => { setMode(value); setError(""); }} variant="fullWidth" sx={{ mb: 1.5, minHeight: 36, "& .MuiTab-root": { minHeight: 36, fontSize: 12 } }}>
              <Tab value="pin" icon={<KeyRound size={15} />} iconPosition="start" label="Supervisor PIN" />
              <Tab value="remote" icon={<Send size={15} />} iconPosition="start" label="Send request" />
            </Tabs>
            <Stack spacing={1.5}>
              <TextField select size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(APPROVAL_REASONS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 500 }} />
              {mode === "pin" && (
                <>
                  <TextField size="small" label="Approver username" value={approver} onChange={(e) => setApprover(e.target.value)} autoComplete="off" autoFocus />
                  <TextField size="small" label="Approval PIN" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    inputProps={{ inputMode: "numeric", maxLength: 8, autoComplete: "one-time-code" }}
                    onKeyDown={(e) => { if (e.key === "Enter" && approver && pin.length >= 4 && !busy) submitPin(); }} />
                </>
              )}
            </Stack>
          </>
        )}
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        {pending ? (
          <Button color="inherit" onClick={withdraw}>Withdraw request</Button>
        ) : (
          <>
            <Button color="inherit" onClick={onClose} disabled={busy}>Cancel</Button>
            {mode === "pin" ? (
              <Button variant="contained" onClick={submitPin} disabled={busy || !approver.trim() || pin.length < 4}>{busy ? "Checking…" : "Approve"}</Button>
            ) : (
              <Button variant="contained" onClick={submitRequest} disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
