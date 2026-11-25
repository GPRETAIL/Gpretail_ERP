import { useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { heldAtText, waitedText } from "../utils/heldBills";
import InfoHint from "@/shared/components/InfoHint";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * The bills set aside at this counter. From the keyboard: Up and Down choose a bill, Enter resumes it, a number key
 * (1 to 9) resumes that bill at once, Delete removes the chosen one, Shift+Delete clears them all (after a question).
 * With the mouse: Resume and Delete on each bill, and Clear all at the bottom.
 */
function HeldBillsBody({ bills, listRef, onResume, onDelete, onClearAll, onClose }) {
  const [selected, setSelected] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const last = Math.max(0, bills.length - 1);
  const chosen = Math.min(selected, last);

  const onKeyDown = (event) => {
    if (!bills.length || event.altKey || event.ctrlKey || event.metaKey) return;
    const onButton = event.target?.tagName === "BUTTON";
    if (event.key === "ArrowDown") setSelected(Math.min(last, chosen + 1));
    else if (event.key === "ArrowUp") setSelected(Math.max(0, chosen - 1));
    else if (event.key === "Home") setSelected(0);
    else if (event.key === "End") setSelected(last);
    else if (event.key === "Enter" && !onButton) onResume(bills[chosen].id);
    else if (/^[1-9]$/.test(event.key) && bills[Number(event.key) - 1] && event.target?.tagName !== "INPUT") onResume(bills[Number(event.key) - 1].id);
    else if (event.key === "Delete" && event.shiftKey) setConfirmingClear(true);
    else if (event.key === "Delete") onDelete(bills[chosen].id);
    else return;
    event.preventDefault();
  };

  return (
    <Box onKeyDown={onKeyDown} sx={{ display: "contents" }}>
      <DialogContent>
        {bills.length === 0 ? (
          <Typography sx={{ fontSize: 14, color: "text.secondary", py: 2 }}>No bills are on hold. Press H in the barcode box, or Hold, to set the current bill aside.</Typography>
        ) : (
          <Stack spacing={1} sx={{ pt: 0.5 }} ref={listRef} role="listbox" aria-label="Held bills" aria-activedescendant={`held-bill-${bills[chosen].id}`} tabIndex={0} autoFocus>
            {bills.map((bill, index) => (
              <Box key={bill.id} id={`held-bill-${bill.id}`} role="option" aria-selected={index === chosen} onClick={() => setSelected(index)}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25, border: 1, borderColor: index === chosen ? "primary.main" : "divider", borderRadius: 1.5, bgcolor: index === chosen ? "action.selected" : "transparent", cursor: "pointer" }}>
                <Box aria-hidden="true" sx={{ width: 26, height: 26, flexShrink: 0, borderRadius: "50%", bgcolor: "action.hover", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{index + 1}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>{bill.label}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    {bill.items} item{bill.items === 1 ? "" : "s"} · ₹{money(bill.amount)} · held {heldAtText(bill.heldAt)} ({waitedText(bill.heldAt)})
                  </Typography>
                </Box>
                <Button size="small" variant="contained" tabIndex={-1} onClick={(event) => { event.stopPropagation(); onResume(bill.id); }}>Resume</Button>
                <Button size="small" color="error" tabIndex={-1} onClick={(event) => { event.stopPropagation(); onDelete(bill.id); }} aria-label={`Delete held bill for ${bill.label}`}>Delete</Button>
              </Box>
            ))}
          </Stack>
        )}
        {confirmingClear && (
          <Alert severity="warning" sx={{ mt: 1.5 }} action={(
            <Stack direction="row" spacing={0.5}>
              <Button size="small" color="inherit" autoFocus onClick={() => setConfirmingClear(false)}>Keep them</Button>
              <Button size="small" color="error" variant="contained" onClick={() => { setConfirmingClear(false); onClearAll(); }}>Yes, delete all</Button>
            </Stack>
          )}>
            Delete all {bills.length} held bill{bills.length === 1 ? "" : "s"}? This cannot be undone.
          </Alert>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <InfoHint label="About held bills" title="Held bills"><p>Keys: Up and Down choose, Enter resumes, 1 to 9 resumes that bill, Delete removes, Shift+Delete clears all.</p><p>A held bill is only kept on this computer for one day. It has no bill number and takes nothing out of stock until it is saved.</p></InfoHint>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Button color="error" disabled={!bills.length || confirmingClear} onClick={() => setConfirmingClear(true)}>Clear all</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Box>
  );
}

/** The dialog. Its body is only mounted while open, so each opening starts fresh: the newest bill chosen, no question pending. */
export default function HeldBillsDialog({ open, bills, ...handlers }) {
  const listRef = useRef(null);
  // The dialog takes focus itself when it opens; the list is given it afterwards so the arrow keys work straight away.
  return (
    <Dialog open={open} onClose={handlers.onClose} fullWidth maxWidth="sm" slotProps={{ transition: { onEntered: () => listRef.current?.focus() } }}>
      <DialogTitle>Held bills{bills.length ? ` (${bills.length})` : ""}</DialogTitle>
      <HeldBillsBody bills={bills} listRef={listRef} {...handlers} />
    </Dialog>
  );
}
