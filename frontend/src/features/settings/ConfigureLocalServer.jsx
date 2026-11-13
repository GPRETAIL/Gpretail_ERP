import { serverUrlProblem } from "@/shared/api/serverUrlCheck";
import { TYPE } from "@/shared/theme/typeScale";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import { Fragment, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import { alpha } from "@mui/material/styles";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { fetchAndApplyRuntimeRoutingConfig } from "@/shared/api/runtimeRouting";
import { muiFieldSx } from "@/shared/theme/formControlSizes";
import OnPremConnectionCard from "./OnPremConnectionCard";

const cardSx = { borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1 };

const toStatusTone = (config = {}) => {
  if (config.connector_status === "online") {
    return { label: "Online", icon: CheckCircle2, token: "success" };
  }
  if (config.connector_last_seen_at) {
    return { label: "Seen, currently offline", icon: AlertCircle, token: "warning" };
  }
  return { label: "Not connected", icon: WifiOff, token: null };
};

const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const serverUrlError = (value, local = false) => serverUrlProblem(value, { local });

export default function ConfigureLocalServer() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingCloud, setTestingCloud] = useState(false);
  const [config, setConfig] = useState(null);
  const [localServerUrl, setLocalServerUrl] = useState("");
  const [cloudServerUrl, setCloudServerUrl] = useState("");
  const [nodes, setNodes] = useState([]);
  const [expandedStoreId, setExpandedStoreId] = useState(null);
  const draftLoaded = useRef(false);
  const draftDirty = useRef(false);
  const [retryingId, setRetryingId] = useState(null);
  const [retryingAllStoreId, setRetryingAllStoreId] = useState(null);

  const localUrlError = localServerUrl.trim() ? serverUrlError(localServerUrl, true) : "Enter the local server URL before saving.";
  const cloudUrlError = serverUrlError(cloudServerUrl);
  const unsavedUrls = localServerUrl.trim() !== String(config?.local_server_url || "").trim()
    || cloudServerUrl.trim() !== String(config?.cloud_server_url || "").trim();

  const fetchConfig = useCallback(async ({ signal } = {}) => {
    const res = await api.get("/local-server-config", { signal });
    return res.data?.data || {};
  }, []);
  const applyConfig = useCallback(next => {
    setConfig(next);
    if (!draftLoaded.current) {
      setLocalServerUrl(String(next.local_server_url || "").trim());
      setCloudServerUrl(String(next.cloud_server_url || "").trim());
      draftLoaded.current = true;
    }
  }, []);
  const fetchNodes = useCallback(async ({ signal } = {}) => {
    const res = await api.get("/sync/nodes", { signal });
    return res.data?.data?.nodes || [];
  }, []);
  const { reload: reloadConfig } = useAsyncQuery(fetchConfig, {
    onSuccess: next => { applyConfig(next); setLoading(false); setRefreshing(false); },
    onError: (err, { silent }) => { setLoading(false); setRefreshing(false); if (!silent) toast.error(err.response?.data?.message || "Failed to load local server configuration"); },
  });
  const { reload: loadNodes } = useAsyncQuery(fetchNodes, { onSuccess: setNodes });
  const loadConfig = () => {
    if (!draftDirty.current) draftLoaded.current = false;
    setRefreshing(true);
    reloadConfig();
  };
  const fetchOutbox = useCallback(async ({ signal }) => {
    const res = await api.get("/sync/outbox", { params: { store_id: expandedStoreId }, signal });
    return res.data?.data?.events || [];
  }, [expandedStoreId]);
  const { data: events, loading: outboxLoading, reload: reloadOutbox } = useAsyncQuery(fetchOutbox, { enabled: expandedStoreId != null });
  const outboxEvents = events || [];
  const loadOutboxEvents = storeId => { if (storeId === expandedStoreId) reloadOutbox({ silent: true }); };

  const toggleExpand = (storeId) => {
    if (expandedStoreId === storeId) {
      setExpandedStoreId(null);
      return;
    }
    setExpandedStoreId(storeId);
  };

  const handleRetryEvent = async (eventId, storeId) => {
    try {
      setRetryingId(eventId);
      await api.post(`/sync/outbox/${eventId}/retry`);
      toast.success("Event queued for retry");
      await Promise.all([loadOutboxEvents(storeId), loadNodes()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to retry event");
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async (storeId) => {
    try {
      setRetryingAllStoreId(storeId);
      const res = await api.post("/sync/outbox/retry-all", { store_id: storeId });
      toast.success(`${res.data?.data?.retried || 0} event(s) queued for retry`);
      await Promise.all([loadOutboxEvents(storeId), loadNodes()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to retry events");
    } finally {
      setRetryingAllStoreId(null);
    }
  };

  const pollConfiguration = useEffectEvent(() => {
    reloadConfig({ silent: true });
    loadNodes({ silent: true });
  });

  useEffect(() => {
    let alive = true;
    const timer = setInterval(() => {
      if (alive && document.visibilityState !== "hidden") {
        pollConfiguration();
      }
    }, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const handleSave = async (disable = false) => {
    if (saving || (!disable && (localUrlError || cloudUrlError))) return;
    try {
      setSaving(true);
      const payload = {
        local_server_url: disable ? "" : String(localServerUrl || "").trim(),
        cloud_server_url: disable ? "" : String(cloudServerUrl || "").trim(),
        ...(disable ? { disable_failover: true } : {}),
      };
      const res = await api.put("/local-server-config", payload);
      const saved = res.data?.data || {};
      setConfig((prev) => ({ ...(prev || {}), ...saved }));
      setDisableDialogOpen(false);
      setLocalServerUrl(String(saved.local_server_url ?? "").trim());
      setCloudServerUrl(String(saved.cloud_server_url ?? "").trim());
      draftLoaded.current = true;
      draftDirty.current = false;
      reloadConfig();
      loadNodes({ silent: true });
      void fetchAndApplyRuntimeRoutingConfig({ apiClient: api, token: localStorage.getItem("token") }).catch(() => {});
      toast.success(res.data?.message || "Local server configuration saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save local server configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await api.post("/local-server-config/test", {
        local_server_url: String(localServerUrl || "").trim(),
      });
      const message = res.data?.message || "Connection successful";
      if (res.data?.data?.status === "SETUP_REQUIRED") toast.info(message);
      else if (res.data?.success === false) toast.error(message);
      else toast.success(message);
      await loadConfig({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleTestCloud = async () => {
    try {
      setTestingCloud(true);
      const res = await api.post("/local-server-config/test-cloud", {
        cloud_server_url: String(cloudServerUrl || "").trim(),
      });
      const message = res.data?.message || "Connection successful";
      if (res.data?.success === false) toast.error(message);
      else toast.success(message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection test failed");
    } finally {
      setTestingCloud(false);
    }
  };

  if (loading) {
    return (
      <Stack role="status" aria-label="Loading local server configuration" aria-busy="true" spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
        <Box aria-hidden="true"><LoadingSkeleton width="240px" sx={{ height: 26 }} /><Box sx={{ mt: 1 }}><LoadingSkeleton width="70%" /></Box></Box>
        <Box aria-hidden="true" sx={{ ...cardSx, p: 2 }}><LoadingSkeleton width="140px" /><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mt: 2 }}>{[0, 1, 2].map(key => <LoadingSkeleton key={key} width="70%" sx={{ height: 32 }} />)}</Box></Box>
        <Box aria-hidden="true" sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", xl: "1.1fr 0.9fr" } }}>
          <Stack spacing={2} sx={{ ...cardSx, p: 2.5 }}><LoadingSkeleton width="180px" />{[0, 1].map(key => <Box key={key}><LoadingSkeleton width="120px" /><Box sx={{ mt: 1 }}><LoadingSkeleton width="100%" sx={{ height: 38 }} /></Box></Box>)}<LoadingSkeleton width="60%" sx={{ height: 36 }} /></Stack>
          <Box sx={{ ...cardSx, p: 2.5 }}><LoadingSkeleton width="150px" /><LoadingSkeleton variant="list" rows={3} /></Box>
        </Box>
      </Stack>
    );
  }

  const tone = toStatusTone(config || {});
  const StatusIcon = tone.icon;

  return (
    <Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { md: "flex-start" }, justifyContent: { md: "space-between" } }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 17.5, md: 21 }, fontWeight: 600, color: "text.primary" }}>
            Configure Local Server
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary" }}>
            Save this store's local server address so devices can use it when available and automatically fail over to the cloud if it goes down.
          </Typography>
        </Box>

        <Button
          type="button"
          onClick={() => loadConfig({ silent: true })}
          disabled={refreshing}
          variant="outlined"
          color="inherit"
          startIcon={refreshing ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <RefreshCw size={16} />}
          sx={{ fontSize: 12.25, whiteSpace: "nowrap" }}
        >
          Refresh Status
        </Button>
      </Stack>

      <Box
        sx={{
          borderRadius: "7px", border: "1px solid", px: 2, py: 1.5,
          ...(tone.token
            ? { borderColor: `${tone.token}.main`, bgcolor: (theme) => alpha(theme.palette[tone.token].main, theme.palette.mode === "dark" ? 0.16 : 0.08) }
            : { borderColor: "divider", bgcolor: "action.hover" }),
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 500, color: tone.token ? `${tone.token}.main` : "text.secondary" }}>
          <StatusIcon size={16} />
          <Box component="span">{tone.label}</Box>
        </Stack>
        <Box sx={{ mt: 1, display: "grid", gap: 1.5, gridTemplateColumns: { md: "repeat(4, 1fr)" }, fontSize: 12.25, color: "text.secondary" }}>
          <Box>
            <Box sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Tenant Key</Box>
            <Box sx={{ mt: 0.5, fontWeight: 500, wordBreak: "break-all", color: "text.primary" }}>{config?.tenant_key || "Not assigned"}</Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Connector Status</Box>
            <Box sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{config?.connector_status || "Not started"}</Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Last Seen</Box>
            <Box sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{formatDateTime(config?.connector_last_seen_at)}</Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Counter Address</Box>
            <Box sx={{ mt: 0.5, fontWeight: 500, wordBreak: "break-all", color: "text.primary" }}>{config?.counter_url || "Not set"}</Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xl: "1.1fr 0.9fr" } }}>
        {config?.node_role === "local" ? (
          <OnPremConnectionCard
            config={config}
            onConnected={(next) => {
              setConfig((prev) => ({ ...(prev || {}), ...next }));
              reloadConfig({ silent: true });
              void fetchAndApplyRuntimeRoutingConfig({ apiClient: api, token: localStorage.getItem("token") }).catch(() => {});
            }}
          />
        ) : (
        <Box component="section" sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>Local Server Address</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary" }}>
            This store's on-prem install runs the same application as the cloud. Enter the address other devices on this network use to reach it, then save.
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: TYPE.label, fontWeight: 500, color: "text.secondary", mb: 0.75 }}>
                Local Server URL
              </Typography>
              <TextField
                type="text"
                size="small"
                fullWidth
                value={localServerUrl}
                error={Boolean(localUrlError)}
                helperText={localUrlError || undefined}
                slotProps={{ htmlInput: { "aria-label": "Local Server URL" } }}
                onChange={(e) => { draftDirty.current = true; setLocalServerUrl(e.target.value); }}
                placeholder="http://192.168.1.25:8000"
                sx={muiFieldSx}
              />
              <Typography sx={{ mt: 0.5, fontSize: TYPE.small, color: "text.secondary" }}>
                The LAN address of this store's local server, e.g. http://192.168.1.25:8000. Required to save. Use Disable local failover to turn it off explicitly.
              </Typography>
            </Box>

            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: TYPE.label, fontWeight: 500, color: "text.secondary", mb: 0.75 }}>
                Cloud Server URL
              </Typography>
              <TextField
                type="text"
                size="small"
                fullWidth
                value={cloudServerUrl}
                error={Boolean(cloudUrlError)}
                helperText={cloudUrlError || undefined}
                slotProps={{ htmlInput: { "aria-label": "Cloud Server URL" } }}
                onChange={(e) => { draftDirty.current = true; setCloudServerUrl(e.target.value); }}
                placeholder={config?.effective_cloud_server_url || "https://yourcompany.gpsoftware.in"}
                sx={muiFieldSx}
              />
              <Typography sx={{ mt: 0.5, fontSize: TYPE.small, color: "text.secondary" }}>
                Where devices fail over to when the local server above is unreachable. Leave blank to use the
                platform default ({config?.effective_cloud_server_url || "not set"}).
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <Button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || Boolean(localUrlError || cloudUrlError)}
                variant="contained"
                color="success"
                startIcon={saving ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <Save size={16} />}
              >
                {saving ? "Saving..." : "Save URLs"}
              </Button>

              {config?.local_server_url && <Button type="button" color="warning" variant="outlined" disabled={saving || testing || testingCloud} onClick={() => setDisableDialogOpen(true)}>Disable local failover</Button>}

              <Button
                type="button"
                onClick={handleTest}
                disabled={testing || saving || unsavedUrls || !config?.local_server_url}
                variant="outlined"
                color="inherit"
                startIcon={testing ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <Wifi size={16} />}
              >
                Test Local
              </Button>

              <Button
                type="button"
                onClick={handleTestCloud}
                disabled={testingCloud || saving || unsavedUrls || !config?.tenant_key}
                variant="outlined"
                color="inherit"
                startIcon={testingCloud ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <Wifi size={16} />}
              >
                Test Cloud
              </Button>
            </Stack>
            {(unsavedUrls || !config?.tenant_key) && <Typography role="status" sx={{ fontSize: 12, color: "text.secondary" }}>Save the server URLs before testing. Use your ERP backend address, not a frontend page URL. Other devices need the server's LAN address rather than 127.0.0.1. The server administrator must approve the backend endpoint before connection testing.</Typography>}
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              To set up an on-prem server, open Configure Local Server on that server and choose Connect to cloud. It fills
              in this store's link here, and its heartbeat keeps the status above current.
            </Typography>
          </Stack>
        </Box>
        )}

        <Box component="section" sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>How It Works</Typography>
          <Stack spacing={2} sx={{ mt: 2, fontSize: 12.25, color: "text.secondary" }}>
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ display: "flex", flexShrink: 0, height: 21, width: 21, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "primary.main", fontSize: TYPE.small, fontWeight: 600, color: "primary.contrastText" }}>1</Box>
              <Box>On the on-prem server, choose Connect to cloud and sign in with a cloud administrator. The store&apos;s data and staff accounts are copied there, and a sync job keeps both sides about 15 seconds apart.</Box>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ display: "flex", flexShrink: 0, height: 21, width: 21, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "primary.main", fontSize: TYPE.small, fontWeight: 600, color: "primary.contrastText" }}>2</Box>
              <Box>Billing PCs open the on-prem counter address (for example http://mainserver:5173) and use the on-prem server while it answers.</Box>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ display: "flex", flexShrink: 0, height: 21, width: 21, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "primary.main", fontSize: TYPE.small, fontWeight: 600, color: "primary.contrastText" }}>3</Box>
              <Box>If it goes down, they switch to the cloud at the same address without signing out, showing Cloud (on-prem server down). When it is back, both sides sync first, then the counters return.</Box>
            </Stack>
          </Stack>

          <Box
            sx={{
              mt: 2.5, borderRadius: "5.25px", border: "1px solid", borderColor: "warning.main",
              bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
              p: 1.5, fontSize: 12.25, color: "warning.dark",
            }}
          >
            Documents created directly on the cloud during an outage (e.g. invoice numbers) are marked with a "C" so they're easy to identify once local is back.
          </Box>
        </Box>
      </Box>

      {nodes.length > 0 && (
        <Box component="section" sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>All Stores — Sync Health</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary" }}>
            Heartbeat status is separate from server reachability. Not connected means no heartbeat has arrived; Stale means an earlier heartbeat is overdue.
          </Typography>

          <Box sx={{ mt: 2, overflowX: "auto" }}>
            <Table size="small" sx={{ "& th, & td": { fontSize: 12.25 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 24, borderColor: "divider" }} />
                  <TableCell sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Store</TableCell>
                  <TableCell sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Status</TableCell>
                  <TableCell sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Last Heartbeat</TableCell>
                  <TableCell sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Last Catch-up</TableCell>
                  <TableCell sx={{ fontSize: TYPE.small, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Outbox</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nodes.map((node) => {
                  const nodeTone = !node.enabled
                    ? { label: "Disabled", token: null, Icon: WifiOff }
                    : !node.last_heartbeat_at
                      ? { label: "Not connected", token: "warning", Icon: WifiOff }
                      : node.is_stale
                    ? { label: "Stale", token: "warning", Icon: AlertCircle }
                    : node.local_healthy
                      ? { label: "Healthy", token: "success", Icon: CheckCircle2 }
                      : { label: "Offline", token: null, Icon: WifiOff };
                  const NodeIcon = nodeTone.Icon;
                  const hasBacklog = (node.outbox_pending || 0) > 0 || (node.outbox_failed || 0) > 0;
                  const isExpanded = expandedStoreId === node.store_id;

                  return (
                    <Fragment key={node.store_id}>
                      <TableRow
                        hover={hasBacklog}
                        sx={hasBacklog ? { cursor: "pointer" } : undefined}
                        onClick={hasBacklog ? () => toggleExpand(node.store_id) : undefined}
                      >
                        <TableCell sx={{ borderColor: "divider", color: "text.disabled" }}>
                          {hasBacklog ? (
                            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ borderColor: "divider", color: "text.primary" }}>
                          {node.store_name || `Store #${node.store_id}`}
                          {node.store_code ? (
                            <Box component="span" sx={{ ml: 0.5, fontSize: TYPE.small, color: "text.secondary" }}>({node.store_code})</Box>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ borderColor: "divider", fontWeight: 500, color: nodeTone.token ? `${nodeTone.token}.main` : "text.secondary" }}>
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                            <NodeIcon size={14} />
                            <Box component="span">{nodeTone.label}</Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>{formatDateTime(node.last_heartbeat_at)}</TableCell>
                        <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>{formatDateTime(node.last_catch_up_at)}</TableCell>
                        <TableCell sx={{ borderColor: "divider" }}>
                          {node.outbox_pending > 0 && (
                            <Box component="span" sx={{ mr: 1, color: "text.secondary" }}>{node.outbox_pending} pending</Box>
                          )}
                          {node.outbox_failed > 0 && (
                            <Box component="span" sx={{ fontWeight: 500, color: "error.main" }}>{node.outbox_failed} failed</Box>
                          )}
                          {!hasBacklog && <Box component="span" sx={{ color: "text.disabled" }}>Clear</Box>}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ bgcolor: "action.hover", px: 1.5, py: 1.5, borderColor: "divider" }}>
                            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                              <Typography component="h3" sx={{ fontSize: TYPE.small, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>
                                Queued writes for this store
                              </Typography>
                              {node.outbox_failed > 0 && (
                                <Button
                                  type="button"
                                  onClick={() => handleRetryAll(node.store_id)}
                                  disabled={retryingAllStoreId === node.store_id}
                                  variant="outlined"
                                  color="inherit"
                                  size="small"
                                  startIcon={retryingAllStoreId === node.store_id ? <Loader2 size={12} style={{ animation: "app-spin 1s linear infinite" }} /> : <RotateCcw size={12} />}
                                  sx={{ fontSize: TYPE.small }}
                                >
                                  Retry All Failed
                                </Button>
                              )}
                            </Stack>

                            {outboxLoading ? (
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontSize: TYPE.small, color: "text.secondary", py: 1 }}>
                                <Loader2 size={14} style={{ animation: "app-spin 1s linear infinite" }} />
                                <Box component="span">Loading...</Box>
                              </Stack>
                            ) : outboxEvents.length === 0 ? (
                              <Typography sx={{ fontSize: TYPE.small, color: "text.secondary", py: 1 }}>No queued events.</Typography>
                            ) : (
                              <Stack spacing={0.75}>
                                {outboxEvents.map((event) => (
                                  <Stack
                                    key={event.id}
                                    direction="row"
                                    sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: 1.25, py: 1, fontSize: TYPE.small }}
                                  >
                                    <Box sx={{ minWidth: 0 }}>
                                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                        <Box
                                          component="span"
                                          sx={{
                                            fontWeight: 500,
                                            color: event.status === "failed" ? "error.main" : event.status === "acked" ? "success.main" : "text.secondary",
                                          }}
                                        >
                                          {event.status}
                                        </Box>
                                        <Box component="span" sx={{ color: "text.secondary" }}>{event.method}</Box>
                                        <Box component="span" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.path}</Box>
                                        {event.attempts > 0 && (
                                          <Box component="span" sx={{ color: "text.disabled" }}>({event.attempts} attempt{event.attempts === 1 ? "" : "s"})</Box>
                                        )}
                                      </Stack>
                                      {event.last_error && (
                                        <Box sx={{ mt: 0.5, color: "error.light", wordBreak: "break-all" }}>{event.last_error}</Box>
                                      )}
                                      <Box sx={{ mt: 0.5, color: "text.disabled" }}>{formatDateTime(event.created_at)}</Box>
                                    </Box>
                                    {event.status === "failed" && (
                                      <Button
                                        type="button"
                                        onClick={() => handleRetryEvent(event.id, node.store_id)}
                                        disabled={retryingId === event.id}
                                        variant="outlined"
                                        color="inherit"
                                        size="small"
                                        startIcon={retryingId === event.id ? <Loader2 size={12} style={{ animation: "app-spin 1s linear infinite" }} /> : <RotateCcw size={12} />}
                                        sx={{ flexShrink: 0, fontSize: TYPE.small }}
                                      >
                                        Retry
                                      </Button>
                                    )}
                                  </Stack>
                                ))}
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
      <Dialog open={disableDialogOpen} onClose={() => { if (!saving) setDisableDialogOpen(false); }} aria-labelledby="disable-failover-title" aria-describedby="disable-failover-description" maxWidth="xs" fullWidth>
        <DialogTitle id="disable-failover-title">Disable local failover?</DialogTitle>
        <DialogContent><DialogContentText id="disable-failover-description">Devices in this store will use the cloud server. You can enable local failover again by saving a local server address.</DialogContentText></DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDisableDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" disabled={saving} onClick={() => handleSave(true)}>{saving ? "Disabling..." : "Disable failover"}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
