import { useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";

const money = value => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const time = value => (value ? new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-");

const STATUS = {
  pending: { label: "Waiting to sync", color: "warning" },
  attention: { label: "Needs attention", color: "error" },
  synced: { label: "Synced", color: "success" },
};

/** POS header chip: online/offline state and the offline bills on this till, with their list. */
export default function PosOfflineStatus({ offline, pack, bills, pending, attention, syncing, onSync, onReprint, onRetry, onDiscard }) {
  const [open, setOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(null);
  const label = offline
    ? `Offline${pending ? ` · ${pending} to sync` : ""}`
    : attention ? `${attention} offline bill${attention === 1 ? "" : "s"} need attention`
      : pending ? `${pending} to sync` : "Online";
  const color = attention ? "error" : offline || pending ? "warning" : "success";

  return (
    <>
      <Chip
        size="small"
        color={color}
        variant={offline || pending || attention ? "filled" : "outlined"}
        icon={offline ? <CloudOff size={14} /> : <Wifi size={14} />}
        label={syncing ? "Syncing…" : label}
        onClick={() => setOpen(true)}
        aria-label="Offline billing status"
      />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Offline billing on this till</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {offline ? (
              <Alert severity="warning">The server can't be reached. Paid bills are saved on this till under the counter's offline series and sync automatically when it answers again.</Alert>
            ) : (
              <Alert severity="success">Online. If the internet drops, this till keeps billing paid sales from its downloaded catalog.</Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              {pack?.catalogAt
                ? `Catalog: ${Number(pack.catalogCount || 0).toLocaleString("en-IN")} items, downloaded ${time(pack.catalogAt)}.`
                : "The catalog has not been downloaded yet; scanning offline needs one download while online."}
              {pack?.series?.code ? ` Offline series ${pack.series.code}.` : " No counter offline series yet (assign a counter)."}
            </Typography>
            {bills.length === 0 ? (
              <Typography variant="body2">No offline bills on this till.</Typography>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Bill no</TableCell><TableCell>Billed</TableCell><TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bills.map(bill => (
                      <TableRow key={bill.checkoutKey}>
                        <TableCell>
                          {bill.sale?.bill_no}
                          {bill.savedBillNo && bill.savedBillNo !== bill.sale?.bill_no ? <Typography variant="caption" display="block" color="text.secondary">Saved as {bill.savedBillNo}</Typography> : null}
                        </TableCell>
                        <TableCell>{time(bill.createdAt)}</TableCell>
                        <TableCell align="right">{money(bill.sale?.grand_total)}</TableCell>
                        <TableCell>
                          <Chip size="small" color={STATUS[bill.status]?.color} label={STATUS[bill.status]?.label || bill.status} />
                          {bill.error ? <Typography variant="caption" display="block" color="error.main" sx={{ maxWidth: 280 }}>{bill.error}</Typography> : null}
                          {bill.review ? <Typography variant="caption" display="block" color="text.secondary">Listed for a manager to check</Typography> : null}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          <Button size="small" onClick={() => onReprint(bill)}>Reprint</Button>
                          {bill.status === "attention" ? <>
                            <Button size="small" onClick={() => onRetry(bill)}>Retry</Button>
                            <Button size="small" color="error" onClick={() => setConfirmDiscard(bill)}>Discard</Button>
                          </> : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<RefreshCw size={14} />} disabled={syncing || pending === 0} onClick={() => onSync()}>Sync now</Button>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(confirmDiscard)} onClose={() => setConfirmDiscard(null)}>
        <DialogTitle>Discard bill {confirmDiscard?.sale?.bill_no}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">The customer already has this receipt. Discarding removes it from this till for good; enter the sale again by hand if it really happened.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDiscard(null)}>Keep</Button>
          <Button color="error" variant="contained" onClick={() => { onDiscard(confirmDiscard); setConfirmDiscard(null); }}>Discard</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
