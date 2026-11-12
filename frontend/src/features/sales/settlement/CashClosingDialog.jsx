import { Printer, Save, X } from "lucide-react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import CashClosingFields from "./CashClosingFields";
import useCashClosingForm from "./useCashClosingForm";

/** Cash Closing in a dialog (POS Old's Close): the same form and save as Sales > Cash Closing. */
export default function CashClosingDialog({ open, onClose, defaultCounterId }) {
  return open ? <CashClosingDialogBody onClose={onClose} defaultCounterId={defaultCounterId} /> : null;
}

function CashClosingDialogBody({ onClose, defaultCounterId }) {
  const form = useCashClosingForm({ defaultCounterId, onSaved: () => onClose() });
  const busy = form.saving || form.loadingMeta;

  return (
    <Dialog open onClose={form.saving ? undefined : onClose} maxWidth="lg" fullWidth aria-labelledby="cash-closing-dialog-title">
      <DialogTitle id="cash-closing-dialog-title" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.25 }}>
        <Typography component="span" sx={{ fontSize: 14, fontWeight: 600 }}>Cash Closing</Typography>
        <IconButton size="small" onClick={onClose} disabled={form.saving} aria-label="Close cash closing">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "background.default" }}>
        <CashClosingFields form={form} />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={form.saving} className="glass-btn glass-btn-secondary">Cancel</Button>
          <Button onClick={() => form.handlePrint()} disabled={busy} className="glass-btn glass-btn-primary" startIcon={<Printer size={16} />}>Print</Button>
          <Button onClick={() => form.handleSave()} disabled={busy} className="glass-btn glass-btn-success" startIcon={<Save size={16} />}>
            {form.saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={() => form.handleSave({ print: true })} disabled={busy} className="glass-btn glass-btn-primary" startIcon={<Printer size={16} />}>
            Save &amp; Print
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
