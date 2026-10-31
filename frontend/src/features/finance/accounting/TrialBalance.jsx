import { useState } from "react";
import { Alert, Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { DateFilters, FinanceReportLayout } from "./components/FinanceReportLayout";
import LedgerStatementDialog from "./components/LedgerStatementDialog";
import { financialYearStart, money, today, useFinanceReport } from "./utils/financeUtils";

/** Finance > Trial Balance: every ledger's closing balance; debits and credits must total the same. */
export default function TrialBalance() {
  const [range, setRange] = useState({ from: financialYearStart(), to: today() });
  const [open, setOpen] = useState(null);
  const report = useFinanceReport("/accounting/trial-balance", range);
  const data = report.data;
  const groups = Object.entries((data?.rows || []).reduce((acc, row) => ({ ...acc, [row.group_name]: [...(acc[row.group_name] || []), row] }), {}));

  return (
    <FinanceReportLayout title="Trial Balance" error={report.error} onRefresh={report.reload}
      filters={<DateFilters from={range.from} to={range.to} onChange={change => setRange(current => ({ ...current, ...change }))} />}>
      {data && Math.abs(data.opening_difference) >= 0.01 ? (
        <Alert severity="warning">Opening balances entered on ledgers differ by {money(Math.abs(data.opening_difference))} ({data.opening_difference > 0 ? "more debit" : "more credit"}). Check them in Manage Ledger.</Alert>
      ) : null}
      <Paper variant="outlined" sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Particulars</TableCell>
              <TableCell align="right">Opening</TableCell>
              <TableCell align="right">Debit</TableCell>
              <TableCell align="right">Credit</TableCell>
              <TableCell align="right">Closing Dr</TableCell>
              <TableCell align="right">Closing Cr</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(([group, rows]) => [
              <TableRow key={group}><TableCell colSpan={6} sx={{ fontWeight: 700, bgcolor: "action.hover" }}>{group}</TableCell></TableRow>,
              ...rows.map(row => (
                <TableRow key={row.id} hover sx={{ cursor: "pointer" }} onClick={() => setOpen(row)}>
                  <TableCell sx={{ pl: 3 }}>{row.name}</TableCell>
                  <TableCell align="right">{row.opening ? money(Math.abs(row.opening)) + (row.opening > 0 ? " Dr" : " Cr") : ""}</TableCell>
                  <TableCell align="right">{row.debit ? money(row.debit) : ""}</TableCell>
                  <TableCell align="right">{row.credit ? money(row.credit) : ""}</TableCell>
                  <TableCell align="right">{row.closing > 0 ? money(row.closing) : ""}</TableCell>
                  <TableCell align="right">{row.closing < 0 ? money(-row.closing) : ""}</TableCell>
                </TableRow>
              )),
            ])}
            {data ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{money(data.total_debit)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{money(data.total_credit)}</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {data && data.rows.length === 0 ? <Box sx={{ p: 2 }}><Typography variant="body2">No entries in this period.</Typography></Box> : null}
      </Paper>
      {open ? <LedgerStatementDialog account={open} from={range.from} to={range.to} onClose={() => setOpen(null)} /> : null}
    </FinanceReportLayout>
  );
}
