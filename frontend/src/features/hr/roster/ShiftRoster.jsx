import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, ListItemText, Menu, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, Copy, Users } from "lucide-react";
import api from "@/shared/api/apiClient";
import HrPage from "../components/HrPage";
import { HR_MANAGER_ROLES, errorMessage } from "../utils/hrStatus";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const shiftDate = (date, days) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + days); return d.toLocaleDateString("en-CA"); };
const dayLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });

/** Set many employees' shift (or day off) over a date range, optionally only on chosen weekdays. */
function BulkDialog({ data, onClose }) {
  const [form, setForm] = useState({ employee_ids: [], from: data.from, to: shiftDate(data.from, 6), choice: data.shifts[0] ? String(data.shifts[0].id) : "OFF", weekdays: [] });
  const [saving, setSaving] = useState(false);
  const toggleDay = (d) => setForm((f) => ({ ...f, weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d] }));
  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post("/shift-roster/bulk", {
        employee_ids: form.employee_ids, from: form.from, to: form.to, weekdays: form.weekdays.length ? form.weekdays : undefined,
        ...(form.choice === "OFF" ? { is_off: true } : form.choice === "CLEAR" ? { clear: true } : { working_hour_id: Number(form.choice) }),
      });
      toast.success(res.data?.message || "Roster updated");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the roster"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Assign shifts</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField select size="small" label="Employees" value={form.employee_ids} SelectProps={{ multiple: true, renderValue: (ids) => `${ids.length} selected` }}
            onChange={(e) => setForm({ ...form, employee_ids: e.target.value })}>
            {data.rows.map((r) => <MenuItem key={r.employee_id} value={r.employee_id}><Checkbox size="small" checked={form.employee_ids.includes(r.employee_id)} /><ListItemText primary={r.name} /></MenuItem>)}
          </TextField>
          <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => setForm({ ...form, employee_ids: data.rows.map((r) => r.employee_id) })}>Select everyone</Button>
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" size="small" label="From" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField type="date" size="small" label="To" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
          </Stack>
          <TextField select size="small" label="Shift" value={form.choice} onChange={(e) => setForm({ ...form, choice: e.target.value })}>
            {data.shifts.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}{s.from_time ? ` (${s.from_time}–${s.to_time})` : ""}</MenuItem>)}
            <MenuItem value="OFF">Day off</MenuItem>
            <MenuItem value="CLEAR">Back to their usual shift</MenuItem>
          </TextField>
          <Box>
            <Typography variant="caption" color="text.secondary">Only on (leave all unticked for every day):</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap" }}>
              {DAYS.map((name, i) => <FormControlLabel key={name} sx={{ mr: 1 }} label={name} control={<Checkbox size="small" checked={form.weekdays.includes(i)} onChange={() => toggleDay(i)} />} />)}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !form.employee_ids.length} onClick={save}>Assign</Button>
      </DialogActions>
    </Dialog>
  );
}

/** HRMS > Shift Roster: each employee's shift or day off for a week; it overrides their usual shift and weekly off. */
export default function ShiftRoster() {
  const canManage = HR_MANAGER_ROLES.includes(useSelector((state) => state.auth.user?.role));
  const [from, setFrom] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(null); // { anchor, employee_id, date }
  const [bulk, setBulk] = useState(false);

  const load = useCallback(async () => {
    try {
      setData((await api.get("/shift-roster", { params: { from } })).data?.data || null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load the roster"));
    }
  }, [from]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const setCell = async (body) => {
    const { employee_id: employeeId, date } = menu;
    setMenu(null);
    try {
      await api.put("/shift-roster/cell", { employee_id: employeeId, date, ...body });
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not change the roster"));
    }
  };
  const copyLastWeek = async () => {
    try {
      const res = await api.post("/shift-roster/copy-week", { from: data.from });
      toast.success(res.data?.message || "Copied");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not copy last week"));
    }
  };

  const cellSx = { px: 0.75, py: 0.5, fontSize: 12, borderRight: "1px solid", borderColor: "divider", textAlign: "center", minWidth: 96 };
  return (
    <HrPage title="Shift Roster" actions={canManage && data ? (
      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<Copy size={14} />} onClick={copyLastWeek}>Copy last week</Button>
        <Button size="small" variant="contained" startIcon={<Users size={14} />} onClick={() => setBulk(true)}>Assign shifts</Button>
      </Stack>
    ) : null}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <IconButton size="small" aria-label="Previous week" onClick={() => setFrom(shiftDate(data?.from || from, -7))}><ChevronLeft size={18} /></IconButton>
        <TextField type="date" size="small" label="Week of" value={data?.from || from} onChange={(e) => e.target.value && setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <IconButton size="small" aria-label="Next week" onClick={() => setFrom(shiftDate(data?.from || from, 7))}><ChevronRight size={18} /></IconButton>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Blank cells follow the employee's usual shift and weekly off. {canManage ? "Click a cell to change it." : ""}</Typography>
      </Stack>
      <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...cellSx, textAlign: "left", minWidth: 180 }}>Employee</TableCell>
                {(data?.dates || []).map((d) => <TableCell key={d} sx={cellSx}>{dayLabel(d)}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.rows || []).map((row) => (
                <TableRow key={row.employee_id} hover>
                  <TableCell sx={{ ...cellSx, textAlign: "left" }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{row.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.usual_shift || "Store default shift"}{row.week_off ? ` · off ${row.week_off}` : ""}</Typography>
                  </TableCell>
                  {data.dates.map((date) => {
                    const cell = row.days[date];
                    return (
                      <TableCell key={date} sx={{ ...cellSx, cursor: canManage ? "pointer" : "default", bgcolor: cell.rostered ? "action.hover" : undefined }}
                        onClick={canManage ? (e) => setMenu({ anchor: e.currentTarget, employee_id: row.employee_id, date }) : undefined}>
                        {cell.is_off ? <Chip size="small" label="Off" variant={cell.rostered ? "filled" : "outlined"} />
                          : cell.shift ? <Chip size="small" color="primary" variant="outlined" label={cell.shift} /> : <Typography variant="caption" color="text.disabled">Usual</Typography>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {data && !data.rows.length && <TableRow><TableCell colSpan={8} sx={{ textAlign: "center", py: 3 }}>No employees.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Menu open={Boolean(menu)} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        {(data?.shifts || []).map((s) => <MenuItem key={s.id} onClick={() => setCell({ working_hour_id: s.id })}>{s.name}{s.from_time ? ` (${s.from_time}–${s.to_time})` : ""}</MenuItem>)}
        <MenuItem onClick={() => setCell({ is_off: true })}>Day off</MenuItem>
        <MenuItem onClick={() => setCell({ clear: true })}>Usual shift</MenuItem>
      </Menu>
      {bulk && data && <BulkDialog data={data} onClose={(saved) => { setBulk(false); if (saved) void load(); }} />}
    </HrPage>
  );
}
