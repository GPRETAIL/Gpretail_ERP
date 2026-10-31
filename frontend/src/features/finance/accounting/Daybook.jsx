import { Fragment, useState } from "react";
import { Box, Chip, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { DateFilters, FinanceReportLayout } from "./components/FinanceReportLayout";
import { VOUCHER_TYPES, money, today, useFinanceReport } from "./utils/financeUtils";

/** Finance > Daybook: every voucher in the period with its debit and credit lines. */
export default function Daybook() {
  const [filters, setFilters] = useState({ from: today(), to: today(), type: "" });
  const report = useFinanceReport("/accounting/daybook", filters);
  const vouchers = report.data || [];
  const total = vouchers.reduce((sum, voucher) => sum + Number(voucher.amount || 0), 0);

  return (
    <FinanceReportLayout title="Daybook" error={report.error} onRefresh={report.reload}
      filters={<>
        <DateFilters from={filters.from} to={filters.to} onChange={change => setFilters(current => ({ ...current, ...change }))} />
        <TextField select size="small" label="Type" value={filters.type} onChange={event => setFilters(current => ({ ...current, type: event.target.value }))} sx={{ width: 160 }}>
          <MenuItem value="">All types</MenuItem>
          {Object.entries(VOUCHER_TYPES).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
      </>}>
      <Typography variant="body2" color="text.secondary">{vouchers.length} voucher{vouchers.length === 1 ? "" : "s"}, {money(total)} in total.</Typography>
      <Paper variant="outlined" sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell><TableCell>Voucher</TableCell><TableCell>Ledger</TableCell>
              <TableCell align="right">Debit</TableCell><TableCell align="right">Credit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vouchers.map(voucher => (
              <Fragment key={voucher.id}>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{voucher.voucher_date}</TableCell>
                  <TableCell colSpan={4}>
                    <b>{voucher.voucher_no}</b>{" "}
                    <Chip size="small" label={VOUCHER_TYPES[voucher.voucher_type] || voucher.voucher_type} sx={{ mx: 0.5 }} />
                    {voucher.automatic ? null : <Chip size="small" variant="outlined" label="Entered by hand" />}
                    {voucher.narration ? <Typography variant="caption" display="block" color="text.secondary">{voucher.narration}{voucher.created_by_name ? ` · ${voucher.created_by_name}` : ""}</Typography> : null}
                  </TableCell>
                </TableRow>
                {voucher.lines.map((line, index) => (
                  <TableRow key={`${voucher.id}-${index}`}>
                    <TableCell /><TableCell />
                    <TableCell sx={{ pl: line.credit ? 4 : 2 }}>{line.credit ? "To " : ""}{line.account}</TableCell>
                    <TableCell align="right">{line.debit ? money(line.debit) : ""}</TableCell>
                    <TableCell align="right">{line.credit ? money(line.credit) : ""}</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        {!report.loading && vouchers.length === 0 ? <Box sx={{ p: 2 }}><Typography variant="body2">No vouchers in this period.</Typography></Box> : null}
      </Paper>
    </FinanceReportLayout>
  );
}
