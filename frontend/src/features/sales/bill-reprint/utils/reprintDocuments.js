import { fetchReceiptCompanyInfo } from "@/features/printing/utils/receiptCompanyInfo";
import { buildPosReturnReceiptHtml, buildPosSaleReceiptHtml } from "@/features/printing/utils/posReceiptHtml";
import { buildSimplePosReturnReceiptData, buildSimplePosSaleReceiptData } from "@/features/printing/utils/posSaleReceiptPrinter";
import { buildDocumentPrintHtml } from "@/features/printing/utils/documentPrintHtml";
import { markReprint } from "@/features/printing/utils/reprintStamp";
import { fetchSalesReceiptCustomization } from "@/features/sales/customisation/utils/salesReceiptCustomisation";

/**
 * Sales > Bill Reprint: where each document type is read from and how it prints. POS bills and returns use the
 * store's own receipt (thermal or A4, from Sales Customisation); dealer documents and customer orders use the A4
 * layout in documentPrintHtml.js. Every reprint carries the small DUPLICATE mark (reprintStamp.js).
 */
export const REPRINT_TYPES = [
  { value: "pos_sale", label: "POS bill", detail: (id) => `/pos-sales/${id}`, docType: "pos_sale_receipt" },
  { value: "pos_return", label: "POS return", detail: (id) => `/pos-returns/${id}`, docType: "pos_return_receipt" },
  { value: "dealer_invoice", label: "Dealer invoice", detail: (id) => `/dealer-invoices/${id}`, docType: "dealer_invoice" },
  { value: "dealer_return", label: "Dealer return", detail: (id) => `/dealer-invoice-returns/${id}`, docType: "dealer_return" },
  { value: "dealer_receipt", label: "Dealer receipt", detail: (id) => `/dealer-receipts/${id}`, docType: "dealer_receipt" },
  { value: "customer_order", label: "Customer order", detail: (id) => `/customer-orders/${id}`, docType: "customer_order" },
];

export const reprintType = (value) => REPRINT_TYPES.find((type) => type.value === value);

/** Requests for one store's documents carry that store, so "All stores" reprints read and log in the bill's own store. */
export const storeApi = (api, storeId) => ({
  get: (url, config = {}) => api.get(url, { ...config, ...(storeId ? { storeScopeId: storeId } : {}) }),
  post: (url, body, config = {}) => api.post(url, body, { ...config, ...(storeId ? { storeScopeId: storeId } : {}) }),
});

/** Safe file name for a shared PDF: "Dealer-invoice-D261116-0001.pdf". */
export const reprintFilename = (row) => `${(reprintType(row.type)?.label || "Bill").replace(/\s+/g, "-")}-${String(row.number || row.id).replace(/[^\w.-]+/g, "-")}.pdf`;

/** The short WhatsApp text that goes with a shared bill. */
export const reprintMessage = (row, storeName) => {
  const amount = `₹${Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `Dear ${row.customer_name || "Customer"}, please find your ${(reprintType(row.type)?.label || "bill").toLowerCase()} ${row.number} for ${amount}.${storeName ? ` – ${storeName}` : ""}`;
};

/**
 * Fetches one document and builds its reprint: { html, printMode, docType, label, isReceipt, receiptData, storeName }.
 * stamp: { count, at, user, copyLabel } for the DUPLICATE mark (omit for a plain copy, e.g. a WhatsApp PDF).
 */
export const buildReprint = async (api, row, stamp) => {
  const scoped = storeApi(api, row.store_id);
  const type = reprintType(row.type);
  if (!type) throw new Error("Unknown document type.");
  const [res, companyInfo, customization] = await Promise.all([
    scoped.get(type.detail(row.id)),
    fetchReceiptCompanyInfo(row.store_id),
    fetchSalesReceiptCustomization(scoped, row.store_id, { fallbackToLocal: true }),
  ]);
  const doc = res.data?.data || {};
  const printMode = customization?.printMode === "browser" ? "browser" : "direct";
  const label = `Reprint-${row.number || row.id}`;

  if (row.type === "pos_sale" || row.type === "pos_return") {
    const receiptData = row.type === "pos_sale"
      ? await buildSimplePosSaleReceiptData(doc, {
        authUser: { name: doc.user_name || doc.user?.name || "", counter_name: doc.counter_name || "" },
        customerName: doc.customer?.name || doc.customer_name || row.customer_name,
        receiptCustomization: customization,
        companyInfo,
      })
      : await buildSimplePosReturnReceiptData(doc, { receiptCustomization: customization, companyInfo });
    const html = (row.type === "pos_sale" ? buildPosSaleReceiptHtml : buildPosReturnReceiptHtml)(receiptData, customization);
    const a4 = String(receiptData.paperSize || customization?.receiptWidthInches || "").toUpperCase() === "A4";
    return {
      html: stamp ? markReprint(html, stamp, { paper: a4 ? "a4" : "thermal" }) : html,
      receiptData: { ...receiptData, reprint: Boolean(stamp) },
      printMode, docType: type.docType, label, isReceipt: true, storeName: companyInfo.storeName,
      paperSize: a4 ? "A4" : receiptData.paperSize,
    };
  }

  const html = buildDocumentPrintHtml(row.type, doc, { companyInfo });
  return {
    html: stamp ? markReprint(html, stamp, { paper: "a4" }) : html,
    receiptData: null, printMode, docType: type.docType, label, isReceipt: false, storeName: companyInfo.storeName, paperSize: "A4",
  };
};
