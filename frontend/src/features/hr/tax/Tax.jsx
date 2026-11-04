import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Stack, Tab, Tabs,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { Paperclip, Plus, Printer, Trash2, Upload } from "lucide-react";
import api from "@/shared/api/apiClient";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import HrPage from "../components/HrPage";
import { FilterChips, HrTable } from "../components/HrWidgets";
import { post, useHrManager } from "../utils/hrApi";
import { rupees } from "../payroll/payslipPrint";
import { errorMessage } from "../utils/hrStatus";
import { PROOF_STATUS, REGIME_LABEL, SECTION, fyChoices, fyOf, form16Html, quarterMonths } from "./taxShared";

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };
const today = () => new Date().toLocaleDateString("en-CA");

/** Opens a proof through its short-lived signed link. */
async function openProof(itemId) {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const res = await api.get(`/tax-declaration-items/${itemId}/proof`);
    if (tab) tab.location.href = res.data.data.url;
  } catch {
    tab?.close();
    toast.error("Could not open the proof");
  }
}

/** The year's estimate under both regimes, and which one costs less with what is declared. */
function RegimeChoice({ estimate, regime, onChange, disabled }) {
  const n = Number(estimate?.new?.tax?.total || 0);
  const o = Number(estimate?.old?.tax?.total || 0);
  const better = n === o ? null : n < o ? "NEW" : "OLD";
  const card = (key, label, e) => (
    <Paper key={key} variant="outlined" onClick={() => !disabled && onChange(key)}
      sx={{ p: 1.5, flex: 1, cursor: disabled ? "default" : "pointer", borderWidth: regime === key ? 2 : 1, borderColor: regime === key ? "primary.main" : "divider" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
        {regime === key ? <Chip size="small" color="primary" label="Chosen" /> : better === key ? <Chip size="small" color="success" label="Lower tax" /> : null}
      </Stack>
      <Typography sx={{ fontSize: 22, fontWeight: 900, mt: 0.5 }}>₹{rupees(e?.tax?.total)}</Typography>
      <Typography variant="caption" color="text.secondary">tax for the year on ₹{rupees(e?.taxable)} taxable</Typography>
    </Paper>
  );
  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>{card("NEW", REGIME_LABEL.NEW, estimate?.new)}{card("OLD", REGIME_LABEL.OLD, estimate?.old)}</Stack>
      {better && <Typography variant="body2" sx={{ mt: 1 }}>With what you have declared, the <b>{REGIME_LABEL[better].toLowerCase()}</b> saves ₹{rupees(Math.abs(n - o))} this year.</Typography>}
    </Box>
  );
}

/** Edits the items of a declaration: amounts, HRA rent details, proofs. */
function ItemsEditor({ items, setItems, sections, readOnly, onUpload, canVerify, onVerify }) {
  const update = (i, patch) => setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const details = (i, patch) => update(i, { details: { ...(items[i].details || {}), ...patch } });
  return (
    <Stack spacing={1.25}>
      {items.length === 0 && <Typography variant="body2" color="text.secondary">Nothing declared yet.</Typography>}
      {items.map((item, i) => (
        <Paper key={item.id || `new-${i}`} variant="outlined" sx={{ p: 1.25 }}>
          <Stack direction={{ xs: "column", md: "row" }} useFlexGap spacing={1.25} alignItems={{ md: "center" }} sx={{ flexWrap: { md: "wrap" } }}>
            <TextField select size="small" label="What" value={item.section} disabled={readOnly || Boolean(item.id)} onChange={(e) => update(i, { section: e.target.value })} sx={{ width: { md: 240 } }}>
              {sections.map((s) => <MenuItem key={s} value={s}>{SECTION[s]?.label || s}</MenuItem>)}
            </TextField>
            {item.section === "HRA" ? (
              <>
                <TextField type="number" size="small" label="Rent a month ₹" value={item.details?.rent_per_month ?? ""} disabled={readOnly} onChange={(e) => details(i, { rent_per_month: e.target.value })} sx={{ width: 140 }} />
                <TextField type="number" size="small" label="Months" value={item.details?.months ?? 12} disabled={readOnly} onChange={(e) => details(i, { months: e.target.value })} sx={{ width: 90 }} />
                <FormControlLabel control={<Checkbox size="small" checked={Boolean(item.details?.metro)} disabled={readOnly} onChange={(e) => details(i, { metro: e.target.checked })} />} label="Metro city" />
                <TextField size="small" label="Landlord" value={item.details?.landlord_name ?? ""} disabled={readOnly} onChange={(e) => details(i, { landlord_name: e.target.value })} sx={{ width: 150 }} />
                <TextField size="small" label="Landlord PAN" value={item.details?.landlord_pan ?? ""} disabled={readOnly} onChange={(e) => details(i, { landlord_pan: e.target.value.toUpperCase() })} sx={{ width: 140 }} />
              </>
            ) : (
              <>
                <TextField type="number" size="small" label="Amount for the year ₹" value={item.declared_amount ?? ""} disabled={readOnly} onChange={(e) => update(i, { declared_amount: e.target.value })} sx={{ width: 170 }} />
                <TextField size="small" label="Details" value={item.description ?? ""} disabled={readOnly} onChange={(e) => update(i, { description: e.target.value })} sx={{ flex: 1, minWidth: 140 }} />
              </>
            )}
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: { md: "auto" }, flexShrink: 0 }}>
              {item.id && <Chip size="small" color={PROOF_STATUS[item.proof_status]?.color || "default"} label={item.proof_status === "VERIFIED" ? `Verified ₹${rupees(item.proof_amount)}` : PROOF_STATUS[item.proof_status]?.label} />}
              {item.has_proof && <Button size="small" startIcon={<Paperclip size={12} />} onClick={() => openProof(item.id)}>View</Button>}
              {item.id && onUpload && !readOnly && (
                <Button size="small" component="label" startIcon={<Upload size={12} />}>Proof
                  <input hidden type="file" accept="image/*,application/pdf" aria-label={`Proof for ${SECTION[item.section]?.label}`} onChange={(e) => e.target.files?.[0] && onUpload(item, e.target.files[0])} />
                </Button>
              )}
              {canVerify && item.id && item.proof_status !== "VERIFIED" && <Button size="small" color="success" onClick={() => onVerify(item, "accept")}>Accept</Button>}
              {canVerify && item.id && item.proof_status !== "REJECTED" && <Button size="small" color="error" onClick={() => onVerify(item, "reject")}>Reject</Button>}
              {!readOnly && <IconButton size="small" aria-label="Remove" onClick={() => setItems(items.filter((_, k) => k !== i))}><Trash2 size={14} /></IconButton>}
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary">{SECTION[item.section]?.help}{item.note ? ` · HR: ${item.note}` : ""}</Typography>
        </Paper>
      ))}
      {!readOnly && <Box><Button size="small" startIcon={<Plus size={14} />} onClick={() => setItems([...items, { section: "80C", declared_amount: "", details: {} }])}>Add an item</Button></Box>}
    </Stack>
  );
}

const toPayload = (regime, items) => ({
  regime,
  items: items.map((it) => ({ id: it.id, section: it.section, description: it.description || undefined,
    declared_amount: it.section === "HRA" ? undefined : Number(it.declared_amount || 0),
    details: it.section === "HRA" ? { rent_per_month: Number(it.details?.rent_per_month || 0), months: Number(it.details?.months ?? 12), metro: Boolean(it.details?.metro),
      landlord_name: it.details?.landlord_name || undefined, landlord_pan: it.details?.landlord_pan || undefined } : undefined })),
});

function Projection({ e }) {
  if (!e) return null;
  const cells = [["Taxable for the year", e.taxable], ["Tax for the year", e.tax?.total], ["Deducted so far", e.tds_deducted], [`Each month now (${e.months_left} left)`, e.tds_month]];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
      {cells.map(([label, value]) => (
        <Paper key={label} variant="outlined" sx={{ p: 1.25 }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography sx={{ fontWeight: 900, fontSize: 18 }}>₹{rupees(value)}</Typography>
        </Paper>
      ))}
      {e.no_pan && <Alert severity="warning" sx={{ gridColumn: "1 / -1" }}>No PAN on your employee record: tax is deducted at a higher rate. Give HR your PAN.</Alert>}
    </Box>
  );
}

/** HRMS > My Tax: regime, tax-saving declarations with proofs, and the year's estimate. */
export function MyTax() {
  const [fy, setFy] = useState(fyOf());
  const [data, setData] = useState(null);
  const [regime, setRegime] = useState("NEW");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const d = (await api.get("/tax-declarations/mine", { params: { fy } })).data?.data || {};
      setData(d);
      setRegime(d.declaration?.regime || "NEW");
      setItems(d.items || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load your tax details"));
      setData({});
    }
  }, [fy]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const locked = Boolean(data?.declaration?.locked);
  const save = async (andSubmit = false) => {
    setSaving(true);
    try {
      const res = await api.put("/tax-declarations/mine", { ...toPayload(regime, items), fy });
      if (andSubmit) await api.post("/tax-declarations/mine/submit", { fy });
      toast.success(andSubmit ? "Declaration sent to HR" : res.data?.message || "Saved");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  };
  const upload = async (item, file) => {
    const body = new FormData();
    body.append("proof", file);
    try {
      await api.post(`/tax-declaration-items/${item.id}/proof`, body, MULTIPART);
      toast.success("Proof uploaded");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not upload the proof"));
    }
  };
  return (
    <HrPage title="My Tax" actions={(
      <TextField select size="small" label="Year" value={fy} onChange={(e) => { setData(null); setFy(e.target.value); }} sx={{ width: 120 }}>
        {fyChoices().map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
      </TextField>
    )}>
      {data && !data.employee && <Alert severity="info">Your login is not linked to an employee yet. Ask HR to tick "Allow System" with your username on your employee record.</Alert>}
      {data?.employee && (
        <Stack spacing={2} sx={{ maxWidth: 1100 }}>
          {locked && <Alert severity="info">Your {fy} declaration is closed. Ask HR if something needs to change.</Alert>}
          <RegimeChoice estimate={data.estimate} regime={regime} onChange={setRegime} disabled={locked} />
          <Projection e={data.estimate?.[regime === "OLD" ? "old" : "new"]} />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>What you will invest or pay this year {regime === "NEW" && <Typography component="span" variant="caption" color="text.secondary">(the new regime only counts previous-employer figures)</Typography>}</Typography>
            <ItemsEditor items={items} setItems={setItems} sections={data.sections || Object.keys(SECTION)} readOnly={locked} onUpload={upload} />
          </Box>
          {!locked && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={saving} onClick={() => save(false)}>Save</Button>
              <Button variant="contained" disabled={saving} onClick={() => save(true)}>Save and send to HR</Button>
              {data.declaration?.status === "SUBMITTED" && <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>Sent to HR on {String(data.declaration.submitted_at || "").slice(0, 10)}</Typography>}
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary">Until the proof deadline (31 January) the amounts you declare are used for monthly TDS; after it, only what HR has verified from your proofs. Save first, then upload a proof for each item.</Typography>
        </Stack>
      )}
    </HrPage>
  );
}

/** HR: one employee's declaration: verify proofs, edit, close. */
function DeclarationDialog({ employeeId, fy, onClose, onChange }) {
  const [data, setData] = useState(null);
  const [regime, setRegime] = useState("NEW");
  const [items, setItems] = useState([]);
  const [verifying, setVerifying] = useState(null);
  const load = useCallback(async () => {
    const d = (await api.get(`/tax-declarations/employee/${employeeId}`, { params: { fy } })).data.data;
    setData(d);
    setRegime(d.declaration.regime);
    setItems(d.items);
  }, [employeeId, fy]);
  useEffect(() => {
    const timer = setTimeout(() => load().catch((err) => toast.error(errorMessage(err, "Could not load"))), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const save = async () => {
    try {
      await api.put(`/tax-declarations/employee/${employeeId}`, { ...toPayload(regime, items), fy });
      toast.success("Declaration saved");
      await load();
      onChange();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save"));
    }
  };
  const upload = async (item, file) => {
    const body = new FormData();
    body.append("proof", file);
    try {
      await api.post(`/tax-declaration-items/${item.id}/proof`, body, MULTIPART);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not upload the proof"));
    }
  };
  const decide = async () => {
    if (await post(`/tax-declaration-items/${verifying.item.id}/verify`, { action: verifying.action, amount: verifying.action === "accept" ? Number(verifying.amount) : undefined, note: verifying.note || undefined }, load)) {
      setVerifying(null);
      onChange();
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Tax declaration · {data?.employee?.name} · {fy}{data?.employee?.pan ? ` · PAN ${data.employee.pan}` : " · no PAN"}</DialogTitle>
      <DialogContent>
        {data && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <RegimeChoice estimate={data.estimate} regime={regime} onChange={setRegime} />
            <ItemsEditor items={items} setItems={setItems} sections={data.sections} onUpload={upload} canVerify onVerify={(item, action) => setVerifying({ item, action, amount: item.declared_amount, note: "" })} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {data && <Button color="inherit" onClick={() => post(`/tax-declarations/${data.declaration.id}/lock`, { locked: !data.declaration.locked }, async () => { await load(); onChange(); })}>{data.declaration.locked ? "Reopen for the employee" : "Close the declaration"}</Button>}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={save}>Save changes</Button>
      </DialogActions>
      {verifying && (
        <Dialog open onClose={() => setVerifying(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>{verifying.action === "accept" ? "Accept proof" : "Reject proof"} · {SECTION[verifying.item.section]?.label}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {verifying.action === "accept" && <TextField type="number" size="small" label="Amount proved ₹" value={verifying.amount} onChange={(e) => setVerifying({ ...verifying, amount: e.target.value })} />}
              <TextField size="small" label="Note to the employee" value={verifying.note} onChange={(e) => setVerifying({ ...verifying, note: e.target.value })} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVerifying(null)}>Back</Button>
            <Button variant="contained" color={verifying.action === "accept" ? "success" : "error"} onClick={decide}>{verifying.action === "accept" ? "Accept" : "Reject"}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
}

function Declarations({ fy }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try {
      setRows((await api.get("/tax-declarations", { params: { fy } })).data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load declarations"));
      setRows([]);
    }
  }, [fy]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const columns = useMemo(() => [
    { key: "name", label: "Employee", valueGetter: (r) => `${r.name}${r.code ? ` (${r.code})` : ""}` },
    { key: "pan", label: "PAN", valueGetter: (r) => r.pan || "Missing" },
    { key: "regime", label: "Regime", valueGetter: (r) => REGIME_LABEL[r.regime] },
    { key: "status", label: "Declaration", valueGetter: (r) => (r.status === "NONE" ? "Not started" : r.status === "SUBMITTED" ? "Sent" : "Draft") + (r.locked ? " · closed" : "") },
    { key: "declared", label: "Declared", align: "right", valueGetter: (r) => Number(r.declared), render: (v) => `₹${rupees(v)}` },
    { key: "to_verify", label: "Proofs to check", align: "right", valueGetter: (r) => r.to_verify, render: (v) => (v ? <Chip size="small" color="warning" label={v} /> : "-") },
    { key: "verified", label: "Verified", align: "right", valueGetter: (r) => r.verified },
  ], []);
  return (
    <>
      <HrTable rows={rows} columns={columns} empty="No employees." prefKey="hr.tax.declarations" file={`tax_declarations_${fy}`} scope={fy}
        actions={(row) => <Button size="small" onClick={() => setOpen(row.employee_id)}>Open</Button>} />
      {open && <DeclarationDialog employeeId={open} fy={fy} onClose={() => setOpen(null)} onChange={load} />}
    </>
  );
}

function useGet(url, params) {
  const [data, setData] = useState(null);
  const key = JSON.stringify(params);
  const load = useCallback(async () => {
    try {
      setData((await api.get(url, { params: JSON.parse(key) })).data?.data ?? null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load"));
      setData({});
    }
  }, [url, key]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  return [data, load, setData];
}

const QUARTERS = [[0, "Year"], [1, "Q1 Apr–Jun"], [2, "Q2 Jul–Sep"], [3, "Q3 Oct–Dec"], [4, "Q4 Jan–Mar"]];
const MonthTotals = ({ months }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3, 1fr)", md: "repeat(6, 1fr)" }, gap: 1, mb: 1.5 }}>
    {(months || []).map((m) => (
      <Paper key={m.month} variant="outlined" sx={{ p: 1, borderColor: m.deducted > m.deposited + 0.5 ? "warning.main" : "divider" }}>
        <Typography variant="caption" sx={{ fontWeight: 800 }}>{m.month}</Typography>
        <Typography variant="body2">Deducted ₹{rupees(m.deducted)}</Typography>
        <Typography variant="body2" color={m.deducted > m.deposited + 0.5 ? "warning.main" : "text.secondary"}>Deposited ₹{rupees(m.deposited)}</Typography>
      </Paper>
    ))}
  </Box>
);

function Register({ fy }) {
  const [quarter, setQuarter] = useState(0);
  const [data] = useGet("/tds/register", { fy, quarter: quarter || undefined });
  const columns = useMemo(() => [
    { key: "month", label: "Month", valueGetter: (r) => r.month },
    { key: "name", label: "Employee", valueGetter: (r) => `${r.name}${r.code ? ` (${r.code})` : ""}` },
    { key: "pan", label: "PAN", valueGetter: (r) => r.pan || "Missing" },
    { key: "source", label: "Paid through", valueGetter: (r) => r.source },
    { key: "gross", label: "Taxable pay", align: "right", valueGetter: (r) => Number(r.gross), render: (v) => `₹${rupees(v)}` },
    { key: "tds", label: "TDS", align: "right", valueGetter: (r) => Number(r.tds), render: (v) => `₹${rupees(v)}` },
  ], []);
  return (
    <>
      <FilterChips value={quarter} onChange={setQuarter} options={QUARTERS} />
      <MonthTotals months={data?.months} />
      <HrTable rows={data?.rows ?? null} columns={columns} empty="No salary paid yet this year." prefKey="hr.tax.register" file={`tds_register_${fy}`} scope={`${fy}:${quarter}`} />
    </>
  );
}

function ChallanDialog({ fy, challan, onClose, onSaved }) {
  const [form, setForm] = useState(challan ? { ...challan, interest: challan.interest ?? 0, fee: challan.fee ?? 0 }
    : { quarter: 1, months: [], tax: "", interest: 0, fee: 0, bsr_code: "", challan_no: "", deposited_on: today(), pay_mode: "BANK", note: "" });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = async () => {
    const body = { fy, quarter: Number(form.quarter), months: form.months, tax: Number(form.tax), interest: Number(form.interest || 0), fee: Number(form.fee || 0),
      bsr_code: form.bsr_code, challan_no: form.challan_no, deposited_on: form.deposited_on, pay_mode: form.pay_mode, note: form.note || undefined };
    try {
      await (challan ? api.put(`/tds/challans/${challan.id}`, body) : api.post("/tds/challans", body));
      toast.success("Challan saved");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the challan"));
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>{challan ? "Edit challan" : "Record a TDS deposit"} · {fy}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField select size="small" label="Quarter" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: Number(e.target.value), months: [] })}>
            {QUARTERS.slice(1).map(([q, l]) => <MenuItem key={q} value={q}>{l}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1}>
            {quarterMonths(fy, Number(form.quarter)).map((m) => (
              <FormControlLabel key={m} label={m} control={<Checkbox size="small" checked={form.months.includes(m)}
                onChange={(e) => setForm({ ...form, months: e.target.checked ? [...form.months, m].sort() : form.months.filter((x) => x !== m) })} />} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField type="number" size="small" label="Tax ₹" value={form.tax} onChange={set("tax")} fullWidth />
            <TextField type="number" size="small" label="Interest ₹" value={form.interest} onChange={set("interest")} fullWidth />
            <TextField type="number" size="small" label="Late fee ₹" value={form.fee} onChange={set("fee")} fullWidth />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="BSR code" value={form.bsr_code} onChange={set("bsr_code")} slotProps={{ htmlInput: { maxLength: 7 } }} fullWidth />
            <TextField size="small" label="Challan serial no." value={form.challan_no} onChange={set("challan_no")} slotProps={{ htmlInput: { maxLength: 5 } }} fullWidth />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" size="small" label="Deposited on" value={form.deposited_on} onChange={set("deposited_on")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField select size="small" label="Paid from" value={form.pay_mode} onChange={set("pay_mode")} fullWidth>
              <MenuItem value="BANK">Bank</MenuItem><MenuItem value="CASH">Cash</MenuItem>
            </TextField>
          </Stack>
          <TextField size="small" label="Note" value={form.note || ""} onChange={set("note")} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!form.months.length || !(Number(form.tax) > 0)} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function Challans({ fy }) {
  const hr = useHrManager();
  const [data, load] = useGet("/tds/challans", { fy });
  const [editing, setEditing] = useState(null);
  const columns = useMemo(() => [
    { key: "quarter", label: "Quarter", valueGetter: (r) => `Q${r.quarter}` },
    { key: "months", label: "Months", valueGetter: (r) => (r.months || []).join(", ") },
    { key: "deposited_on", label: "Deposited", valueGetter: (r) => r.deposited_on },
    { key: "bsr_code", label: "BSR", valueGetter: (r) => r.bsr_code },
    { key: "challan_no", label: "Serial", valueGetter: (r) => r.challan_no },
    { key: "tax", label: "Tax", align: "right", valueGetter: (r) => Number(r.tax), render: (v) => `₹${rupees(v)}` },
    { key: "total", label: "Total paid", align: "right", valueGetter: (r) => Number(r.total), render: (v) => `₹${rupees(v)}` },
  ], []);
  return (
    <>
      {hr && <Button size="small" variant="outlined" startIcon={<Plus size={14} />} sx={{ mb: 1 }} onClick={() => setEditing({})}>Record a deposit</Button>}
      <MonthTotals months={data?.months} />
      <HrTable rows={data?.challans ?? null} columns={columns} empty="No deposits recorded." prefKey="hr.tax.challans" file={`tds_challans_${fy}`} scope={fy}
        actions={hr ? (row) => (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" onClick={() => setEditing(row)}>Edit</Button>
            <Button size="small" color="inherit" onClick={() => api.delete(`/tds/challans/${row.id}`).then(load).catch((err) => toast.error(errorMessage(err, "Could not remove")))}>Remove</Button>
          </Stack>
        ) : undefined} />
      {editing && <ChallanDialog fy={fy} challan={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </>
  );
}

function Form16({ fy }) {
  const [people] = useGet("/tax-declarations", { fy });
  const [employeeId, setEmployeeId] = useState("");
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (!employeeId) return;
    api.get("/tds/form16", { params: { fy, employee_id: employeeId } }).then((r) => setForm(r.data.data)).catch((err) => toast.error(errorMessage(err, "Could not load Form 16")));
  }, [fy, employeeId]);
  return (
    <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField select size="small" label="Employee" value={employeeId} onChange={(e) => { setForm(null); setEmployeeId(e.target.value); }} sx={{ minWidth: 260 }}>
          {(Array.isArray(people) ? people : []).map((p) => <MenuItem key={p.employee_id} value={String(p.employee_id)}>{p.name}{p.code ? ` (${p.code})` : ""}</MenuItem>)}
        </TextField>
        {form && <Button variant="outlined" startIcon={<Printer size={14} />} onClick={() => browserPrintHtml(form16Html(form))}>Print Part B</Button>}
      </Stack>
      {form && (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          {!form.complete && <Alert severity="info" sx={{ mb: 1 }}>The year is not finished: this is the estimate so far.</Alert>}
          <Typography variant="body2">Paid ₹{rupees(form.paid)} in {form.months} payment(s) · TDS ₹{rupees(form.tds)} · taxable ₹{rupees(form.computation?.taxable)} · tax for the year ₹{rupees(form.computation?.tax?.total)} ({REGIME_LABEL[form.computation?.regime] || "-"})</Typography>
        </Paper>
      )}
    </Stack>
  );
}

function Form24q({ fy }) {
  const [quarter, setQuarter] = useState(1);
  const [data] = useGet("/tds/form24q", { fy, quarter });
  const a1 = useMemo(() => [
    { key: "name", label: "Employee", valueGetter: (r) => r.name }, { key: "code", label: "Code", valueGetter: (r) => r.code },
    { key: "pan", label: "PAN", valueGetter: (r) => r.pan || "PANNOTAVBL" }, { key: "month", label: "Month", valueGetter: (r) => r.month },
    { key: "paid_on", label: "Paid on", valueGetter: (r) => r.paid_on }, { key: "gross", label: "Amount paid", align: "right", valueGetter: (r) => Number(r.gross) },
    { key: "tds", label: "TDS", align: "right", valueGetter: (r) => Number(r.tds) }, { key: "bsr_code", label: "BSR", valueGetter: (r) => r.bsr_code || "" },
    { key: "deposited_on", label: "Deposited on", valueGetter: (r) => r.deposited_on || "" }, { key: "challan_no", label: "Challan serial", valueGetter: (r) => r.challan_no || "" },
  ], []);
  const a2 = useMemo(() => ["name", "pan", "regime", "gross", "previous_salary", "exempt", "standard_deduction", "professional_tax", "chapter_via", "taxable", "tax", "rebate", "surcharge", "cess", "total_tax", "tds"]
    .map((key) => ({ key, label: key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), valueGetter: (r) => r[key] })), []);
  return (
    <>
      <FilterChips value={quarter} onChange={setQuarter} options={QUARTERS.slice(1)} />
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Annexure I: salary paid and TDS</Typography>
      <HrTable rows={data?.annexure1 ?? null} columns={a1} empty="Nothing paid in this quarter." prefKey="hr.tax.24q1" file={`form24q_${fy}_Q${quarter}_annexure1`} scope={`${fy}:${quarter}`} />
      {quarter === 4 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Annexure II: the year per employee</Typography>
          <HrTable rows={data?.annexure2 ?? null} columns={a2} empty="No salary this year." prefKey="hr.tax.24q2" file={`form24q_${fy}_annexure2`} scope={`${fy}:a2`} />
        </>
      )}
    </>
  );
}

const slabRows = (slabs) => (slabs || []).map(([from, to, pct]) => ({ from, to: to ?? "", pct }));

function TaxRules({ fy }) {
  // The loaded rules are edited in place; saving reloads them.
  const [data, load, setData] = useGet("/tds/rules", { fy });
  const rules = data?.rules;
  if (!rules) return <Typography variant="body2">Loading…</Typography>;
  const set = (path, value) => setData((prev) => {
    const next = structuredClone(prev);
    let node = next.rules;
    path.slice(0, -1).forEach((k) => { node = node[k]; });
    node[path[path.length - 1]] = value;
    return next;
  });
  const num = (path, label, width = 150) => {
    const value = path.reduce((n, k) => n?.[k], rules);
    return <TextField type="number" size="small" label={label} value={value ?? ""} onChange={(e) => set(path, e.target.value)} sx={{ width }} />;
  };
  const slabEditor = (regime) => (
    <Stack spacing={1}>
      {slabRows(rules[regime].slabs).map((s, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <TextField type="number" size="small" label="From ₹" value={s.from} onChange={(e) => set([regime, "slabs", i, 0], e.target.value)} sx={{ width: 130 }} />
          <TextField type="number" size="small" label="To ₹ (blank = above)" value={s.to} onChange={(e) => set([regime, "slabs", i, 1], e.target.value === "" ? null : e.target.value)} sx={{ width: 170 }} />
          <TextField type="number" size="small" label="%" value={s.pct} onChange={(e) => set([regime, "slabs", i, 2], e.target.value)} sx={{ width: 80 }} />
          <IconButton size="small" aria-label="Remove slab" onClick={() => set([regime, "slabs"], rules[regime].slabs.filter((_, k) => k !== i))}><Trash2 size={14} /></IconButton>
        </Stack>
      ))}
      <Box><Button size="small" startIcon={<Plus size={14} />} onClick={() => set([regime, "slabs"], [...rules[regime].slabs, [0, null, 0]])}>Add a slab</Button></Box>
    </Stack>
  );
  const save = async () => {
    const n = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    const regime = (r) => ({ ...r, standard_deduction: Number(r.standard_deduction), rebate_limit: Number(r.rebate_limit), rebate_max: Number(r.rebate_max),
      slabs: r.slabs.map(([a, b, c]) => [Number(a) || 0, n(b), Number(c) || 0]), surcharge: (r.surcharge || []).map(([a, b]) => [Number(a), Number(b)]) });
    try {
      await api.put("/tds/rules", { fy, enabled: Boolean(rules.enabled), cess_pct: Number(rules.cess_pct), no_pan_rate: Number(rules.no_pan_rate), proof_deadline: rules.proof_deadline,
        tan: rules.tan || null, metro_cities: rules.metro_cities, caps: Object.fromEntries(Object.entries(rules.caps).map(([k, v]) => [k, Number(v)])),
        exempt: Object.fromEntries(Object.entries(rules.exempt).map(([k, v]) => [k, Number(v)])), new: regime(rules.new), old: regime(rules.old) });
      toast.success(`Income tax rules for ${fy} saved`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the rules"));
    }
  };
  return (
    <Stack spacing={1.5} sx={{ maxWidth: 1100 }}>
      <Alert severity="info" sx={{ py: 0 }}>Starting figures are the FY 2025-26 rates. Please confirm them with your accountant for {fy}; they change with each budget.</Alert>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <FormControlLabel control={<Checkbox size="small" checked={Boolean(rules.enabled)} onChange={(e) => set(["enabled"], e.target.checked)} />} label="Deduct income tax (TDS) in payroll" />
        <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: "wrap", rowGap: 1.5 }}>
          <TextField size="small" label="TAN" value={rules.tan || ""} onChange={(e) => set(["tan"], e.target.value.toUpperCase())} sx={{ width: 150 }} />
          {num(["cess_pct"], "Cess %", 100)}{num(["no_pan_rate"], "Rate without PAN %", 160)}
          <TextField size="small" label="Proof deadline (MM-DD)" value={rules.proof_deadline} onChange={(e) => set(["proof_deadline"], e.target.value)} sx={{ width: 170 }} />
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 1.5 }}>
          {num(["caps", "80C"], "80C limit ₹")}{num(["caps", "80CCD1B"], "80CCD(1B) limit ₹")}{num(["caps", "80D"], "80D limit ₹")}{num(["caps", "24B"], "Home-loan interest limit ₹", 190)}
          {num(["exempt", "gratuity"], "Gratuity exempt up to ₹", 190)}{num(["exempt", "leave_on_exit"], "Leave on exit exempt up to ₹", 210)}
        </Stack>
      </Paper>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5 }}>
        {[["new", "New regime"], ["old", "Old regime"]].map(([key, label]) => (
          <Paper key={key} variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
            <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 1.5 }}>
              {num([key, "standard_deduction"], "Standard deduction ₹", 170)}{num([key, "rebate_limit"], "No tax up to ₹", 150)}{num([key, "rebate_max"], "Rebate up to ₹", 140)}
            </Stack>
            {slabEditor(key)}
          </Paper>
        ))}
      </Box>
      <Box><Button variant="contained" onClick={save}>Save rules for {fy}</Button></Box>
    </Stack>
  );
}

const TABS = [["declarations", "Declarations"], ["register", "TDS register"], ["challans", "Challans"], ["form16", "Form 16"], ["form24q", "Form 24Q"], ["rules", "Tax rules"]];

/** HRMS > Income Tax: declarations and proofs, TDS register, deposits, Form 16, Form 24Q and the year's rules. */
export function IncomeTax() {
  const [fy, setFy] = useState(fyOf());
  const [tab, setTab] = useState("declarations");
  return (
    <HrPage title="Income Tax" actions={(
      <ToggleButtonGroup exclusive size="small" value={fy} onChange={(_, v) => v && setFy(v)}>
        {fyChoices().map((y) => <ToggleButton key={y} value={y}>{y}</ToggleButton>)}
      </ToggleButtonGroup>
    )}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 1.5, minHeight: 36 }}>
        {TABS.map(([v, l]) => <Tab key={v} value={v} label={l} sx={{ minHeight: 36, py: 0.5 }} />)}
      </Tabs>
      {tab === "declarations" && <Declarations key={fy} fy={fy} />}
      {tab === "register" && <Register key={fy} fy={fy} />}
      {tab === "challans" && <Challans key={fy} fy={fy} />}
      {tab === "form16" && <Form16 key={fy} fy={fy} />}
      {tab === "form24q" && <Form24q key={fy} fy={fy} />}
      {tab === "rules" && <TaxRules key={fy} fy={fy} />}
    </HrPage>
  );
}
