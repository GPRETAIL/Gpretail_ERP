import api from "../api/axios";
import { getPrintDeviceId } from "./printDevice";

const QZ_SCRIPT_CANDIDATES = [
  "/qz-tray.js",
  "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js",
];

let scriptLoadPromise = null;
let websocketConnectPromise = null;

const getQz = () => window.qz;

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-qz-src="${src}"]`);
    if (existing) {
      if (getQz()) {
        resolve(true);
        return;
      }
      if (existing.dataset.loaded === "true") {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.qzSrc = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(true);
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });

export const ensureQzLoaded = async () => {
  if (getQz()) return getQz();

  if (!scriptLoadPromise) {
    scriptLoadPromise = (async () => {
      for (const src of QZ_SCRIPT_CANDIDATES) {
        try {
          await loadScript(src);
          if (getQz()) return getQz();
        } catch {
          // Try next source.
        }
      }
      throw new Error("QZ Tray JavaScript library could not be loaded.");
    })();
  }

  return scriptLoadPromise;
};

export const ensureQzConnected = async () => {
  const qz = await ensureQzLoaded();

  if (typeof qz.api?.setPromiseType === "function") {
    // QZ expects a promise factory function, not the Promise constructor directly.
    qz.api.setPromiseType((resolver) => new Promise(resolver));
  }

  // Optional insecure setup for local intranet use.
  if (typeof qz.security?.setCertificatePromise === "function") {
    qz.security.setCertificatePromise(() => Promise.resolve(null));
  }
  if (typeof qz.security?.setSignaturePromise === "function") {
    qz.security.setSignaturePromise(() => Promise.resolve(null));
  }

  if (qz.websocket.isActive()) {
    return qz;
  }

  if (!websocketConnectPromise) {
    websocketConnectPromise = (async () => {
      const preferSecure = window.location.protocol === "https:";
      const secureModes = preferSecure ? [true, false] : [false, true];
      const hosts = ["localhost", "localhost.qz.io"];

      let lastError = null;
      for (const usingSecure of secureModes) {
        for (const host of hosts) {
          try {
            await qz.websocket.connect({
              host,
              usingSecure,
              retries: 0,
              delay: 0,
            });
            return qz;
          } catch (err) {
            lastError = err;
          }
        }
      }

      const reason = lastError?.message || "Could not establish websocket session";
      throw new Error(
        `Unable to connect to QZ Tray. Please start QZ Tray desktop app and allow this site. ${reason}`
      );
    })().finally(() => {
      websocketConnectPromise = null;
    });
  }

  await websocketConnectPromise;
  return qz;
};

export const disconnectQz = async () => {
  const qz = getQz();
  if (qz?.websocket?.isActive?.()) {
    await qz.websocket.disconnect();
  }
  websocketConnectPromise = null;
};

export const getAvailablePrinters = async () => {
  const qz = await ensureQzConnected();
  const result = await qz.printers.find();
  if (Array.isArray(result)) return result;
  if (!result) return [];
  return [result];
};

export const fetchSavedPrinterConfig = async ({ docType = "generic", companyId } = {}) => {
  const deviceId = getPrintDeviceId();
  const attempts = [];
  const addAttempt = (doc, comp) => {
    const key = `${doc || ""}::${comp || ""}`;
    if (!attempts.some((x) => x.key === key)) {
      attempts.push({ key, doc, comp });
    }
  };

  addAttempt(docType || "generic", companyId);
  if (docType !== "generic") addAttempt("generic", companyId);
  if (companyId) addAttempt(docType || "generic", undefined);
  if (companyId && docType !== "generic") addAttempt("generic", undefined);

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const params = { doc_type: attempt.doc, device_id: deviceId };
      if (attempt.comp) params.company_id = attempt.comp;
      const res = await api.get("/printer-configs/resolve", { params });
      const data = res.data?.data || null;
      if (data) return data;
    } catch (err) {
      lastError = err;
      // Continue trying fallback resolution paths.
    }
  }

  if (lastError) throw lastError;
  return null;
};

const makeQzConfig = (qz, printerConfig = {}) => {
  const target = String(printerConfig.printer_name || "").trim() || null;
  const options = {};

  if (printerConfig.host) options.host = printerConfig.host;
  if (printerConfig.port) {
    const parsed = Number(printerConfig.port);
    if (Number.isFinite(parsed) && parsed > 0) options.port = parsed;
  }

  const copies = Number(printerConfig.copies);
  if (Number.isFinite(copies) && copies > 0) options.copies = Math.floor(copies);

  return qz.configs.create(target, options);
};

export const printHtmlWithQz = async ({ html, printerConfig }) => {
  if (!html || !String(html).trim()) {
    throw new Error("Nothing to print.");
  }

  const qz = await ensureQzConnected();
  const cfg = makeQzConfig(qz, printerConfig || {});

  const data = [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: html,
    },
  ];

  await qz.print(cfg, data);
};

export const printHtmlWithSavedConfig = async ({ html, docType = "generic", companyId } = {}) => {
  const config = await fetchSavedPrinterConfig({ docType, companyId });
  if (!config) {
    throw new Error(`No printer configuration found for '${docType}'.`);
  }
  await printHtmlWithQz({ html, printerConfig: config });
  return config;
};
