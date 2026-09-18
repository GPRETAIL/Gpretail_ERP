import { Trash2 } from "lucide-react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";

/**
 * ConfirmDialog — a lightweight confirmation modal matching the app's Tailwind style.
 *
 * Props:
 *   open       {boolean}   — whether the dialog is visible
 *   title      {string}    — dialog heading
 *   message    {string}    — body text
 *   confirmLabel {string}  — label for the confirm button (default "Delete")
 *   onConfirm  {function}  — called when user clicks the confirm button
 *   onCancel   {function}  — called when user clicks Cancel or the backdrop
 *   danger     {boolean}   — use red confirm button (default true)
 */
const ConfirmDialog = ({
  open,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this record? This action cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  danger = true,
}) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {danger && (
          <Box sx={{ color: "error.main", display: "inline-flex", flexShrink: 0 }}>
            <Trash2 className="h-4 w-4" />
          </Box>
        )}
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{title}</Typography>
      </Stack>
    </DialogTitle>
    <DialogContent sx={{ py: 1.5 }}>
      <Typography sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.6 }}>{message}</Typography>
    </DialogContent>
    <DialogActions sx={{ px: 2, py: 1.5 }}>
      <Button className="glass-btn glass-btn-secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        className={`glass-btn ${danger ? "glass-btn-danger" : "glass-btn-primary"}`}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
