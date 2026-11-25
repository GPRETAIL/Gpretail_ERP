import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { heldAtText, waitedText } from "../utils/heldBills";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The bills set aside at this counter. Resume puts one back on the screen; Delete throws it away. */
export default function HeldBillsDialog({ open, bills, onResume, onDelete, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Held bills</DialogTitle>
      <DialogContent>
        {bills.length === 0 ? (
          <Typography sx={{ fontSize: 14, color: "text.secondary", py: 2 }}>No bills are on hold. Press H in the barcode box, or Hold, to set the current bill aside.</Typography>
        ) : (
          <Stack spacing={1} sx={{ pt: 0.5 }}>
            {bills.map((bill) => (
              <Box key={bill.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>{bill.label}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    {bill.items} item{bill.items === 1 ? "" : "s"} · ₹{money(bill.amount)} · held {heldAtText(bill.heldAt)} ({waitedText(bill.heldAt)})
                  </Typography>
                </Box>
                <Button size="small" variant="contained" onClick={() => onResume(bill.id)}>Resume</Button>
                <Button size="small" color="error" onClick={() => onDelete(bill.id)} aria-label={`Delete held bill for ${bill.label}`}>Delete</Button>
              </Box>
            ))}
          </Stack>
        )}
        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1.5 }}>
          A held bill is only kept on this computer for one day. It has no bill number and takes nothing out of stock until it is saved.
        </Typography>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}
