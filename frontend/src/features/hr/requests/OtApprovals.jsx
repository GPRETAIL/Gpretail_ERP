import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import HrPage from "../components/HrPage";
import { clockTime, duration, errorMessage } from "../utils/hrStatus";

const OT_STATUS = { PENDING: ["Pending", "warning"], APPROVED: ["Approved", "success"], REJECTED: ["Rejected", "error"], NONE: ["No approval needed", "default"] };

/** HRMS > OT Approvals: overtime by day; payroll pays only approved overtime (unless the store switched approval off). */
export default function OtApprovals() {
  const [month, setMonth] = useState(new Date().toLocaleDateString("en-CA").slice(0, 7));
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState([]);
  const [adjusting, setAdjusting] = useState(null); // { row, hours }

  const load = useCallback(async () => {
    try {
      setRows((await api.get("/overtime", { params: { month, status: status || undefined } })).data?.data || []);
      setSelected([]);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load overtime"));
    }
  }, [month, status]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const decide = async (ids, action, minutes) => {
    try {
      const res = await api.post("/overtime/decide", { ids, action, ...(minutes !== undefined ? { minutes } : {}) });
      toast.success(res.data?.message || "Done");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update overtime"));
    }
  };

  const grid = useSearchGrid({ sourceRows: rows || [], paginationMode: "client", scopeKey: `${month}:${status}` });
  const columns = useMemo(() => [
    { key: "date", label: "Date", valueGetter: (r) => r.date },
    { key: "name", label: "Employee", valueGetter: (r) => r.name || "" },
    { key: "times", label: "In / Out", valueGetter: (r) => `${clockTime(r.check_in)} – ${clockTime(r.check_out)}` },
    { key: "worked", label: "Worked", valueGetter: (r) => r.worked_minutes, render: (v) => duration(v) },
    { key: "ot", label: "Overtime", valueGetter: (r) => r.ot_minutes, render: (v) => <b>{duration(v)}</b> },
    { key: "approved", label: "Approved", valueGetter: (r) => r.ot_approved_minutes ?? "", render: (v, r) => (r.ot_status === "APPROVED" ? duration(v) : "") },
    { key: "status", label: "Status", valueGetter: (r) => OT_STATUS[r.ot_status]?.[0], render: (v, r) => <Chip size="small" color={OT_STATUS[r.ot_status]?.[1]} label={v} /> },
  ], []);

  return (
    <HrPage title="OT Approvals">
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1, mb: 1 }}>
        <TextField type="month" size="small" label="Month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        {[["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["", "All"]].map(([value, label]) => (
          <Button key={label} size="small" variant={status === value ? "contained" : "outlined"} color={status === value ? "primary" : "inherit"}
            onClick={() => setStatus(value)} sx={{ borderRadius: 999, minWidth: 0, px: 1.5 }}>{label}</Button>
        ))}
        <Box sx={{ flex: 1 }} />
        {selected.length > 0 && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.length} selected</Typography>
            <Button size="small" color="success" variant="contained" onClick={() => decide(selected, "approve")}>Approve</Button>
            <Button size="small" color="error" onClick={() => decide(selected, "reject")}>Reject</Button>
          </>
        )}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable rows={grid.rows} columns={columns} loading={!rows} emptyText="No overtime for this month." searchPlaceholder="Search overtime..."
          tablePreferenceKey="hr.overtime" exportFileName={`overtime_${month}`} rowKey="id" paginationMode="client" page={grid.page} limit={grid.limit}
          onPageChange={grid.setPage} onLimitChange={(v) => { grid.setLimit(v); grid.setPage(1); }} selectedRows={selected} onSelectionChange={setSelected}
          actionsLabel="Actions" renderActions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" color="success" onClick={() => decide([row.id], "approve")}>Approve</Button>
              <Button size="small" onClick={() => setAdjusting({ row, hours: (row.ot_minutes / 60).toFixed(2) })}>Part</Button>
              <Button size="small" color="error" onClick={() => decide([row.id], "reject")}>Reject</Button>
            </Stack>
          )} />
      </SearchGridPanel>
      {adjusting && (
        <Dialog open onClose={() => setAdjusting(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>Approve part of {adjusting.row.name}'s overtime on {adjusting.row.date}</DialogTitle>
          <DialogContent>
            <TextField type="number" size="small" label={`Hours to approve (of ${duration(adjusting.row.ot_minutes)})`} value={adjusting.hours}
              onChange={(e) => setAdjusting({ ...adjusting, hours: e.target.value })} fullWidth sx={{ mt: 1 }} slotProps={{ htmlInput: { step: 0.25, min: 0 } }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdjusting(null)}>Cancel</Button>
            <Button variant="contained" color="success" onClick={() => { const { row, hours } = adjusting; setAdjusting(null); void decide([row.id], "approve", Math.round(Number(hours) * 60)); }}>Approve</Button>
          </DialogActions>
        </Dialog>
      )}
    </HrPage>
  );
}
