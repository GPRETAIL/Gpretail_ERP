import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import { Check, RefreshCw, X } from "lucide-react";
import api from "../../api/axios";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import FilterableDataTable from "../../components/FilterableDataTable";
import PageSkeleton from "../../components/PageSkeleton";
import SearchGridPanel from "../../components/SearchGridPanel";
import useSearchGrid from "../../hooks/useSearchGrid";
import { APPROVAL_REASONS } from "../../utils/approvals";

const ROLE_LABELS = { cashier: "Cashier", sales: "Sales", store_user: "Store User", supervisor: "Supervisor", manager: "Manager" };
const STATUS_COLORS = { pending: "warning", approved: "success", used: "success", rejected: "error", cancelled: "default" };
const APPROVER_ROLES = ["supervisor", "manager", "admin", "super_admin"];
const POLL_MS = 10000;

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (value) => (value ? new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "-");
const describe = (row) => (row.action === "pos_discount"
  ? `Discount ${row.requested_percent}%${row.approved_percent != null && row.approved_percent !== row.requested_percent ? ` (approved ${row.approved_percent}%)` : ""}`
  : `Refund ₹${money(row.amount)}${row.payload?.without_receipt ? " · no receipt" : ""}`);

function Inbox() {
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(null); // { row, approve }
  const [percent, setPercent] = useState("");
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: status });
  const { page, limit, setPage, setLimit } = grid;
  const [note, setNote] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/approvals/inbox", { params: { status } });
      setRows(res.data?.data || []);
    } catch (err) {
      if (!silent) toast.error(err?.response?.data?.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    // The loading flag is raised where the status changes (initial state / filter click).
    void load(true);
    if (status !== "pending") return undefined;
    // Cashiers are waiting at the counter, so pending requests refresh on their own.
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load, status]);

  const columns = useMemo(() => [
    { key: "id", label: "#", valueGetter: (row) => row.id },
    { key: "created_at", label: "Requested", valueGetter: (row) => row.created_at || "", render: (value) => when(value), searchValue: (row) => when(row.created_at) },
    { key: "requested_by", label: "By", valueGetter: (row) => `${row.requested_by?.name || "-"}${row.channel === "pin" ? " (PIN)" : ""}` },
    {
      key: "request", label: "Request", valueGetter: (row) => describe(row),
      render: (value, row) => (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{value}</Typography>
          {(row.payload?.lines || []).slice(0, 3).map((line) => (
            <Typography key={line.index} sx={{ fontSize: 11, color: "text.secondary" }}>{line.product}: ₹{money(line.reference_price)} → ₹{money(line.unit_price)}</Typography>
          ))}
        </Box>
      ),
    },
    { key: "reason", label: "Reason", valueGetter: (row) => `${APPROVAL_REASONS[row.reason_code] || row.reason_code || "-"}${row.note ? ` · ${row.note}` : ""}` },
    {
      key: "status", label: "Status", valueGetter: (row) => (row.status === "used" ? "completed" : row.status),
      render: (value, row) => <Chip size="small" color={STATUS_COLORS[row.status] || "default"} label={value} />,
    },
    { key: "decided_by", label: "Decided by", valueGetter: (row) => `${row.decided_by?.name || "-"}${row.decision_note ? ` · ${row.decision_note}` : ""}` },
  ], []);

  const openDecision = (row, approve) => {
    setDeciding({ row, approve });
    setPercent(row.action === "pos_discount" ? String(row.requested_percent ?? "") : "");
    setNote("");
  };

  const decide = async () => {
    const { row, approve } = deciding;
    try {
      await api.post(`/approvals/requests/${row.id}/${approve ? "approve" : "reject"}`, {
        note: note.trim() || undefined,
        ...(approve && row.action === "pos_discount" && percent !== "" ? { approved_percent: Number(percent) } : {}),
      });
      toast.success(approve ? "Approved. The counter continues automatically." : "Request rejected.");
      setDeciding(null);
      void load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the decision");
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        {["pending", "approved", "used", "rejected", "all"].map((value) => (
          <Button key={value} size="small" variant={status === value ? "contained" : "outlined"} color={status === value ? "primary" : "inherit"}
            onClick={() => { if (value !== status) setLoading(true); setStatus(value); setPage(1); }} sx={{ borderRadius: 999, textTransform: "capitalize", minWidth: 0, px: 1.5 }}>
            {value === "used" ? "Completed" : value}
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => load()}>Refresh</Button>
      </Stack>
      <SearchGridPanel>
      <FilterableDataTable
        rows={grid.rows}
        columns={columns}
        loading={loading}
        loadingText="Loading approvals..."
        emptyText={status === "pending" ? "No requests are waiting for approval." : "No requests."}
        searchPlaceholder="Search approvals..."
        tablePreferenceKey="sales.approvals.inbox"
        exportFileName="approval_requests"
        paginationMode="client"
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(value) => { setLimit(value); setPage(1); }}
        renderActions={(row) => (row.status !== "pending" ? null : row.can_decide ? (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" color="success" startIcon={<Check size={14} />} onClick={() => openDecision(row, true)}>Approve</Button>
            <Button size="small" color="error" startIcon={<X size={14} />} onClick={() => openDecision(row, false)}>Reject</Button>
          </Stack>
        ) : <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Above your limit</Typography>)}
        actionsLabel="Decision"
      />
      </SearchGridPanel>

      <Dialog open={Boolean(deciding)} onClose={() => setDeciding(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{deciding?.approve ? "Approve request" : "Reject request"} #{deciding?.row.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2">{deciding && describe(deciding.row)} · requested by {deciding?.row.requested_by?.name}</Typography>
            {deciding?.approve && deciding.row.action === "pos_discount" && (
              <TextField size="small" type="number" label="Approve up to (%)" value={percent} onChange={(e) => setPercent(e.target.value)}
                helperText="Lower it to make a counter-offer." inputProps={{ min: 0, max: deciding.row.requested_percent, step: 0.5 }} />
            )}
            <TextField size="small" label={deciding?.approve ? "Note (optional)" : "Reason for rejecting"} value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 500 }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeciding(null)}>Cancel</Button>
          <Button variant="contained" color={deciding?.approve ? "success" : "error"} onClick={decide}>{deciding?.approve ? "Approve" : "Reject"}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function Limits() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/approvals/limits")
      .then((res) => setData(res.data?.data))
      .catch((err) => setLoadError(err?.response?.status === 422
        // Limits belong to one store; "All Stores" has no single store to edit.
        ? "Limits are set per store. Choose a store with the store switcher in the footer, then open this tab again."
        : err?.response?.data?.message || "Failed to load limits"));
  }, []);

  if (loadError) return <Alert severity="info">{loadError}</Alert>;
  if (!data) return <PageSkeleton variant="form" rows={6} />;

  const update = (role, field, value) => setData((prev) => ({ ...prev, limits: prev.limits.map((row) => (row.role === role ? { ...row, [field]: value } : row)) }));
  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/approvals/limits", { enabled: data.enabled, limits: data.limits.map((row) => ({
        ...row,
        max_discount_percent: row.max_discount_percent === "" ? null : row.max_discount_percent,
        max_refund_amount: row.max_refund_amount === "" ? null : row.max_refund_amount,
      })) });
      setData(res.data?.data);
      toast.success(data.enabled ? "Approval limits saved." : "Approvals switched off for this store.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save limits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ maxWidth: 820 }}>
      <FormControlLabel control={<Switch checked={Boolean(data.enabled)} onChange={(e) => setData((prev) => ({ ...prev, enabled: e.target.checked }))} />}
        label="Require approval when a discount or refund exceeds the user's limit" />
      <Alert severity="info">
        Admins are never limited. Supervisors and managers approve requests up to their own limit. Leave a field empty for no limit.
      </Alert>
      <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 1, opacity: data.enabled ? 1 : 0.6 }}>
        <Table size="small" aria-label="Approval limits">
          <TableHead>
            <TableRow><TableCell>Role</TableCell><TableCell>Max discount without approval (%)</TableCell><TableCell>Max refund without approval (₹)</TableCell><TableCell>Refund without bill</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {data.limits.map((row) => (
              <TableRow key={row.role}>
                <TableCell sx={{ fontWeight: 600 }}>{ROLE_LABELS[row.role] || row.role}</TableCell>
                <TableCell><TextField size="small" type="number" disabled={!data.enabled} value={row.max_discount_percent ?? ""} onChange={(e) => update(row.role, "max_discount_percent", e.target.value)} inputProps={{ min: 0, max: 100, step: 0.5, "aria-label": `${row.role} discount limit` }} sx={{ width: 120 }} /></TableCell>
                <TableCell><TextField size="small" type="number" disabled={!data.enabled} value={row.max_refund_amount ?? ""} onChange={(e) => update(row.role, "max_refund_amount", e.target.value)} inputProps={{ min: 0, step: 100, "aria-label": `${row.role} refund limit` }} sx={{ width: 140 }} /></TableCell>
                <TableCell><Switch size="small" disabled={!data.enabled} checked={Boolean(row.allow_no_receipt_refund)} onChange={(e) => update(row.role, "allow_no_receipt_refund", e.target.checked)} inputProps={{ "aria-label": `${row.role} may refund without bill` }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save limits"}</Button>
        <Button color="inherit" disabled={!data.enabled} onClick={() => setData((prev) => ({ ...prev, limits: prev.limits.map((row) => ({ role: row.role, ...prev.recommended[row.role] })) }))}>Use recommended</Button>
      </Stack>
    </Stack>
  );
}

function MyPin() {
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.put("/approvals/pin", { pin, currentPassword: password });
      toast.success("Approval PIN saved. Use it to approve at a counter.");
      setPin(""); setPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save PIN");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Stack spacing={1.5} sx={{ maxWidth: 360 }}>
      <Typography variant="body2" color="text.secondary">Cashiers ask you to type your username and this PIN on their screen to approve a discount or refund. Keep it private.</Typography>
      <TextField size="small" label="New PIN (4–8 digits)" type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} inputProps={{ inputMode: "numeric", maxLength: 8, autoComplete: "new-password" }} />
      <TextField size="small" label="Your current password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      <Button variant="contained" onClick={save} disabled={saving || pin.length < 4 || !password}>{saving ? "Saving…" : "Save PIN"}</Button>
    </Stack>
  );
}

export default function Approvals() {
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.user?.role);
  const isAdmin = ["admin", "super_admin"].includes(role);
  const canApprove = APPROVER_ROLES.includes(role);
  const [tab, setTab] = useState(canApprove ? "inbox" : "limits");

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <PageHeader onBack={() => navigate("/sales")} title={<Breadcrumbs items={[{ label: "Sales", onClick: () => navigate("/sales") }, { label: "Discount & Refund Approvals" }]} />} />
      <Box sx={{ px: 2, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          {canApprove && <Tab value="inbox" label="Approval inbox" />}
          {isAdmin && <Tab value="limits" label="Limits" />}
          {canApprove && <Tab value="pin" label="My approval PIN" />}
        </Tabs>
      </Box>
      <Box sx={{ p: 2, flex: 1, overflow: "auto" }}>
        {!canApprove && !isAdmin && <Alert severity="info">Only supervisors, managers and administrators manage approvals.</Alert>}
        {tab === "inbox" && canApprove && <Inbox />}
        {tab === "limits" && isAdmin && <Limits />}
        {tab === "pin" && canApprove && <MyPin />}
      </Box>
    </Box>
  );
}
