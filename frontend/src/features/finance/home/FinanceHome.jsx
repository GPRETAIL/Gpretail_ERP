import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Alert, Box, Button, Card, Chip, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Banknote, Building2, CreditCard, Landmark, ReceiptIndianRupee, RefreshCw, TrendingUp, Users } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader";
import { navItems } from "@/shared/layout/navItems";
import { getVisibleNavItems } from "@/features/auth/utils/accessControl";
import FinanceDashboardTabPane from "@/features/dashboard/components/FinanceDashboardTabPane";
import { DashboardLayoutProvider } from "@/features/dashboard/context/DashboardLayoutContext";
import { money, useFinanceReport } from "@/features/finance/accounting/utils/financeUtils";
import { groupFinancePages } from "./utils/financeHomePages";

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

/** Finance home (/finance): where the money is today, from the books, then every Finance page this user may open. */
export default function FinanceHome() {
  const user = useSelector((state) => state.auth.user);
  const home = useFinanceReport("/accounting/home", null);
  const data = home.data;
  const groups = useMemo(() => groupFinancePages(getVisibleNavItems(navItems, user).find((item) => item.path === "/finance")?.subItems), [user]);
  const storeId = sessionStorage.getItem("activeStoreId") || String(user?.store_id || "");

  return (
    <Box component="section" sx={{ height: "100%", overflowY: "auto", p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <PageHeader title="Finance" actions={<Button size="small" startIcon={<RefreshCw size={14} />} onClick={home.reload}>Refresh</Button>} />

      {home.error ? <Alert severity="info">{home.error}</Alert> : null}
      {!data && !home.error ? (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } }}>
          {[0, 1, 2, 3].map((n) => <Skeleton key={n} variant="rounded" height={110} />)}
        </Box>
      ) : null}
      {data ? (
        <Box aria-label="Money today" sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" } }}>
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

      {groups.map((group) => (
        <Box key={group.title}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{group.title}</Typography>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(6, 1fr)" } }}>
            {group.items.map((page) => (
              <Card key={page.path} component={Link} to={page.path} variant="outlined"
                sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, minHeight: 48, textDecoration: "none", "&:hover": { boxShadow: 2, bgcolor: "action.hover" } }}>
                {page.icon ? <page.icon style={{ width: 16, height: 16, color: "#6366f1", flexShrink: 0 }} /> : null}
                <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary", flex: 1 }}>{page.name}</Typography>
                {page.soon ? <Chip label="Soon" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} /> : null}
              </Card>
            ))}
          </Box>
        </Box>
      ))}

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Payables, purchases and dues</Typography>
        <DashboardLayoutProvider>
          <FinanceDashboardTabPane active companyId={storeId} />
        </DashboardLayoutProvider>
      </Box>
    </Box>
  );
}
