import { useState } from "react";
import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { DateFilters, FinanceReportLayout } from "./components/FinanceReportLayout";
import LedgerStatementDialog from "./components/LedgerStatementDialog";
import { money, today, useFinanceReport } from "./utils/financeUtils";
import { useFinanceSummary } from "./components/FinanceSummary";

const COPY = {
  payable: { title: "Payable", party: "Supplier", note: "What the store owes its suppliers (bills less payments and returns)." },
  receivable: { title: "Receivable", party: "Customer", note: "What credit customers owe, and POS bills not yet settled." },
};

/** Finance > Payable / Receivable: party ledgers with an outstanding balance. */
export default function Outstanding({ side }) {
  const [to, setTo] = useState(today());
  const [open, setOpen] = useState(null);
  const report = useFinanceReport("/accounting/outstanding", { side, to });
  const rows = report.data || [];
  const copy = COPY[side];
  // Summary layouts: by days since each party's last entry, or the biggest parties.
  const summary = useFinanceSummary("outstanding", { side, to }, copy.title);

  return (
    <FinanceReportLayout title={copy.title} error={report.error} onRefresh={report.reload} actions={summary.buttons}
      filters={<DateFilters single to={to} onChange={change => setTo(change.to)} />}>
      <Typography variant="body2" color="text.secondary">{copy.note} A negative amount is an advance.</Typography>
      {summary.wrap(summary.applied ? summary.table : (
      <Paper variant="outlined" sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow><TableCell>{copy.party}</TableCell><TableCell>Last entry</TableCell><TableCell align="right">Outstanding</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.account_id} hover sx={{ cursor: "pointer" }} onClick={() => setOpen({ id: row.account_id, name: row.name })}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.last_entry ? String(row.last_entry).slice(0, 10) : "-"}</TableCell>
                <TableCell align="right">{money(row.amount)}</TableCell>
              </TableRow>
            ))}
            {rows.length ? (
              <TableRow>
                <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{money(rows.reduce((sum, row) => sum + row.amount, 0))}</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {!report.loading && rows.length === 0 ? <Box sx={{ p: 2 }}><Typography variant="body2">Nothing outstanding.</Typography></Box> : null}
      </Paper>
      ))}
      {open ? <LedgerStatementDialog account={open} to={to} onClose={() => setOpen(null)} /> : null}
    </FinanceReportLayout>
  );
}
