import { useState } from "react";
import { Alert, Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { DateFilters, FinanceReportLayout } from "./components/FinanceReportLayout";
import LedgerStatementDialog from "./components/LedgerStatementDialog";
import { financialYearStart, money, today, useFinanceReport } from "./utils/financeUtils";

const TITLES = { trading: "Trading Account", pl: "Profit & Loss Account", balance: "Balance Sheet" };

/** One side of a T-format account: headed sections of lines, then its total. */
function Side({ title, sections, total, onOpen }) {
  return (
    <Paper variant="outlined" sx={{ flex: { xs: "none", md: 1 }, minWidth: 0, overflow: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow><TableCell>{title}</TableCell><TableCell align="right">Amount</TableCell></TableRow>
        </TableHead>
        <TableBody>
          {sections.filter(section => section.items.length).map(section => [
            section.heading ? <TableRow key={`h-${section.heading}`}><TableCell colSpan={2} sx={{ fontWeight: 700, bgcolor: "action.hover" }}>{section.heading}</TableCell></TableRow> : null,
            ...section.items.map((item, index) => (
              <TableRow key={`${section.heading}-${item.name}-${index}`} hover={Boolean(item.account_id)} sx={item.account_id ? { cursor: "pointer" } : undefined}
                onClick={item.account_id ? () => onOpen({ id: item.account_id, name: item.name }) : undefined}>
                <TableCell sx={{ pl: section.heading ? 3 : 2, fontWeight: item.strong ? 700 : 400 }}>{item.name}</TableCell>
                <TableCell align="right" sx={{ fontWeight: item.strong ? 700 : 400 }}>{money(item.amount)}</TableCell>
              </TableRow>
            )),
          ])}
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>{money(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
}

const lines = rows => (rows || []).map(row => ({ name: row.name, amount: row.amount, account_id: row.account_id }));

function tradingSides(t) {
  const profit = t.gross_profit;
  return [
    { title: "Debit", total: Math.max(t.total_debit + Math.max(profit, 0), 0), sections: [
      { items: [{ name: "Opening Stock", amount: t.opening_stock }] },
      { heading: "Purchase Accounts", items: lines(t.purchases) },
      { heading: "Direct Expenses", items: lines(t.direct_expenses) },
      { items: profit > 0 ? [{ name: "Gross Profit c/o", amount: profit, strong: true }] : [] },
    ] },
    { title: "Credit", total: t.total_credit + Math.max(-profit, 0), sections: [
      { heading: "Sales Accounts", items: lines(t.sales) },
      { heading: "Direct Incomes", items: lines(t.direct_incomes) },
      { items: [{ name: "Closing Stock", amount: t.closing_stock }] },
      { items: profit < 0 ? [{ name: "Gross Loss c/o", amount: -profit, strong: true }] : [] },
    ] },
  ];
}

function profitSides(p) {
  const expenses = (p.indirect_expenses || []).reduce((sum, row) => sum + row.amount, 0);
  const incomes = (p.indirect_incomes || []).reduce((sum, row) => sum + row.amount, 0);
  const left = Math.max(-p.gross_profit, 0) + expenses + Math.max(p.net_profit, 0);
  return [
    { title: "Debit", total: left, sections: [
      { items: p.gross_profit < 0 ? [{ name: "Gross Loss b/f", amount: -p.gross_profit }] : [] },
      { heading: "Indirect Expenses", items: lines(p.indirect_expenses) },
      { items: p.net_profit > 0 ? [{ name: "Net Profit", amount: p.net_profit, strong: true }] : [] },
    ] },
    { title: "Credit", total: Math.max(p.gross_profit, 0) + incomes + Math.max(-p.net_profit, 0), sections: [
      { items: p.gross_profit > 0 ? [{ name: "Gross Profit b/f", amount: p.gross_profit }] : [] },
      { heading: "Indirect Incomes", items: lines(p.indirect_incomes) },
      { items: p.net_profit < 0 ? [{ name: "Net Loss", amount: -p.net_profit, strong: true }] : [] },
    ] },
  ];
}

function balanceSides(b) {
  const groups = list => list.map(group => ({ heading: group.group, items: group.accounts.map(row => ({ name: row.name, amount: row.amount, account_id: row.account_id })) }));
  return [
    { title: "Liabilities", total: b.total_liabilities, sections: [
      ...groups(b.liabilities),
      { heading: "Capital", items: b.starting_stock ? [{ name: "Stock on hand when the books started", amount: b.starting_stock }] : [] },
      { items: [{ name: "Profit & Loss A/c", amount: b.profit_and_loss, strong: true }] },
      { items: Math.abs(b.opening_difference) >= 0.01 ? [{ name: "Difference in opening balances", amount: b.opening_difference }] : [] },
    ] },
    { title: "Assets", total: b.total_assets, sections: [
      ...groups(b.assets),
      { heading: "Stock-in-Hand", items: [{ name: "Closing Stock (FIFO cost)", amount: b.closing_stock }] },
    ] },
  ];
}

/** Finance > Trading Account, Profit & Loss Account and Balance Sheet (variant). */
export default function FinalAccounts({ variant }) {
  const [range, setRange] = useState({ from: financialYearStart(), to: today() });
  const [open, setOpen] = useState(null);
  const isBalance = variant === "balance";
  const report = useFinanceReport(isBalance ? "/accounting/balance-sheet" : "/accounting/profit-loss", isBalance ? { to: range.to } : range);
  const data = report.data;
  const sides = !data ? [] : variant === "trading" ? tradingSides(data.trading) : variant === "pl" ? profitSides(data.profit_and_loss) : balanceSides(data);

  return (
    <FinanceReportLayout title={TITLES[variant]} error={report.error} onRefresh={report.reload}
      filters={<DateFilters single={isBalance} from={range.from} to={range.to} onChange={change => setRange(current => ({ ...current, ...change }))} />}>
      {isBalance && data && Math.abs(data.difference) >= 0.01 ? <Alert severity="error">Assets and liabilities differ by {money(data.difference)}.</Alert> : null}
      {data ? (
        <Typography variant="body2" color="text.secondary">
          {isBalance ? `As on ${data.as_of}. Stock is valued at FIFO cost.` : `${data.from} to ${data.to}. Opening and closing stock are valued at FIFO cost.`}
          {variant === "pl" ? ` Gross profit ${money(data.trading.gross_profit)} comes from the Trading Account.` : ""}
        </Typography>
      ) : null}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", md: "flex-start" } }}>
        {sides.map(side => <Side key={side.title} {...side} onOpen={setOpen} />)}
      </Stack>
      {!data && report.loading ? <Box sx={{ p: 2 }}><Typography variant="body2">Loading…</Typography></Box> : null}
      {open ? <LedgerStatementDialog account={open} from={isBalance ? undefined : range.from} to={range.to} onClose={() => setOpen(null)} /> : null}
    </FinanceReportLayout>
  );
}
