import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Save } from "lucide-react";
import DealerPaymentBlock from "./DealerPaymentBlock";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Dealer Invoice with the payment dialog on (Sales Customisation): Save first asks how the invoice is settled.
 * Credit: nothing is taken now and the whole invoice goes on the dealer's account. Paid now: money taken by mode
 * (cash, card, UPI, bank, cheque); whatever is not paid still goes on credit. A credit above the user's limit asks
 * for a supervisor's approval when saved, as on the page.
 */
export default function DealerPaymentDialog({ total, payments, onChange, saving, onConfirm, onClose }) {
  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const kind = payments.length ? "paid" : "credit";
  const choose = (value) => {
    if (!value || value === kind) return;
    onChange(value === "credit" ? [] : [{ mode: "CASH", amount: Number(total || 0).toFixed(2), reference_no: "", card_type_id: "", upi_provider_id: "", cheque_date: "" }]);
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="dealer-payment-title">
      <DialogTitle id="dealer-payment-title">Payment</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography>Invoice total</Typography><Typography sx={{ fontWeight: 700 }}>₹{money(total)}</Typography>
          </Stack>
          <ToggleButtonGroup exclusive fullWidth size="small" value={kind} onChange={(_e, value) => choose(value)} aria-label="How the invoice is settled">
            <ToggleButton value="credit">Credit</ToggleButton>
            <ToggleButton value="paid">Paid now</ToggleButton>
          </ToggleButtonGroup>
          {kind === "credit" ? (
            <Alert severity="info">The whole invoice, ₹{money(total)}, goes on the dealer&apos;s account as credit. It is collected later in Sales &gt; Dealer Receipt.</Alert>
          ) : (
            <>
              <DealerPaymentBlock total={total} payments={payments} onChange={onChange} />
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ color: "text.secondary" }}>On credit</Typography>
                <Typography sx={{ fontWeight: 600 }}>₹{money(Math.max(0, total - paid))}</Typography>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" startIcon={<Save size={16} />} disabled={saving || paid > total + 0.005} onClick={onConfirm}>
          {saving ? "Saving..." : kind === "credit" ? "Save on credit" : "Save invoice"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
