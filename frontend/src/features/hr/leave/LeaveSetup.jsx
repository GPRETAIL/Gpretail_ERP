import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import api from "@/shared/api/apiClient";
import { days, errorMessage } from "../utils/hrStatus";

const blankType = { code: "", name: "", is_paid: true, allow_half_day: true, carry_forward: false, max_carry_days: 0, max_days_per_application: "", is_active: true };

function TypeDialog({ value, onClose }) {
  const [form, setForm] = useState({ ...blankType, ...value, max_days_per_application: value?.max_days_per_application ?? "" });
  const flag = (key) => <FormControlLabel control={<Checkbox size="small" checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />}
    label={{ is_paid: "Paid (has a balance)", allow_half_day: "Half day allowed", carry_forward: "Carry forward to next year", is_active: "Active" }[key]} />;
  const save = async () => {
    try {
      const body = { ...form, max_carry_days: Number(form.max_carry_days) || 0, max_days_per_application: form.max_days_per_application === "" ? null : Number(form.max_days_per_application) };
      const res = form.id ? await api.put(`/leave-types/${form.id}`, body) : await api.post("/leave-types", body);
      toast.success(res.data?.message || "Saved");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the leave type"));
    }
  };
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>{form.id ? "Edit leave type" : "Add leave type"}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1.5}>
            <TextField size="small" label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} sx={{ width: 110 }} />
            <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
          </Stack>
          {flag("is_paid")}{flag("allow_half_day")}{flag("carry_forward")}
          {form.carry_forward && <TextField type="number" size="small" label="Carry forward at most (days)" value={form.max_carry_days} onChange={(e) => setForm({ ...form, max_carry_days: e.target.value })} />}
          <TextField type="number" size="small" label="Most days in one application" value={form.max_days_per_application} onChange={(e) => setForm({ ...form, max_days_per_application: e.target.value })} placeholder="No limit" />
          {flag("is_active")}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={!form.code.trim() || !form.name.trim()} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function PolicyDialog({ value, types, onClose }) {
  const [name, setName] = useState(value?.name || "");
  const [isDefault, setIsDefault] = useState(Boolean(value?.is_default));
  const [daysByType, setDaysByType] = useState(() => Object.fromEntries((value?.items || []).map((item) => [item.leave_type_id, item.days_per_year])));
  const save = async () => {
    try {
      const body = { name, is_default: isDefault, items: types.filter((t) => Number(daysByType[t.id]) > 0).map((t) => ({ leave_type_id: t.id, days_per_year: Number(daysByType[t.id]) })) };
      const res = value?.id ? await api.put(`/leave-policies/${value.id}`, body) : await api.post("/leave-policies", body);
      toast.success(res.data?.message || "Saved");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the policy"));
    }
  };
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>{value?.id ? "Edit leave policy" : "Add leave policy"}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField size="small" label="Policy name" value={name} onChange={(e) => setName(e.target.value)} />
          <Typography variant="caption" color="text.secondary">Days given each year (paid leave types):</Typography>
          {types.filter((t) => t.is_paid && t.is_active).map((t) => (
            <TextField key={t.id} type="number" size="small" label={`${t.name} (${t.code})`} value={daysByType[t.id] ?? ""} onChange={(e) => setDaysByType({ ...daysByType, [t.id]: e.target.value })} />
          ))}
          <FormControlLabel control={<Checkbox size="small" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />} label="Default for employees with no policy" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim()} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Leave > Setup: the store's leave types and leave policies (days per year per type). */
export default function LeaveSetup() {
  const [types, setTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [editingType, setEditingType] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api.get("/leave-types"), api.get("/leave-policies")]);
      setTypes(t.data?.data || []);
      setPolicies(p.data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load leave setup"));
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const closed = (saved) => { setEditingType(null); setEditingPolicy(null); if (saved) void load(); };
  const removePolicy = async (policy) => {
    if (!window.confirm(`Delete the policy ${policy.name}? Its employees move to the default policy.`)) return;
    try {
      await api.delete(`/leave-policies/${policy.id}`);
      void load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the policy"));
    }
  };
  const cell = { py: 0.75, fontSize: 12.5 };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 1.5, alignItems: "start", overflow: "auto" }}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>Leave types</Typography>
          <Button size="small" startIcon={<Plus size={14} />} onClick={() => setEditingType({})}>Add</Button>
        </Stack>
        <Table size="small">
          <TableHead><TableRow><TableCell sx={cell}>Code</TableCell><TableCell sx={cell}>Name</TableCell><TableCell sx={cell}>Rules</TableCell><TableCell sx={cell} /></TableRow></TableHead>
          <TableBody>
            {types.map((t) => (
              <TableRow key={t.id} sx={{ opacity: t.is_active ? 1 : 0.5 }}>
                <TableCell sx={{ ...cell, fontWeight: 700 }}>{t.code}</TableCell>
                <TableCell sx={cell}>{t.name}</TableCell>
                <TableCell sx={cell}>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                    <Chip size="small" label={t.is_paid ? "Paid" : "Unpaid"} color={t.is_paid ? "success" : "default"} variant="outlined" />
                    {t.carry_forward && <Chip size="small" label={`Carry ≤ ${days(t.max_carry_days)}`} variant="outlined" />}
                    {!t.allow_half_day && <Chip size="small" label="No half day" variant="outlined" />}
                    {!t.is_active && <Chip size="small" label="Off" />}
                  </Stack>
                </TableCell>
                <TableCell sx={cell} align="right"><Button size="small" onClick={() => setEditingType(t)}>Edit</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>Leave policies</Typography>
          <Button size="small" startIcon={<Plus size={14} />} onClick={() => setEditingPolicy({})}>Add</Button>
        </Stack>
        <Table size="small">
          <TableHead><TableRow><TableCell sx={cell}>Policy</TableCell><TableCell sx={cell}>Days per year</TableCell><TableCell sx={cell}>Employees</TableCell><TableCell sx={cell} /></TableRow></TableHead>
          <TableBody>
            {policies.map((p) => (
              <TableRow key={p.id}>
                <TableCell sx={cell}>{p.name}{p.is_default && <Chip size="small" label="Default" color="primary" sx={{ ml: 1 }} />}</TableCell>
                <TableCell sx={cell}>{(p.items || []).map((item) => `${item.leave_type?.code} ${days(item.days_per_year)}`).join(" · ") || "-"}</TableCell>
                <TableCell sx={cell}>{p.is_default ? `${p.employees} + unassigned` : p.employees}</TableCell>
                <TableCell sx={cell} align="right">
                  <Button size="small" onClick={() => setEditingPolicy(p)}>Edit</Button>
                  {!p.is_default && <Button size="small" color="error" onClick={() => removePolicy(p)}>Delete</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Choose an employee's policy on their record (HRMS &gt; Employee).</Typography>
      </Paper>
      {editingType && <TypeDialog value={editingType} onClose={closed} />}
      {editingPolicy && <PolicyDialog value={editingPolicy} types={types} onClose={closed} />}
    </Box>
  );
}
