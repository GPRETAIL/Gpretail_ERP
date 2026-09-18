import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

// Reusable confirmation dialog. Open it by setting `config`:
//   { title, message, confirmLabel?, tone? ("danger" default | "primary"), requireText?, onConfirm }
// When `requireText` is set the user must type it exactly to enable Confirm (e.g. "RESTORE").
// `onConfirm` is an async fn; it owns its own error toasts — the modal closes only when it resolves.
const ConfirmModal = ({ config, onClose }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText("");
    setBusy(false);
  }, [config]);

  if (!config) return null;

  const danger = config.tone !== "primary";
  const needsText = Boolean(config.requireText);
  const canConfirm = !needsText || text === config.requireText;

  const confirm = async () => {
    if (!canConfirm || busy) return;
    try {
      setBusy(true);
      await config.onConfirm();
      onClose();
    } catch {
      setBusy(false); // onConfirm surfaces its own error
    }
  };

  return (
    <Dialog open={Boolean(config)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <Box
              sx={{
                borderRadius: "50%", p: 1, display: "flex",
                bgcolor: danger ? "error.light" : "info.light",
                color: danger ? "error.main" : "info.main",
              }}
            >
              <AlertTriangle className="h-5 w-5" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{config.title}</Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>{config.message}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </IconButton>
          </Stack>
          {needsText ? (
            <TextField
              size="small"
              label={`Type "${config.requireText}" to confirm`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              autoFocus
              fullWidth
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={danger ? "error" : "primary"}
          onClick={confirm}
          disabled={!canConfirm || busy}
        >
          {busy ? "Working…" : config.confirmLabel || "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmModal;
