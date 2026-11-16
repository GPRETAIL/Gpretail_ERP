import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { BadgeCheck, RefreshCw, Settings2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const lastMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); };
const monthEnded = (month) => new Date(`${month}-01T00:00:00`) < new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const right = (render = money) => (value) => <Box component="span" sx={{ display: "block", textAlign: "right" }}>{render(value)}</Box>;

/**
 * Finance > Incentive Report: what each salesperson earned in a month under the Incentive Configuration rules (item,
 * scheme, old stock, target, less returns). A manager approves a finished month; payroll then pays it.
 */
export default function IncentiveReport() {
  const navigate = useNavigate();
  const storeId = useSelector((state) => state.auth.user?.store_id);
  const role = useSelector((state) => state.auth.user?.role);
  const [month, setMonth] = useState(lastMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // { row, lines }
  const [approving, setApproving] = useState(false);
  const rows = useMemo(() => data?.rows || [], [data]);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${storeId || ""}:${month}` });
  const { page, limit, setPage, setLimit } = grid;
  const canApprove = ["manager", "admin", "super_admin"].includes(role);
  const totals = useMemo(() => rows.reduce((t, r) => ({ net: t.net + r.net_sales, total: t.total + r.total }), { net: 0, total: 0 }), [rows]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/incentives/report", { params: { month } });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load the incentive report");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const openDetail = useCallback(async (row) => {
    try {
      const res = await api.get("/incentives/report", { params: { month, employee_id: row.employee_id } });
      setDetail({ row, lines: res.data?.data?.lines || [] });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the bill lines");
    }
  }, [month]);

  const approve = async () => {
    if (!window.confirm(`Approve the incentives for ${month}? The amounts are then fixed and payroll pays them.`)) return;
    setApproving(true);
    try {
      const res = await api.post("/incentives/approve", { month });
      setData(res.data?.data || null);
      toast.success(res.data?.message || "Month approved.");
    } catch (err) {
      const body = err?.response?.data;
      toast.error(body?.errors ? Object.values(body.errors).flat()[0] : body?.message || "Could not approve the month.");
    } finally {
      setApproving(false);
    }
  };

  const columns = useMemo(() => [
    { key: "employee_name", label: "Salesperson", valueGetter: (r) => r.employee_name,
      render: (_v, r) => <Button size="small" sx={{ textTransform: "none", p: 0, minWidth: 0 }} onClick={() => void openDetail(r)}>{r.employee_name}</Button> },
    { key: "employee_code", label: "Code", valueGetter: (r) => r.employee_code || "-" },
    { key: "section", label: "Section", valueGetter: (r) => r.section || "-" },
    { key: "bills", label: "Bills", valueGetter: (r) => r.bills, render: right(qty) },
    { key: "qty", label: "Qty", valueGetter: (r) => r.qty, render: right(qty) },
    { key: "net_sales", label: "Net sales", valueGetter: (r) => r.net_sales, render: right() },
    { key: "item_amount", label: "Item", valueGetter: (r) => r.item_amount, render: right() },
    { key: "scheme_amount", label: "Scheme", valueGetter: (r) => r.scheme_amount, render: right() },
    { key: "ageing_amount", label: "Old stock", valueGetter: (r) => r.ageing_amount, render: right() },
    { key: "target_amount", label: "Target", valueGetter: (r) => r.target_amount,
      render: (_v, r) => <Box sx={{ textAlign: "right" }}>{money(r.target_amount)}{r.achievement_pct !== undefined && <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{r.achievement_pct}% of target</Typography>}</Box> },
    { key: "returns_amount", label: "Returns", valueGetter: (r) => r.returns_amount, render: right() },
    { key: "total", label: "Incentive", valueGetter: (r) => r.total, render: right((v) => <b>{money(v)}</b>) },
  ], [openDetail]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "auto" }}>
      <PageHeader
        onBack={() => navigate("/finance")}
        title={<Breadcrumbs items={[{ label: "Finance", onClick: () => navigate("/finance") }, { label: "Incentive Report" }]} />}
        actions={(
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
            <TextField size="small" type="month" label="Month" value={month} onChange={(e) => { setMonth(e.target.value); setLoading(true); }} slotProps={{ inputLabel: { shrink: true } }} />
            <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => { setLoading(true); void load(); }}>Refresh</Button>
            <Button size="small" startIcon={<Settings2 size={14} />} onClick={() => navigate("/settings/incentive-configuration")}>Rules</Button>
            {canApprove && !data?.approved && (
              <Button variant="contained" size="small" startIcon={<BadgeCheck size={15} />} disabled={approving || !monthEnded(month) || rows.length === 0} onClick={() => void approve()}>
                {approving ? "Approving..." : "Approve month"}
              </Button>
            )}
          </Stack>
        )}
      />
      <Box sx={{ px: 1, display: "flex", flexDirection: "column", gap: 1.5, pb: 2 }}>
        {data?.approved ? (
          <Alert severity="success" sx={{ py: 0 }}>Approved on {new Date(data.approved_at).toLocaleString()}. These amounts are fixed; payroll pays them. A return entered now counts in the current month.</Alert>
        ) : (
          <Alert severity="info" sx={{ py: 0 }}>
            Worked out live from the bills and the current rules. {monthEnded(month) ? "Approve the month to fix the amounts for payroll." : "The month can be approved after it ends."}
          </Alert>
        )}
        <Stack direction="row" spacing={3} sx={{ px: 0.5 }}>
          <Typography sx={{ fontSize: 13 }}>Net sales credited: <b>₹{money(totals.net)}</b></Typography>
          <Typography sx={{ fontSize: 13 }}>Incentive: <b>₹{money(totals.total)}</b></Typography>
          <Chip size="small" color={data?.approved ? "success" : "warning"} label={data?.approved ? "Approved" : "Open"} />
        </Stack>
        <SearchGridPanel>
          <FilterableDataTable
            rows={grid.rows}
            columns={columns}
            loading={loading}
            loadingText="Working out incentives..."
            emptyText="No sales credited to a salesperson in this month."
            searchPlaceholder="Search salespeople..."
            tablePreferenceKey="finance.incentive-report"
            exportFileName={`incentives_${month}`}
            paginationMode="client"
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(value) => { setLimit(value); setPage(1); }}
          />
        </SearchGridPanel>
      </Box>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="lg" fullWidth aria-labelledby="incentive-detail-title">
        <DialogTitle id="incentive-detail-title">{detail?.row.employee_name}: bill lines in {month}</DialogTitle>
        <DialogContent>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" aria-label="Incentive bill lines">
              <TableHead>
                <TableRow>
                  {["Date", "Bill", "Product", "Qty", "Net", "Item", "Rule", "Scheme", "Old stock", "Total"].map((h) => <TableCell key={h}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {(detail?.lines || []).map((line, index) => (
                  <TableRow key={index} sx={line.kind === "return" ? { "& td": { color: "error.main" } } : undefined}>
                    <TableCell>{line.date}</TableCell>
                    <TableCell>{line.bill_no}</TableCell>
                    <TableCell>{line.product}</TableCell>
                    <TableCell align="right">{qty(line.qty)}</TableCell>
                    <TableCell align="right">{money(line.net)}</TableCell>
                    <TableCell align="right">{money(line.item)}</TableCell>
                    <TableCell>{line.item_rule || "-"}</TableCell>
                    <TableCell align="right">{money(line.scheme)}</TableCell>
                    <TableCell align="right">{money(line.ageing)}</TableCell>
                    <TableCell align="right"><b>{money(line.total)}</b></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          {detail && detail.row.target_amount > 0 && (
            <Typography sx={{ mt: 1.5, fontSize: 13 }}>Monthly target: ₹{money(detail.row.target_amount)} ({detail.row.achievement_pct}% of target), paid on top of the lines.</Typography>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
