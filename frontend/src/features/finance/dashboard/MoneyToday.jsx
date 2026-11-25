import { Link } from "react-router-dom";
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Banknote, Building2, CreditCard, Landmark, ReceiptIndianRupee, RefreshCw, TrendingUp, Users } from "lucide-react";
import { money, useFinanceReport } from "@/features/finance/accounting/utils/financeUtils";

const rupees = (value) => `₹${money(value)}`;

function MoneyCard({ icon: Icon, title, value, color, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
        <Icon size={16} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: color || "text.primary" }}>{value}</Typography>
      {children}
    </Paper>
  );
}

function Lines({ rows }) {
  return rows.map((row) => (
    <Stack key={row.id} direction="row" sx={{ justifyContent: "space-between", gap: 1, fontSize: 12, color: "text.secondary" }}>
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</Box>
      <Box component="span" sx={{ whiteSpace: "nowrap" }}>{rupees(row.balance)}</Box>
    </Stack>
  ));
}

const GRID = { display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } };

/** Finance > Dashboard: where the money is today, straight from the books (cash, bank, today, GST, dues, profit). */
export default function MoneyToday() {
  const home = useFinanceReport("/accounting/home", null);
  const data = home.data;

  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 700 }}>Money today</Typography>
        <Button size="small" startIcon={<RefreshCw size={14} />} onClick={home.reload}>Refresh</Button>
      </Stack>

      {home.error ? <Alert severity="info">{home.error}</Alert> : null}
      {!data && !home.error ? (
        <Box sx={GRID}>{[0, 1, 2, 3].map((n) => <Skeleton key={n} variant="rounded" height={110} />)}</Box>
      ) : null}
      {data ? (
        <Box aria-label="Money today" sx={GRID}>
          <MoneyCard icon={Banknote} title="Cash in hand" value={rupees(data.totals.cash)}>
            {data.cash.length > 1 ? <Lines rows={data.cash} /> : null}
          </MoneyCard>
          <MoneyCard icon={Landmark} title="Bank" value={rupees(data.totals.bank)}>
            {data.bank.length > 1 ? <Lines rows={data.bank} /> : null}
            {Math.abs(data.totals.clearing) >= 0.01 ? (
              <Typography variant="caption" color="text.secondary">+ {rupees(data.totals.clearing)} card / UPI not yet in bank</Typography>
            ) : null}
          </MoneyCard>
          <MoneyCard icon={CreditCard} title="Today" value={rupees(data.totals.in_today - data.totals.out_today)}>
            <Typography variant="caption" color="text.secondary">Received {rupees(data.totals.in_today)} · Paid {rupees(data.totals.out_today)}</Typography>
          </MoneyCard>
          <MoneyCard icon={ReceiptIndianRupee} title="GST payable this month" value={rupees(data.gst.net_payable)} color={data.gst.net_payable < 0 ? "success.main" : undefined}>
            <Typography variant="caption" color="text.secondary">Output {rupees(data.gst.output)} · Input credit {rupees(data.gst.input)}</Typography>
          </MoneyCard>
          <MoneyCard icon={Users} title="Customers owe" value={rupees(data.totals.receivable)}>
            <Typography component={Link} to="/finance/receivable" variant="caption" sx={{ color: "primary.main" }}>Open Receivable</Typography>
          </MoneyCard>
          <MoneyCard icon={Building2} title="We owe suppliers" value={rupees(data.totals.payable)}>
            <Typography component={Link} to="/finance/payable" variant="caption" sx={{ color: "primary.main" }}>Open Payable</Typography>
          </MoneyCard>
          <MoneyCard icon={TrendingUp} title="Profit this month" value={rupees(data.net_profit_month)} color={data.net_profit_month < 0 ? "error.main" : "success.main"}>
            <Typography component={Link} to="/finance/p-l-account" variant="caption" sx={{ color: "primary.main" }}>Open Profit &amp; Loss</Typography>
          </MoneyCard>
        </Box>
      ) : null}
    </Box>
  );
}
