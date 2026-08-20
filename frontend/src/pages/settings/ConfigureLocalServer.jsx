import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
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

const parseFileNameFromDisposition = (contentDisposition = "") => {
  const value = String(contentDisposition || "");
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/["\r\n]/g, "").trim();
    } catch {
      // ignore malformed encoding
    }
  }
  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].replace(/["\r\n]/g, "").trim();
  }
  return "";
};

const normalizeApiClientPath = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return text.startsWith("/api/") ? text.slice(4) : text;
};

const toStatusTone = (config = {}) => {
  if (config.connector_tunnel_online || config.connector_status === "online") {
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
      label: "Seen, tunnel offline",
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
  const [downloading, setDownloading] = useState(false);
  const [config, setConfig] = useState(null);
  const [localServerUrl, setLocalServerUrl] = useState("");

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

  useEffect(() => {
    let alive = true;
    loadConfig();
    const timer = setInterval(() => {
      if (alive) loadConfig({ silent: true });
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

  const handleDownload = async () => {
    try {
      if (!config?.connector_download_url) {
        toast.error(config?.connector_download_issue || "Connector download is not available");
        return;
      }

      setDownloading(true);
      // Bundled node_modules makes the zip large; default api timeout is 30s. Allow up to 15 minutes.
      const response = await api.get(normalizeApiClientPath(config.connector_download_url), {
        responseType: "blob",
        timeout: 900_000,
      });

      const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const payloadText = await response.data.text();
        let payload = null;
        try {
          payload = JSON.parse(payloadText);
        } catch {
          // ignore malformed json
        }
        throw new Error(payload?.message || "Connector download failed");
      }

      const disposition = String(response.headers?.["content-disposition"] || "");
      const fileName = parseFileNameFromDisposition(disposition) || "connector-setup.zip";
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: contentType || "application/zip" });

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);

      toast.success("Connector downloaded. Run it on the company machine, then click Refresh Status.");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Unable to download connector");
    } finally {
      setDownloading(false);
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
            Download the company connector, run it on the company machine, then refresh this page to confirm tunnel status.
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
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Connector Setup</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            The downloaded package is pre-configured for this company. After it starts successfully, the cloud backend will route company API requests through the local tunnel automatically when available.
          </p>

          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Download Company Connector</div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Download, extract, and run the installer on the company’s local server machine.
                  </div>
                  {config?.connector_download_issue ? (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {config.connector_download_issue}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || !config?.connector_download_url}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download Connector
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Local Server URL
              </label>
              <input
                type="text"
                value={localServerUrl}
                onChange={(e) => setLocalServerUrl(e.target.value)}
                placeholder="http://192.168.1.25:5101"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Usually this is filled automatically after the connector starts and sends its heartbeat. You only need to override it if auto-detection is wrong.
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
              <div>Download the connector ZIP and run it on the company’s Windows machine or local server.</div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">2</div>
              <div>The connector starts the local backend and opens a secure tunnel back to the cloud ERP.</div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">3</div>
              <div>When the local connector is online, company API requests are handled locally first. If local is down, the cloud handles them automatically.</div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">4</div>
              <div>Data changes are synced both ways through the connector event queue, so the company user continues using the same ERP login and cloud URL.</div>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Running the connector is required. This page does not itself start the local server; it only lets the company admin download, monitor, save, and test the setup.
          </div>
        </section>
      </div>
    </div>
  );
}
