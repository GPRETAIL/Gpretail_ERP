import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { LogIn, LogOut, PencilLine, RefreshCw } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { ATTENDANCE_STATUS, MARKABLE_STATUSES, clockTime, duration, errorMessage, statusLabel } from "../utils/hrStatus";

const SUMMARY = [
  ["", "All", "total"], ["PRESENT", "Present", "present"], ["LATE", "Late", "late"], ["HALF_DAY", "Half day", "half_day"],
  ["ABSENT", "Absent", "absent"], ["LEAVE", "On leave", "leave"], ["OFF", "Off", "off"], ["NOT_MARKED", "Not marked", "not_marked"],
];

const matches = (row, filter) => {
  if (!filter) return true;
  if (filter === "LATE") return row.late_minutes > 0;
  if (filter === "OFF") return row.status === "HOLIDAY" || row.status === "WEEK_OFF";
  if (filter === "PRESENT") return row.status === "PRESENT" || row.status === "HALF_DAY";
  return row.status === filter;
};

/** Mark a status by hand for the chosen employees (or hand the day back to their punches). */
function MarkDialog({ count, date, onClose, onSave }) {
  const [status, setStatus] = useState("PRESENT");
  const [remarks, setRemarks] = useState("");
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Mark attendance · {count} employee{count === 1 ? "" : "s"} · {date}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {MARKABLE_STATUSES.map((value) => <MenuItem key={value} value={value}>{statusLabel(value)}</MenuItem>)}
            <MenuItem value="AUTO">Back to check-in/out times</MenuItem>
          </TextField>
          <TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={status === "AUTO"} placeholder="Optional" />
          <Typography variant="caption" color="text.secondary">A marked day stays as set; staff check-ins don't change it until you choose "Back to check-in/out times".</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(status, remarks)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Employee In/Out > Today: everyone's status for a date, with punches and marking for managers. */
export default function TodayBoard({ date, onDateChange, canManage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [marking, setMarking] = useState(null); // employee ids
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/attendance/today", { params: { date: date || undefined } });
      setData(res.data?.data || null);
      if (!date && res.data?.data?.date) onDateChange(res.data.data.date);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load attendance"));
    } finally {
      setLoading(false);
    }
  }, [date, onDateChange]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const rows = useMemo(() => (data?.rows || []).filter((row) => matches(row, filter)), [data, filter]);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${date}:${filter}` });
  const isToday = Boolean(data?.today) && data.today === date; // Punches are for now; other dates are marked.

  const run = async (request, success) => {
    setBusy(true);
    try {
      const res = await request();
      toast.success(res.data?.message || success);
      setSelected([]);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update attendance"));
    } finally {
      setBusy(false);
    }
  };
  const punch = (ids, type) => run(() => api.post("/attendance/punch", { employee_ids: ids, type, date }), "Recorded");
  const mark = (ids, status, remarks) => run(() => api.post("/attendance/mark", { employee_ids: ids, date, status, remarks: remarks || undefined }), "Updated");

  const columns = useMemo(() => [
    { key: "code", label: "Code", valueGetter: (row) => row.code },
    { key: "name", label: "Employee", valueGetter: (row) => row.name },
    { key: "department", label: "Department", valueGetter: (row) => row.department || "" },
    {
      key: "status", label: "Status", valueGetter: (row) => statusLabel(row.status),
      render: (value, row) => <Chip size="small" variant={row.status === "NOT_MARKED" ? "outlined" : "filled"} color={ATTENDANCE_STATUS[row.status]?.color || "default"} label={value} />,
    },
    { key: "check_in", label: "In", valueGetter: (row) => row.check_in || "", render: (value) => clockTime(value) },
    { key: "check_out", label: "Out", valueGetter: (row) => row.check_out || "", render: (value) => clockTime(value) },
    { key: "late_minutes", label: "Late", valueGetter: (row) => row.late_minutes, render: (value) => (value > 0 ? <Box component="span" sx={{ color: "warning.main", fontWeight: 600 }}>{duration(value)}</Box> : "") },
    { key: "worked_minutes", label: "Worked", valueGetter: (row) => row.worked_minutes, render: (value) => duration(value) },
    { key: "ot_minutes", label: "OT", valueGetter: (row) => row.ot_minutes || 0, render: (value, row) => (value > 0 ? `${duration(value)}${row.ot_status === "PENDING" ? " (to approve)" : row.ot_status === "REJECTED" ? " (rejected)" : ""}` : "") },
    { key: "source", label: "Set by", valueGetter: (row) => (row.source === "MANUAL" ? "Marked" : row.source ? "Check-in" : "") },
    { key: "remarks", label: "Remarks", valueGetter: (row) => row.remarks || "" },
  ], []);

  const summary = data?.summary || {};
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <TextField type="date" size="small" label="Date" value={date || ""} onChange={(e) => { setLoading(true); onDateChange(e.target.value); }}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
        {SUMMARY.map(([value, label, key]) => (
          <Button key={label} size="small" variant={filter === value ? "contained" : "outlined"} color={filter === value ? "primary" : "inherit"}
            onClick={() => setFilter(value)} sx={{ borderRadius: 999, minWidth: 0, px: 1.25 }}>
            {label} <Box component="span" sx={{ ml: 0.75, fontWeight: 700 }}>{summary[key] ?? 0}</Box>
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => { setLoading(true); void load(); }}>Refresh</Button>
      </Stack>
      {canManage && selected.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 1, py: 0.5, borderRadius: 1, bgcolor: "action.selected" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.length} selected</Typography>
          {isToday && <Button size="small" startIcon={<LogIn size={14} />} disabled={busy} onClick={() => punch(selected, "IN")}>Check in now</Button>}
          {isToday && <Button size="small" startIcon={<LogOut size={14} />} disabled={busy} onClick={() => punch(selected, "OUT")}>Check out now</Button>}
          <Button size="small" startIcon={<PencilLine size={14} />} disabled={busy} onClick={() => setMarking(selected)}>Mark…</Button>
          <Button size="small" color="inherit" onClick={() => setSelected([])}>Clear</Button>
        </Stack>
      )}
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Loading attendance..."
          emptyText="No employees. Add employees in HRMS > Employee."
          searchPlaceholder="Search employees..."
          tablePreferenceKey="hr.attendance.today"
          exportFileName={`attendance_${date || "today"}`}
          rowKey="employee_id"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          {...(canManage ? { selectedRows: selected, onSelectionChange: setSelected } : {})}
          actionsLabel={canManage ? "Actions" : undefined}
          renderActions={canManage ? (row) => (
            <Stack direction="row" spacing={0.5}>
              {isToday && !row.check_in && <Button size="small" disabled={busy} onClick={() => punch([row.employee_id], "IN")}>In</Button>}
              {isToday && row.check_in && <Button size="small" disabled={busy} onClick={() => punch([row.employee_id], "OUT")}>Out</Button>}
              <Button size="small" disabled={busy} onClick={() => setMarking([row.employee_id])}>Mark</Button>
            </Stack>
          ) : undefined}
        />
      </SearchGridPanel>
      {marking && <MarkDialog count={marking.length} date={date} onClose={() => setMarking(null)} onSave={(status, remarks) => { const ids = marking; setMarking(null); void mark(ids, status, remarks); }} />}
    </Box>
  );
}
