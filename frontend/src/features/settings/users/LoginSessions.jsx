import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LogOut, RefreshCw, UserX } from "lucide-react";
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import PageHeader from "@/shared/components/PageHeader";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import InfoHint from "@/shared/components/InfoHint";

const CLIENTS = { web: "Web", mobile: "Mobile app", staff: "Staff app (HR)", failover: "Counter (cloud failover)" };
const when = (value) => (value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-");

/** User Access > Login Sessions: the tenant admin sees who is signed in across their stores and ends a session. */
export default function LoginSessions() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // { kind: "one" | "user", row }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/login-sessions");
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load login sessions");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const end = async () => {
    const { kind, row } = confirm;
    setConfirm(null);
    try {
      const res = await api.delete(kind === "user" ? `/login-sessions/user/${row.user_id}` : `/login-sessions/${row.id}`);
      toast.success(res.data?.message || "Session ended");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not end the session");
    }
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client" });
  const columns = useMemo(() => [
    { key: "user_name", label: "User", valueGetter: (row) => row.user_name },
    { key: "username", label: "Username", valueGetter: (row) => row.username || "" },
    { key: "role", label: "Role", valueGetter: (row) => row.role || "" },
    { key: "store_name", label: "Store", valueGetter: (row) => row.store_name || "" },
    { key: "client", label: "Signed in with", valueGetter: (row) => CLIENTS[row.client] || row.client },
    { key: "device", label: "Device", valueGetter: (row) => row.device || "-" },
    { key: "ip_address", label: "IP address", valueGetter: (row) => row.ip_address || "-" },
    { key: "signed_in_at", label: "Signed in", valueGetter: (row) => row.signed_in_at || "", render: (value) => when(value) },
    {
      key: "last_active_at", label: "Last active", valueGetter: (row) => row.last_active_at || "",
      render: (value, row) => (row.active_now ? <Chip size="small" color="success" label="Active now" /> : when(value)),
    },
    { key: "expires_at", label: "Expires", valueGetter: (row) => row.expires_at || "", render: (value) => when(value) },
    {
      key: "actions", label: "", sortable: false, filterable: false, valueGetter: () => "",
      render: (_value, row) => (row.is_current ? <Chip size="small" variant="outlined" label="This session" /> : (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="End this session">
            <IconButton size="small" color="error" aria-label={`End session of ${row.user_name}`} onClick={() => setConfirm({ kind: "one", row })}>
              <LogOut size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={`End all of ${row.user_name}'s sessions`}>
            <IconButton size="small" aria-label={`End all sessions of ${row.user_name}`} onClick={() => setConfirm({ kind: "user", row })}>
              <UserX size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      )),
    },
  ], []);

  const activeNow = rows.filter((row) => row.active_now).length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flex: 1, minHeight: 0, p: { xs: 1.5, md: 2 } }}>
      <PageHeader
        onBack={() => navigate("/user-access")}
        title={<Breadcrumbs items={[{ label: "User Access", onClick: () => navigate("/user-access") }, { label: "Login Sessions" }]} />}
        actions={(
          <Button size="small" variant="outlined" startIcon={<RefreshCw size={14} />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        )}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
        <Chip label={`${rows.length} signed in`} />
        <Chip color="success" variant="outlined" label={`${activeNow} active now`} />
        <InfoHint label="About ending a session">Ending a session signs that device out on its next action. Sessions are per server: on-prem and cloud each list their own.</InfoHint>
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Loading sessions..."
          emptyText="Nobody is signed in."
          searchPlaceholder="Search user, store, device..."
          tablePreferenceKey="user-access.login-sessions"
          exportFileName="login_sessions"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
        />
      </SearchGridPanel>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "user" ? "End all sessions?" : "End this session?"}
        message={confirm?.kind === "user"
          ? `${confirm?.row.user_name} will be signed out on every device.`
          : `${confirm?.row.user_name} will be signed out of ${CLIENTS[confirm?.row.client] || "this app"} on ${confirm?.row.device}.`}
        confirmLabel="End session"
        onConfirm={end}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  );
}
