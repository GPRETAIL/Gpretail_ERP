import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";

const STATUS = { OPEN: ["Open", "warning"], IN_PROGRESS: ["In progress", "info"], CLOSED: ["Closed", "default"] };
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

/** HR > Helpdesk: the questions staff raise from the HRMS app. Reply, and close a ticket when it is answered. */
export default function Helpdesk({ canManage }) {
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // the ticket being read
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/helpdesk-tickets", { params: { status } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load the helpdesk"));
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const openTicket = async (row) => {
    try {
      setOpen((await api.get(`/helpdesk-tickets/${row.id}`)).data?.data);
      setReply("");
    } catch (err) {
      toast.error(errorMessage(err, "Could not open the ticket"));
    }
  };
  const send = async () => {
    setBusy(true);
    try {
      setOpen((await api.post(`/helpdesk-tickets/${open.id}/reply`, { body: reply })).data?.data);
      setReply("");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not send the reply"));
    } finally {
      setBusy(false);
    }
  };
  const setTicketStatus = async (next) => {
    try {
      setOpen((await api.put(`/helpdesk-tickets/${open.id}/status`, { status: next })).data?.data);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not change the status"));
    }
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: status });
  const columns = useMemo(() => [
    { key: "last_reply_at", label: "Updated", valueGetter: (row) => when(row.last_reply_at || row.created_at) },
    { key: "employee", label: "Employee", valueGetter: (row) => `${row.employee || ""}${row.code ? ` (${row.code})` : ""}` },
    { key: "category_label", label: "About", valueGetter: (row) => row.category_label },
    { key: "subject", label: "Question", valueGetter: (row) => row.subject },
    { key: "status", label: "Status", valueGetter: (row) => STATUS[row.status]?.[0] || row.status, render: (value, row) => <Chip size="small" color={STATUS[row.status]?.[1] || "default"} label={value} /> },
  ], []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1}>
        <TextField select size="small" label="Show" value={status} onChange={(e) => { setLoading(true); setStatus(e.target.value); }} sx={{ width: 170 }}>
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="IN_PROGRESS">In progress</MenuItem>
          <MenuItem value="CLOSED">Closed</MenuItem>
        </TextField>
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText="No questions from staff."
          searchPlaceholder="Search the helpdesk..."
          tablePreferenceKey="hr.helpdesk"
          exportFileName="helpdesk"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel="Actions"
          renderActions={(row) => <Button size="small" onClick={() => void openTicket(row)}>Open</Button>}
        />
      </SearchGridPanel>
      {open && (
        <Dialog open onClose={() => setOpen(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>{open.subject}</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>{open.employee} · {open.category_label} · {when(open.created_at)}</Typography>
            <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "action.hover", whiteSpace: "pre-wrap", fontSize: 14, mb: 1.5 }}>{open.message}</Box>
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {open.replies.map((item) => (
                <Box key={item.id} sx={{ p: 1.25, borderRadius: 1, border: 1, borderColor: "divider", bgcolor: item.from === "HR" ? "action.selected" : "transparent", whiteSpace: "pre-wrap", fontSize: 14 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary" }}>{item.from === "HR" ? "HR" : open.employee} · {when(item.at)}</Typography>
                  {item.body}
                </Box>
              ))}
            </Stack>
            {canManage && open.status !== "CLOSED" && <TextField multiline minRows={3} fullWidth size="small" label="Your reply" value={reply} onChange={(e) => setReply(e.target.value)} slotProps={{ htmlInput: { maxLength: 3000 } }} />}
          </DialogContent>
          <DialogActions>
            {canManage && open.status !== "CLOSED" && <Button color="inherit" onClick={() => void setTicketStatus("CLOSED")}>Close ticket</Button>}
            {canManage && open.status === "CLOSED" && <Button onClick={() => void setTicketStatus("OPEN")}>Open again</Button>}
            <Button onClick={() => setOpen(null)}>Close window</Button>
            {canManage && open.status !== "CLOSED" && <Button variant="contained" disabled={busy || !reply.trim()} onClick={() => void send()}>{busy ? "Sending" : "Send reply"}</Button>}
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
