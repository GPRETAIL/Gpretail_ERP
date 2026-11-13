import { useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { Cloud, Loader2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { TYPE } from "@/shared/theme/typeScale";
import { muiFieldSx } from "@/shared/theme/formControlSizes";

const cardSx = { borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1 };
const DEFAULT_CLOUD = "https://dev.gpsoftware.in";

const when = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const HANDSHAKE = {
  ready: { label: "Up to date with the cloud", color: "success.main" },
  catching_up: { label: "Catching up with the cloud", color: "warning.main" },
  cloud_unreachable: { label: "Cloud not reachable from this server", color: "error.main" },
};

const Fact = ({ label, children }) => (
  <Box>
    <Box sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>{label}</Box>
    <Box sx={{ mt: 0.5, fontWeight: 500, color: "text.primary", wordBreak: "break-all" }}>{children}</Box>
  </Box>
);

/**
 * On the on-prem server's own page: connect it to the cloud once (a cloud admin signs in; the password is not
 * kept), then see that it stays in step. After that, counters open the counter address and move to the cloud by
 * themselves when this server is down.
 */
export default function OnPremConnectionCard({ config, onConnected }) {
  const connected = Boolean(config?.enabled && config?.cloud_server_url);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ counter_url: "", cloud_server_url: "", username: "", password: "" });
  const handshake = HANDSHAKE[config?.handshake?.state];

  const openDialog = () => {
    setForm({
      counter_url: config?.counter_url || window.location.origin,
      cloud_server_url: config?.cloud_server_url || DEFAULT_CLOUD,
      username: "",
      password: "",
    });
    setOpen(true);
  };
  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const connect = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post("/local-server-config/connect", form, { timeout: 600000 });
      toast.success(res.data?.message || "Connected to the cloud");
      setOpen(false);
      onConnected?.(res.data?.data || {});
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error((errors && Object.values(errors).flat()[0]) || err.response?.data?.message || "Could not connect to the cloud");
    } finally {
      setForm((prev) => ({ ...prev, password: "" }));
      setSaving(false);
    }
  };

  return (
    <Box component="section" sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { md: "flex-start" } }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>This on-prem server and the cloud</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary", maxWidth: 720 }}>
            Counters open the counter address below. When this server is down they keep billing on the cloud at the same
            address, and come back once both sides are up to date. Staff accounts come from the cloud.
          </Typography>
        </Box>
        <Button type="button" variant={connected ? "outlined" : "contained"} color={connected ? "inherit" : "primary"} startIcon={<Cloud size={16} />} onClick={openDialog}>
          {connected ? "Reconnect to cloud" : "Connect to cloud"}
        </Button>
      </Stack>

      <Box sx={{ mt: 2, display: "grid", gap: 1.5, gridTemplateColumns: { md: "repeat(3, 1fr)" }, fontSize: 12.25 }}>
        <Fact label="Cloud">{connected ? config.cloud_server_url : "Not connected"}</Fact>
        <Fact label="Counter address">{config?.counter_url || "Not set"}</Fact>
        <Fact label="Sync">
          {handshake ? <Box component="span" sx={{ color: handshake.color }}>{handshake.label}</Box> : "Not running"}
        </Fact>
        <Fact label="Last sync">{when(config?.last_cycle_at)}</Fact>
        <Fact label="Staff accounts copied">{connected ? `${config?.users_synced ?? 0} · ${when(config?.last_users_sync_at)}` : "None"}</Fact>
        <Fact label="Waiting to sync">
          {config?.handshake ? `${config.handshake.local_backlog ?? 0} to the cloud · ${config.handshake.cloud_backlog ?? "?"} from the cloud` : "—"}
        </Fact>
      </Box>
      {connected && !config?.last_cycle_at && (
        <Typography role="status" sx={{ mt: 1.5, fontSize: 12, color: "warning.main" }}>
          The sync job has not run yet. Add the Windows Task Scheduler entry for schedule:run (every minute), as in the setup guide.
        </Typography>
      )}

      <Dialog open={open} onClose={() => { if (!saving) setOpen(false); }} maxWidth="sm" fullWidth aria-labelledby="connect-cloud-title">
        <Box component="form" onSubmit={connect}>
          <DialogTitle id="connect-cloud-title">Connect to cloud</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: 12.25, mb: 2 }}>
              Sign in with a cloud company administrator. The password is used once to connect and is not stored. The
              store&apos;s data and staff accounts are then copied here, which can take a few minutes.
            </DialogContentText>
            <Stack spacing={2}>
              <TextField size="small" label="Counter address" value={form.counter_url} onChange={set("counter_url")} required
                helperText="The address the billing PCs open, e.g. http://mainserver:5173" sx={muiFieldSx} />
              <TextField size="small" label="Cloud address" value={form.cloud_server_url} onChange={set("cloud_server_url")} required
                helperText="e.g. https://dev.gpsoftware.in" sx={muiFieldSx} />
              <TextField size="small" label="Cloud admin username or email" value={form.username} onChange={set("username")} required
                autoComplete="username" sx={muiFieldSx} />
              <TextField size="small" label="Cloud admin password" type="password" value={form.password} onChange={set("password")} required
                autoComplete="current-password" sx={muiFieldSx} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}
              startIcon={saving ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <Cloud size={16} />}>
              {saving ? "Connecting and copying..." : "Connect"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
