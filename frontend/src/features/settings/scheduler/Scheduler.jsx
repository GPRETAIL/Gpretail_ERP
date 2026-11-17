import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Menu, MenuItem,
  Paper, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { Download, Pencil, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import { StatusChip } from "@/shared/theme/StatusChip";
import ScheduleDialog from "./components/ScheduleDialog";
import { describeFrequency, emptySchedule, FORMAT_LABELS, isEmail, recipientLabel, scheduleToForm, STATUS_TONES } from "./utils/scheduler";

const errorText = (err, fallback) => {
  const data = err?.response?.data || {};
  return (data.errors && Object.values(data.errors).flat()[0]) || data.message || fallback;
};

function Schedules({ options, onChanged }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);
  const [menu, setMenu] = useState(null); // { anchor, row }

  const load = useCallback(async () => {
    try {
      const res = await api.get("/report-schedules");
      setRows(res.data?.data || []);
    } catch (err) {
      setRows([]);
      toast.error(errorText(err, "Could not load the schedules."));
    }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const act = async (row, fn, done) => {
    setBusy(row.id);
    try {
      const res = await fn();
      if (done) toast.success(typeof done === "function" ? done(res) : done);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "That did not work."));
    } finally {
      setBusy(null);
    }
  };

  const download = async (row, format) => {
    setMenu(null);
    setBusy(row.id);
    try {
      const res = await api.get(`/report-schedules/${row.id}/preview`, { params: { format }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.report_label}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Could not build the report.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Each schedule emails one report, as Excel and/or PDF, at its time (India time). People only receive reports they may open.</Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setEditing(emptySchedule())}>New schedule</Button>
      </Stack>
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Schedule</TableCell><TableCell>Report</TableCell><TableCell>When</TableCell><TableCell>Send to</TableCell>
              <TableCell>Next</TableCell><TableCell>Last</TableCell><TableCell>Active</TableCell><TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {(rows || []).map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell>{row.report_label}<Typography variant="caption" color="text.secondary" component="div">{row.period_label} · {row.formats.map((f) => FORMAT_LABELS[f]).join(" + ")}</Typography></TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{describeFrequency(row)}</TableCell>
                <TableCell sx={{ maxWidth: 260 }}>{row.recipients.map((r) => recipientLabel(r, options)).join(", ")}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{row.is_active ? row.next_run_at : "-"}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{row.last_status ? <StatusChip label={row.last_status} tone={STATUS_TONES[row.last_status] || "slate"} /> : "-"}</TableCell>
                <TableCell>
                  <Switch size="small" checked={row.is_active} disabled={busy === row.id} slotProps={{ input: { "aria-label": `Active ${row.name}` } }}
                    onChange={(e) => act(row, () => api.patch(`/report-schedules/${row.id}/active`, { is_active: e.target.checked }))} />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  {busy === row.id ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  <Tooltip title="Send now"><IconButton size="small" aria-label={`Send ${row.name} now`} disabled={busy === row.id} onClick={(e) => setMenu({ anchor: e.currentTarget, row })}><Send size={15} /></IconButton></Tooltip>
                  <Tooltip title="Download"><IconButton size="small" aria-label={`Download ${row.name}`} disabled={busy === row.id} onClick={(e) => setMenu({ anchor: e.currentTarget, row, download: true })}><Download size={15} /></IconButton></Tooltip>
                  <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => setEditing(scheduleToForm(row))}><Pencil size={15} /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" aria-label={`Delete ${row.name}`} onClick={() => window.confirm(`Delete "${row.name}"?`) && act(row, () => api.delete(`/report-schedules/${row.id}`), "Schedule deleted.")}><Trash2 size={15} /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows === null ? <Box sx={{ p: 2 }}><CircularProgress size={18} /></Box> : null}
        {rows && !rows.length ? <Box sx={{ p: 2 }}><Typography variant="body2">No schedules yet. Try a Daily Business Summary to the owner every morning at 9.</Typography></Box> : null}
      </Paper>
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu?.download ? [
          <MenuItem key="xlsx" onClick={() => download(menu.row, "xlsx")}>Excel (as it would go now)</MenuItem>,
          <MenuItem key="pdf" onClick={() => download(menu.row, "pdf")}>PDF (as it would go now)</MenuItem>,
        ] : [
          <MenuItem key="me" onClick={() => { const row = menu.row; setMenu(null); act(row, () => api.post(`/report-schedules/${row.id}/send-now`, { only_me: true }), (res) => res.data?.message); }}>Send to me only</MenuItem>,
          <MenuItem key="all" onClick={() => { const row = menu.row; setMenu(null); act(row, () => api.post(`/report-schedules/${row.id}/send-now`), (res) => res.data?.message); }}>Send to everyone now</MenuItem>,
        ]}
      </Menu>
      {editing ? <ScheduleDialog initial={editing} options={options} onClose={() => setEditing(null)}
        onSaved={(message) => { toast.success(message || "Saved."); setEditing(null); void load(); }} /> : null}
    </Stack>
  );
}

function Groups({ options, onChanged }) {
  const [groups, setGroups] = useState(null);
  const [form, setForm] = useState(null); // { id?, name, description, users: [], emails: [], email }

  const load = useCallback(async () => {
    try {
      const res = await api.get("/report-schedules/groups");
      setGroups(res.data?.data || []);
    } catch {
      setGroups([]);
    }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const save = async () => {
    const body = { name: form.name, description: form.description || null, user_ids: form.users.map((u) => u.id), emails: form.emails };
    try {
      await (form.id ? api.put(`/report-schedules/groups/${form.id}`, body) : api.post("/report-schedules/groups", body));
      toast.success("Group saved.");
      setForm(null);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Could not save the group."));
    }
  };

  const remove = async (group) => {
    if (!window.confirm(`Delete group "${group.name}"?`)) return;
    try {
      await api.delete(`/report-schedules/groups/${group.id}`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Could not delete the group."));
    }
  };

  const addEmail = () => {
    if (!isEmail(form.email)) return;
    setForm((f) => ({ ...f, emails: [...new Set([...f.emails, f.email.trim().toLowerCase()])], email: "" }));
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Named lists like "Owners" or "Accounts team": add users and outside addresses (auditor, partner), then send schedules to the group.</Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setForm({ name: "", description: "", users: [], emails: [], email: "" })}>New group</Button>
      </Stack>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead><TableRow><TableCell>Group</TableCell><TableCell>Members</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {(groups || []).map((g) => (
              <TableRow key={g.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{g.name}<Typography variant="caption" color="text.secondary" component="div">{g.description}</Typography></TableCell>
                <TableCell>{g.members.map((m) => m.name || m.email).join(", ") || "-"}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton size="small" aria-label={`Edit group ${g.name}`} onClick={() => setForm({ id: g.id, name: g.name, description: g.description || "", email: "",
                    users: g.members.filter((m) => m.user_id).map((m) => ({ id: m.user_id, name: m.name, email: m.user_email })), emails: g.members.filter((m) => !m.user_id).map((m) => m.email) })}><Pencil size={15} /></IconButton>
                  <IconButton size="small" aria-label={`Delete group ${g.name}`} onClick={() => remove(g)}><Trash2 size={15} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {groups && !groups.length ? <Box sx={{ p: 2 }}><Typography variant="body2">No groups yet.</Typography></Box> : null}
      </Paper>
      {form ? (
        <Dialog open onClose={() => setForm(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{form.id ? "Edit group" : "New group"}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <TextField size="small" label="Group name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <TextField size="small" label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <Autocomplete multiple options={options.users || []} value={form.users} isOptionEqualToValue={(a, b) => a.id === b.id}
                getOptionLabel={(u) => `${u.name}${u.email ? ` (${u.email})` : ""}`} onChange={(_, users) => setForm((f) => ({ ...f, users }))}
                renderInput={(params) => <TextField {...params} size="small" label="Users" />} />
              <Stack direction="row" spacing={1}>
                <TextField size="small" fullWidth label="Outside email address" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }} error={Boolean(form.email) && !isEmail(form.email)} slotProps={{ htmlInput: { "data-enter-ignore": "true" } }} />
                <Button variant="outlined" onClick={addEmail} disabled={!isEmail(form.email)}>Add</Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                {form.emails.map((email) => <Chip key={email} size="small" variant="outlined" label={email} onDelete={() => setForm((f) => ({ ...f, emails: f.emails.filter((x) => x !== email) }))} />)}
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setForm(null)}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!form.name.trim() || (!form.users.length && !form.emails.length)}>Save group</Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
}

function DeliveryLog() {
  const [runs, setRuns] = useState(null);
  const load = useCallback(async () => {
    try {
      const res = await api.get("/report-schedules/runs");
      setRuns(res.data?.data || []);
    } catch {
      setRuns([]);
    }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}><Button size="small" startIcon={<RefreshCw size={14} />} onClick={load}>Refresh</Button></Stack>
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>When</TableCell><TableCell>Schedule</TableCell><TableCell>Period</TableCell><TableCell>Status</TableCell><TableCell>Sent to</TableCell><TableCell>Notes</TableCell></TableRow></TableHead>
          <TableBody>
            {(runs || []).map((run) => (
              <TableRow key={run.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{run.at}{run.trigger === "manual" ? <Typography variant="caption" color="text.secondary" component="div">sent by hand</Typography> : null}</TableCell>
                <TableCell>{run.schedule}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{run.period_from === run.period_to ? run.period_from : `${run.period_from} to ${run.period_to}`}</TableCell>
                <TableCell><StatusChip label={run.status} tone={STATUS_TONES[run.status] || "slate"} /></TableCell>
                <TableCell sx={{ maxWidth: 260 }}>{run.recipients.join(", ") || "-"}</TableCell>
                <TableCell sx={{ maxWidth: 320, fontSize: 12, color: "text.secondary" }}>
                  {run.error || ""}
                  {run.skipped.length ? <div>Skipped: {run.skipped.map((s) => `${s.name || s.email} (${s.reason})`).join("; ")}</div> : null}
                  {run.rows ? <div>{run.rows} rows · {run.files.join(", ")}</div> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {runs && !runs.length ? <Box sx={{ p: 2 }}><Typography variant="body2">Nothing sent yet.</Typography></Box> : null}
      </Paper>
    </Stack>
  );
}

/** Settings > Scheduler: reports emailed on a schedule (Excel/PDF) to users, roles, groups and outside addresses. */
export default function Scheduler() {
  const [tab, setTab] = useState("schedules");
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");

  const loadOptions = useCallback(async () => {
    try {
      const res = await api.get("/report-schedules/options");
      setOptions(res.data?.data || {});
      setError("");
    } catch (err) {
      setError(errorText(err, "Could not load the scheduler."));
    }
  }, []);
  useEffect(() => { const t = setTimeout(loadOptions, 0); return () => clearTimeout(t); }, [loadOptions]);

  return (
    <Box component="section" sx={{ height: "100%", overflowY: "auto", p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <PageHeader title="Scheduler" />
      {error ? <Alert severity="warning">{error}</Alert> : null}
      {options && !options.email_ready ? (
        <Alert severity="warning">Email is not set up, so scheduled reports cannot go out yet. Add your mailbox's SMTP details in{" "}
          <Link component={RouterLink} to="/settings/messaging">Settings &gt; Messaging &gt; Email</Link>.</Alert>
      ) : null}
      <Tabs value={tab} onChange={(_, next) => setTab(next)} variant="scrollable" sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}>
        <Tab value="schedules" label="Schedules" />
        <Tab value="groups" label="Recipient Groups" />
        <Tab value="log" label="Delivery Log" />
      </Tabs>
      {!options && !error ? <CircularProgress size={20} /> : null}
      {options && tab === "schedules" ? <Schedules options={options} onChanged={loadOptions} /> : null}
      {options && tab === "groups" ? <Groups options={options} onChanged={loadOptions} /> : null}
      {options && tab === "log" ? <DeliveryLog /> : null}
    </Box>
  );
}
