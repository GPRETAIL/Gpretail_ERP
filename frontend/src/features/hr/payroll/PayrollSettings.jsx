import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { errorMessage } from "../utils/hrStatus";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Salary Management > Settings: PF, ESI, professional tax by state (editable slabs), OT and batta. */
export default function PayrollSettings({ canManage }) {
  const [settings, setSettings] = useState(null);
  const [presets, setPresets] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/payroll/settings").then((res) => {
      if (!active) return;
      setSettings(res.data?.data?.settings || null);
      setPresets(res.data?.data?.pt_presets || {});
    }).catch((err) => toast.error(errorMessage(err, "Could not load payroll settings")));
    return () => { active = false; };
  }, []);

  if (!settings) return <LoadingSkeleton variant="table" rows={10} label="Loading payroll settings" />;
  const set = (section, key, value) => setSettings((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }));
  const pt = settings.pt;
  const chooseState = (state) => {
    const preset = presets[state] || {};
    setSettings((prev) => ({ ...prev, pt: { state, frequency: preset.frequency || "monthly", months: preset.months || [], slabs: preset.slabs || [] } }));
  };
  const setSlab = (i, j, value) => set("pt", "slabs", pt.slabs.map((slab, k) => (k === i ? slab.map((v, m) => (m === j ? value : v)) : slab)));
  const save = async () => {
    setSaving(true);
    try {
      const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
      await api.put("/payroll/settings", { ...settings, pt: { ...pt, slabs: pt.slabs.map(([a, b, c, d]) => [Number(a) || 0, num(b), Number(c) || 0, num(d)]) } });
      toast.success("Payroll settings saved");
    } catch (err) {
      toast.error(errorMessage(err, "Could not save payroll settings"));
    } finally {
      setSaving(false);
    }
  };
  const field = (section, key, label, width = 140) => (
    <TextField type="number" size="small" label={label} value={settings[section]?.[key] ?? ""} onChange={(e) => set(section, key, e.target.value)} disabled={!canManage} sx={{ width }} />
  );
  const tick = (section, key, label) => (
    <FormControlLabel control={<Checkbox size="small" checked={Boolean(settings[section]?.[key])} onChange={(e) => set(section, key, e.target.checked)} disabled={!canManage} />} label={label} />
  );

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5, alignItems: "start", overflow: "auto" }}>
      <Stack spacing={1.5}>
        <Alert severity="info" sx={{ py: 0 }}>These are common rates. Please confirm them with your accountant; they change from time to time.</Alert>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Provident Fund (PF)</Typography>
          {tick("pf", "enabled", "Deduct PF")}
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: "wrap", rowGap: 1.5 }}>
            {field("pf", "employee_pct", "Employee %")}{field("pf", "employer_pct", "Employer %")}{field("pf", "wage_ceiling", "Wage ceiling ₹")}
          </Stack>
          {tick("pf", "cap_wages", "Work out PF on Basic up to the wage ceiling")}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>PF applies from the employee's PF eligible date, or when they have a PF number or UAN.</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>ESI</Typography>
          {tick("esi", "enabled", "Deduct ESI")}
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: "wrap", rowGap: 1.5 }}>
            {field("esi", "employee_pct", "Employee %")}{field("esi", "employer_pct", "Employer %")}{field("esi", "gross_limit", "Only up to gross ₹")}
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Overtime and batta</Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
            {field("ot", "multiplier", "OT rate × hourly")}{field("ot", "hours_per_day", "Hours in a day")}{field("batta", "per_day", "Batta per day ₹")}
          </Stack>
          {tick("ot", "requires_approval", "Overtime needs approval before it is paid (HRMS > OT Approvals)")}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>OT is paid to employees with OT ticked, for time worked beyond their shift. Batta is paid per day present to employees with Beta ticked.</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Exits: notice period and gratuity</Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
            {field("exit", "notice_days", "Notice period (days)", 160)}
          </Stack>
          {tick("gratuity", "enabled", "Pay gratuity in the full and final settlement")}
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: "wrap", rowGap: 1.5 }}>
            {field("gratuity", "min_years", "From years of service")}{field("gratuity", "days", "Days' wages a year")}{field("gratuity", "divisor", "Month of (days)")}{field("gratuity", "cap", "Up to ₹", 160)}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Gratuity = Basic × days ÷ month of days × years of service (6 months or more counts as a year). An employee's own Notice Period on their record wins over the store's.</Typography>
        </Paper>
      </Stack>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Professional tax</Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5, mb: 1.5 }}>
          <TextField select size="small" label="Store's state" value={pt.state} onChange={(e) => chooseState(e.target.value)} disabled={!canManage} sx={{ minWidth: 220 }}>
            {Object.entries(presets).map(([code, preset]) => <MenuItem key={code} value={code}>{preset.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Deducted" value={pt.frequency} onChange={(e) => set("pt", "frequency", e.target.value)} disabled={!canManage} sx={{ minWidth: 150 }}>
            <MenuItem value="monthly">Every month</MenuItem><MenuItem value="half_yearly">Half-yearly</MenuItem>
          </TextField>
        </Stack>
        {pt.frequency === "half_yearly" && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">Deduct in (slabs are on the half-year's salary):</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap" }}>
              {MONTHS.map((name, i) => (
                <FormControlLabel key={name} sx={{ mr: 1 }} label={name} control={<Checkbox size="small" disabled={!canManage} checked={pt.months.includes(i + 1)}
                  onChange={(e) => set("pt", "months", e.target.checked ? [...pt.months, i + 1].sort((a, b) => a - b) : pt.months.filter((m) => m !== i + 1))} />} />
              ))}
            </Stack>
          </Box>
        )}
        {pt.slabs.map((slab, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
            <TextField type="number" size="small" label="Salary from ₹" value={slab[0] ?? ""} onChange={(e) => setSlab(i, 0, e.target.value)} disabled={!canManage} />
            <TextField type="number" size="small" label="To ₹ (blank = above)" value={slab[1] ?? ""} onChange={(e) => setSlab(i, 1, e.target.value)} disabled={!canManage} />
            <TextField type="number" size="small" label="Tax ₹" value={slab[2] ?? ""} onChange={(e) => setSlab(i, 2, e.target.value)} disabled={!canManage} />
            {pt.frequency === "monthly" && <TextField type="number" size="small" label="In Feb ₹" value={slab[3] ?? ""} onChange={(e) => setSlab(i, 3, e.target.value)} disabled={!canManage} />}
            {canManage && <IconButton size="small" aria-label="Remove slab" onClick={() => set("pt", "slabs", pt.slabs.filter((_, k) => k !== i))}><Trash2 size={15} /></IconButton>}
          </Stack>
        ))}
        {canManage && <Button size="small" startIcon={<Plus size={14} />} onClick={() => set("pt", "slabs", [...pt.slabs, [0, null, 0, null]])}>Add slab</Button>}
        {pt.state === "NONE" && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>No professional tax is deducted.</Typography>}
      </Paper>
      {canManage && (
        <Box sx={{ gridColumn: { lg: "1 / -1" }, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="contained" disabled={saving} onClick={save}>Save settings</Button>
        </Box>
      )}
    </Box>
  );
}
