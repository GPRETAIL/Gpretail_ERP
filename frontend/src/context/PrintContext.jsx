/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  connectLocalPrinterService,
  detectLocalPrinterService,
  disconnectLocalPrinterService,
  getServicePrinters,
  isLocalPrinterServiceConnected,
  printWithLocalService,
} from "../utils/localPrinterService";
import { renderPrintableHtmlToImageJob } from "../utils/renderPrintableHtml";
import { loadSalesReceiptCustomization } from "../utils/salesReceiptCustomization";
import { buildEscposReceiptJob, isEscposReceiptEligible } from "../utils/escposReceiptBuilder";

const PrintContext = createContext(null);

// Detection walks every ws/wss candidate, so it needs a budget bigger than a single probe.
const DETECT_TIMEOUT_MS = 3000;
const DETECT_RETRY_MS = 20000;

const STATUS = {
  QUEUED: "queued",
  PRINTING: "printing",
  DONE: "done",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const shouldRenderReceiptAsImage = (job) =>
  Boolean(
    job?.receiptData &&
      String(job?.html || "").trim() &&
      /receipt/i.test(String(job?.docType || ""))
  );

const resolvePrinterFunction = (job) => {
  const explicit = String(job?.printerFunction || "").trim().toLowerCase();
  if (explicit) return explicit;
  if (/receipt/i.test(String(job?.docType || ""))) return "receipt";
  return "a4";
};

let jobCounter = 0;

export const PrintProvider = ({ children }) => {
  const authUser = useSelector((state) => state.auth.user);
  const [printer, setPrinter] = useState(null); // service info
  const [serviceDetected, setServiceDetected] = useState(false);
  const [jobs, setJobs] = useState([]);
  const processingRef = useRef(false);
  const cancelledRef = useRef(new Set());

  const connectPrinter = useCallback(async ({ silent = false } = {}) => {
    const info = await connectLocalPrinterService();
    let printerInfo = {
      printers: [],
      selectedPrinterName: "",
      selectedPrinterNames: [],
      selectedTransport: "printer",
      selectedBluetoothDeviceName: "",
      printerRoutes: [],
    };
    try {
      printerInfo = await getServicePrinters();
    } catch (err) {
      // The service counts as connected even if the printer-list action is unsupported, but
      // swallowing this silently is what hid a hard ReferenceError here for three days -- the
      // page reported "connected" while showing an empty printer list.
      console.error("Printer service connected but returned no printer list:", err);
    }

    const next = {
      ...info,
      type: "local_service",
      name: info?.name || "GP Retail Printer Service",
      printers: Array.isArray(printerInfo?.printers) ? printerInfo.printers : [],
      selectedPrinterName: String(printerInfo?.selectedPrinterName || "").trim(),
      selectedPrinterNames: Array.isArray(printerInfo?.selectedPrinterNames)
        ? printerInfo.selectedPrinterNames
        : [],
      selectedTransport: String(printerInfo?.selectedTransport || "printer").trim() || "printer",
      selectedBluetoothDeviceName: String(printerInfo?.selectedBluetoothDeviceName || "").trim(),
      printerRoutes: Array.isArray(printerInfo?.printerRoutes) ? printerInfo.printerRoutes : [],
      connectedAt: Date.now(),
    };
    setPrinter(next);
    setServiceDetected(true);
    if (!silent) toast.success(`${next.name} connected`);
    return next;
  }, []);

  const ensurePrinterSession = useCallback(async () => {
    if (printer) return printer;

    const detected = await detectLocalPrinterService({ timeoutMs: DETECT_TIMEOUT_MS });
    setServiceDetected(detected);
    if (!detected) {
      throw new Error(
        "Printer connector is not available on this machine. Install or start the local printer service."
      );
    }

    return connectPrinter({ silent: true });
  }, [connectPrinter, printer]);

  const disconnect = useCallback(async () => {
    if (!printer) return;
    await disconnectLocalPrinterService();
    toast.info(`${printer.name || "Printer service"} disconnected`);
    setPrinter(null);
  }, [printer]);

  const sessionConnected = !!printer;
  const connected = sessionConnected || serviceDetected;

  // Detection used to run exactly once at mount. If the connector was still starting -- or the
  // operator launched it after opening the app -- `connected` stayed false for the whole session
  // and every receipt silently fell back to the browser's print dialog. Re-probe while
  // disconnected, and again whenever the tab regains focus.
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const probe = async () => {
      if (cancelled || isLocalPrinterServiceConnected()) return;
      try {
        const detected = await detectLocalPrinterService({ timeoutMs: DETECT_TIMEOUT_MS });
        if (cancelled) return;
        setServiceDetected(detected);
        if (detected && !isLocalPrinterServiceConnected()) {
          await connectPrinter({ silent: true });
        }
      } catch {
        if (!cancelled) setServiceDetected(false);
      }
    };

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (!isLocalPrinterServiceConnected()) {
          await probe();
        }
        schedule();
      }, DETECT_RETRY_MS);
    };

    const onFocus = () => {
      if (!isLocalPrinterServiceConnected()) {
        probe();
      }
    };

    probe();
    schedule();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [connectPrinter]);

  const updateJob = useCallback((jobId, patch) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
  }, []);

  const cleanupJobs = useCallback(() => {
    const cutoff = Date.now() - 8000;
    setJobs((prev) =>
      prev.filter(
        (j) =>
          j.status === STATUS.QUEUED ||
          j.status === STATUS.PRINTING ||
          j.createdAt > cutoff
      )
    );
  }, []);

  const processQueue = useCallback(
    async (queue) => {
      if (processingRef.current) return;
      processingRef.current = true;

      for (const job of queue) {
        if (cancelledRef.current.has(job.id)) {
          updateJob(job.id, { status: STATUS.CANCELLED });
          cancelledRef.current.delete(job.id);
          continue;
        }

        const totalCopies = job.totalCopies || 1;
        updateJob(job.id, { status: STATUS.PRINTING, currentCopy: 1, totalCopies });

        try {
          let html = job.html;
          let receiptData = job.receiptData;
          let label = job.label;
          let escposHandled = false;

          if (shouldRenderReceiptAsImage(job)) {
            try {
              const customization = loadSalesReceiptCustomization(job.companyId);
              if (isEscposReceiptEligible(job.receiptData, customization)) {
                const kind = /return/i.test(String(job.docType || "")) ? "return" : "sale";
                const escposJob = buildEscposReceiptJob(job.receiptData, customization, {
                  kind,
                  jobName: String(job.label || "Receipt").trim() || "Receipt",
                });
                html = "";
                receiptData = null;
                label = escposJob;
                escposHandled = true;
              }
            } catch (escposErr) {
              // Falls through to the existing image-render attempt below - printing can only get
              // faster or stay exactly as reliable as it is today, never worse.
              console.error("ESC/POS fast-path receipt build failed, falling back to rendered image:", escposErr);
            }
          }

          if (!escposHandled && shouldRenderReceiptAsImage(job)) {
            try {
              const rendered = await renderPrintableHtmlToImageJob(job.html);
              if (rendered?.imageDataUrl) {
                html = "";
                receiptData = null;
                label = {
                  kind: "rendered_sheet_v1",
                  jobName: String(job.label || "Receipt").trim() || "Receipt",
                  imageDataUrl: rendered.imageDataUrl,
                  pageWidthMm: rendered.pageWidthMm,
                  pageHeightMm: rendered.pageHeightMm,
                };
              }
            } catch (renderErr) {
              // Falls through to the bare structured receipt payload below (no store info, no
              // barcode/QR, no format styling) - surface this loudly rather than silently
              // degrading to a receipt that looks nothing like the customization preview.
              console.error("Receipt image rasterization failed, falling back to plain structured print:", renderErr);
            }
          }

          await printWithLocalService({
            html,
            receiptData,
            label,
            copies: totalCopies,
            docType: job.docType || "generic",
            companyId: job.companyId,
            printerConfig: job.printerConfig || null,
            printerFunction: resolvePrinterFunction(job),
            user: {
              id: authUser?.id,
              name: authUser?.name,
              email: authUser?.email,
            },
          });

          updateJob(job.id, {
            status: STATUS.DONE,
            completedCopies: totalCopies,
            currentCopy: totalCopies,
          });
        } catch (err) {
          const message = err?.message || "Print failed";
          updateJob(job.id, {
            status: STATUS.FAILED,
            error: message,
            completedCopies: 0,
            currentCopy: 1,
          });
          toast.error(`Print error: ${message}`);
        }
      }

      processingRef.current = false;
      setTimeout(cleanupJobs, 10000);
    },
    [authUser?.email, authUser?.id, authUser?.name, cleanupJobs, updateJob]
  );

  const enqueue = useCallback(
    ({
      html,
      receiptData,
      label = "Print Job",
      copies = 1,
      docType = "generic",
      companyId,
      printerConfig,
      printerFunction,
    }) => {
      const job = {
        id: `pj-${++jobCounter}`,
        html,
        receiptData,
        label,
        docType,
        companyId,
        printerConfig,
        printerFunction,
        totalCopies: Math.max(1, Number(copies) || 1),
        currentCopy: 0,
        completedCopies: 0,
        status: STATUS.QUEUED,
        error: null,
        createdAt: Date.now(),
      };

      setJobs((prev) => {
        const next = [...prev, job];
        const queued = next.filter((j) => j.status === STATUS.QUEUED);
        if (!processingRef.current && queued.length > 0) {
          setTimeout(() => processQueue(queued), 0);
        }
        return next;
      });

      return job.id;
    },
    [processQueue]
  );

  const printReceipt = useCallback(
    async (
      receiptData,
      {
        html = "",
        label = "Receipt",
        copies = 1,
        docType = "generic",
        companyId,
        printerConfig,
        printerFunction,
      } = {}
    ) => {
      if (!connected) {
        try {
          await ensurePrinterSession();
        } catch (err) {
          toast.error(
            err?.message ||
              "Printer service is not connected. Connect it in Settings > Printing Configuration."
          );
          return null;
        }
      }
      return enqueue({
        html,
        receiptData,
        label,
        copies,
        docType,
        companyId,
        printerConfig,
        printerFunction,
      });
    },
    [connected, enqueue, ensurePrinterSession]
  );

  const printHtml = useCallback(
    async (
      html,
      {
        label = "Document",
        copies = 1,
        docType = "generic",
        companyId,
        printerConfig,
        receiptData,
        printerFunction,
      } = {}
    ) => {
      if (!connected) {
        try {
          await ensurePrinterSession();
        } catch (err) {
          toast.error(
            err?.message ||
              "Printer service is not connected. Connect it in Settings > Printing Configuration."
          );
          return null;
        }
      }
      return enqueue({
        html,
        receiptData,
        label,
        copies,
        docType,
        companyId,
        printerConfig,
        printerFunction,
      });
    },
    [connected, enqueue, ensurePrinterSession]
  );

  const cancelJob = useCallback((jobId) => {
    cancelledRef.current.add(jobId);
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        if (j.status === STATUS.QUEUED) return { ...j, status: STATUS.CANCELLED };
        return j;
      })
    );
  }, []);

  const clearFinished = useCallback(() => {
    setJobs((prev) =>
      prev.filter((j) => j.status === STATUS.QUEUED || j.status === STATUS.PRINTING)
    );
  }, []);

  // Re-submits a failed job's original content as a fresh queued job - everything enqueue() needs
  // is already sitting on the stored job object from when it was first submitted.
  const retryJob = useCallback((jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    enqueue({
      html: job.html,
      receiptData: job.receiptData,
      label: job.label,
      copies: job.totalCopies,
      docType: job.docType,
      companyId: job.companyId,
      printerConfig: job.printerConfig,
      printerFunction: job.printerFunction,
    });
  }, [jobs, enqueue]);

  const activeJobs = jobs.filter(
    (j) => j.status === STATUS.QUEUED || j.status === STATUS.PRINTING
  );
  const hasActiveJobs = activeJobs.length > 0;
  const currentJob = jobs.find((j) => j.status === STATUS.PRINTING) || null;

  const value = {
    printer,
    connected,
    sessionConnected,
    serviceDetected,
    connectPrinter,
    disconnect,
    jobs,
    activeJobs,
    hasActiveJobs,
    currentJob,
    printReceipt,
    printHtml,
    cancelJob,
    retryJob,
    clearFinished,
    STATUS,
    printerConnected: connected,
    queuePrintHtml: printHtml,
  };

  return <PrintContext.Provider value={value}>{children}</PrintContext.Provider>;
};

export const usePrintContext = () => {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error("usePrintContext must be used within PrintProvider");
  return ctx;
};
