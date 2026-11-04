import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { BarChart3, FileText, LogOut, Plus, Printer, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import HrPage from "../components/HrPage";
import { FilterChips, HrTable, PaymentDialog } from "../components/HrWidgets";
import { post, useEmployees, useHrManager, useLoader } from "../utils/hrApi";
import { rupees } from "../payroll/payslipPrint";
import { EXIT_REASON, EXIT_STATUS, EXIT_TYPE, MONEY_STATUS, days, errorMessage } from "../utils/hrStatus";
import { experienceLetterHtml, relievingLetterHtml, settlementHtml } from "./exitPrint";

const today = () => new Date().toLocaleDateString("en-CA");
const addDays = (date, n) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + Number(n || 0)); return d.toLocaleDateString("en-CA"); };
const exitChip = (status) => <Chip size="small" color={EXIT_STATUS[status]?.color || "default"} label={EXIT_STATUS[status]?.label || status} />;
const noticeText = (r) => (r.type !== "RESIGNATION" ? "-" : r.notice_short_days > 0 ? `${r.notice_short_days} of ${r.notice_days} day(s) short${r.notice_waived ? " (waived)" : ""}` : `${r.notice_days} day(s), served`);

/** HRMS > My Resignation: resign, follow it, withdraw it before it is accepted. */
export function MyResignation() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const load = useCallback(async () => {
    try {
      setData((await api.get("/separations/mine")).data?.data || {});
    } catch (err) {
      toast.error(errorMessage(err, "Could not load"));
      setData({});
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const open = (data?.separations || []).find((s) => ["REQUESTED", "ACCEPTED", "RELIEVED"].includes(s.status));
  const send = async () => {
    if (await post("/separations/resign", { requested_last_day: form.requested_last_day || undefined, reason: form.reason || undefined }, load)) setForm(null);
  };
  return (
    <HrPage title="My Resignation" actions={data?.employee && !open ? (
      <Button size="small" variant="outlined" color="error" startIcon={<LogOut size={14} />}
        onClick={() => setForm({ requested_last_day: addDays(today(), data.notice_days), reason: "" })}>Resign</Button>
    ) : null}>
      {data && !data.employee && <Alert severity="info">Your login is not linked to an employee yet. Ask HR to tick "Allow System" with your username on your employee record.</Alert>}
      {open && (
        <Paper variant="outlined" sx={{ p: 2, mb: 1.5, maxWidth: 560 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>Resignation sent on {open.applied_on}</Typography>{exitChip(open.status)}
          </Stack>
          {open.status === "REQUESTED" && <Typography variant="body2">Waiting for your manager. You asked to leave on {open.requested_last_day || "-"}; your notice period is {open.notice_days} day(s).</Typography>}
          {open.status !== "REQUESTED" && <Typography variant="body2">Your last working day is <b>{open.last_working_day}</b>.{open.notice_short_days > 0 && !open.notice_waived ? ` ${open.notice_short_days} day(s) of notice are not served and will be deducted in your settlement.` : ""}</Typography>}
          {open.decision_note && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>"{open.decision_note}"</Typography>}
          {open.status === "REQUESTED" && <Button size="small" color="inherit" sx={{ mt: 1 }} onClick={() => post(`/separations/${open.id}/withdraw`, {}, load)}>Withdraw resignation</Button>}
        </Paper>
      )}
      {data?.employee && !open && <Typography variant="body2" color="text.secondary">You have no resignation in progress. Your notice period is {data.notice_days} day(s).</Typography>}
      {(data?.separations || []).filter((s) => s !== open).map((s) => (
        <Typography key={s.id} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{s.applied_on}: {EXIT_TYPE[s.type]} · {EXIT_STATUS[s.status]?.label}</Typography>
      ))}
      {form && (
        <Dialog open onClose={() => setForm(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>Resign</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Your notice period is {data.notice_days} day(s); leaving earlier may be deducted from your settlement unless your manager waives it.</Typography>
              <TextField type="date" size="small" label="I would like to leave on" value={form.requested_last_day} onChange={(e) => setForm({ ...form, requested_last_day: e.target.value })}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today() } }} />
              <TextField size="small" label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} multiline minRows={2} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setForm(null)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={send}>Send resignation</Button>
          </DialogActions>
        </Dialog>
      )}
    </HrPage>
  );
}

/** Accept (or change) an exit: last working day, notice period, waiver. Also HR's "record exit". */
function ExitDialog({ title, row, employees, onSubmit, onClose }) {
  const recording = !row;
  const [form, setForm] = useState({
    employee_id: "", type: "RESIGNATION", applied_on: today(), reason: "", note: "",
    last_working_day: row?.last_working_day || row?.requested_last_day || today(), notice_days: row?.notice_days ?? 30, notice_waived: Boolean(row?.notice_waived),
  });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const applied = row?.applied_on || form.applied_on;
  const served = Math.max(0, Math.round((new Date(`${form.last_working_day}T00:00:00`) - new Date(`${applied}T00:00:00`)) / 86400000));
  const short = Math.max(0, Number(form.notice_days || 0) - served);
  const resignation = (row?.type || form.type) === "RESIGNATION";
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {recording && (
            <>
              <TextField select size="small" label="Employee" value={form.employee_id} onChange={set("employee_id")}>
                {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.name}{e.code ? ` (${e.code})` : ""}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1.5}>
                <TextField select size="small" label="Type" value={form.type} onChange={set("type")} fullWidth>
                  {Object.entries(EXIT_TYPE).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
                <TextField type="date" size="small" label={form.type === "RESIGNATION" ? "Resigned on" : "Decided on"} value={form.applied_on} onChange={set("applied_on")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              </Stack>
              <TextField size="small" label="Reason" value={form.reason} onChange={set("reason")} />
            </>
          )}
          {row?.reason && <Typography variant="body2" color="text.secondary">"{row.reason}"</Typography>}
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" size="small" label="Last working day" value={form.last_working_day} onChange={set("last_working_day")} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: applied } }} fullWidth />
            {resignation && <TextField type="number" size="small" label="Notice period (days)" value={form.notice_days} onChange={set("notice_days")} slotProps={{ htmlInput: { min: 0 } }} fullWidth />}
          </Stack>
          {resignation && (
            <>
              <Typography variant="body2" color={short > 0 && !form.notice_waived ? "warning.main" : "text.secondary"}>
                {served} day(s) served{short > 0 ? `, ${short} short: ${form.notice_waived ? "waived" : "deducted at the day rate in the settlement"}` : ", notice served in full"}.
              </Typography>
              {short > 0 && <FormControlLabel control={<Checkbox size="small" checked={form.notice_waived} onChange={(e) => setForm({ ...form, notice_waived: e.target.checked })} />} label="Waive the notice shortfall" />}
            </>
          )}
          {!recording && row?.status === "REQUESTED" && <TextField size="small" label="Note to the employee" value={form.note} onChange={set("note")} placeholder="Optional" />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={recording && !form.employee_id} onClick={() => onSubmit(recording
          ? { employee_id: Number(form.employee_id), type: form.type, applied_on: form.applied_on, last_working_day: form.last_working_day, reason: form.reason || undefined,
            notice_days: form.type === "RESIGNATION" ? Number(form.notice_days) : undefined, notice_waived: form.notice_waived }
          : { last_working_day: form.last_working_day, notice_days: Number(form.notice_days), notice_waived: form.notice_waived, note: form.note || undefined })}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

const RATINGS = [["manager", "Manager / team"], ["pay", "Pay"], ["work", "Work and hours"], ["growth", "Growth"]];

function InterviewDialog({ row, onSubmit, onClose }) {
  const saved = row.exit_interview || {};
  const [form, setForm] = useState({ reason_category: saved.reason_category || (row.type === "RETIREMENT" ? "RETIREMENT" : "BETTER_PAY"), ratings: saved.ratings || {},
    would_rejoin: Boolean(saved.would_rejoin), comments: saved.comments || "" });
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Exit interview · {row.employee_name}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField select size="small" label="Main reason for leaving" value={form.reason_category} onChange={(e) => setForm({ ...form, reason_category: e.target.value })}>
            {Object.entries(EXIT_REASON).filter(([v]) => v !== "NOT_RECORDED").map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          <Typography variant="caption" color="text.secondary">How did they rate (1 poor – 5 very good)?</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            {RATINGS.map(([key, label]) => (
              <TextField key={key} select size="small" label={label} value={form.ratings[key] ?? ""} onChange={(e) => setForm({ ...form, ratings: { ...form.ratings, [key]: e.target.value === "" ? undefined : Number(e.target.value) } })}>
                <MenuItem value="">-</MenuItem>
                {[1, 2, 3, 4, 5].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </TextField>
            ))}
          </Box>
          <FormControlLabel control={<Checkbox size="small" checked={form.would_rejoin} onChange={(e) => setForm({ ...form, would_rejoin: e.target.checked })} />} label="Would come back to work here" />
          <TextField size="small" label="Comments" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} multiline minRows={3} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSubmit({ ...form, comments: form.comments || undefined })}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function ExitReport() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/separations/report").then((r) => setData(r.data?.data || null)).catch(() => setData({ total: 0 }));
  }, []);
  if (!data) return <Typography variant="body2">Loading…</Typography>;
  const block = (title, entries, labels) => (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
      {Object.keys(entries || {}).length === 0 && <Typography variant="body2" color="text.secondary">None.</Typography>}
      {Object.entries(entries || {}).sort((a, b) => b[1] - a[1]).map(([key, count]) => (
        <Stack key={key} direction="row" justifyContent="space-between" sx={{ py: 0.4, fontSize: 13 }}><span>{labels?.[key] || key}</span><b>{count}</b></Stack>
      ))}
    </Paper>
  );
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">{data.total} exit(s) from {data.from} to {data.to} · {data.interviewed} interviewed · {data.would_rejoin} would come back</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5, alignItems: "start" }}>
        {block("By type", data.by_type, EXIT_TYPE)}
        {block("Why people left", data.by_reason, EXIT_REASON)}
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Average ratings (1–5)</Typography>
          {RATINGS.map(([key, label]) => <Stack key={key} direction="row" justifyContent="space-between" sx={{ py: 0.4, fontSize: 13 }}><span>{label}</span><b>{data.ratings?.[key] ?? "-"}</b></Stack>)}
        </Paper>
      </Box>
      {block("By month (last working day)", data.by_month)}
    </Stack>
  );
}

/** HRMS > Exits: resignations to accept, people leaving, relieving, exit interviews and letters. */
export function Exits() {
  const hr = useHrManager();
  const [status, setStatus] = useState("REQUESTED,ACCEPTED");
  const [rows, load, setRows] = useLoader("/separations", { status: status || undefined });
  const [meta, setMeta] = useState(null);
  const [dialog, setDialog] = useState(null);
  const employees = useEmployees(hr);
  useEffect(() => {
    api.get("/separations", { params: { status: "NONE" } }).then((r) => setMeta(r.data?.meta || null)).catch(() => {});
  }, []);
  const done = async (url, body) => { if (await post(url, body, load)) setDialog(null); };
  const todayIs = meta?.today || today();
  const columns = useMemo(() => [
    { key: "employee", label: "Employee", valueGetter: (r) => `${r.employee_name || ""}${r.employee_code ? ` (${r.employee_code})` : ""}` },
    { key: "type", label: "Type", valueGetter: (r) => EXIT_TYPE[r.type] || r.type },
    { key: "applied_on", label: "Resigned / decided", valueGetter: (r) => r.applied_on },
    { key: "requested_last_day", label: "Asked to leave", valueGetter: (r) => r.requested_last_day || "" },
    { key: "last_working_day", label: "Last working day", valueGetter: (r) => r.last_working_day || "" },
    { key: "notice", label: "Notice", valueGetter: (r) => noticeText(r) },
    { key: "status", label: "Status", valueGetter: (r) => EXIT_STATUS[r.status]?.label || r.status, render: (v, r) => exitChip(r.status) },
    { key: "interview", label: "Exit interview", valueGetter: (r) => (r.exit_interview ? EXIT_REASON[r.exit_interview.reason_category] || "Done" : "") },
    { key: "settlement", label: "Settlement", valueGetter: (r) => (r.settlement ? `${MONEY_STATUS[r.settlement.status]?.label || r.settlement.status} ₹${rupees(r.settlement.net)}` : "") },
    { key: "reason", label: "Reason", valueGetter: (r) => r.reason || "" },
  ], []);
  const print = (html) => browserPrintHtml(html);
  return (
    <HrPage title="Exits" actions={hr ? <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={() => setDialog({ kind: "record" })}>Record exit</Button> : null}>
      <FilterChips value={status} onChange={(v) => { if (v !== "REPORT") setRows(null); setStatus(v); }}
        options={[["REQUESTED,ACCEPTED", "Open"], ["REQUESTED", "Resignations"], ["RELIEVED", "Relieved"], ["SETTLED", "Settled"], ["REJECTED,WITHDRAWN", "Closed"], ["", "All"], ["REPORT", "Report"]]} />
      {status === "REPORT" ? <ExitReport /> : (
        <HrTable rows={rows} columns={columns} empty="No exits here." prefKey="hr.exits" file="exits" scope={status}
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              {row.status === "REQUESTED" && <Button size="small" color="success" onClick={() => setDialog({ kind: "accept", row })}>Accept</Button>}
              {row.status === "REQUESTED" && <Button size="small" color="error" onClick={() => setDialog({ kind: "reject", row })}>Reject</Button>}
              {hr && row.status === "ACCEPTED" && <Button size="small" onClick={() => setDialog({ kind: "amend", row })}>Change</Button>}
              {hr && row.status === "ACCEPTED" && row.last_working_day <= todayIs && <Button size="small" onClick={() => done(`/separations/${row.id}/relieve`)}>Relieve</Button>}
              {hr && row.status === "ACCEPTED" && <Button size="small" color="inherit" onClick={() => done(`/separations/${row.id}/withdraw`)}>Cancel</Button>}
              {hr && ["ACCEPTED", "RELIEVED", "SETTLED"].includes(row.status) && <Button size="small" color="inherit" onClick={() => setDialog({ kind: "interview", row })}>Interview</Button>}
              {["RELIEVED", "SETTLED"].includes(row.status) && <Button size="small" color="inherit" startIcon={<FileText size={12} />} onClick={() => print(relievingLetterHtml(row, meta?.store))}>Relieving</Button>}
              {["RELIEVED", "SETTLED"].includes(row.status) && <Button size="small" color="inherit" startIcon={<FileText size={12} />} onClick={() => print(experienceLetterHtml(row, meta?.store))}>Experience</Button>}
            </Stack>
          )} />
      )}
      {dialog?.kind === "record" && <ExitDialog title="Record an exit" employees={employees} onClose={() => setDialog(null)} onSubmit={(body) => done("/separations", body)} />}
      {dialog?.kind === "accept" && <ExitDialog title={`Accept resignation · ${dialog.row.employee_name}`} row={dialog.row} onClose={() => setDialog(null)} onSubmit={(body) => done(`/separations/${dialog.row.id}/accept`, body)} />}
      {dialog?.kind === "amend" && <ExitDialog title={`Change exit · ${dialog.row.employee_name}`} row={dialog.row} onClose={() => setDialog(null)}
        onSubmit={(body) => done(`/separations/${dialog.row.id}/amend`, body)} />}
      {dialog?.kind === "reject" && (
        <RejectDialog row={dialog.row} onClose={() => setDialog(null)} onSubmit={(body) => done(`/separations/${dialog.row.id}/reject`, body)} />
      )}
      {dialog?.kind === "interview" && <InterviewDialog row={dialog.row} onClose={() => setDialog(null)} onSubmit={(body) => done(`/separations/${dialog.row.id}/interview`, body)} />}
    </HrPage>
  );
}

function RejectDialog({ row, onSubmit, onClose }) {
  const [note, setNote] = useState("");
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Don't accept · {row.employee_name}</DialogTitle>
      <DialogContent><TextField size="small" label="Note to the employee" value={note} onChange={(e) => setNote(e.target.value)} fullWidth sx={{ mt: 1 }} placeholder="Optional" /></DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" color="error" onClick={() => onSubmit({ note: note || undefined })}>Reject</Button>
      </DialogActions>
    </Dialog>
  );
}

const LinesTable = ({ title, lines, total }) => (
  <Table size="small">
    <TableHead><TableRow><TableCell sx={{ fontWeight: 800 }}>{title}</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>₹</TableCell></TableRow></TableHead>
    <TableBody>
      {(lines || []).map((l) => <TableRow key={l.code}><TableCell>{l.name}</TableCell><TableCell align="right">{rupees(l.amount)}</TableCell></TableRow>)}
      <TableRow><TableCell sx={{ fontWeight: 800 }}>Total</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>{rupees(total)}</TableCell></TableRow>
    </TableBody>
  </Table>
);

/** The settlement statement; HR edits leave days, the notice waiver and extra lines while it is a draft. */
function SettlementDialog({ settlement, canManage, onChange, onClose }) {
  const [fnf, setFnf] = useState(settlement);
  const [encash, setEncash] = useState(() => Object.fromEntries((settlement.summary?.leave || []).map((l) => [l.leave_type_id, l.days])));
  const [adjustments, setAdjustments] = useState(settlement.adjustments || []);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = fnf.summary || {};
  const draft = fnf.status === "DRAFT";
  const call = async (url, body, message) => {
    setBusy(true);
    try {
      const res = await api.post(url, body);
      setFnf(res.data.data);
      toast.success(message || res.data?.message || "Done");
      onChange();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Could not save"));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const recalc = (extra = {}) => call("/final-settlements/prepare", { separation_id: fnf.separation_id, encash_days: encash,
    adjustments: adjustments.filter((a) => a.name && Number(a.amount) > 0).map((a) => ({ ...a, amount: Number(a.amount) })), ...extra }, "Recalculated");
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 15, display: "flex", alignItems: "center", gap: 1 }}>
        Full and final · {fnf.employee_name} <Chip size="small" color={MONEY_STATUS[fnf.status]?.color || "default"} label={fnf.status === "DRAFT" ? "Draft" : MONEY_STATUS[fnf.status]?.label || fnf.status} />
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {EXIT_TYPE[fnf.type]} · joined {fnf.joining_date || "-"} · last working day {fnf.last_working_day} · service {s.service || "-"} · paid {days(s.payable_days)} of {days(s.days_in_month)} days in the last month at ₹{rupees(s.day_rate)} a day
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <LinesTable title="Earnings" lines={fnf.earnings} total={fnf.gross} />
          <LinesTable title="Deductions" lines={fnf.deductions} total={fnf.total_deductions} />
        </Box>
        <Paper variant="outlined" sx={{ mt: 1.5, p: 1.25, display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 16 }}>
          <span>Net payable</span><span>₹{rupees(fnf.net)}</span>
        </Paper>
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          <Typography variant="body2">Gratuity: {s.gratuity_amount > 0 ? `₹${rupees(s.gratuity_wage)} Basic × 15/26 × ${s.gratuity_years} year(s) = ₹${rupees(s.gratuity_amount)}` : s.gratuity_note || "none"}{s.gratuity_amount > 0 && s.gratuity_note ? ` (${s.gratuity_note})` : ""}</Typography>
          {s.loan_left > 0 && <Alert severity="warning" sx={{ py: 0 }}>₹{rupees(s.loan_left)} of advances and loans is still owed after this settlement: collect it with Repay on Advances & Loans, or waive it.</Alert>}
        </Stack>
        {draft && canManage && (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Leave paid on exit (day rate ₹{rupees(s.day_rate)})</Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
              {(s.leave || []).map((l) => (
                <TextField key={l.leave_type_id} type="number" size="small" label={`${l.name} (${days(l.available)} left)`} value={encash[l.leave_type_id] ?? 0}
                  onChange={(e) => setEncash({ ...encash, [l.leave_type_id]: Number(e.target.value) })} slotProps={{ htmlInput: { min: 0, max: l.available, step: 0.5 } }} sx={{ width: 190 }} />
              ))}
            </Stack>
            {s.notice_short_days > 0 && (
              <FormControlLabel control={<Checkbox size="small" checked={Boolean(s.notice_waived)} disabled={busy} onChange={(e) => recalc({ notice_waived: e.target.checked })} />}
                label={`Waive notice: ${s.notice_short_days} of ${s.notice_days} day(s) not served`} />
            )}
            <Typography variant="subtitle2">Other lines</Typography>
            {adjustments.map((a, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField select size="small" value={a.type} onChange={(e) => setAdjustments(adjustments.map((x, k) => (k === i ? { ...x, type: e.target.value } : x)))} sx={{ width: 140 }}>
                  <MenuItem value="EARNING">Pay</MenuItem><MenuItem value="DEDUCTION">Recover</MenuItem>
                </TextField>
                <TextField size="small" label="For" value={a.name} onChange={(e) => setAdjustments(adjustments.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} sx={{ flex: 1 }} />
                <TextField type="number" size="small" label="₹" value={a.amount} onChange={(e) => setAdjustments(adjustments.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))} sx={{ width: 120 }} />
                <IconButton size="small" aria-label="Remove line" onClick={() => setAdjustments(adjustments.filter((_, k) => k !== i))}><Trash2 size={14} /></IconButton>
              </Stack>
            ))}
            <Box><Button size="small" startIcon={<Plus size={14} />} onClick={() => setAdjustments([...adjustments, { type: "EARNING", name: "", amount: "" }])}>Add a line</Button></Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<Printer size={14} />} onClick={() => browserPrintHtml(settlementHtml(fnf))}>Print / PDF</Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Close</Button>
        {canManage && draft && <Button disabled={busy} onClick={() => recalc()}>Recalculate</Button>}
        {canManage && draft && <Button variant="contained" disabled={busy} onClick={async () => { if (await recalc()) await call(`/final-settlements/${fnf.id}/submit`, {}); }}>Submit</Button>}
        {canManage && fnf.status === "SUBMITTED" && <Button color="inherit" disabled={busy} onClick={() => call(`/final-settlements/${fnf.id}/reopen`, {})}>Reopen</Button>}
        {canManage && fnf.status === "SUBMITTED" && <Button variant="contained" disabled={busy} onClick={() => setPaying(true)}>Mark paid</Button>}
      </DialogActions>
      {paying && <PaymentDialog title={`Pay ${fnf.employee_name} ₹${rupees(fnf.net)}`} help="Posted to the accounts." onClose={() => setPaying(false)}
        onSubmit={async (body) => { if (await call(`/final-settlements/${fnf.id}/mark-paid`, body)) setPaying(false); }} />}
    </Dialog>
  );
}

/** HRMS > Full & Final: settle exits, post them, pay them. */
export function FinalSettlements() {
  const hr = useHrManager();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try {
      setData((await api.get("/final-settlements")).data?.data || { settlements: [], waiting: [] });
    } catch (err) {
      toast.error(errorMessage(err, "Could not load settlements"));
      setData({ settlements: [], waiting: [] });
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const prepare = async (separationId) => {
    try {
      const res = await api.post("/final-settlements/prepare", { separation_id: separationId });
      setOpen(res.data.data);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not prepare the settlement"));
    }
  };
  const columns = useMemo(() => [
    { key: "employee", label: "Employee", valueGetter: (r) => `${r.employee_name || ""}${r.employee_code ? ` (${r.employee_code})` : ""}` },
    { key: "last_working_day", label: "Last working day", valueGetter: (r) => r.last_working_day },
    { key: "gross", label: "Earnings", align: "right", valueGetter: (r) => Number(r.gross), render: (v) => `₹${rupees(v)}` },
    { key: "total_deductions", label: "Deductions", align: "right", valueGetter: (r) => Number(r.total_deductions), render: (v) => `₹${rupees(v)}` },
    { key: "net", label: "Net payable", align: "right", valueGetter: (r) => Number(r.net), render: (v) => `₹${rupees(v)}` },
    { key: "status", label: "Status", valueGetter: (r) => (r.status === "DRAFT" ? "Draft" : MONEY_STATUS[r.status]?.label || r.status),
      render: (v, r) => <Chip size="small" color={MONEY_STATUS[r.status]?.color || "default"} label={v} /> },
    { key: "paid_on", label: "Paid on", valueGetter: (r) => r.paid_on || "" },
  ], []);
  return (
    <HrPage title="Full & Final">
      {(data?.waiting || []).length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Waiting for a settlement</Typography>
          {data.waiting.map((w) => (
            <Stack key={w.separation_id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>{w.employee_name}{w.employee_code ? ` (${w.employee_code})` : ""} · {EXIT_TYPE[w.type]} · last day {w.last_working_day}</Typography>
              {hr && (w.last_working_day <= today()
                ? <Button size="small" variant="outlined" onClick={() => prepare(w.separation_id)}>Prepare</Button>
                : <Typography variant="caption" color="text.secondary">from {w.last_working_day}</Typography>)}
            </Stack>
          ))}
        </Paper>
      )}
      <HrTable rows={data?.settlements ?? null} columns={columns} empty="No settlements yet." prefKey="hr.exits.settlements" file="final_settlements" scope="all"
        actions={(row) => <Button size="small" startIcon={<BarChart3 size={12} />} onClick={() => api.get(`/final-settlements/${row.id}`).then((r) => setOpen(r.data.data)).catch(() => toast.error("Could not open"))}>Open</Button>} />
      {open && <SettlementDialog key={open.id} settlement={open} canManage={hr} onChange={load} onClose={() => setOpen(null)} />}
    </HrPage>
  );
}
