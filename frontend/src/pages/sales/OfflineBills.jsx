import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import api from "../../api/axios";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchGridPanel from "../../components/SearchGridPanel";
import useSearchGrid from "../../hooks/useSearchGrid";

const money = value => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = value => (value ? new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");

/**
 * Sales > Offline Bills: bills a till saved without internet that the server accepted as-is
 * (stock already short, a piece sold elsewhere meanwhile, a discount above the limit, a renumbered
 * bill). A manager checks each one and signs it off.
 */
export default function OfflineBills() {
  const navigate = useNavigate();
  const storeId = useSelector(state => state.auth.user?.store_id);
  // Signing off is a manager's call (the server enforces it too); supervisors can look.
  const canEdit = ["manager", "admin", "super_admin"].includes(useSelector(state => state.auth.user?.role));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("open");
  const [signing, setSigning] = useState(null);
  const [note, setNote] = useState("");
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${storeId || ""}:${status}` });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    try {
      const res = await api.get("/pos-sales/offline/review", { params: status === "all" ? { status: "all" } : {} });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load offline bills");
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    // Deferred a tick: a synchronous setState in an effect body cascades a render (set-state-in-effect).
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const signOff = async () => {
    try {
      const res = await api.post(`/pos-sales/offline/review/${signing.id}`, { note: note.trim() || null });
      toast.success(res.data?.message || "Marked as checked");
      setSigning(null);
      setNote("");
      setLoading(true);
      void load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not mark the bill as checked");
    }
  };

  const columns = useMemo(() => [
    { key: "bill_no", label: "Bill no", valueGetter: row => row.bill_no },
    { key: "billed_at", label: "Billed (offline)", valueGetter: row => when(row.billed_at) },
    { key: "counter_name", label: "Counter", valueGetter: row => row.counter_name || "-" },
    { key: "cashier", label: "Cashier", valueGetter: row => row.cashier || "-" },
    { key: "grand_total", label: "Amount", valueGetter: row => row.grand_total, render: value => money(value) },
    {
      key: "issues", label: "To check", valueGetter: row => (row.issues || []).map(issue => issue.message).join(" "),
      render: (_value, row) => <Stack spacing={0.25}>{(row.issues || []).map((issue, index) => <Typography key={index} sx={{ fontSize: 12 }}>• {issue.message}</Typography>)}</Stack>,
    },
    {
      key: "status", label: "Status", valueGetter: row => (row.reviewed_at ? "Checked" : "To check"),
      render: (_value, row) => row.reviewed_at
        ? <Box><Chip size="small" color="success" label="Checked" />{row.review_note ? <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{row.review_note}</Typography> : null}</Box>
        : canEdit ? <Button size="small" variant="outlined" onClick={() => setSigning(row)}>Mark checked</Button> : <Chip size="small" color="warning" label="To check" />,
    },
  ], [canEdit]);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/sales")} title={<Breadcrumbs items={[{ label: "Sales", onClick: () => navigate("/sales") }, { label: "Offline Bills" }]} />}
        actions={<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ToggleButtonGroup size="small" exclusive value={status} onChange={(_event, value) => { if (value) { setStatus(value); setLoading(true); } }}>
            <ToggleButton value="open">To check</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
          <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => { setLoading(true); void load(); }}>Refresh</Button>
        </Stack>} />
      <Alert severity="info">Bills saved on a till while it had no internet keep their printed number. These synced with something the server had to accept as-is; check the stock or the bill, then mark it checked.</Alert>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Loading offline bills..."
          emptyText={status === "open" ? "No offline bills to check." : "No offline bills with points to check."}
          searchPlaceholder="Search bills..."
          tablePreferenceKey="sales.offline-bills"
          exportFileName="offline_bills"
          paginationMode="client"
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={value => { setLimit(value); setPage(1); }}
        />
      </SearchGridPanel>
      <Dialog open={Boolean(signing)} onClose={() => setSigning(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark bill {signing?.bill_no} as checked</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {(signing?.issues || []).map((issue, index) => <Typography key={index} variant="body2">• {issue.message}</Typography>)}
            <TextField label="What you found or did (optional)" value={note} onChange={event => setNote(event.target.value)} multiline minRows={2}
              slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSigning(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void signOff()}>Mark checked</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
