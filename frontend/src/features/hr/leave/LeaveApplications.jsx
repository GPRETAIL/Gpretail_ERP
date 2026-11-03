import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { LEAVE_STATUS, days, errorMessage } from "../utils/hrStatus";

const FILTERS = [["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["CANCELLED", "Cancelled"], ["", "All"]];

/**
 * Leave applications to decide (inbox: pending ones from the people who report to you, or everyone for HR) or
 * every application with a status filter. Approve, reject with a note, or cancel an approved leave.
 */
export default function LeaveApplications({ inbox = false, year, onChanged }) {
  const [status, setStatus] = useState(inbox ? "PENDING" : "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(null); // { row, action }
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/leave-applications", { params: { status: status || undefined, inbox: inbox ? 1 : undefined, year: inbox ? undefined : year } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load leave applications"));
    } finally {
      setLoading(false);
    }
  }, [status, inbox, year]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const decide = async () => {
    const { row, action } = deciding;
    try {
      const res = await api.post(`/leave-applications/${row.id}/${action}`, { note: note || undefined });
      toast.success(res.data?.message || "Done");
      setDeciding(null);
      setNote("");
      setLoading(true);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the leave"));
    }
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${status}:${year}` });
  const columns = useMemo(() => [
    { key: "employee_name", label: "Employee", valueGetter: (row) => row.employee_name || "" },
    { key: "leave_type", label: "Leave", valueGetter: (row) => row.leave_type_name || row.leave_type_code || "" },
    { key: "from_date", label: "From", valueGetter: (row) => row.from_date },
    { key: "to_date", label: "To", valueGetter: (row) => row.to_date },
    { key: "days", label: "Days", valueGetter: (row) => row.days, render: (value, row) => `${days(value)}${row.half_day ? " (half)" : ""}` },
    { key: "reason", label: "Reason", valueGetter: (row) => row.reason || "" },
    { key: "status", label: "Status", valueGetter: (row) => LEAVE_STATUS[row.status]?.label || row.status, render: (value, row) => <Chip size="small" color={LEAVE_STATUS[row.status]?.color || "default"} label={value} /> },
    { key: "decision_note", label: "Note", valueGetter: (row) => row.decision_note || "" },
  ], []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      {!inbox && (
        <Stack direction="row" spacing={1}>
          {FILTERS.map(([value, label]) => (
            <Button key={label} size="small" variant={status === value ? "contained" : "outlined"} color={status === value ? "primary" : "inherit"}
              onClick={() => { setLoading(true); setStatus(value); }} sx={{ borderRadius: 999, minWidth: 0, px: 1.5 }}>{label}</Button>
          ))}
        </Stack>
      )}
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText={inbox ? "Nothing waiting for your approval." : "No leave applications."}
          searchPlaceholder="Search applications..."
          tablePreferenceKey={inbox ? "hr.leave.inbox" : "hr.leave.applications"}
          exportFileName="leave_applications"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel="Actions"
          renderActions={(row) => (
            <Stack direction="row" spacing={0.5}>
              {row.status === "PENDING" && <Button size="small" color="success" onClick={() => setDeciding({ row, action: "approve" })}>Approve</Button>}
              {row.status === "PENDING" && <Button size="small" color="error" onClick={() => setDeciding({ row, action: "reject" })}>Reject</Button>}
              {row.status === "APPROVED" && <Button size="small" color="inherit" onClick={() => setDeciding({ row, action: "cancel" })}>Cancel leave</Button>}
            </Stack>
          )}
        />
      </SearchGridPanel>
      {deciding && (
        <Dialog open onClose={() => setDeciding(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>
            {{ approve: "Approve", reject: "Reject", cancel: "Cancel" }[deciding.action]} leave · {deciding.row.employee_name} · {days(deciding.row.days)} day(s)
          </DialogTitle>
          <DialogContent>
            {deciding.action === "cancel"
              ? <Box sx={{ fontSize: 13, pt: 1 }}>The {days(deciding.row.days)} day(s) go back to the balance and those days return to normal attendance.</Box>
              : <TextField size="small" label="Note to the employee" value={note} onChange={(e) => setNote(e.target.value)} fullWidth sx={{ mt: 1 }} placeholder="Optional" />}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeciding(null)}>Back</Button>
            <Button variant="contained" color={deciding.action === "approve" ? "success" : "error"} onClick={decide}>
              {{ approve: "Approve", reject: "Reject", cancel: "Cancel leave" }[deciding.action]}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
