import { Fragment, useEffect, useState } from "react";
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
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import api from "../../api/axios";

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

export default function ConfigureLocalServer() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingCloud, setTestingCloud] = useState(false);
  const [config, setConfig] = useState(null);
  const [localServerUrl, setLocalServerUrl] = useState("");
  const [cloudServerUrl, setCloudServerUrl] = useState("");
  const [nodes, setNodes] = useState([]);
  const [expandedStoreId, setExpandedStoreId] = useState(null);
  const [outboxEvents, setOutboxEvents] = useState([]);
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [retryingAllStoreId, setRetryingAllStoreId] = useState(null);

  const loadConfig = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const res = await api.get("/local-server-config");
      const next = res.data?.data || {};
      setConfig(next);
      setLocalServerUrl(String(next.local_server_url || "").trim());
      setCloudServerUrl(String(next.cloud_server_url || "").trim());
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load local server configuration");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNodes = async () => {
    try {
      const res = await api.get("/sync/nodes");
      setNodes(res.data?.data?.nodes || []);
    } catch {
      // Non-critical: leave the health table blank rather than surfacing another toast.
    }
  };

  const loadOutboxEvents = async (storeId) => {
    try {
      setOutboxLoading(true);
      const res = await api.get("/sync/outbox", { params: { store_id: storeId } });
      setOutboxEvents(res.data?.data?.events || []);
    } catch {
      setOutboxEvents([]);
    } finally {
      setOutboxLoading(false);
    }
  };

  const toggleExpand = (storeId) => {
    if (expandedStoreId === storeId) {
      setExpandedStoreId(null);
      setOutboxEvents([]);
      return;
    }
    setExpandedStoreId(storeId);
    loadOutboxEvents(storeId);
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

  useEffect(() => {
    let alive = true;
    loadConfig();
    loadNodes();
    const timer = setInterval(() => {
      if (alive) {
        loadConfig({ silent: true });
        loadNodes();
      }
    }, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        local_server_url: String(localServerUrl || "").trim(),
        cloud_server_url: String(cloudServerUrl || "").trim(),
      };
      const res = await api.put("/local-server-config", payload);
      const saved = res.data?.data || {};
      setConfig((prev) => ({ ...(prev || {}), ...saved }));
      setLocalServerUrl(String(saved.local_server_url || payload.local_server_url || "").trim());
      setCloudServerUrl(String(saved.cloud_server_url || payload.cloud_server_url || "").trim());
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
      toast.success(message);
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
      toast.success(message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection test failed");
    } finally {
      setTestingCloud(false);
    }
  };

  if (loading) {
    return (
      <Stack direction="row" spacing={1.5} sx={{ p: 3, alignItems: "center", fontSize: 12.25, color: "text.secondary" }}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <Box component="span">Loading local server configuration...</Box>
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
          startIcon={refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
          <StatusIcon className="w-4 h-4" />
          <Box component="span">{tone.label}</Box>
        </Stack>
        <Box sx={{ mt: 1, display: "grid", gap: 1.5, gridTemplateColumns: { md: "repeat(3, 1fr)" }, fontSize: 12.25, color: "text.secondary" }}>
          <Box>
            <Box sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Tenant Key</Box>
            <Box sx={{ mt: 0.5, fontWeight: 500, wordBreak: "break-all", color: "text.primary" }}>{config?.tenant_key || "Not assigned"}</Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Connector Status</Box>
            <Box sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{config?.connector_status || "Not started"}</Box>
          </Box>
          <Box>
            <Box sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Last Seen</Box>
            <Box sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{formatDateTime(config?.connector_last_seen_at)}</Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xl: "1.1fr 0.9fr" } }}>
        <Box component="section" sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>Local Server Address</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary" }}>
            This store's on-prem install runs the same application as the cloud. Enter the address other devices on this network use to reach it, then save.
          </Typography>

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary", mb: 0.75 }}>
                Local Server URL
              </Typography>
              <TextField
                type="text"
                size="small"
                fullWidth
                value={localServerUrl}
                onChange={(e) => setLocalServerUrl(e.target.value)}
                placeholder="http://192.168.1.25:8000"
              />
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                The LAN address of this store's local server, e.g. http://192.168.1.25:8000. Leave blank to disable local-server failover for this store.
              </Typography>
            </Box>

            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary", mb: 0.75 }}>
                Cloud Server URL
              </Typography>
              <TextField
                type="text"
                size="small"
                fullWidth
                value={cloudServerUrl}
                onChange={(e) => setCloudServerUrl(e.target.value)}
                placeholder={config?.effective_cloud_server_url || "https://yourcompany.gpsoftware.in"}
              />
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                Where devices fail over to when the local server above is unreachable. Leave blank to use the
                platform default ({config?.effective_cloud_server_url || "not set"}).
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                variant="contained"
                color="success"
                startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              >
                Save URLs
              </Button>

              <Button
                type="button"
                onClick={handleTest}
                disabled={testing}
                variant="outlined"
                color="inherit"
                startIcon={testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              >
                Test Local
              </Button>

              <Button
                type="button"
                onClick={handleTestCloud}
                disabled={testingCloud}
                variant="outlined"
                color="inherit"
                startIcon={testingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              >
                Test Cloud
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box component="section" sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>How It Works</Typography>
          <Stack spacing={2} sx={{ mt: 2, fontSize: 12.25, color: "text.secondary" }}>
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ display: "flex", flexShrink: 0, height: 21, width: 21, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "primary.main", fontSize: 10.5, fontWeight: 600, color: "primary.contrastText" }}>1</Box>
              <Box>Save this store's local server address above, then use Test Connection to confirm the cloud can reach it.</Box>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ display: "flex", flexShrink: 0, height: 21, width: 21, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "primary.main", fontSize: 10.5, fontWeight: 600, color: "primary.contrastText" }}>2</Box>
              <Box>From then on, every device automatically checks the local server first and uses it when reachable — no separate login or URL to remember.</Box>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ display: "flex", flexShrink: 0, height: 21, width: 21, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "primary.main", fontSize: 10.5, fontWeight: 600, color: "primary.contrastText" }}>3</Box>
              <Box>If the local server goes down, devices switch to this cloud URL automatically so the store can keep working, and switch back the moment local is healthy again.</Box>
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
            Every store with local-server failover configured, and whether its local install has checked in recently.
          </Typography>

          <Box sx={{ mt: 2, overflowX: "auto" }}>
            <Table size="small" sx={{ "& th, & td": { fontSize: 12.25 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 24, borderColor: "divider" }} />
                  <TableCell sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Store</TableCell>
                  <TableCell sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Last Heartbeat</TableCell>
                  <TableCell sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Last Catch-up</TableCell>
                  <TableCell sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary", borderColor: "divider" }}>Outbox</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nodes.map((node) => {
                  const nodeTone = node.is_stale
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
                            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ borderColor: "divider", color: "text.primary" }}>
                          {node.store_name || `Store #${node.store_id}`}
                          {node.store_code ? (
                            <Box component="span" sx={{ ml: 0.5, fontSize: 10.5, color: "text.secondary" }}>({node.store_code})</Box>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ borderColor: "divider", fontWeight: 500, color: nodeTone.token ? `${nodeTone.token}.main` : "text.secondary" }}>
                          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                            <NodeIcon className="w-3.5 h-3.5" />
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
                              <Typography component="h3" sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>
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
                                  startIcon={retryingAllStoreId === node.store_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                  sx={{ fontSize: 11 }}
                                >
                                  Retry All Failed
                                </Button>
                              )}
                            </Stack>

                            {outboxLoading ? (
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontSize: 10.5, color: "text.secondary", py: 1 }}>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <Box component="span">Loading...</Box>
                              </Stack>
                            ) : outboxEvents.length === 0 ? (
                              <Typography sx={{ fontSize: 10.5, color: "text.secondary", py: 1 }}>No queued events.</Typography>
                            ) : (
                              <Stack spacing={0.75}>
                                {outboxEvents.map((event) => (
                                  <Stack
                                    key={event.id}
                                    direction="row"
                                    sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: 1.25, py: 1, fontSize: 10.5 }}
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
                                        startIcon={retryingId === event.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                        sx={{ flexShrink: 0, fontSize: 11 }}
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
    </Stack>
  );
}
