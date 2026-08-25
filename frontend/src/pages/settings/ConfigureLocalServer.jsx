import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 rounded-sm p-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

const cardClass =
  "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm";

const toStatusTone = (config = {}) => {
  if (config.connector_status === "online") {
    return {
      label: "Online",
      icon: CheckCircle2,
      textClass: "text-green-600 dark:text-green-400",
      bgClass: "bg-green-50 dark:bg-green-950/40",
      borderClass: "border-green-200 dark:border-green-800",
    };
  }
  if (config.connector_last_seen_at) {
    return {
      label: "Seen, currently offline",
      icon: AlertCircle,
      textClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-950/40",
      borderClass: "border-amber-200 dark:border-amber-800",
    };
  }
  return {
    label: "Not connected",
    icon: WifiOff,
    textClass: "text-gray-600 dark:text-gray-300",
    bgClass: "bg-gray-50 dark:bg-gray-800",
    borderClass: "border-gray-200 dark:border-gray-700",
  };
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
  const [config, setConfig] = useState(null);
  const [localServerUrl, setLocalServerUrl] = useState("");
  const [nodes, setNodes] = useState([]);

  const loadConfig = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const res = await api.get("/local-server-config");
      const next = res.data?.data || {};
      setConfig(next);
      setLocalServerUrl(String(next.local_server_url || "").trim());
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
      const payload = { local_server_url: String(localServerUrl || "").trim() };
      const res = await api.put("/local-server-config", payload);
      const saved = res.data?.data || {};
      setConfig((prev) => ({ ...(prev || {}), ...saved }));
      setLocalServerUrl(String(saved.local_server_url || payload.local_server_url || "").trim());
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

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading local server configuration...</span>
      </div>
    );
  }

  const tone = toStatusTone(config || {});
  const StatusIcon = tone.icon;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Configure Local Server
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Save this store's local server address so devices can use it when available and automatically fail over to the cloud if it goes down.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadConfig({ silent: true })}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh Status
        </button>
      </div>

      <div className={`rounded-lg border px-4 py-3 ${tone.borderClass} ${tone.bgClass}`}>
        <div className={`flex items-center gap-2 text-sm font-medium ${tone.textClass}`}>
          <StatusIcon className="w-4 h-4" />
          <span>{tone.label}</span>
        </div>
        <div className="mt-2 grid gap-3 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Tenant Key</div>
            <div className="mt-1 font-medium break-all">{config?.tenant_key || "Not assigned"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Connector Status</div>
            <div className="mt-1 font-medium">{config?.connector_status || "Not started"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Seen</div>
            <div className="mt-1 font-medium">{formatDateTime(config?.connector_last_seen_at)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={`${cardClass} p-4 md:p-5`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Local Server Address</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            This store's on-prem install runs the same application as the cloud. Enter the address other devices on this network use to reach it, then save.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Local Server URL
              </label>
              <input
                type="text"
                value={localServerUrl}
                onChange={(e) => setLocalServerUrl(e.target.value)}
                placeholder="http://192.168.1.25:8000"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The LAN address of this store's local server, e.g. http://192.168.1.25:8000. Leave blank to disable local-server failover for this store.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save URL
              </button>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                Test Connection
              </button>
            </div>
          </div>
        </section>

        <section className={`${cardClass} p-4 md:p-5`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">How It Works</h2>
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">1</div>
              <div>Save this store's local server address above, then use Test Connection to confirm the cloud can reach it.</div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">2</div>
              <div>From then on, every device automatically checks the local server first and uses it when reachable — no separate login or URL to remember.</div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">3</div>
              <div>If the local server goes down, devices switch to this cloud URL automatically so the store can keep working, and switch back the moment local is healthy again.</div>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Documents created directly on the cloud during an outage (e.g. invoice numbers) are marked with a "C" so they're easy to identify once local is back.
          </div>
        </section>
      </div>

      {nodes.length > 0 && (
        <section className={`${cardClass} p-4 md:p-5`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">All Stores — Sync Health</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Every store with local-server failover configured, and whether its local install has checked in recently.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Last Heartbeat</th>
                  <th className="py-2 pr-4">Last Catch-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {nodes.map((node) => {
                  const nodeTone = node.is_stale
                    ? { label: "Stale", textClass: "text-amber-600 dark:text-amber-400", Icon: AlertCircle }
                    : node.local_healthy
                      ? { label: "Healthy", textClass: "text-green-600 dark:text-green-400", Icon: CheckCircle2 }
                      : { label: "Offline", textClass: "text-gray-500 dark:text-gray-400", Icon: WifiOff };
                  const NodeIcon = nodeTone.Icon;

                  return (
                    <tr key={node.store_id}>
                      <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">
                        {node.store_name || `Store #${node.store_id}`}
                        {node.store_code ? (
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({node.store_code})</span>
                        ) : null}
                      </td>
                      <td className={`py-2 pr-4 font-medium ${nodeTone.textClass}`}>
                        <span className="inline-flex items-center gap-1.5">
                          <NodeIcon className="w-3.5 h-3.5" />
                          {nodeTone.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{formatDateTime(node.last_heartbeat_at)}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{formatDateTime(node.last_catch_up_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
