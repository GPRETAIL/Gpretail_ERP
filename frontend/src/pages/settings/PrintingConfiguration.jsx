import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, Download, RefreshCw, Save, Unplug } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { usePrintContext } from "../../context/PrintContext";
import {
  detectLocalPrinterService,
  getLocalPrinterServiceInstallerMeta,
  getPrintConfigDeviceId,
  savePrinterRouting,
} from "../../utils/localPrinterService";

const DEFAULT_PRINTER_SERVICE_URL =
  import.meta.env.VITE_LOCAL_PRINTER_SERVICE_URL ||
  (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_PROXY_TARGET || "http://localhost:8080").replace(/^http/i, "ws");

const PRINTER_FUNCTION_OPTIONS = [
  { value: "", label: "Not assigned" },
  { value: "barcode", label: "Barcode" },
  { value: "receipt", label: "Receipt" },
  { value: "a4", label: "A4 size" },
];

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

export default function PrintingConfiguration() {
  const authUser = useSelector((state) => state.auth.user);
  const {
    printer,
    sessionConnected,
    serviceDetected,
    connectPrinter,
    disconnect,
  } = usePrintContext();

  const deviceId = useMemo(() => getPrintConfigDeviceId(), []);
  const [installerMeta, setInstallerMeta] = useState(null);
  const [servicePresent, setServicePresent] = useState(false);
  const [checkingService, setCheckingService] = useState(false);
  const [downloadingInstaller, setDownloadingInstaller] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [savingRouting, setSavingRouting] = useState(false);
  const [users, setUsers] = useState([]);
  const [printerRoutes, setPrinterRoutes] = useState([]);

  const detectedPrinters = Array.isArray(printer?.printers) ? printer.printers : [];
  const selectedPrinterName = String(printer?.selectedPrinterName || "").trim();
  const selectedPrinterNames = Array.isArray(printer?.selectedPrinterNames)
    ? printer.selectedPrinterNames
    : selectedPrinterName
      ? [selectedPrinterName]
      : [];
  const selectedTransport = String(printer?.selectedTransport || "printer").trim() || "printer";
  const selectedBluetoothDeviceName = String(printer?.selectedBluetoothDeviceName || "").trim();

  const checkServicePresence = async () => {
    setCheckingService(true);
    try {
      const exists = await detectLocalPrinterService({ timeoutMs: 1800 });
      setServicePresent(exists);
    } catch {
      setServicePresent(false);
    } finally {
      setCheckingService(false);
    }
  };

  const handleRefreshInstallerMeta = async () => {
    try {
      const meta = await getLocalPrinterServiceInstallerMeta();
      setInstallerMeta(meta || null);
    } catch (err) {
      setInstallerMeta(null);
      toast.error(
        err.response?.data?.message || "Unable to load printer connector package details"
      );
    }
  };

  useEffect(() => {
    handleRefreshInstallerMeta();
    checkServicePresence();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      try {
        const res = await api.get("/user-access");
        if (cancelled) return;
        setUsers(Array.isArray(res.data?.data?.users) ? res.data.data.users : []);
      } catch {
        if (!cancelled) setUsers([]);
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (serviceDetected) {
      setServicePresent(true);
    }
  }, [serviceDetected]);

  useEffect(() => {
    setPrinterRoutes(Array.isArray(printer?.printerRoutes) ? printer.printerRoutes : []);
  }, [printer?.printerRoutes]);

  const handleConnectService = async () => {
    setConnecting(true);
    try {
      await connectPrinter();
      setServicePresent(true);
    } catch (err) {
      toast.error(err.message || "Failed to connect printer connector");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const isSelectedPrinterName = useMemo(
    () => new Set(selectedPrinterNames.map((value) => String(value || "").trim().toLowerCase())),
    [selectedPrinterNames]
  );

  const handleDownloadInstaller = async () => {
    setDownloadingInstaller(true);
    try {
      const response = await api.get("/local-printer-service/installer", {
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
          // ignore malformed JSON
        }
        throw new Error(payload?.message || "Connector package download failed.");
      }

      const disposition = String(response.headers?.["content-disposition"] || "");
      const fileName =
        parseFileNameFromDisposition(disposition) ||
        installerMeta?.fileName ||
        "erp-printer-connector.zip";

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: contentType || "application/octet-stream",
            });

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);

      toast.success(
        "Package downloaded. Extract it, run run.bat on Windows or run.sh on macOS, select a printer in terminal, then return here."
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Unable to download connector package."
      );
    } finally {
      setDownloadingInstaller(false);
    }
  };

  const printersForTable = sessionConnected
    ? detectedPrinters
    : [];

  const getRouteForPrinter = (printerName) =>
    printerRoutes.find(
      (route) => String(route?.printer_name || "").trim().toLowerCase() === String(printerName || "").trim().toLowerCase()
    ) || null;

  const handleRouteChange = (printerName, patch) => {
    const normalizedName = String(printerName || "").trim();
    if (!normalizedName) return;
    setPrinterRoutes((prev) => {
      const existing = prev.find(
        (route) => String(route?.printer_name || "").trim().toLowerCase() === normalizedName.toLowerCase()
      );
      const nextRoute = {
        printer_name: normalizedName,
        printer_function: "",
        user_id: null,
        user_name: "",
        ...(existing || {}),
        ...patch,
      };

      const filtered = prev.filter(
        (route) => String(route?.printer_name || "").trim().toLowerCase() !== normalizedName.toLowerCase()
      );

      if (!nextRoute.printer_function && !nextRoute.user_id && !String(nextRoute.user_name || "").trim()) {
        return filtered;
      }

      return [...filtered, nextRoute];
    });
  };

  const handleSaveRouting = async () => {
    setSavingRouting(true);
    try {
      const payload = printerRoutes
        .map((route) => ({
          printer_name: String(route?.printer_name || "").trim(),
          printer_function: String(route?.printer_function || "").trim().toLowerCase(),
          user_id: route?.user_id ? Number(route.user_id) || null : null,
          user_name: String(route?.user_name || "").trim(),
        }))
        .filter((route) => route.printer_name);
      await savePrinterRouting(payload);
      await connectPrinter({ silent: true });
      toast.success("Printer routing saved");
    } catch (err) {
      toast.error(err?.message || "Failed to save printer routing");
    } finally {
      setSavingRouting(false);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      <div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        <h1 className="text-sm font-semibold dark:text-gray-200">
          Settings / Printing Configuration
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Printing is managed by the local printer connector. You can select multiple printers in the connector terminal and route them here by function and user.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Connector Status
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Company: {authUser?.company_name || "Unknown"} • Device: {deviceId}
              </p>
            </div>
            {sessionConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                Offline
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-600 dark:text-gray-400">
              <div><b>Connector:</b> {printer?.name || "ERP Printer Connector"}</div>
              <div><b>Service URL:</b> {printer?.url || DEFAULT_PRINTER_SERVICE_URL}</div>
              <div><b>Detected on this machine:</b> {checkingService ? "Checking..." : servicePresent ? "Yes" : "No"}</div>
              <div><b>Configured printer:</b> {selectedPrinterName || "Not reported"}</div>
              <div><b>Configured printers:</b> {selectedPrinterNames.length ? selectedPrinterNames.join(", ") : "Not reported"}</div>
              <div><b>Configured transport:</b> {selectedTransport}</div>
              {selectedBluetoothDeviceName ? (
                <div><b>Saved Bluetooth device:</b> {selectedBluetoothDeviceName}</div>
              ) : null}
              <div><b>Available printers:</b> {printersForTable.length}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {sessionConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="glass-btn glass-btn-danger inline-flex items-center"
                >
                  <Unplug className="w-4 h-4 mr-1" />
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectService}
                  disabled={connecting}
                  className="glass-btn glass-btn-primary inline-flex items-center"
                >
                  {connecting ? "Connecting..." : "Connect Service"}
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadInstaller}
                disabled={downloadingInstaller}
                className="glass-btn glass-btn-success inline-flex items-center"
              >
                <Download className="w-4 h-4 mr-1.5" />
                {downloadingInstaller ? "Downloading..." : "Download Connector"}
              </button>

              <button
                type="button"
                onClick={() => {
                  handleRefreshInstallerMeta();
                  checkServicePresence();
                }}
                className="glass-btn glass-btn-secondary inline-flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Refresh
              </button>
            </div>

            {installerMeta && (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-600 dark:text-gray-400">
                <div><b>Package:</b> {installerMeta.fileName}</div>
                <div><b>Type:</b> {installerMeta.type}</div>
                <div><b>Hint:</b> {installerMeta.installHint}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            How It Works
          </h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <b>1. Download and extract the connector package.</b>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use the download button on the left. The package is served from your deployed ERP backend.
              </div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <b>2. Run `run.bat` on Windows or `run.sh` on macOS.</b>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The terminal lists all printers currently visible to the operating system, including paired Bluetooth printers.
              </div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <b>3. Select one or more printers in terminal.</b>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You can enter values like `1,2,3`. The selected printers are saved locally by the connector, then this page routes them by function and user.
              </div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <b>4. The connector auto-starts on system login.</b>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                If the saved printer is available, printing goes there automatically. If the connector is offline, ERP falls back to normal browser printing.
              </div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <b>5. To change printer later, run the connector script again.</b>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use `run.bat configure` or `./run.sh configure`. That is where printer reassignment happens.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm overflow-auto">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Connector Printers
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              This table shows printers reported by the currently connected local printer connector.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveRouting}
            disabled={!sessionConnected || savingRouting}
            className="glass-btn glass-btn-primary inline-flex items-center"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {savingRouting ? "Saving..." : "Save Routing"}
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            <tr>
              <th className="text-left px-3 py-2 border-b dark:border-gray-600">Printer</th>
              <th className="text-left px-3 py-2 border-b dark:border-gray-600">Type</th>
              <th className="text-left px-3 py-2 border-b dark:border-gray-600">Default</th>
              <th className="text-left px-3 py-2 border-b dark:border-gray-600">Selected In Connector</th>
              <th className="text-left px-3 py-2 border-b dark:border-gray-600">Printer Function</th>
              <th className="text-left px-3 py-2 border-b dark:border-gray-600">User</th>
              <th className="text-left px-3 py-2 border-b dark:border-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {!sessionConnected ? (
              <tr>
                <td className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={7}>
                  Connector is not connected. Download and run the connector package first, then connect it here.
                </td>
              </tr>
            ) : printersForTable.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={7}>
                  Connector is connected, but it did not report any printers.
                </td>
              </tr>
            ) : (
              printersForTable.map((printerRow, index) => {
                const name =
                  typeof printerRow === "string"
                    ? printerRow
                    : String(printerRow?.name || printerRow?.PrinterName || "").trim();
                const type =
                  typeof printerRow === "string"
                    ? "Unknown"
                    : printerRow?.connectionType || printerRow?.ConnectionType || "Local";
                const isDefault = Boolean(printerRow?.isDefault || printerRow?.Default);
                const isSelected =
                  Boolean(printerRow?.isSelected) ||
                  isSelectedPrinterName.has(name.toLowerCase()) ||
                  (selectedPrinterName &&
                    name.toLowerCase() === selectedPrinterName.toLowerCase());
                const isOffline = Boolean(printerRow?.isOffline || printerRow?.WorkOffline);
                const canPrint = printerRow?.canPrint !== false;
                const statusReason = String(printerRow?.statusReason || "").trim();
                const route = getRouteForPrinter(name);

                return (
                  <tr
                    key={`${name}-${index}`}
                    className={isSelected ? "bg-blue-50/70 dark:bg-blue-900/10" : ""}
                  >
                    <td className="px-3 py-2 border-b dark:border-gray-600 font-medium text-gray-800 dark:text-gray-100">
                      {name || "-"}
                    </td>
                    <td className="px-3 py-2 border-b dark:border-gray-600 text-gray-600 dark:text-gray-400 capitalize">
                      {String(type || "Local").replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 border-b dark:border-gray-600">
                      {isDefault ? (
                        <span className="text-green-700 dark:text-green-400 font-medium text-xs">Yes</span>
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="px-3 py-2 border-b dark:border-gray-600">
                      {isSelected ? (
                        <span className="text-blue-700 dark:text-blue-400 font-medium text-xs">Yes</span>
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="px-3 py-2 border-b dark:border-gray-600">
                      <select
                        value={route?.printer_function || ""}
                        onChange={(event) =>
                          handleRouteChange(name, { printer_function: event.target.value })
                        }
                        disabled={!isSelected}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {PRINTER_FUNCTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 border-b dark:border-gray-600">
                      <select
                        value={route?.user_id || ""}
                        onChange={(event) => {
                          const selectedUser = users.find(
                            (user) => String(user.id) === String(event.target.value || "")
                          );
                          handleRouteChange(name, {
                            user_id: selectedUser ? selectedUser.id : null,
                            user_name: selectedUser?.name || selectedUser?.email || "",
                          });
                        }}
                        disabled={!isSelected}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Any user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 border-b dark:border-gray-600">
                      {isOffline ? (
                        <span className="text-red-700 dark:text-red-400 font-medium text-xs">Offline</span>
                      ) : !canPrint ? (
                        <span className="text-amber-700 dark:text-amber-400 font-medium text-xs">
                          Discoverable Only
                        </span>
                      ) : (
                        <span className="text-green-700 dark:text-green-400 font-medium text-xs">Available</span>
                      )}
                      {statusReason ? (
                        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {statusReason}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
