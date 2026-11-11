import { useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { DateFilters } from "./FinanceReportLayout";
import { VOUCHER_TYPES, drCr, financialYearStart, money, today, useFinanceReport } from "@/features/finance/accounting/utils/financeUtils";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";

/** One ledger's entries for a period with a running balance. */
export default function LedgerStatementDialog({ account, onClose, from: initialFrom, to: initialTo }) {
  const [range, setRange] = useState({ from: initialFrom || financialYearStart(), to: initialTo || today() });
  const report = useFinanceReport(`/accounting/accounts/${account.id}/ledger`, range);
  const data = report.data;

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
          <Box>
            {account.name}
            <Typography variant="body2" color="text.secondary">{account.group_name || data?.account?.group_name}</Typography>
          </Box>
          <Stack direction="row" spacing={1}><DateFilters from={range.from} to={range.to} onChange={change => setRange(current => ({ ...current, ...change }))} /></Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {report.error ? <Alert severity="warning">{report.error}</Alert> : null}
        {data ? (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell><TableCell>Voucher</TableCell><TableCell>Particulars</TableCell>
                  <TableCell align="right">Debit</TableCell><TableCell align="right">Credit</TableCell><TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5}><b>Opening balance</b></TableCell>
                  <TableCell align="right"><b>{drCr(data.account.opening)}</b></TableCell>
                </TableRow>
                {data.entries.map((entry, index) => (
                  <TableRow key={`${entry.voucher_id}-${index}`}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{entry.date}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {entry.voucher_no}
                      <Typography variant="caption" display="block" color="text.secondary">{VOUCHER_TYPES[entry.voucher_type] || entry.voucher_type}</Typography>
                    </TableCell>
                    <TableCell>
                      {entry.against || "-"}
                      {entry.narration ? <Typography variant="caption" display="block" color="text.secondary">{entry.narration}</Typography> : null}
                    </TableCell>
                    <TableCell align="right">{entry.debit ? money(entry.debit) : ""}</TableCell>
                    <TableCell align="right">{entry.credit ? money(entry.credit) : ""}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{drCr(entry.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3}><b>Closing balance</b></TableCell>
                  <TableCell align="right"><b>{money(data.account.debit)}</b></TableCell>
                  <TableCell align="right"><b>{money(data.account.credit)}</b></TableCell>
                  <TableCell align="right"><b>{drCr(data.account.closing)}</b></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {data.entries.length === 0 ? <Chip size="small" label="No entries in this period" sx={{ mt: 1 }} /> : null}
          </Box>
        ) : report.loading ? <LoadingSkeleton variant="table" rows={8} label="Loading statement" /> : null}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}
