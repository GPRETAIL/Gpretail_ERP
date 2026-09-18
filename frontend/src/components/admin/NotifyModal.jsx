import React, { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "react-toastify";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from "@mui/material";
import api from "../../api/axios";

// Reusable manual-notification modal. Pass a `target` object to open it:
//   { companyId, storeId?, warehouseId?, label, scope?, defaultSubject?, defaultMessage? }
// It emails the resolved contact (company/store/warehouse) + the platform inbox. `onClose` hides it.
const NotifyModal = ({ target, onClose }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (target) {
      setSubject(target.defaultSubject || "");
      setMessage(target.defaultMessage || "");
    }
  }, [target]);

  if (!target) return null;

  const send = async (event) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) return toast.error("Subject and message are required");
    try {
      setSending(true);
      const res = await api.post("/admin/notify", {
        companyId: target.companyId,
        storeId: target.storeId || null,
        warehouseId: target.warehouseId || null,
        subject: subject.trim(),
        message: message.trim(),
      });
      const d = res.data?.data || {};
      if (d.configured === false) {
        toast.info("Recorded, but email isn't configured yet (no send).");
      } else if (d.sent) {
        toast.success(`Notification sent to ${d.recipients?.length || 0} recipient(s)`);
      } else {
        toast.warn("Email send failed — check server logs / Brevo setup");
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="sm" fullWidth>
      <Stack component="form" onSubmit={send}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Notify — {target.label}</Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Emails the {target.scope || "company"}'s contact (and your admin inbox for a record).
            </Typography>
            <TextField
              size="small"
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              fullWidth
            />
            <TextField
              size="small"
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              fullWidth
              multiline
              rows={6}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={sending} startIcon={<Send className="h-4 w-4" />}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default NotifyModal;
