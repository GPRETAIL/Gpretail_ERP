import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CheckCircle2, Download, RefreshCw, Save, Unplug } from "lucide-react";
import { toast } from "react-toastify";
import { alpha } from "@mui/material/styles";
import { Box, Button, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
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

  const cardSx = { bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "5.25px", boxShadow: 1 };
  const innerBoxSx = { ...cardSx, p: 1.5 };

  return (
    <Stack spacing={1.5} sx={{ pb: 10 }}>
      <Box sx={{ ...cardSx, px: 1.5, py: 1 }}>
        <Typography component="h1" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
          Settings / Printing Configuration
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: "text.secondary", mt: 0.25 }}>
          Printing is managed by the local printer connector. You can select multiple printers in the connector terminal and route them here by function and user.
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", xl: "repeat(2, 1fr)" } }}>
        <Box sx={{ ...cardSx, p: 2 }}>
          <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
            <Box>
              <Typography component="h2" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                Connector Status
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary", mt: 0.5 }}>
                Company: {authUser?.company_name || "Unknown"} • Device: {deviceId}
              </Typography>
            </Box>
            {sessionConnected ? (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center", borderRadius: "50px", bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.2 : 0.1), px: 1.25, py: 0.5, fontSize: 11, fontWeight: 500, color: "success.main" }}
              >
                <CheckCircle2 size={14} />
                <Box component="span">Connected</Box>
              </Stack>
            ) : (
              <Box sx={{ borderRadius: "50px", bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.1), px: 1.25, py: 0.5, fontSize: 11, fontWeight: 500, color: "warning.main" }}>
                Offline
              </Box>
            )}
          </Stack>

          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Box sx={{ ...innerBoxSx, fontSize: 10.5, color: "text.secondary" }}>
              <Box><Box component="b">Connector:</Box> {printer?.name || "ERP Printer Connector"}</Box>
              <Box><Box component="b">Service URL:</Box> {printer?.url || DEFAULT_PRINTER_SERVICE_URL}</Box>
              <Box><Box component="b">Detected on this machine:</Box> {checkingService ? "Checking..." : servicePresent ? "Yes" : "No"}</Box>
              <Box><Box component="b">Configured printer:</Box> {selectedPrinterName || "Not reported"}</Box>
              <Box><Box component="b">Configured printers:</Box> {selectedPrinterNames.length ? selectedPrinterNames.join(", ") : "Not reported"}</Box>
              <Box><Box component="b">Configured transport:</Box> {selectedTransport}</Box>
              {selectedBluetoothDeviceName ? (
                <Box><Box component="b">Saved Bluetooth device:</Box> {selectedBluetoothDeviceName}</Box>
              ) : null}
              <Box><Box component="b">Available printers:</Box> {printersForTable.length}</Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              {sessionConnected ? (
                <Button
                  type="button"
                  onClick={handleDisconnect}
                  className="glass-btn glass-btn-danger"
                >
                  <Unplug size={16} style={{marginRight: 4}} />
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleConnectService}
                  disabled={connecting}
                  className="glass-btn glass-btn-primary"
                >
                  {connecting ? "Connecting..." : "Connect Service"}
                </Button>
              )}

              <Button
                type="button"
                onClick={handleDownloadInstaller}
                disabled={downloadingInstaller}
                className="glass-btn glass-btn-success"
              >
                <Download size={16} style={{marginRight: 6}} />
                {downloadingInstaller ? "Downloading..." : "Download Connector"}
              </Button>

              <Button
                type="button"
                onClick={() => {
                  handleRefreshInstallerMeta();
                  checkServicePresence();
                }}
                className="glass-btn glass-btn-secondary"
              >
                <RefreshCw size={16} style={{marginRight: 6}} />
                Refresh
              </Button>
            </Stack>

            {installerMeta && (
              <Box sx={{ ...innerBoxSx, fontSize: 10.5, color: "text.secondary" }}>
                <Box><Box component="b">Package:</Box> {installerMeta.fileName}</Box>
                <Box><Box component="b">Type:</Box> {installerMeta.type}</Box>
                <Box><Box component="b">Hint:</Box> {installerMeta.installHint}</Box>
              </Box>
            )}
          </Stack>
        </Box>

        <Box sx={{ ...cardSx, p: 2 }}>
          <Typography component="h2" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
            How It Works
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 2, fontSize: 12.25, color: "text.secondary" }}>
            <Box sx={innerBoxSx}>
              <Box component="b">1. Download and extract the connector package.</Box>
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                Use the download button on the left. The package is served from your deployed ERP backend.
              </Typography>
            </Box>
            <Box sx={innerBoxSx}>
              <Box component="b">2. Run `run.bat` on Windows or `run.sh` on macOS.</Box>
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                The terminal lists all printers currently visible to the operating system, including paired Bluetooth printers.
              </Typography>
            </Box>
            <Box sx={innerBoxSx}>
              <Box component="b">3. Select one or more printers in terminal.</Box>
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                You can enter values like `1,2,3`. The selected printers are saved locally by the connector, then this page routes them by function and user.
              </Typography>
            </Box>
            <Box sx={innerBoxSx}>
              <Box component="b">4. The connector auto-starts on system login.</Box>
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                If the saved printer is available, printing goes there automatically. If the connector is offline, ERP falls back to normal browser printing.
              </Typography>
            </Box>
            <Box sx={innerBoxSx}>
              <Box component="b">5. To change printer later, run the connector script again.</Box>
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                Use `run.bat configure` or `./run.sh configure`. That is where printer reassignment happens.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ ...cardSx, overflow: "auto" }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Box>
            <Typography component="h2" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
              Connector Printers
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: "text.secondary", mt: 0.25 }}>
              This table shows printers reported by the currently connected local printer connector.
            </Typography>
          </Box>
          <Button
            type="button"
            onClick={handleSaveRouting}
            disabled={!sessionConnected || savingRouting}
            className="glass-btn glass-btn-primary"
          >
            <Save size={16} style={{marginRight: 6}} />
            {savingRouting ? "Saving..." : "Save Routing"}
          </Button>
        </Stack>

        <Table size="small" sx={{ "& th, & td": { fontSize: 12.25 } }}>
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Printer</TableCell>
              <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Type</TableCell>
              <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Default</TableCell>
              <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Selected In Connector</TableCell>
              <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Printer Function</TableCell>
              <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>User</TableCell>
              <TableCell sx={{ borderColor: "divider", color: "text.secondary" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!sessionConnected ? (
              <TableRow>
                <TableCell sx={{ color: "text.secondary" }} colSpan={7}>
                  Connector is not connected. Download and run the connector package first, then connect it here.
                </TableCell>
              </TableRow>
            ) : printersForTable.length === 0 ? (
              <TableRow>
                <TableCell sx={{ color: "text.secondary" }} colSpan={7}>
                  Connector is connected, but it did not report any printers.
                </TableCell>
              </TableRow>
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
                  <TableRow
                    key={`${name}-${index}`}
                    sx={isSelected ? { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.1 : 0.05) } : undefined}
                  >
                    <TableCell sx={{ borderColor: "divider", fontWeight: 500, color: "text.primary" }}>
                      {name || "-"}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary", textTransform: "capitalize" }}>
                      {String(type || "Local").replace(/_/g, " ")}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      {isDefault ? (
                        <Box component="span" sx={{ color: "success.main", fontWeight: 500, fontSize: 10.5 }}>Yes</Box>
                      ) : (
                        "No"
                      )}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      {isSelected ? (
                        <Box component="span" sx={{ color: "primary.main", fontWeight: 500, fontSize: 10.5 }}>Yes</Box>
                      ) : (
                        "No"
                      )}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <TextField
                        select
                        size="small"
                        value={route?.printer_function || ""}
                        onChange={(event) =>
                          handleRouteChange(name, { printer_function: event.target.value })
                        }
                        sx={{ minWidth: 120 }}
                      >
                        {PRINTER_FUNCTION_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <TextField
                        select
                        size="small"
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
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="">Any user</MenuItem>
                        {users.map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      {isOffline ? (
                        <Box component="span" sx={{ color: "error.main", fontWeight: 500, fontSize: 10.5 }}>Offline</Box>
                      ) : !canPrint ? (
                        <Box component="span" sx={{ color: "warning.main", fontWeight: 500, fontSize: 10.5 }}>
                          Discoverable Only
                        </Box>
                      ) : (
                        <Box component="span" sx={{ color: "success.main", fontWeight: 500, fontSize: 10.5 }}>Available</Box>
                      )}
                      {statusReason ? (
                        <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>
                          {statusReason}
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
