import { fetchReceiptCompanyInfo, requireReceiptStoreName, getReceiptCompanyId } from "./receiptCompanyInfo";
import { buildPosSaleReceiptHtml } from "./posReceiptHtml";
import {
  fetchSalesReceiptCustomization,
  getSalesReceiptPaperSize,
  getPosBillBarcodeValue,
  getPosReturnBarcodeValue,
  buildReceiptCodeMarkupAsync,
  buildPaymentQrMarkup,
  DEFAULT_SALES_RECEIPT_MESSAGE,
} from "@/features/sales/customisation/utils/salesReceiptCustomisation";

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

const clampReceiptCopies = (value) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, n));
};

const WALKING_CUSTOMER_NAME = "Walking customer";

// PosSale itself has no cash_amount/card_amount/upi_amount columns - the real tender
// breakdown lives in its `payments` relation (each row's own `payment_mode`), same as
// the desktop POS Sales page's own copy of this logic.
const getSaleReceiptPaymentMethod = (sale = {}) => {
  const payments = Array.isArray(sale?.payments) ? sale.payments : [];
  if (payments.length > 0) {
    const modes = [...new Set(payments.map((p) => String(p.payment_mode || "").trim()).filter(Boolean))];
    if (modes.length > 0) {
      return modes.map((mode) => mode.charAt(0) + mode.slice(1).replaceAll("_", " ").toLowerCase()).join(" / ");
    }
  }
  if (sale?.payment_mode) {
    const mode = String(sale.payment_mode).trim();
    return mode.charAt(0) + mode.slice(1).toLowerCase();
  }
  return "";
};

/** Avoid window.open after async save -- browsers block it as a popup. Uses a hidden iframe + print(). */
export const browserPrintHtml = (html, { copies = 1 } = {}) => {
  const n = Math.min(3, Math.max(1, Number.parseInt(copies, 10) || 1));
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;width:0;height:0;border:none;left:0;top:0;opacity:0;pointer-events:none"
  );
  iframe.setAttribute("title", "Receipt print");
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return false;
  }
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // ignore
    }
  };

  const runPrint = () => {
    try {
      win.focus();
      let remaining = n;
      const next = () => {
        win.print();
        remaining -= 1;
        if (remaining > 0) {
          setTimeout(next, 450);
        } else {
          setTimeout(cleanup, 600);
        }
      };
      next();
    } catch {
      cleanup();
    }
  };

  if (doc.readyState === "complete") {
    setTimeout(runPrint, 80);
  } else {
    iframe.onload = () => setTimeout(runPrint, 80);
  }
  return true;
};

/**
 * Builds the same receiptData shape the desktop POS Sales page's printSaleReceipt()
 * builds, but from only the saved-sale API response plus caller-supplied context --
 * no dependency on desktop-only live UI state (split payment forms, applied returns,
 * in-progress cart totals). Used by simpler checkout flows (mobile Create Invoice)
 * that still want the exact same receipt template/format as the desktop POS.
 */
export const buildSimplePosSaleReceiptData = async (
  savedSale,
  { authUser, customerName, receiptCustomization, companyInfo } = {}
) => {
  const items = savedSale?.items || [];
  const billNumber = savedSale?.bill_no ?? savedSale?.id;
  const displayBillNo = getPosBillBarcodeValue(billNumber);
  const storeName =
    requireReceiptStoreName(companyInfo);
  const grandTotal = round2(toNum(savedSale?.grand_total, 0));

  const receiptItems = items.map((item) => {
    const qty = Math.max(0, toNum(item.quantity, 0));
    const rate = Math.max(0, toNum(item.selling_price, 0));
    const taxPerc = Math.max(0, toNum(item.tax_rate, 0));
    const discountAmount = round2(Math.max(0, toNum(item.discount, 0)));
    const taxAmount = round2(toNum(item.tax_amount, 0));
    const amount = round2(toNum(item.subtotal, qty * rate - discountAmount + taxAmount));
    const subtotal = round2(amount - taxAmount);

    return {
      name: String(item.product?.name || item.barcode?.product_name || "-").trim(),
      qty,
      rate,
      taxPerc,
      taxName: item.tax_name || "",
      taxType: item.tax_type || "",
      baseAmount: subtotal,
      taxAmount,
      discountAmount,
      amount,
      code: item.barcode?.barcode || item.product?.barcode || "",
      hsnCode: item.product?.hsn_code || "",
    };
  });

  return {
    storeName,
    storeAddress: companyInfo?.storeAddress || "",
    storePhone: companyInfo?.storePhone || "",
    storeGstNo: companyInfo?.storeGstNo || "",
    billNo: displayBillNo,
    billBarcode: displayBillNo,
    dateTime: savedSale?.sale_date || new Date().toISOString(),
    cashierName: String(authUser?.name || authUser?.email || "").trim(),
    counterName: String(authUser?.counter_name || savedSale?.counter_name || "").trim(),
    customerName: customerName || WALKING_CUSTOMER_NAME,
    paperSize: getSalesReceiptPaperSize(receiptCustomization?.receiptWidthInches),
    items: receiptItems,
    billAmount: round2(toNum(savedSale?.subtotal, 0) + Math.max(0, toNum(savedSale?.discount_amount, 0))),
    discountAmount: Math.max(0, toNum(savedSale?.discount_amount, 0)),
    taxAmount: round2(toNum(savedSale?.tax_amount, 0)),
    returnAdjustment: 0,
    refundAmount: 0,
    appliedReturnNo: savedSale?.applied_return_no || "",
    returnItems: [],
    total: grandTotal,
    paidAmount: Math.max(0, toNum(savedSale?.paid_amount, 0)),
    receivedAmount: Math.max(0, toNum(savedSale?.paid_amount, 0)),
    balanceAmount: 0,
    changeAmount: Math.max(0, toNum(savedSale?.change_amount, 0)),
    paymentMethod: getSaleReceiptPaymentMethod(savedSale),
    generalTaxVisible: Boolean(receiptCustomization?.generalFields?.tax?.visible),
    generalPaidVisible: Boolean(receiptCustomization?.generalFields?.paid?.visible),
    generalReceivedVisible: Boolean(receiptCustomization?.generalFields?.receivedAmount?.visible),
    generalBalanceVisible: Boolean(receiptCustomization?.generalFields?.balanceAmt?.visible),
    generalYouSavedVisible: Boolean(receiptCustomization?.generalFields?.youSaved?.visible),
    loyalty: savedSale?.loyalty || null, // points redeemed / earned / balance (sale response)
    vouchers: savedSale?.vouchers || [], // gift vouchers, credit notes and coupons the bill used (sale response)
    footerNote: "",
    message: receiptCustomization?.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
    billCodeMarkup: await buildReceiptCodeMarkupAsync(displayBillNo, receiptCustomization, "bill"),
    paymentQrMarkup: await buildPaymentQrMarkup(receiptCustomization, {
      billAmount: grandTotal,
      billNo: displayBillNo,
      storeName,
    }),
  };
};


/**
 * The POS return receipt's data from a saved return alone (GET /pos-returns/{id}), like buildSimplePosSaleReceiptData:
 * no POS Return screen state, so Bill Reprint prints a return exactly as the counter printed it.
 */
export const buildSimplePosReturnReceiptData = async (savedReturn, { cashierName, counterName, receiptCustomization, companyInfo } = {}) => {
  const displayReturnNo = getPosReturnBarcodeValue(savedReturn?.display_return_no || savedReturn?.return_no || savedReturn?.id);
  const items = (savedReturn?.items || []).map((item) => {
    const qty = Math.max(0, toNum(item.quantity, 0));
    const rate = Math.max(0, toNum(item.refund_price, 0));
    const discountAmount = round2(Math.max(0, toNum(item.discount, 0)));
    const taxAmount = round2(toNum(item.tax_amount, 0));
    const amount = round2(Math.abs(toNum(item.subtotal, qty * rate - discountAmount + taxAmount)));
    return {
      name: String(item.product?.name || "-").trim(), qty, rate, taxPerc: Math.max(0, toNum(item.tax_rate, 0)),
      taxName: item.tax_name || "", taxType: item.tax_type || "", baseAmount: round2(amount - taxAmount), taxAmount,
      discountAmount, amount, code: item.product?.barcode || "",
    };
  });
  const discount = round2(items.reduce((sum, item) => sum + item.discountAmount, 0));
  const net = round2(-Math.abs(toNum(savedReturn?.total_refund, 0)));
  const fields = receiptCustomization?.generalFields || {};

  return {
    storeName: requireReceiptStoreName(companyInfo),
    storeAddress: companyInfo?.storeAddress || "", storePhone: companyInfo?.storePhone || "", storeGstNo: companyInfo?.storeGstNo || "",
    billNo: displayReturnNo, billBarcode: displayReturnNo,
    dateTime: savedReturn?.return_date || new Date().toISOString(),
    cashierName: String(cashierName || savedReturn?.creator?.name || "").trim(),
    counterName: String(counterName || "").trim(),
    customerName: String(savedReturn?.customer?.name || "").trim() || WALKING_CUSTOMER_NAME,
    sourceBillNo: savedReturn?.pos_sale?.bill_no || savedReturn?.source_bill_no || "",
    returnReason: String(savedReturn?.return_reason_name || "").trim(),
    paperSize: getSalesReceiptPaperSize(receiptCustomization?.receiptWidthInches),
    items,
    billAmount: round2(net - discount), discountAmount: discount,
    taxAmount: round2(items.reduce((sum, item) => sum + item.taxAmount, 0)),
    total: net, paidAmount: 0, receivedAmount: 0, balanceAmount: 0, paymentMethod: "Return",
    generalTaxVisible: Boolean(fields.tax?.visible), generalPaidVisible: Boolean(fields.paid?.visible),
    generalReceivedVisible: Boolean(fields.receivedAmount?.visible), generalBalanceVisible: Boolean(fields.balanceAmt?.visible),
    generalYouSavedVisible: Boolean(fields.youSaved?.visible),
    message: receiptCustomization?.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
    returnCodeMarkup: await buildReceiptCodeMarkupAsync(displayReturnNo, receiptCustomization, "return"),
  };
};


/**
 * Prints a just-saved POS sale's receipt using the exact same template builder, store
 * customization (Sales Customisation page), and silent/browser print pipeline as the
 * desktop POS Sales page -- so an invoice created from the mobile app prints identically
 * to one created from the desktop app.
 *
 * @param savedSale - the `data` object returned by POST /pos-sales
 * @param queuePrintHtml - `usePrintContext().queuePrintHtml` (silent print via the local
 *   print-connector WS service when the store's customization has printMode !== "browser")
 */
/**
 * Builds the receipt HTML (plus the underlying data/customization) for a
 * saved sale without printing it - split out of printPosSaleReceipt so
 * anything else that needs the same receipt document (Share Receipt via
 * the Web Share API, a future PDF preview, etc.) assembles it the exact
 * same way instead of re-deriving it.
 */
export const buildPosSaleReceiptHtmlForSale = async (
  savedSale,
  { api, authUser, customerName } = {}
) => {
  const companyId = getReceiptCompanyId(savedSale, authUser);
  const [companyInfo, receiptCustomization] = await Promise.all([
    fetchReceiptCompanyInfo(companyId),
    fetchSalesReceiptCustomization(api, companyId, { fallbackToLocal: true }),
  ]);

  const receiptData = await buildSimplePosSaleReceiptData(savedSale, {
    authUser,
    customerName,
    receiptCustomization,
    companyInfo,
  });

  const html = buildPosSaleReceiptHtml(receiptData, receiptCustomization);
  return { html, receiptData, receiptCustomization };
};

export const printPosSaleReceipt = async (
  savedSale,
  { api, authUser, customerName, queuePrintHtml } = {}
) => {
  const companyId = authUser?.company_id;
  const { html, receiptData, receiptCustomization } = await buildPosSaleReceiptHtmlForSale(savedSale, {
    api,
    authUser,
    customerName,
  });

  const printCopies = clampReceiptCopies(receiptCustomization?.posReceiptPrintCopies);
  const isDirectPrint = receiptCustomization?.printMode !== "browser";

  if (isDirectPrint && queuePrintHtml) {
    await queuePrintHtml(html, {
      label: `POSSale-${savedSale?.bill_no ?? savedSale?.id ?? ""}`,
      docType: "pos_sale_receipt",
      copies: printCopies,
      companyId,
      receiptData,
    });
    return;
  }

  browserPrintHtml(html, { copies: printCopies });
};
