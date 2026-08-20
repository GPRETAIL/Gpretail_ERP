import api from "../api/axios";
import { getPrintDeviceId } from "./printDevice";

const DEFAULT_HTTP_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_PROXY_TARGET ||
  "http://localhost:5001";
const resolveWsCandidateUrls = () => {
  if (import.meta.env.VITE_LOCAL_PRINTER_SERVICE_URL) {
    return [import.meta.env.VITE_LOCAL_PRINTER_SERVICE_URL];
  }
  const isHttps = typeof window !== "undefined" && window.location?.protocol === "https:";
  if (isHttps) {
    return [
      "wss://localhost:5001",
      "wss://127.0.0.1:5001",
      "ws://localhost:5001",
      "ws://127.0.0.1:5001",
    ];
  }
  return ["ws://localhost:5001", "ws://127.0.0.1:5001"];
};

const DEFAULT_WS_CANDIDATES = resolveWsCandidateUrls();
const DEFAULT_WS_URL = DEFAULT_WS_CANDIDATES[0];
const CONNECT_TIMEOUT_MS = 5000;
const REQUEST_TIMEOUT_MS = 10000;
const PRINT_REQUEST_TIMEOUT_MS = 60000;
const HEARTBEAT_INTERVAL_MS = 30000;

// The service has answered to different action spellings across versions, so each request walks
// its candidate list until one is accepted rather than assuming a single name.
const GET_PRINTER_ACTIONS = [
  "GetPrinters",
  "getPrinters",
  "get_printers",
  "printers",
  "ListPrinters",
];

const PRINT_ACTIONS = [
  "Print",
  "print",
  "PrintReceipt",
  "printReceipt",
  "print_receipt",
];

const LABEL_ACTIONS = [
  "PrintLabel",
  "printLabel",
  "print_label",
  "Print",
];

const GET_ROUTING_ACTIONS = [
  "GetPrinterRouting",
  "getPrinterRouting",
  "get_printer_routing",
  "printerRouting",
];

const SAVE_ROUTING_ACTIONS = [
  "SavePrinterRouting",
  "savePrinterRouting",
  "save_printer_routing",
  "SetPrinterRouting",
];

let heartbeatTimer = null;
let activeWsUrl = DEFAULT_WS_URL;
// Module state. These are read and assigned throughout this file; without the declarations every
// path that touches them throws a ReferenceError under ESM strict mode, which is what made the
// printer dialog unusable rather than merely empty.
let socket = null;
let openPromise = null;
let requestCounter = 0;
let latestServiceVersion = "";

// In-flight requests. Responses are matched by RequestId when the service echoes one back, and
// fall back to FIFO order against genericQueue for the older builds that don't.
const pendingById = new Map();
const genericQueue = [];

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

const makeRequestId = () => `req-${Date.now()}-${++requestCounter}`;

const getRequestIdFromPayload = (payload) =>
  payload?.RequestId || payload?.requestId || payload?.requestID || null;

const parseJsonSafe = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
};

const extractError = (payload) => {
  if (!payload) return "";
  return (
    payload.Error ||
    payload.error ||
    payload.Message ||
    payload.message ||
    payload.reason ||
    ""
  );
};

const isRequestTimeoutError = (error) =>
  /did not respond in time/i.test(String(error?.message || error || ""));

const isSuccessResponse = (payload) => {
  if (!payload) return false;
  if (typeof payload.Success === "boolean") return payload.Success;
  if (typeof payload.success === "boolean") return payload.success;
  return !extractError(payload);
};

const removeFromGenericQueue = (ref) => {
  const idx = genericQueue.indexOf(ref);
  if (idx >= 0) genericQueue.splice(idx, 1);
};

const settleRequest = (ref, payload, asError = false) => {
  if (!ref || ref.done) return;
  ref.done = true;
  clearTimeout(ref.timer);
  removeFromGenericQueue(ref);
  pendingById.delete(ref.id);
  if (asError) ref.reject(payload);
  else ref.resolve(payload);
};

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ action: "ping", RequestId: `ping-${Date.now()}` }));
      } catch {
        resetSocket("Heartbeat ping failed.");
      }
    } else {
      stopHeartbeat();
    }
  }, HEARTBEAT_INTERVAL_MS);
};

const resetSocket = (errorMessage = "Printer service disconnected.") => {
  stopHeartbeat();
  if (socket) {
    try {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    } catch {
      // ignore cleanup issues
    }
  }
  socket = null;
  openPromise = null;

  const refs = [
    ...pendingById.values(),
    ...genericQueue.filter((x) => !pendingById.has(x.id)),
  ];
  refs.forEach((ref) => settleRequest(ref, new Error(errorMessage), true));
  pendingById.clear();
  genericQueue.length = 0;
};

const attachSocketHandlers = (ws) => {
  startHeartbeat();
  ws.onmessage = (event) => {
    const payload = parseJsonSafe(event.data) || { message: String(event.data || "") };
    latestServiceVersion =
      payload?.ServiceVersion || payload?.serviceVersion || latestServiceVersion;

    const requestId = getRequestIdFromPayload(payload);
    if (requestId && pendingById.has(requestId)) {
      settleRequest(pendingById.get(requestId), payload, false);
      return;
    }

    const nextGeneric = genericQueue.find((entry) => !entry.done);
    if (nextGeneric) {
      settleRequest(nextGeneric, payload, false);
    }
  };

  ws.onclose = () => {
    resetSocket("Printer service connection closed.");
  };

  ws.onerror = () => {
    // Request-level promises will timeout or be rejected by onclose.
  };
};

const connectCandidateUrl = async (url) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try {
        ws.close();
      } catch {
        // ignore
      }
      reject(new Error(`Could not connect to printer service on ${url}.`));
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket = ws;
      activeWsUrl = url;
      attachSocketHandlers(ws);
      resolve({
        type: "local_service",
        name: "GP Retail Printer Service",
        url,
        serviceVersion: latestServiceVersion || "",
      });
    };

    ws.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(new Error(`Unable to connect to GP Retail Printer Service on ${url}.`));
    };

    ws.onclose = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(new Error(`Printer service socket closed on ${url}.`));
    };
  });

export const connectLocalPrinterService = async () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return {
      type: "local_service",
      name: "GP Retail Printer Service",
      url: activeWsUrl,
      serviceVersion: latestServiceVersion || "",
    };
  }

  if (openPromise) return openPromise;

  openPromise = (async () => {
    const candidates = resolveWsCandidateUrls();
    let lastError = null;
    for (const url of candidates) {
      try {
        const result = await connectCandidateUrl(url);
        return result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Unable to connect to GP Retail Printer Service on any local endpoint.");
  })().finally(() => {
    openPromise = null;
  });

  return openPromise;
};

export const isLocalPrinterServiceConnected = () =>
  !!socket && socket.readyState === WebSocket.OPEN;

const probeCandidateUrl = (url, timeoutMs) =>
  new Promise((resolve) => {
    let settled = false;
    let opened = false;
    let ws;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    try {
      ws = new WebSocket(url);
    } catch {
      // Constructing a ws:// socket from an https page throws outright in some browsers.
      finish(false);
      return;
    }

    ws.onopen = () => {
      opened = true;
      finish(true);
    };

    ws.onerror = () => finish(false);
    ws.onclose = () => {
      if (!opened) finish(false);
    };
  });

// Detection must try the same candidates connectLocalPrinterService does. Probing only the first
// one reported "not detected" whenever the agent was reachable on a later candidate -- and callers
// read that as "no silent printing", so POS fell through to the browser's print dialog.
export const detectLocalPrinterService = async ({ timeoutMs = 1800 } = {}) => {
  if (isLocalPrinterServiceConnected()) return true;

  const candidates = resolveWsCandidateUrls();
  const perCandidateTimeout = Math.max(
    600,
    Math.floor(timeoutMs / Math.max(1, candidates.length))
  );

  for (const url of candidates) {
    // Sequential on purpose: candidates are ordered by preference, so stop at the first hit.
    if (await probeCandidateUrl(url, perCandidateTimeout)) {
      activeWsUrl = url;
      return true;
    }
  }
  return false;
};

export const disconnectLocalPrinterService = async () => {
  if (!socket) return;
  resetSocket("Printer service disconnected.");
};

const sendRequest = async (payload, timeoutMs = REQUEST_TIMEOUT_MS) => {
  await connectLocalPrinterService();
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("Printer service is not connected.");
  }

  const requestId = getRequestIdFromPayload(payload) || makeRequestId();
  const requestPayload = {
    ...payload,
    RequestId: requestId,
    requestId,
  };

  return new Promise((resolve, reject) => {
    const ref = {
      id: requestId,
      done: false,
      resolve,
      reject,
      timer: setTimeout(() => {
        settleRequest(ref, new Error("Printer service did not respond in time."), true);
      }, timeoutMs),
    };

    pendingById.set(ref.id, ref);
    genericQueue.push(ref);

    try {
      socket.send(JSON.stringify(requestPayload));
    } catch (err) {
      settleRequest(ref, err, true);
    }
  });
};

const normalizePrinterConfig = (cfg = {}) => ({
  printer_name: String(cfg.printer_name || cfg.printerName || cfg.name || "").trim(),
  printer_type: String(cfg.printer_type || cfg.printerType || "local_usb")
    .trim()
    .toLowerCase(),
  host: String(cfg.host || cfg.hostIp || cfg.host_ip || "").trim(),
  port: String(cfg.port || "").trim(),
  copies: Math.max(1, toInt(cfg.copies, 1)),
  use_system_default: Boolean(
    cfg.use_system_default ??
      cfg.useSystemDefault ??
      cfg.useDefaultPrinter ??
      cfg.UseDefaultPrinter
  ),
});

const mapPrinterType = (printerType = "") => {
  const normalized = String(printerType || "").toLowerCase();
  if (normalized.includes("label") || normalized.includes("tspl")) return "Tspl";
  if (normalized.includes("a4")) return "A4";
  return "EscPos";
};

const mapConnectionType = (cfg) => (cfg?.host ? "Network" : "Usb");

const normalizeLabelPayload = (label) => {
  if (!label || typeof label !== "object" || Array.isArray(label)) return undefined;
  return label;
};

const toReceiptItem = (item = {}) => ({
  Name: String(item.name || item.productName || "").trim(),
  ProductName: String(item.productName || item.name || "").trim(),
  Code: String(item.code || "").trim(),
  Sku: String(item.sku || item.code || "").trim(),
  Qty: Number(item.qty || 0) || 0,
  Unit: String(item.unit || "Nos").trim(),
  Rate: Number(item.rate || 0) || 0,
  Price: Number(item.rate || item.price || 0) || 0,
  MrpPrice: Number(item.mrpPrice || item.price || item.rate || 0) || 0,
  Amount: Number(item.amount || 0) || 0,
  Barcode: String(item.barcode || "").trim(),
  PrintBarcode: Boolean(item.printBarcode),
  PrintQrCode: Boolean(item.printQrCode),
  QrData: String(item.qrData || "").trim(),
  BatchNo: String(item.batchNo || "").trim(),
  ExpiryDate: item.expiryDate || "",
});

const normalizeReceipt = (receiptData = {}, fallbackLabel = "Receipt") => ({
  StoreName: String(receiptData.storeName || "Store").trim(),
  StoreAddress: String(receiptData.storeAddress || "").trim(),
  StorePhone: String(receiptData.storePhone || "").trim(),
  StoreGstNo: String(receiptData.storeGstNo || "").trim(),
  BillNo: String(receiptData.billNo || "").trim(),
  DateTime: receiptData.dateTime || new Date().toISOString(),
  CashierName: String(receiptData.cashierName || "").trim(),
  CustomerName: String(receiptData.customerName || "").trim(),
  PaymentMethod: String(receiptData.paymentMethod || "").trim(),
  FooterNote: String(receiptData.footerNote || "").trim(),
  PaperSize: String(receiptData.paperSize || "").trim(),
  Label: String(receiptData.label || fallbackLabel || "Receipt").trim(),
  Message: String(receiptData.message || "").trim(),
  SubTotal: Number(receiptData.subTotal || 0) || 0,
  DiscountAmount: Number(receiptData.discountAmount || 0) || 0,
  TaxPercent: Number(receiptData.taxPercent || 0) || 0,
  TaxAmount: Number(receiptData.taxAmount || 0) || 0,
  Total: Number(receiptData.total || 0) || 0,
  PaidAmount: Number(receiptData.paidAmount || 0) || 0,
  ChangeAmount: Number(receiptData.changeAmount || 0) || 0,
  Items: Array.isArray(receiptData.items)
    ? receiptData.items.map(toReceiptItem)
    : [],
});

const runActionCandidates = async (
  basePayload,
  actions,
  { timeoutMs = REQUEST_TIMEOUT_MS, retryOnTimeout = true } = {}
) => {
  let lastError = "";
  for (const action of actions) {
    try {
      const response = await sendRequest({
        ...basePayload,
        Action: action,
        action,
      }, timeoutMs);
      if (isSuccessResponse(response)) return response;
      const errorMessage =
        extractError(response) || `Printer service rejected action '${action}'.`;
      lastError = errorMessage;
    } catch (err) {
      lastError = err?.message || String(err);
      if (!retryOnTimeout && isRequestTimeoutError(err)) {
        break;
      }
    }
  }
  throw new Error(lastError || "Printer service request failed.");
};

export const getServicePrinters = async () => {
  const response = await runActionCandidates(
    {
      DocumentType: "generic",
      documentType: "generic",
      Message: "",
    },
    GET_PRINTER_ACTIONS
  );

  const printers =
    response?.Printers ||
    response?.printers ||
    response?.data?.printers ||
    response?.data ||
    [];

  const selectedPrinterName = String(
    response?.selectedPrinterName ||
      response?.SelectedPrinterName ||
      response?.data?.selectedPrinterName ||
      ""
  ).trim();
  const selectedTransport = String(
    response?.selectedTransport ||
      response?.SelectedTransport ||
      response?.data?.selectedTransport ||
      "printer"
  ).trim() || "printer";
  const selectedBluetoothDeviceName = String(
    response?.selectedBluetoothDeviceName ||
      response?.SelectedBluetoothDeviceName ||
      response?.data?.selectedBluetoothDeviceName ||
      ""
  ).trim();

  const selectedPrinterNamesRaw =
    response?.selectedPrinterNames ||
    response?.SelectedPrinterNames ||
    response?.data?.selectedPrinterNames ||
    [];
  const selectedPrinterNames = Array.from(
    new Set(
      (Array.isArray(selectedPrinterNamesRaw) ? selectedPrinterNamesRaw : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
  const printerRoutes =
    response?.printerRoutes ||
    response?.PrinterRoutes ||
    response?.data?.printerRoutes ||
    [];

  const normalizedPrinters = Array.isArray(printers)
    ? printers
        .map((printer) => {
          if (typeof printer === "string") {
            return {
              name: printer,
              isSelected:
                selectedPrinterName &&
                printer.toLowerCase() === selectedPrinterName.toLowerCase(),
            };
          }

          const name = String(printer?.name || printer?.PrinterName || "").trim();
          if (!name) return null;
          return {
            ...printer,
            name,
            isSelected:
              Boolean(printer?.isSelected) ||
              selectedPrinterNames.some((selectedName) => selectedName.toLowerCase() === name.toLowerCase()) ||
              (selectedPrinterName &&
                name.toLowerCase() === selectedPrinterName.toLowerCase()),
          };
        })
        .filter(Boolean)
    : [];

  return {
    printers: normalizedPrinters,
    selectedPrinterName,
    selectedPrinterNames,
    selectedTransport,
    selectedBluetoothDeviceName,
    printerRoutes: Array.isArray(printerRoutes) ? printerRoutes : [],
  };
};

export const getPrinterRouting = async () => {
  const response = await runActionCandidates(
    {
      DocumentType: "generic",
      documentType: "generic",
      Message: "",
    },
    GET_ROUTING_ACTIONS
  );

  const selectedPrinterNamesRaw =
    response?.selectedPrinterNames ||
    response?.SelectedPrinterNames ||
    response?.data?.selectedPrinterNames ||
    [];
  const printerRoutesRaw =
    response?.printerRoutes ||
    response?.PrinterRoutes ||
    response?.data?.printerRoutes ||
    [];

  return {
    selectedPrinterName: String(
      response?.selectedPrinterName ||
        response?.SelectedPrinterName ||
        response?.data?.selectedPrinterName ||
        ""
    ).trim(),
    selectedPrinterNames: Array.from(
      new Set(
        (Array.isArray(selectedPrinterNamesRaw) ? selectedPrinterNamesRaw : [])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    ),
    printerRoutes: Array.isArray(printerRoutesRaw) ? printerRoutesRaw : [],
  };
};

export const savePrinterRouting = async (printerRoutes = []) =>
  runActionCandidates(
    {
      DocumentType: "generic",
      documentType: "generic",
      PrinterRoutes: Array.isArray(printerRoutes) ? printerRoutes : [],
      printerRoutes: Array.isArray(printerRoutes) ? printerRoutes : [],
    },
    SAVE_ROUTING_ACTIONS
  );

export const printWithLocalService = async ({
  html = "",
  receiptData = null,
  label = "Print Job",
  copies = 1,
  docType = "generic",
  printerConfig = null,
  printerFunction = "",
  user = null,
} = {}) => {
  const contentHtml = String(html || "");
  const receipt = receiptData ? normalizeReceipt(receiptData, label) : null;
  const labelPayload = normalizeLabelPayload(label);
  if (!contentHtml.trim() && !receipt && !labelPayload) {
    throw new Error("Nothing to print.");
  }

  const cfg = normalizePrinterConfig(printerConfig || {});

  const printerType = mapPrinterType(cfg.printer_type);
  const connectionType = mapConnectionType(cfg);
  const jobCopies = Math.max(1, toInt(copies, cfg.copies || 1));
  const printerName = cfg.use_system_default ? "" : cfg.printer_name;
  const jobLabelText = typeof label === "string"
    ? String(label || "").trim()
    : String(
      labelPayload?.jobName ||
        labelPayload?.name ||
        labelPayload?.title ||
        "Print Job"
    ).trim();

  const normalizedPrinterFunction = String(printerFunction || "").trim().toLowerCase();
  const userId =
    user?.id === undefined || user?.id === null || user?.id === ""
      ? undefined
      : Number(user.id) || undefined;
  const userName = String(user?.name || "").trim();
  const userEmail = String(user?.email || "").trim();

  const printer = {
    PrinterName: printerName,
    Name: printerName,
    PrinterType: printerType,
    ConnectionType: connectionType,
    HostIp: cfg.host || "",
    Port: cfg.port ? toInt(cfg.port, 0) : undefined,
    Copies: jobCopies,
    UseDefaultPrinter: Boolean(cfg.use_system_default),
    UseSystemDefaultPrinter: Boolean(cfg.use_system_default),
  };

  const basePayload = {
    DocumentType: docType || "generic",
    documentType: docType || "generic",
    PrinterType: printerType,
    printerType,
    ConnectionType: connectionType,
    connectionType,
    PrinterName: printerName,
    printerName: printerName,
    HostIp: cfg.host || "",
    hostIp: cfg.host || "",
    Port: cfg.port ? toInt(cfg.port, 0) : undefined,
    port: cfg.port ? toInt(cfg.port, 0) : undefined,
    Copies: jobCopies,
    copies: jobCopies,
    UseDefaultPrinter: Boolean(cfg.use_system_default),
    useDefaultPrinter: Boolean(cfg.use_system_default),
    UseSystemDefaultPrinter: Boolean(cfg.use_system_default),
    useSystemDefaultPrinter: Boolean(cfg.use_system_default),
    JobLabel: jobLabelText,
    jobLabel: jobLabelText,
    PrinterFunction: normalizedPrinterFunction || undefined,
    printerFunction: normalizedPrinterFunction || undefined,
    Message: contentHtml,
    message: contentHtml,
    Printer: printer,
    printer,
    UserId: userId,
    userId,
    UserName: userName || undefined,
    userName: userName || undefined,
    UserEmail: userEmail || undefined,
    userEmail: userEmail || undefined,
    Label: labelPayload,
    label: labelPayload,
    Receipt: receipt || undefined,
    receipt: receipt || undefined,
  };

  const actions = printerType === "Tspl" || labelPayload ? LABEL_ACTIONS : PRINT_ACTIONS;
  return runActionCandidates(basePayload, actions, {
    timeoutMs: PRINT_REQUEST_TIMEOUT_MS,
    retryOnTimeout: false,
  });
};

export const getLocalPrinterServiceInstallerUrl = () => {
  const base = String(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
  return `${base}/local-printer-service/installer`;
};

export const getLocalPrinterServiceInstallerMeta = async () => {
  const res = await api.get("/local-printer-service/meta");
  return res.data?.data || null;
};

export const getPrintConfigDeviceId = () => getPrintDeviceId();
