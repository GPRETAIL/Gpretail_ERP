import { useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack,
  Switch, TextField, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import api from "@/shared/api/apiClient";
import { addRecipient, DAYS, describeFrequency, FORMAT_LABELS, isEmail, recipientLabel, ROLE_LABELS, schedulePayload } from "../utils/scheduler";

const errorText = (err) => {
  const data = err?.response?.data || {};
  return (data.errors && Object.values(data.errors).flat()[0]) || data.message || "Could not save the schedule.";
};

/** New / edit schedule: which report, for which period, when, in what format, and to whom. */
export default function ScheduleDialog({ initial, options, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [adding, setAdding] = useState({ type: "user", value: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reports = useMemo(() => (options.reports || []).filter((r) => r.allowed), [options.reports]);
  const report = reports.find((r) => r.key === form.report_key) || null;
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const addCurrent = () => {
    const value = String(adding.value || "").trim();
    if (!value || (adding.type === "email" && !isEmail(value))) return;
    set({ recipients: addRecipient(form.recipients, { type: adding.type, value }) });
    setAdding((current) => ({ ...current, value: "" }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = schedulePayload(form);
      const res = form.id ? await api.put(`/report-schedules/${form.id}`, body) : await api.post("/report-schedules", body);
      onSaved(res.data?.message, res.data?.data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const ready = form.name.trim() && form.report_key && form.formats.length && form.recipients.length;
  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form.id ? "Edit schedule" : "New schedule"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField size="small" label="Schedule name" required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Owner's morning summary" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Autocomplete sx={{ flex: 2 }} options={reports} groupBy={(r) => r.module} getOptionLabel={(r) => r.label} value={report}
              isOptionEqualToValue={(a, b) => a.key === b.key}
              onChange={(_, next) => set({ report_key: next?.key || "", layout: next?.layouts?.[0]?.value || "", name: form.name || next?.label || "" })}
              renderInput={(params) => <TextField {...params} size="small" label="Report" required />} />
            {report?.layouts?.length ? (
              <TextField sx={{ flex: 1 }} select size="small" label="Group by" value={form.layout || report.layouts[0].value} onChange={(e) => set({ layout: e.target.value })}>
                {report.layouts.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </TextField>
            ) : null}
            <TextField sx={{ flex: 1 }} select size="small" label="Period" value={form.period} onChange={(e) => set({ period: e.target.value })}>
              {(options.periods || []).map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
            <TextField select size="small" label="Send" value={form.frequency} onChange={(e) => set({ frequency: e.target.value })} sx={{ minWidth: 140 }}>
              <MenuItem value="daily">Daily</MenuItem><MenuItem value="weekly">Weekly</MenuItem><MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
            {form.frequency === "weekly" ? (
              <TextField select size="small" label="On" value={form.day_of_week} onChange={(e) => set({ day_of_week: e.target.value })} sx={{ minWidth: 150 }}>
                {DAYS.map((d, i) => <MenuItem key={d} value={i + 1}>{d}</MenuItem>)}
              </TextField>
            ) : null}
            {form.frequency === "monthly" ? (
              <TextField select size="small" label="On day" value={form.day_of_month} onChange={(e) => set({ day_of_month: e.target.value })} sx={{ minWidth: 120 }}
                helperText={Number(form.day_of_month) > 28 ? "Short months: on their last day" : " "}>
                {Array.from({ length: 31 }, (_, i) => <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>)}
              </TextField>
            ) : null}
            <TextField size="small" type="time" label="At" value={form.send_time} onChange={(e) => set({ send_time: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 130 }} />
            <Typography variant="body2" color="text.secondary">{describeFrequency(form)}</Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Attach</Typography>
            {Object.entries(FORMAT_LABELS).map(([value, label]) => (
              <FormControlLabel key={value} label={label} control={<Checkbox size="small" checked={form.formats.includes(value)}
                onChange={(e) => set({ formats: e.target.checked ? [...form.formats, value] : form.formats.filter((f) => f !== value) })} />} />
            ))}
          </Stack>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Send to</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
              <TextField select size="small" value={adding.type} onChange={(e) => setAdding({ type: e.target.value, value: "" })} sx={{ minWidth: 130 }} slotProps={{ htmlInput: { "aria-label": "Recipient type" } }}>
                <MenuItem value="user">User</MenuItem><MenuItem value="role">Role</MenuItem><MenuItem value="group">Group</MenuItem><MenuItem value="email">Email address</MenuItem>
              </TextField>
              {adding.type === "user" ? (
                <Autocomplete sx={{ flex: 1 }} options={options.users || []} getOptionLabel={(u) => `${u.name} (${u.email})`}
                  value={(options.users || []).find((u) => String(u.id) === String(adding.value)) || null}
                  onChange={(_, u) => setAdding({ type: "user", value: u ? String(u.id) : "" })}
                  renderInput={(params) => <TextField {...params} size="small" placeholder="Choose a user" />} />
              ) : adding.type === "role" ? (
                <TextField select sx={{ flex: 1 }} size="small" value={adding.value} onChange={(e) => setAdding({ type: "role", value: e.target.value })} slotProps={{ htmlInput: { "aria-label": "Role" } }}>
                  {(options.roles || []).map((r) => <MenuItem key={r} value={r}>All {ROLE_LABELS[r] || r}</MenuItem>)}
                </TextField>
              ) : adding.type === "group" ? (
                <TextField select sx={{ flex: 1 }} size="small" value={adding.value} onChange={(e) => setAdding({ type: "group", value: e.target.value })}
                  helperText={(options.groups || []).length ? " " : "Create groups on the Recipient Groups tab"} slotProps={{ htmlInput: { "aria-label": "Group" } }}>
                  {(options.groups || []).map((g) => <MenuItem key={g.id} value={String(g.id)}>{g.name}</MenuItem>)}
                </TextField>
              ) : (
                <TextField sx={{ flex: 1 }} size="small" placeholder="name@example.com" value={adding.value} onChange={(e) => setAdding({ type: "email", value: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCurrent(); } }} slotProps={{ htmlInput: { "aria-label": "Email address", "data-enter-ignore": "true" } }}
                  error={Boolean(adding.value) && !isEmail(adding.value)} />
              )}
              <Button variant="outlined" startIcon={<Plus size={14} />} onClick={addCurrent} disabled={!adding.value || (adding.type === "email" && !isEmail(adding.value))}>Add</Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mt: 1.25 }}>
              {form.recipients.map((r) => (
                <Chip key={`${r.type}:${r.value}`} size="small" label={recipientLabel(r, options)} variant={r.type === "email" ? "outlined" : "filled"}
                  onDelete={() => set({ recipients: form.recipients.filter((x) => !(x.type === r.type && x.value === r.value)) })} />
              ))}
              {!form.recipients.length ? <Typography variant="caption" color="text.secondary">No one yet. A user only receives reports they are allowed to open.</Typography> : null}
            </Stack>
          </Box>

          <TextField size="small" label="Email subject (optional)" value={form.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Default: report name, period and store" />
          <TextField size="small" label="Message (optional)" multiline minRows={2} value={form.message} onChange={(e) => set({ message: e.target.value })} />
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            <FormControlLabel control={<Switch checked={form.skip_empty} onChange={(e) => set({ skip_empty: e.target.checked })} />} label="Don't send when the report is empty" />
            <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />} label="Active" />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!ready || saving}>{saving ? "Saving..." : "Save schedule"}</Button>
      </DialogActions>
    </Dialog>
  );
}
