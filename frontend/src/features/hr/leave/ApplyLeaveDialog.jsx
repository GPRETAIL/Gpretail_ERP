import { useState } from "react";
import { toast } from "react-toastify";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField } from "@mui/material";
import api from "@/shared/api/apiClient";
import { days, errorMessage } from "../utils/hrStatus";

/**
 * Apply for leave: the type (with what is left of it), the dates, half day for a single date, and a reason.
 * `employees` (HR only) lets the form apply on someone else's behalf.
 */
export default function ApplyLeaveDialog({ balances, employees = null, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ employee_id: "", leave_type_id: balances[0]?.leave_type_id ? String(balances[0].leave_type_id) : "", from_date: today, to_date: today, half_day: false, reason: "" });
  const [saving, setSaving] = useState(false);
  const type = balances.find((b) => String(b.leave_type_id) === form.leave_type_id);
  const set = (key) => (e) => setForm((prev) => {
    const next = { ...prev, [key]: e.target.value };
    if (key === "from_date" && (next.to_date < next.from_date || prev.half_day)) next.to_date = next.from_date;
    return next;
  });

  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.post("/leave-applications", {
        employee_id: form.employee_id ? Number(form.employee_id) : undefined, leave_type_id: Number(form.leave_type_id),
        from_date: form.from_date, to_date: form.half_day ? form.from_date : form.to_date, half_day: form.half_day, reason: form.reason || undefined,
      });
      toast.success(res.data?.message || "Leave applied");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not apply for leave"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Apply for leave</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {employees && (
            <TextField select size="small" label="Employee" value={form.employee_id} onChange={set("employee_id")} helperText="Leave empty to apply for yourself.">
              <MenuItem value="">Myself</MenuItem>
              {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.name}{e.code ? ` (${e.code})` : ""}</MenuItem>)}
            </TextField>
          )}
          <TextField select size="small" label="Leave type" value={form.leave_type_id} onChange={set("leave_type_id")}
            helperText={type && !type.is_paid ? "Unpaid: no balance needed" : type && !form.employee_id && type.available != null ? `${days(type.available)} day(s) available` : " "}>
            {balances.map((b) => <MenuItem key={b.leave_type_id} value={String(b.leave_type_id)}>{b.name} ({b.code})</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" size="small" label="From" value={form.from_date} onChange={set("from_date")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField type="date" size="small" label="To" value={form.half_day ? form.from_date : form.to_date} onChange={set("to_date")} disabled={form.half_day}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.from_date } }} fullWidth />
          </Stack>
          {type?.allow_half_day !== false && (
            <FormControlLabel control={<Checkbox size="small" checked={form.half_day} onChange={(e) => setForm((prev) => ({ ...prev, half_day: e.target.checked, to_date: prev.from_date }))} />} label="Half day" />
          )}
          <TextField size="small" label="Reason" value={form.reason} onChange={set("reason")} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !form.leave_type_id || !form.from_date} onClick={submit}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
}
