import { DEFAULT_SALES_RECEIPT_MESSAGE, getPosBillBarcodeValue } from "../../utils/salesReceiptCustomization";
import { getReceiptCompanyId, requireReceiptStoreName } from "../../utils/receiptCompanyInfo";

export const POS_OLD_SALE_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    saleat: "saleAt", saledate: "saleAt", date: "saleAt",
    amount: "amount", billamount: "amount",
    customerid: "customerId",
    customername: "customerName", customer: "customerName",
    customermobile: "customerMobile", mobile: "customerMobile",
  },
  required: ["amount"],
  sampleFileName: "pos_old_sale_sample.xlsx",
  sampleHeaders: ["company", "saleAt", "amount", "customerName", "customerMobile"],
};

export const mapCustomerRow = (r) => ({
  value: String(r.id),
  label: `${r.name || "Unnamed"}${r.phone ? ` (${r.phone})` : ""}`,
  id: String(r.id),
  name: r.name || "",
  mobileNo: r.phone || "",
});

export const normalize = (v) => String(v || "").trim().toLowerCase();
export const compactBarcode = (v) => String(v || "").replace(/[^0-9a-z]/gi, "").toLowerCase();
export const toNum = (v, f = 0) => { const n = Number(v); return Number.isFinite(n) ? n : f; };
export const toInt = (v, f = 0) => { const n = parseInt(v, 10); return Number.isInteger(n) ? n : f; };
export const round2 = (v) => Math.round((toNum(v, 0) + Number.EPSILON) * 100) / 100;
export const formatMoney = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatEditableDecimal = (value) => {
  const numeric = round2(toNum(value, 0));
  return numeric > 0 ? String(numeric) : "";
};
export const formatQty = (v) => {
  const n = toNum(v, 0);
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
};
export const formatReturnDocNo = (value, prefix = "RR") => `${String(prefix || "RR").toUpperCase()}/${toInt(value, 0)}`;
export const formatPosSaleBillNo = (value) => `SB/${toInt(value, 0)}`;
export const parseBillNoFromInput = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return null;
  const n = parseInt(s.replace(/^sb\//i, ""), 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
};
/** Same as POS Return: only numeric bill shapes go direct to source-bill; anything else is treated as barcode. */
export const isLikelySaleBillInput = (value) => /^(?:sb\/)?\d+$/i.test(String(value || "").trim());
export const stripLeadingBarcodeZeros = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return raw;
  return raw.replace(/^0+/, "") || "0";
};
export const barcodeMatchesReturnScan = (lineBarcode, scannedRaw) => {
  const scanned = String(scannedRaw || "").trim().toLowerCase();
  if (!scanned) return false;
  const lineBc = String(lineBarcode || "").trim().toLowerCase();
  if (lineBc && lineBc === scanned) return true;
  if (/^\d+$/.test(scanned) && lineBc && /^\d+$/.test(lineBc)) {
    if (stripLeadingBarcodeZeros(scanned) === stripLeadingBarcodeZeros(lineBc)) return true;
  }
  return compactBarcode(lineBarcode) === compactBarcode(scannedRaw);
};

export const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
/** Matches POS Return: barcode-only lines are not capped by a source bill. */
export const STANDALONE_MAX_QTY = 999999;
export const WALKING_CUSTOMER_NAME = "Walking customer";
export const isExchangeReturnLine = (line) => Boolean(line?.isExchangeReturn);

export const buildPosOldSaleReceiptPayload = ({
  sale,
  authUser,
  receiptCustomization,
  companyInfo,
  stockRows = [],
  returnItems = [],
  appliedReturnNo = "",
  paymentMethod = "Cash",
  customerNameOverride = "",
}) => {
  const receiptCompanyId = getReceiptCompanyId(sale, { company_id: authUser?.company_id });
  const savedBillNo = sale?.bill_no ?? sale?.billNo;
  const displayBillNo = getPosBillBarcodeValue(savedBillNo);
  // A re-fetched historical sale (last-receipt/lookup-sale) returns the
  // real PosSale columns (grand_total/discount_amount/paid_amount), not
  // the cart-draft field names (amount/totalDiscount/paidCash) - both are
  // handled so reprinting doesn't zero out the whole bill summary.
  const totalAmount = round2(toNum(sale?.grand_total ?? sale?.amount, 0));
  const receiptDiscountAmount = round2(Math.max(0, toNum(sale?.discount_amount ?? sale?.total_discount ?? sale?.totalDiscount, 0)));
  const saleAmount = round2(
    (sale?.items || []).reduce((sum, item) => sum + Math.max(0, toNum(item.subtotal ?? item.total, 0)), 0)
  );
  const paidCash = round2(Math.max(0, toNum(sale?.paid_amount ?? sale?.paid_cash ?? sale?.paidCash, 0)));
  const balanceAmount = round2(Math.max(0, totalAmount - paidCash));
  const receiptItems = (sale?.items || []).map((item) => {
    // A freshly-saved sale (still in memory) uses the cart-line shape
    // (qty/price/discountAmt/barcode); a re-fetched historical sale (via
    // last-receipt/lookup-sale) returns the real PosSaleItem columns
    // instead (quantity/selling_price/discount/tax_rate, product name only
    // under the nested product relation) - both are handled here so
    // reprinting an old bill doesn't silently blank out every line.
    const barcodeId = item.barcode_id ?? item.barcodeId;
    const stockLine = stockRows.find((row) => String(row.id) === String(barcodeId));
    const qty = Math.max(0, toNum(item.quantity ?? item.qty, 0));
    const rate = Math.max(0, toNum(item.selling_price ?? item.price, 0));
    const discountAmount = Math.max(0, toNum(item.discount ?? item.discount_amt ?? item.discountAmt, 0));
    const taxPerc = Math.max(0, toNum(item.tax_rate ?? item.taxPerc ?? stockLine?.tax, 0));
    const grossLineAmount = round2(Math.max(qty * rate - discountAmount, 0));
    const divisor = 1 + (taxPerc / 100);
    const baseAmount = taxPerc > 0 ? round2(grossLineAmount / divisor) : grossLineAmount;
    const taxAmount = round2(grossLineAmount - baseAmount);
    const productName = String(
      item.product?.name
      ?? item.product_name
      ?? item.productName
      ?? item.barcodeRef?.product_name
      ?? item.barcode
      ?? stockLine?.productName
      ?? ""
    ).trim();

    return {
      name: productName || "-",
      qty,
      rate,
      taxPerc,
      taxName: item.tax_name || (taxPerc > 0 ? "GST" : ""),
      taxType: item.tax_type || (taxPerc > 0 ? "GST" : ""),
      baseAmount,
      taxAmount,
      discountAmount,
      amount: grossLineAmount,
      code: item.barcode || item.barcodeRef?.barcode || "",
    };
  });
  const receiptTaxAmount = round2(receiptItems.reduce((sum, item) => sum + toNum(item.taxAmount, 0), 0));
  const receiptCustomerName =
    String(customerNameOverride || sale?.customer_name || sale?.customerName || sale?.customer?.name || "").trim()
    || WALKING_CUSTOMER_NAME;

  return {
    companyId: receiptCompanyId,
    receiptCustomization,
    storeName:
      requireReceiptStoreName(companyInfo),
    storeAddress: companyInfo?.storeAddress || "",
    storePhone: companyInfo?.storePhone || "",
    storeGstNo: companyInfo?.storeGstNo || "",
    billNo: displayBillNo,
    billBarcode: displayBillNo,
    dateTime: sale?.sale_at || sale?.saleAt || new Date().toISOString(),
    cashierName: String(authUser?.name || authUser?.email || "POS").trim(),
    counterName: String(authUser?.counter_name || sale?.counter_name || "").trim(),
    customerName: receiptCustomerName,
    items: receiptItems,
    billAmount: round2(totalAmount < 0 ? totalAmount : saleAmount + receiptDiscountAmount),
    discountAmount: receiptDiscountAmount,
    taxAmount: receiptTaxAmount,
    total: totalAmount,
    paidAmount: paidCash,
    receivedAmount: paidCash,
    balanceAmount,
    changeAmount: 0,
    refundAmount: balanceAmount,
    appliedReturnNo: String(appliedReturnNo || "").trim(),
    returnItems,
    paymentMethod,
    generalTaxVisible: Boolean(receiptCustomization.generalFields?.tax?.visible),
    generalPaidVisible: Boolean(receiptCustomization.generalFields?.paid?.visible),
    generalReceivedVisible: Boolean(receiptCustomization.generalFields?.receivedAmount?.visible),
    generalBalanceVisible: Boolean(receiptCustomization.generalFields?.balanceAmt?.visible),
    generalYouSavedVisible: Boolean(receiptCustomization.generalFields?.youSaved?.visible),
    message: receiptCustomization.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
  };
};

/* ───────────────── COMPONENT ───────────────── */
