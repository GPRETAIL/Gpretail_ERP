import { useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import api from "@/shared/api/apiClient";
import { usePrintContext } from "@/features/printing/context/PrintContext";
import { browserPrintHtml } from "@/features/printing/utils/posSaleReceiptPrinter";
import { buildReprint, reprintFilename, reprintMessage, storeApi } from "../utils/reprintDocuments";
import { sharePdf } from "../utils/sharePdf";

/**
 * Reprint (or share) one document and log it. A silent print is logged only once the print connector reports the job
 * done, so a failed or cancelled print is not counted; a browser print is logged once the print dialog opens.
 * Ask for the reason / approval first (row.reason_required, row.approval_required): the log enforces both.
 */
export default function useBillReprint() {
  const authUser = useSelector((state) => state.auth.user);
  const { printHtml, jobs, STATUS } = usePrintContext();
  const waiting = useRef(new Map()); // print job id -> { resolve, reject }

  const settle = useCallback((list) => {
    waiting.current.forEach((handlers, jobId) => {
      const job = list.find((j) => j.id === jobId);
      if (!job || [STATUS.QUEUED, STATUS.PRINTING].includes(job.status)) return;
      waiting.current.delete(jobId);
      if (job.status === STATUS.DONE) handlers.resolve();
      else handlers.reject(new Error(job.error || "The print was cancelled."));
    });
  }, [STATUS]);
  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
    settle(jobs);
  }, [jobs, settle]);

  const log = useCallback(async (row, { copyLabel, reason, approvalToken, channel = "print" } = {}) => {
    const res = await storeApi(api, row.store_id).post(`/bill-reprints/${row.type}/${row.id}/log`, {
      copy_label: copyLabel || null, reason: reason?.trim() || null, channel, ...(approvalToken ? { approvalToken } : {}),
    });
    return res.data?.data;
  }, []);

  const stampFor = useCallback((row, copyLabel) => ({
    count: Number(row.print_count || 0) + 1, at: new Date(), user: authUser?.name || authUser?.username || "", copyLabel,
  }), [authUser?.name, authUser?.username]);

  /**
   * Prints one document; resolves with the log entry ({ count, ... }) once printed and logged.
   * options.original: the first print right after saving (no DUPLICATE mark, not logged).
   */
  const print = useCallback(async (row, options = {}) => {
    const built = await buildReprint(api, row, options.original ? null : stampFor(row, options.copyLabel));
    if (built.printMode === "direct") {
      const jobId = await printHtml(built.html, {
        label: built.label, docType: built.docType, copies: 1, companyId: row.store_id,
        ...(built.isReceipt ? { receiptData: built.receiptData } : {}),
      });
      if (!jobId) throw new Error("The printer service is not connected.");
      await new Promise((resolve, reject) => {
        waiting.current.set(jobId, { resolve, reject });
        settle(jobsRef.current); // in case the job already finished
      });
    } else if (!browserPrintHtml(built.html, { copies: 1 })) {
      throw new Error("Could not open the print window.");
    }
    return options.original ? null : log(row, options);
  }, [log, printHtml, settle, stampFor]);

  /** Shares one document as a PDF (WhatsApp); logged as a share. */
  const share = useCallback(async (row, options = {}) => {
    const built = await buildReprint(api, row, stampFor(row, options.copyLabel));
    const entry = await log(row, { ...options, channel: "share" });
    const result = await sharePdf({ html: built.html, filename: reprintFilename(row), text: reprintMessage(row, built.storeName), phone: row.customer_phone,
      paperSize: built.paperSize });
    return { ...entry, result };
  }, [log, stampFor]);

  return { print, share, log };
}
