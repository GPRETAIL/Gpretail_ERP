import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField } from "@mui/material";
import { CalendarClock, Clock } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import HrPage from "../components/HrPage";
import { LEAVE_STATUS, REQUEST_STATUS_LABEL as STATUS_LABEL, errorMessage, requestSummary } from "../utils/hrStatus";

const today = () => new Date().toLocaleDateString("en-CA");

/** Ask to fix a day's attendance (a missed punch, or on duty outside) or to change the shift on some days. */
function RequestDialog({ type, shifts, onClose }) {
  const [form, setForm] = useState({ from_date: today(), to_date: today(), check_in: "", check_out: "", status: "", working_hour_id: shifts[0] ? String(shifts[0].id) : "", is_off: false, reason: "" });
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async () => {
    setSaving(true);
    try {
      const body = type === "ATTENDANCE"
        ? { type, from_date: form.from_date, check_in: form.check_in || undefined, check_out: form.check_out || undefined, status: form.status || undefined, reason: form.reason || undefined }
        : { type, from_date: form.from_date, to_date: form.to_date, ...(form.is_off ? { is_off: true } : { working_hour_id: Number(form.working_hour_id) }), reason: form.reason || undefined };
      const res = await api.post("/staff-requests", body);
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
      <DialogTitle sx={{ fontSize: 15 }}>{type === "ATTENDANCE" ? "Fix attendance" : "Change shift"}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {type === "ATTENDANCE" ? (
            <>
              <TextField type="date" size="small" label="Date" value={form.from_date} onChange={set("from_date")} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
              <Stack direction="row" spacing={1.5}>
                <TextField type="time" size="small" label="Check-in" value={form.check_in} onChange={set("check_in")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                <TextField type="time" size="small" label="Check-out" value={form.check_out} onChange={set("check_out")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              </Stack>
              <TextField select size="small" label="Or mark the day as" value={form.status} onChange={set("status")}>
                <MenuItem value="">-</MenuItem>
                {Object.entries(STATUS_LABEL).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
            </>
          ) : (
            <>
              <Stack direction="row" spacing={1.5}>
                <TextField type="date" size="small" label="From" value={form.from_date} onChange={set("from_date")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                <TextField type="date" size="small" label="To" value={form.to_date} onChange={set("to_date")} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.from_date } }} fullWidth />
              </Stack>
              <FormControlLabel control={<Checkbox size="small" checked={form.is_off} onChange={(e) => setForm({ ...form, is_off: e.target.checked })} />} label="Day off instead" />
              {!form.is_off && (
                <TextField select size="small" label="Shift" value={form.working_hour_id} onChange={set("working_hour_id")}>
                  {shifts.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                </TextField>
              )}
            </>
          )}
          <TextField size="small" label="Reason" value={form.reason} onChange={set("reason")} multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={submit}>Send for approval</Button>
      </DialogActions>
    </Dialog>
  );
}

const baseColumns = [
  { key: "type", label: "Request", valueGetter: (r) => (r.type === "ATTENDANCE" ? "Fix attendance" : "Change shift") },
  { key: "from_date", label: "From", valueGetter: (r) => r.from_date },
  { key: "to_date", label: "To", valueGetter: (r) => r.to_date },
  { key: "asked", label: "Asked for", valueGetter: (r) => requestSummary(r) },
  { key: "reason", label: "Reason", valueGetter: (r) => r.reason || "" },
  { key: "status", label: "Status", valueGetter: (r) => LEAVE_STATUS[r.status]?.label || r.status, render: (v, r) => <Chip size="small" color={LEAVE_STATUS[r.status]?.color || "default"} label={v} /> },
  { key: "decision_note", label: "Note", valueGetter: (r) => r.decision_note || "" },
];

/** HRMS > My Requests: fix a day's attendance or change a shift, sent to the reporting manager. */
export function MyRequests() {
  const [data, setData] = useState(null);
  const [asking, setAsking] = useState(null); // ATTENDANCE | SHIFT
  const load = useCallback(async () => {
    try {
      setData((await api.get("/staff-requests/mine")).data?.data || null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load your requests"));
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const withdraw = async (row) => {
    try {
      await api.post(`/staff-requests/${row.id}/cancel`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not withdraw"));
    }
  };
  const grid = useSearchGrid({ sourceRows: data?.requests || [], paginationMode: "client", scopeKey: "mine" });
  return (
    <HrPage title="My Requests" actions={data?.employee ? (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<Clock size={14} />} onClick={() => setAsking("ATTENDANCE")}>Fix attendance</Button>
        <Button size="small" variant="outlined" startIcon={<CalendarClock size={14} />} onClick={() => setAsking("SHIFT")}>Change shift</Button>
      </Stack>
    ) : null}>
      {data && !data.employee && <Alert severity="info" sx={{ mb: 1 }}>Your login is not linked to an employee yet. Ask HR to tick "Allow System" with your username on your employee record.</Alert>}
      <SearchGridPanel>
        <FilterableDataTable rows={grid.rows} columns={baseColumns} loading={!data} emptyText="No requests yet." searchPlaceholder="Search requests..."
          tablePreferenceKey="hr.requests.mine" exportFileName="my_requests" paginationMode="client" page={grid.page} limit={grid.limit}
          onPageChange={grid.setPage} onLimitChange={(v) => { grid.setLimit(v); grid.setPage(1); }}
          actionsLabel="Actions" renderActions={(row) => (row.status === "PENDING" ? <Button size="small" color="inherit" onClick={() => withdraw(row)}>Withdraw</Button> : null)} />
      </SearchGridPanel>
      {asking && <RequestDialog type={asking} shifts={data?.shifts || []} onClose={(saved) => { setAsking(null); if (saved) void load(); }} />}
    </HrPage>
  );
}

/** HRMS > Request Approvals: requests from the people who report to you (HR: everyone). */
export function RequestApprovals() {
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState(null);
  const [deciding, setDeciding] = useState(null); // { row, action }
  const [note, setNote] = useState("");
  const load = useCallback(async () => {
    try {
      setRows((await api.get("/staff-requests", { params: { status: status || undefined } })).data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load requests"));
    }
  }, [status]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const decide = async () => {
    try {
      const res = await api.post(`/staff-requests/${deciding.row.id}/${deciding.action}`, { note: note || undefined });
      toast.success(res.data?.message || "Done");
      setDeciding(null);
      setNote("");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the request"));
    }
  };
  const columns = useMemo(() => [{ key: "employee", label: "Employee", valueGetter: (r) => r.employee_name || "" }, ...baseColumns], []);
  const grid = useSearchGrid({ sourceRows: rows || [], paginationMode: "client", scopeKey: status });
  return (
    <HrPage title="Request Approvals">
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        {[["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["", "All"]].map(([value, label]) => (
          <Button key={label} size="small" variant={status === value ? "contained" : "outlined"} color={status === value ? "primary" : "inherit"}
            onClick={() => { setRows(null); setStatus(value); }} sx={{ borderRadius: 999, minWidth: 0, px: 1.5 }}>{label}</Button>
        ))}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable rows={grid.rows} columns={columns} loading={!rows} emptyText="Nothing waiting for your approval." searchPlaceholder="Search requests..."
          tablePreferenceKey="hr.requests.approvals" exportFileName="staff_requests" paginationMode="client" page={grid.page} limit={grid.limit}
          onPageChange={grid.setPage} onLimitChange={(v) => { grid.setLimit(v); grid.setPage(1); }}
          actionsLabel="Actions" renderActions={(row) => (row.status === "PENDING" ? (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" color="success" onClick={() => setDeciding({ row, action: "approve" })}>Approve</Button>
              <Button size="small" color="error" onClick={() => setDeciding({ row, action: "reject" })}>Reject</Button>
            </Stack>
          ) : null)} />
      </SearchGridPanel>
      {deciding && (
        <Dialog open onClose={() => setDeciding(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>{deciding.action === "approve" ? "Approve" : "Reject"} · {deciding.row.employee_name} · {requestSummary(deciding.row)}</DialogTitle>
          <DialogContent><TextField size="small" label="Note to the employee" value={note} onChange={(e) => setNote(e.target.value)} fullWidth sx={{ mt: 1 }} placeholder="Optional" /></DialogContent>
          <DialogActions>
            <Button onClick={() => setDeciding(null)}>Back</Button>
            <Button variant="contained" color={deciding.action === "approve" ? "success" : "error"} onClick={decide}>{deciding.action === "approve" ? "Approve" : "Reject"}</Button>
          </DialogActions>
        </Dialog>
      )}
    </HrPage>
  );
}
