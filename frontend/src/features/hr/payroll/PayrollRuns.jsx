import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Calculator, CheckCircle2, RotateCcw, Wallet } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";
import PayslipDialog from "./PayslipDialog";
import { monthLabel, rupees } from "./payslipPrint";

const RUN_STATUS = { DRAFT: ["Draft", "default"], SUBMITTED: ["Submitted", "primary"], PAID: ["Paid", "success"] };
const days = (value) => { const n = Number(value) || 0; return Number.isInteger(n) ? String(n) : n.toFixed(1); };
const lastMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); };

/** Salary Management > Payroll: prepare a month from attendance, review the payslips, submit, mark paid. */
export default function PayrollRuns({ canManage }) {
  const [month, setMonth] = useState(lastMonth());
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(null); // { paid_on, pay_mode }
  const [slipId, setSlipId] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = (await api.get("/payroll-runs", { params: { year: month.slice(0, 4) } })).data?.data || [];
      const found = list.find((r) => r.month === month);
      setRun(found ? (await api.get(`/payroll-runs/${found.id}`)).data?.data : null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load payroll"));
    } finally {
      setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const act = async (request) => {
    setBusy(true);
    try {
      const res = await request();
      toast.success(res.data?.message || "Done");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update payroll"));
    } finally {
      setBusy(false);
    }
  };

  const grid = useSearchGrid({ sourceRows: run?.payslips || [], paginationMode: "client", scopeKey: `${month}:${run?.status}` });
  const columns = useMemo(() => [
    { key: "code", label: "Code", valueGetter: (row) => row.snapshot?.code || "" },
    { key: "name", label: "Employee", valueGetter: (row) => row.snapshot?.name || "" },
    { key: "payable_days", label: "Payable days", valueGetter: (row) => Number(row.payable_days), render: (value) => days(value) },
    { key: "lop_days", label: "LOP days", valueGetter: (row) => Number(row.lop_days), render: (value) => days(value) },
    { key: "gross_fixed", label: "Salary", valueGetter: (row) => Number(row.gross_fixed), render: (value) => rupees(value) },
    { key: "gross_earned", label: "Earned", valueGetter: (row) => Number(row.gross_earned), render: (value) => rupees(value) },
    { key: "total_deductions", label: "Deductions", valueGetter: (row) => Number(row.total_deductions), render: (value) => rupees(value) },
    { key: "net_pay", label: "Net pay", valueGetter: (row) => Number(row.net_pay), render: (value) => <b>{rupees(value)}</b> },
    { key: "held", label: "Hold", valueGetter: (row) => (row.held ? "On hold" : ""), render: (value) => (value ? <Chip size="small" color="warning" label={value} /> : "") },
  ], []);
  const status = run ? RUN_STATUS[run.status] : null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <TextField type="month" size="small" label="Month" value={month} onChange={(e) => { if (e.target.value) { setLoading(true); setMonth(e.target.value); } }}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        {status && <Chip color={status[1]} label={status[0]} />}
        <Box sx={{ flex: 1 }} />
        {canManage && (!run || run.status === "DRAFT") && (
          <Button size="small" variant={run ? "outlined" : "contained"} startIcon={<Calculator size={14} />} disabled={busy}
            onClick={() => act(() => api.post("/payroll-runs/prepare", { month }))}>{run ? "Recalculate" : `Prepare ${monthLabel(month)}`}</Button>
        )}
        {canManage && run?.status === "DRAFT" && (
          <Button size="small" variant="contained" startIcon={<CheckCircle2 size={14} />} disabled={busy || !run.payslips?.length}
            onClick={() => { if (window.confirm(`Submit ${monthLabel(month)} payroll? It is posted to the accounts and employees can see their payslips.`)) void act(() => api.post(`/payroll-runs/${run.id}/submit`)); }}>Submit</Button>
        )}
        {canManage && run?.status === "SUBMITTED" && (
          <>
            <Button size="small" startIcon={<RotateCcw size={14} />} disabled={busy} onClick={() => act(() => api.post(`/payroll-runs/${run.id}/reopen`))}>Reopen</Button>
            <Button size="small" variant="contained" startIcon={<Wallet size={14} />} disabled={busy} onClick={() => setPaying({ paid_on: new Date().toISOString().slice(0, 10), pay_mode: "BANK" })}>Mark paid</Button>
          </>
        )}
      </Stack>
      {!loading && !run && <Alert severity="info">No payroll for {monthLabel(month)} yet. Prepare works it out from attendance, leave and each employee's Gross Pay and Salary Structure.</Alert>}
      {run && (
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          {[["Employees", run.employees], ["Earned", `₹${rupees(run.gross)}`], ["Deductions", `₹${rupees(run.deductions)}`], ["Net pay", `₹${rupees(run.net)}`], ["Cost to company", `₹${rupees(run.employer_cost)}`]].map(([label, value]) => (
            <Paper key={label} variant="outlined" sx={{ px: 1.5, py: 0.75, minWidth: 130 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
            </Paper>
          ))}
          {run.status === "PAID" && <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>Paid on {run.paid_on} by {run.pay_mode === "CASH" ? "cash" : "bank"}</Typography>}
        </Stack>
      )}
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText={run ? "No payslips. Employees need a Gross Pay on their record." : "Prepare the month to see payslips."}
          searchPlaceholder="Search payslips..."
          tablePreferenceKey="hr.payroll.run"
          exportFileName={`payroll_${month}`}
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel="Payslip"
          renderActions={(row) => <Button size="small" onClick={() => setSlipId(row.id)}>View</Button>}
        />
      </SearchGridPanel>
      {slipId && <PayslipDialog id={slipId} onClose={() => setSlipId(null)} />}
      {paying && (
        <Dialog open onClose={() => setPaying(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>Mark {monthLabel(month)} salaries paid</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <TextField type="date" size="small" label="Paid on" value={paying.paid_on} onChange={(e) => setPaying({ ...paying, paid_on: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField select size="small" label="Paid from" value={paying.pay_mode} onChange={(e) => setPaying({ ...paying, pay_mode: e.target.value })}>
                <MenuItem value="BANK">Bank</MenuItem><MenuItem value="CASH">Cash</MenuItem>
              </TextField>
              <Typography variant="caption" color="text.secondary">Salaries on hold are not included; they stay owed in Salary Payable.</Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaying(null)}>Cancel</Button>
            <Button variant="contained" onClick={() => { const body = paying; setPaying(null); void act(() => api.post(`/payroll-runs/${run.id}/mark-paid`, body)); }}>Mark paid</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
