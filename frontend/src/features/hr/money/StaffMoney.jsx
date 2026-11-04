import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { HandCoins, Paperclip, Plus, Receipt } from "lucide-react";
import api from "@/shared/api/apiClient";
import HrPage from "../components/HrPage";
import { FilterChips, HrTable, PaymentDialog } from "../components/HrWidgets";
import { post, useEmployees, useHrManager, useLoader } from "../utils/hrApi";
import { rupees } from "../payroll/payslipPrint";
import { CLAIM_CATEGORY, LOAN_TYPE, MONEY_STATUS, claimPayLabel, days, errorMessage } from "../utils/hrStatus";

const today = () => new Date().toLocaleDateString("en-CA");
const thisMonth = () => today().slice(0, 7);
const nextMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString("en-CA").slice(0, 7); };
const statusChip = (status) => <Chip size="small" color={MONEY_STATUS[status]?.color || "default"} label={MONEY_STATUS[status]?.label || status} />;



function EmployeeSelect({ employees, value, onChange, required }) {
  return (
    <TextField select size="small" label={required ? "Employee" : "For employee"} value={value} onChange={(e) => onChange(e.target.value)}>
      {!required && <MenuItem value="">Myself</MenuItem>}
      {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.name}{e.code ? ` (${e.code})` : ""}</MenuItem>)}
    </TextField>
  );
}

/** Opens a claim's bill through a short-lived signed link (bills are private). */
async function openBill(claimId) {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const res = await api.get(`/expense-claims/${claimId}/bill`);
    if (tab) tab.location.href = res.data.data.url;
  } catch {
    tab?.close();
    toast.error("Could not open the bill");
  }
}

function ClaimDialog({ employees, onClose }) {
  const [form, setForm] = useState({ employee_id: "", claim_date: today(), category: "TRAVEL", amount: "", description: "" });
  const [bill, setBill] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async () => {
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => value !== "" && body.append(key, value));
      if (bill) body.append("bill", bill);
      const res = await api.post("/expense-claims", body, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(res.data?.message || "Claim sent");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not send the claim"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>New expense claim</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {employees.length > 0 && <EmployeeSelect employees={employees} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} />}
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" size="small" label="Spent on" value={form.claim_date} onChange={set("claim_date")} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} fullWidth />
            <TextField type="number" size="small" label="Amount (₹)" value={form.amount} onChange={set("amount")} slotProps={{ htmlInput: { min: 1, step: "0.01" } }} fullWidth />
          </Stack>
          <TextField select size="small" label="Category" value={form.category} onChange={set("category")}>
            {Object.entries(CLAIM_CATEGORY).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <TextField size="small" label="What was it for?" value={form.description} onChange={set("description")} multiline minRows={2} />
          <Button component="label" variant="outlined" size="small" startIcon={<Paperclip size={14} />} sx={{ justifyContent: "flex-start", textTransform: "none" }}>
            {bill ? bill.name : "Attach the bill (photo or PDF)"}
            <input hidden type="file" accept="image/*,application/pdf" onChange={(e) => setBill(e.target.files?.[0] || null)} />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !(Number(form.amount) > 0)} onClick={submit}>Send for approval</Button>
      </DialogActions>
    </Dialog>
  );
}

function LoanDialog({ employees, onClose }) {
  const [form, setForm] = useState({ employee_id: "", type: "ADVANCE", amount: "", instalments: "1", first_month: nextMonth(), reason: "" });
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const instalments = form.type === "ADVANCE" ? 1 : Math.max(1, Number(form.instalments) || 1);
  const perMonth = Number(form.amount) > 0 ? Math.ceil((Number(form.amount) / instalments) * 100) / 100 : 0;
  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.post("/staff-loans", { employee_id: form.employee_id ? Number(form.employee_id) : undefined, type: form.type, amount: Number(form.amount),
        instalments, first_month: form.first_month || undefined, reason: form.reason || undefined });
      toast.success(res.data?.message || "Request sent");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not send the request"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Ask for an advance or loan</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {employees.length > 0 && <EmployeeSelect employees={employees} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} />}
          <ToggleButtonGroup exclusive size="small" value={form.type} onChange={(_, v) => v && setForm({ ...form, type: v })} fullWidth>
            <ToggleButton value="ADVANCE">Salary advance</ToggleButton>
            <ToggleButton value="LOAN">Loan</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1.5}>
            <TextField type="number" size="small" label="Amount (₹)" value={form.amount} onChange={set("amount")} slotProps={{ htmlInput: { min: 1 } }} fullWidth />
            {form.type === "LOAN" && <TextField type="number" size="small" label="Months to repay" value={form.instalments} onChange={set("instalments")} slotProps={{ htmlInput: { min: 1, max: 60 } }} fullWidth />}
          </Stack>
          <TextField type="month" size="small" label="Recover from salary of" value={form.first_month} onChange={set("first_month")} slotProps={{ inputLabel: { shrink: true } }} />
          {perMonth > 0 && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>₹{rupees(perMonth)} will be taken from {instalments === 1 ? "one salary" : `each of ${instalments} salaries`}. No interest.</Typography>}
          <TextField size="small" label="Reason" value={form.reason} onChange={set("reason")} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !(Number(form.amount) > 0)} onClick={submit}>Send for approval</Button>
      </DialogActions>
    </Dialog>
  );
}

const claimColumns = [
  { key: "claim_date", label: "Spent on", valueGetter: (r) => r.claim_date },
  { key: "category", label: "Category", valueGetter: (r) => CLAIM_CATEGORY[r.category] || r.category },
  { key: "amount", label: "Amount", align: "right", valueGetter: (r) => Number(r.amount), render: (v) => `₹${rupees(v)}` },
  { key: "description", label: "For", valueGetter: (r) => r.description || "" },
  { key: "bill", label: "Bill", valueGetter: (r) => (r.has_bill ? "Yes" : ""), render: (v, r) => (r.has_bill ? <Button size="small" startIcon={<Paperclip size={12} />} onClick={() => openBill(r.id)}>View</Button> : "-") },
  { key: "status", label: "Status", valueGetter: (r) => MONEY_STATUS[r.status]?.label || r.status, render: (v, r) => statusChip(r.status) },
  { key: "pay", label: "Paid back", valueGetter: (r) => claimPayLabel(r) },
  { key: "decision_note", label: "Note", valueGetter: (r) => r.decision_note || "" },
];

const loanColumns = [
  { key: "type", label: "Type", valueGetter: (r) => LOAN_TYPE[r.type] || r.type },
  { key: "amount", label: "Amount", align: "right", valueGetter: (r) => Number(r.amount), render: (v) => `₹${rupees(v)}` },
  { key: "plan", label: "Recovery", valueGetter: (r) => `${r.instalments} × ₹${rupees(r.instalment_amount)} from ${r.first_month}` },
  { key: "recovered", label: "Recovered", align: "right", valueGetter: (r) => Number(r.recovered || 0), render: (v) => `₹${rupees(v)}` },
  { key: "balance", label: "Balance", align: "right", valueGetter: (r) => (["ACTIVE", "CLOSED"].includes(r.status) ? Number(r.balance) : null), render: (v) => (v === null ? "-" : `₹${rupees(v)}`) },
  { key: "status", label: "Status", valueGetter: (r) => MONEY_STATUS[r.status]?.label || r.status, render: (v, r) => statusChip(r.status) },
  { key: "reason", label: "Reason", valueGetter: (r) => r.reason || "" },
];




/** HRMS > My Claims & Advances: claim back money spent for the store, ask for a salary advance or loan. */
export function MyClaims() {
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(null); // claim | loan
  const load = useCallback(async () => {
    try {
      setData((await api.get("/staff-money/mine")).data?.data || null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load your claims"));
      setData({});
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const withdraw = async (url) => {
    try {
      const res = await api.post(url);
      toast.success(res.data?.message || "Withdrawn");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not withdraw"));
    }
  };
  const owed = (data?.loans || []).filter((l) => l.status === "ACTIVE").reduce((sum, l) => sum + Number(l.balance || 0), 0);
  return (
    <HrPage title="My Claims & Advances" actions={data?.employee ? (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<Receipt size={14} />} onClick={() => setAdding("claim")}>New claim</Button>
        <Button size="small" variant="outlined" startIcon={<HandCoins size={14} />} onClick={() => setAdding("loan")}>Ask for advance</Button>
      </Stack>
    ) : null}>
      {data && !data.employee && <Alert severity="info" sx={{ mb: 1 }}>Your login is not linked to an employee yet. Ask HR to tick "Allow System" with your username on your employee record.</Alert>}
      {owed > 0 && <Alert severity="warning" sx={{ mb: 1 }}>₹{rupees(owed)} of advances and loans is still to be recovered from your salary.</Alert>}
      <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.5 }}>Expense claims</Typography>
      <HrTable rows={data?.claims ?? (data ? [] : null)} columns={claimColumns} empty="No claims yet." prefKey="hr.money.myclaims" file="my_claims" scope="claims"
        actions={(row) => (row.status === "PENDING" ? <Button size="small" color="inherit" onClick={() => withdraw(`/expense-claims/${row.id}/cancel`)}>Withdraw</Button> : null)} />
      <Typography sx={{ fontSize: 13, fontWeight: 800, mt: 2, mb: 0.5 }}>Advances and loans</Typography>
      <HrTable rows={data?.loans ?? (data ? [] : null)} columns={loanColumns} empty="No advances or loans." prefKey="hr.money.myloans" file="my_loans" scope="loans"
        actions={(row) => (["REQUESTED", "APPROVED"].includes(row.status) ? <Button size="small" color="inherit" onClick={() => withdraw(`/staff-loans/${row.id}/cancel`)}>Withdraw</Button> : null)} />
      {adding === "claim" && <ClaimDialog employees={[]} onClose={(saved) => { setAdding(null); if (saved) void load(); }} />}
      {adding === "loan" && <LoanDialog employees={[]} onClose={(saved) => { setAdding(null); if (saved) void load(); }} />}
    </HrPage>
  );
}

/** Approve or reject with an optional note; a claim also chooses how it is paid back. */
function DecideDialog({ title, approve, payChoice, onSubmit, onClose }) {
  const [note, setNote] = useState("");
  const [payVia, setPayVia] = useState("SALARY");
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>{approve ? "Approve" : "Reject"} · {title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {approve && payChoice && (
            <ToggleButtonGroup exclusive size="small" value={payVia} onChange={(_, v) => v && setPayVia(v)} fullWidth>
              <ToggleButton value="SALARY">With next salary</ToggleButton>
              <ToggleButton value="DIRECT">Pay now</ToggleButton>
            </ToggleButtonGroup>
          )}
          <TextField size="small" label="Note to the employee" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" color={approve ? "success" : "error"} onClick={() => onSubmit({ action: approve ? "approve" : "reject", note: note || undefined, pay_via: approve && payChoice ? payVia : undefined })}>
          {approve ? "Approve" : "Reject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}



/** HRMS > Expense Claims: claims from the people who report to you (HR: everyone); approve, reject, pay now. */
export function ExpenseClaims() {
  const hr = useHrManager();
  const [status, setStatus] = useState("PENDING");
  const [rows, load, setRows] = useLoader("/expense-claims", { status: status || undefined, inbox: 1 });
  const [dialog, setDialog] = useState(null); // { kind: approve|reject|pay|new, row }
  const employees = useEmployees(hr);
  const columns = useMemo(() => [{ key: "employee", label: "Employee", valueGetter: (r) => r.employee_name || "" }, ...claimColumns], []);
  const done = async (url, body) => { if (await post(url, body, load)) setDialog(null); };
  const total = (rows || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return (
    <HrPage title="Expense Claims" actions={hr ? <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={() => setDialog({ kind: "new" })}>New claim</Button> : null}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: "wrap" }}>
        <FilterChips value={status} onChange={(v) => { setRows(null); setStatus(v); }}
          options={[["PENDING", "Pending"], ["APPROVED", "Approved"], ["PAID", "Paid"], ["REJECTED", "Rejected"], ["", "All"]]} />
        {rows?.length > 0 && <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", mb: 1, ml: 1 }}>{rows.length} claim(s) · ₹{rupees(total)}</Typography>}
      </Stack>
      <HrTable rows={rows} columns={columns} empty="No claims here." prefKey="hr.money.claims" file="expense_claims" scope={status}
        actions={(row) => (
          <Stack direction="row" spacing={0.5}>
            {row.status === "PENDING" && <Button size="small" color="success" onClick={() => setDialog({ kind: "approve", row })}>Approve</Button>}
            {row.status === "PENDING" && <Button size="small" color="error" onClick={() => setDialog({ kind: "reject", row })}>Reject</Button>}
            {hr && row.status === "APPROVED" && !row.payslip_id && <Button size="small" onClick={() => setDialog({ kind: "pay", row })}>Pay now</Button>}
          </Stack>
        )} />
      {(dialog?.kind === "approve" || dialog?.kind === "reject") && (
        <DecideDialog title={`${dialog.row.employee_name} · ₹${rupees(dialog.row.amount)}`} approve={dialog.kind === "approve"} payChoice
          onClose={() => setDialog(null)} onSubmit={(body) => done(`/expense-claims/${dialog.row.id}/decide`, body)} />
      )}
      {dialog?.kind === "pay" && (
        <PaymentDialog title={`Pay ${dialog.row.employee_name} ₹${rupees(dialog.row.amount)}`} help="Posted to the accounts as a staff expense."
          onClose={() => setDialog(null)} onSubmit={(body) => done(`/expense-claims/${dialog.row.id}/pay`, body)} />
      )}
      {dialog?.kind === "new" && <ClaimDialog employees={employees} onClose={(saved) => { setDialog(null); if (saved) void load(); }} />}
    </HrPage>
  );
}

function RecoveriesDialog({ loan, onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get(`/staff-loans/${loan.id}/recoveries`).then((r) => setRows(r.data?.data || [])).catch(() => setRows([]));
  }, [loan.id]);
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>{loan.employee_name} · {LOAN_TYPE[loan.type]} ₹{rupees(loan.amount)}</DialogTitle>
      <DialogContent>
        {rows?.length === 0 && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Nothing recovered yet.</Typography>}
        {(rows || []).map((r) => (
          <Stack key={r.id} direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "divider", fontSize: 13 }}>
            <span>{r.month} · {r.kind === "PAYROLL" ? "From salary" : `Repaid (${r.pay_mode === "BANK" ? "bank" : "cash"})`}</span>
            <strong>₹{rupees(r.amount)}</strong>
          </Stack>
        ))}
        {(loan.skip_months || []).length > 0 && <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>Skipped: {loan.skip_months.join(", ")}</Typography>}
        <Typography sx={{ fontSize: 13, fontWeight: 800, mt: 1.5 }}>Balance ₹{rupees(loan.balance)}</Typography>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

/** HRMS > Advances & Loans: approve requests, pay them out, follow recovery from salary. */
export function StaffLoans() {
  const hr = useHrManager();
  const [status, setStatus] = useState("REQUESTED,APPROVED");
  const [rows, load, setRows] = useLoader("/staff-loans", { status: status || undefined });
  const [dialog, setDialog] = useState(null);
  const employees = useEmployees(hr);
  const columns = useMemo(() => [{ key: "employee", label: "Employee", valueGetter: (r) => r.employee_name || "" }, ...loanColumns], []);
  const done = async (url, body) => { if (await post(url, body, load)) setDialog(null); };
  const [skipMonth, setSkipMonth] = useState(thisMonth());
  const outstanding = (rows || []).filter((r) => r.status === "ACTIVE").reduce((sum, r) => sum + Number(r.balance || 0), 0);
  return (
    <HrPage title="Advances & Loans" actions={hr ? <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={() => setDialog({ kind: "new" })}>New advance / loan</Button> : null}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: "wrap" }}>
        <FilterChips value={status} onChange={(v) => { setRows(null); setStatus(v); }}
          options={[["REQUESTED,APPROVED", "Requests"], ["ACTIVE", "Recovering"], ["CLOSED", "Repaid"], ["REJECTED,CANCELLED", "Rejected"], ["", "All"]]} />
        {outstanding > 0 && <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", mb: 1, ml: 1 }}>Still to recover ₹{rupees(outstanding)}</Typography>}
      </Stack>
      <HrTable rows={rows} columns={columns} empty="Nothing here." prefKey="hr.money.loans" file="staff_loans" scope={status}
        actions={(row) => (
          <Stack direction="row" spacing={0.5}>
            {row.status === "REQUESTED" && <Button size="small" color="success" onClick={() => setDialog({ kind: "approve", row })}>Approve</Button>}
            {row.status === "REQUESTED" && <Button size="small" color="error" onClick={() => setDialog({ kind: "reject", row })}>Reject</Button>}
            {hr && row.status === "APPROVED" && <Button size="small" onClick={() => setDialog({ kind: "disburse", row })}>Pay out</Button>}
            {hr && row.status === "APPROVED" && <Button size="small" color="inherit" onClick={() => done(`/staff-loans/${row.id}/cancel`)}>Cancel</Button>}
            {hr && row.status === "ACTIVE" && <Button size="small" onClick={() => setDialog({ kind: "repay", row })}>Repay</Button>}
            {hr && row.status === "ACTIVE" && <Button size="small" color="inherit" onClick={() => setDialog({ kind: "skip", row })}>Skip a month</Button>}
            {["ACTIVE", "CLOSED"].includes(row.status) && <Button size="small" color="inherit" onClick={() => setDialog({ kind: "history", row })}>History</Button>}
          </Stack>
        )} />
      {(dialog?.kind === "approve" || dialog?.kind === "reject") && (
        <DecideDialog title={`${dialog.row.employee_name} · ${LOAN_TYPE[dialog.row.type]} ₹${rupees(dialog.row.amount)}`} approve={dialog.kind === "approve"}
          onClose={() => setDialog(null)} onSubmit={({ action, note }) => done(`/staff-loans/${dialog.row.id}/decide`, { action, note })} />
      )}
      {dialog?.kind === "disburse" && (
        <PaymentDialog title={`Pay out ₹${rupees(dialog.row.amount)} to ${dialog.row.employee_name}`} month={dialog.row.first_month}
          help={`${dialog.row.instalments} × ₹${rupees(dialog.row.instalment_amount)} will be taken from salary. Posted to the accounts.`}
          onClose={() => setDialog(null)} onSubmit={(body) => done(`/staff-loans/${dialog.row.id}/disburse`, body)} />
      )}
      {dialog?.kind === "repay" && (
        <PaymentDialog title={`Repayment from ${dialog.row.employee_name}`} amount={dialog.row.balance} help={`Balance ₹${rupees(dialog.row.balance)}.`}
          onClose={() => setDialog(null)} onSubmit={(body) => done(`/staff-loans/${dialog.row.id}/repay`, body)} />
      )}
      {dialog?.kind === "skip" && (
        <Dialog open onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>Skip a month · {dialog.row.employee_name}</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1.5 }}>Nothing is taken from that month's salary; the instalments run a month longer.</Typography>
            <TextField type="month" size="small" label="Month" value={skipMonth} onChange={(e) => setSkipMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="contained" onClick={() => done(`/staff-loans/${dialog.row.id}/skip-month`, { month: skipMonth })}>Skip</Button>
          </DialogActions>
        </Dialog>
      )}
      {dialog?.kind === "history" && <RecoveriesDialog loan={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === "new" && <LoanDialog employees={employees} onClose={(saved) => { setDialog(null); if (saved) void load(); }} />}
    </HrPage>
  );
}

function EncashDialog({ onClose }) {
  const [form, setForm] = useState({ employee_id: "", leave_type_id: "", days: "", month: thisMonth(), note: "" });
  const [balances, setBalances] = useState(null);
  const [saving, setSaving] = useState(false);
  const year = Number(form.month.slice(0, 4));
  useEffect(() => {
    api.get("/leave/balances", { params: { year } }).then((r) => setBalances(r.data?.data || { types: [], rows: [] })).catch(() => setBalances({ types: [], rows: [] }));
  }, [year]);
  const types = (balances?.types || []).filter((t) => t.is_paid);
  const row = (balances?.rows || []).find((r) => String(r.employee_id) === form.employee_id);
  const type = types.find((t) => String(t.id) === form.leave_type_id);
  const left = row && type ? row[type.code]?.balance ?? 0 : null;
  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.post("/leave-encashments", { employee_id: Number(form.employee_id), leave_type_id: Number(form.leave_type_id), days: Number(form.days), month: form.month, note: form.note || undefined });
      toast.success(res.data?.message || "Saved");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not encash"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Encash leave</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField select size="small" label="Employee" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            {(balances?.rows || []).map((r) => <MenuItem key={r.employee_id} value={String(r.employee_id)}>{r.name}{r.code ? ` (${r.code})` : ""}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Leave type" value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}>
            {types.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}{row ? ` · ${days(row[t.code]?.balance ?? 0)} left` : ""}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField type="number" size="small" label="Days" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} slotProps={{ htmlInput: { min: 0.5, step: 0.5 } }} fullWidth
              helperText={left !== null ? `${days(left)} day(s) left` : " "} />
            <TextField type="month" size="small" label="Pay in salary of" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth helperText=" " />
          </Stack>
          <TextField size="small" label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>The days come off the balance now and are paid at the day rate (monthly salary ÷ days in that month).</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !form.employee_id || !form.leave_type_id || !(Number(form.days) > 0)} onClick={submit}>Encash</Button>
      </DialogActions>
    </Dialog>
  );
}

const encashColumns = [
  { key: "employee", label: "Employee", valueGetter: (r) => r.employee?.name || "" },
  { key: "leave_type_name", label: "Leave", valueGetter: (r) => r.leave_type_name || "" },
  { key: "days", label: "Days", align: "right", valueGetter: (r) => Number(r.days), render: (v) => days(v) },
  { key: "month", label: "Paid in", valueGetter: (r) => r.month },
  { key: "amount", label: "Amount", align: "right", valueGetter: (r) => (r.amount === null ? null : Number(r.amount)), render: (v) => (v === null ? "At payroll" : `₹${rupees(v)}`) },
  { key: "status", label: "Status", valueGetter: (r) => MONEY_STATUS[r.status]?.label || r.status, render: (v, r) => statusChip(r.status) },
  { key: "note", label: "Note", valueGetter: (r) => r.note || "" },
];

/** HRMS > Leave Encashment: pay unused leave days with a month's salary. */
export function LeaveEncashment() {
  const hr = useHrManager();
  const [rows, load] = useLoader("/leave-encashments");
  const [adding, setAdding] = useState(false);
  return (
    <HrPage title="Leave Encashment" actions={hr ? <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={() => setAdding(true)}>Encash leave</Button> : null}>
      <Box>
        <HrTable rows={rows} columns={encashColumns} empty="No leave encashed yet." prefKey="hr.money.encash" file="leave_encashment" scope="all"
          actions={(row) => (hr && row.status === "APPROVED" && !row.payslip_id ? <Button size="small" color="inherit" onClick={() => post(`/leave-encashments/${row.id}/cancel`, {}, load)}>Cancel</Button> : null)} />
      </Box>
      {adding && <EncashDialog onClose={(saved) => { setAdding(false); if (saved) void load(); }} />}
    </HrPage>
  );
}
