import QRCode from "qrcode";
import {
  DEFAULT_SALES_RECEIPT_GENERAL_FIELDS,
  DEFAULT_SALES_RECEIPT_TAX_FIELDS,
  DEFAULT_SALES_RECEIPT_PRODUCT_FIELDS,
  DEFAULT_SALES_RECEIPT_MESSAGE,
  buildSalesReceiptTaxRows,
  buildUpiPaymentUri,
  wrapSalesReceiptText,
} from "./salesReceiptCustomization";

// ── ESC/POS command bytes ─────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT_ON: new Uint8Array([ESC, 0x21, 0x10]),
  DOUBLE_HEIGHT_OFF: new Uint8Array([ESC, 0x21, 0x00]),
  LINE_FEED: new Uint8Array([0x0a]),
  PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x01]),
  BARCODE_HEIGHT: new Uint8Array([GS, 0x68, 0x3c]), // GS h 60 (~60 dots)
  BARCODE_WIDTH: new Uint8Array([GS, 0x77, 0x02]), // GS w 2 (narrow module)
  BARCODE_HRI_OFF: new Uint8Array([GS, 0x48, 0x00]), // GS H 0 - printer's own HRI text suppressed;
  // we print the human-readable value ourselves as a plain text line instead (see plan notes:
  // HRI font/position varies enough across firmwares that this sidesteps the inconsistency).
};

// Characters-per-line for the printer's built-in fixed-pitch font. This is NOT the same thing as
// the "receipt width in inches" CSS setting used by the image-rendering path (that scales an
// arbitrary bitmap; ESC/POS text uses the printer's own font metrics instead) - it's an estimate
// per nominal roll width, tuned against a real physical test print on the actual hardware (a
// TVSE RP3200 Lite, ~2.83in real printable width, 203dpi): the first estimate of 32 left a large,
// clearly-too-conservative blank margin after every line, which was also why "Sales No: X" / "Date:
// Y" fell back to two separate lines instead of sharing one - they summed to exactly the old
// estimate's width with zero room to spare. Still an estimate; re-tune again if needed.
const CPL_BY_WIDTH_INCHES = { "2.5": 36, "3.0": 42, "3.5": 46, "4.0": 52 };
const DEFAULT_CPL = 42;
const resolveCpl = (receiptWidthInches) =>
  CPL_BY_WIDTH_INCHES[String(receiptWidthInches || "").trim()] || DEFAULT_CPL;

// Two remote-guided fix rounds (CPL, then QR banding + extra line feeds) made no visible
// difference on the real printer - rather than guess a third time, this logs the actual resolved
// values so the next physical test can be compared against real numbers instead of assumptions.
// Safe to remove once the printer's real CPL and QR reliability are confirmed and stable.
const debugLog = (...args) => {
  if (typeof console !== "undefined") console.log("[ESC/POS debug]", ...args);
};

// ── byte assembly helpers ─────────────────────────────────────────────────
const textEncoder = new TextEncoder();

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

const padRight = (value, width) => {
  const str = String(value ?? "");
  return str.length >= width ? str.slice(0, width) : str + " ".repeat(width - str.length);
};
const padLeft = (value, width) => {
  const str = String(value ?? "");
  return str.length >= width ? str.slice(-width) : " ".repeat(width - str.length) + str;
};

class ReceiptByteWriter {
  constructor() {
    this.parts = [];
  }
  raw(bytes) {
    this.parts.push(bytes);
    return this;
  }
  line(str = "") {
    this.parts.push(textEncoder.encode(`${str}\n`));
    return this;
  }
  toBytes() {
    const total = this.parts.reduce((sum, p) => sum + p.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const part of this.parts) {
      merged.set(part, offset);
      offset += part.length;
    }
    return merged;
  }
}

// Two labelled values sharing one physical printed line (e.g. "Sales No: X" left, "Date: Y" right)
// - falls back to two lines if they don't both fit rather than corrupting alignment.
const twoColLine = (left, right, cpl) => {
  const l = String(left || "");
  const r = String(right || "");
  const gap = cpl - l.length - r.length;
  if (gap < 1) return `${l}\n${padLeft(r, cpl)}`;
  return l + " ".repeat(gap) + r;
};

// A label column plus N right-justified numeric columns on one line, e.g. item rows
// ("Name  Qty  Rate  Amount") or tax-summary rows ("Tax Name  %  AMT  Total").
const tableLine = (label, values, colWidths, cpl) => {
  const gaps = colWidths.length;
  const numsWidth = colWidths.reduce((a, b) => a + b, 0) + gaps;
  const labelWidth = Math.max(4, cpl - numsWidth);
  let out = padRight(String(label ?? "").slice(0, labelWidth), labelWidth);
  values.forEach((value, index) => {
    out += ` ${padLeft(value, colWidths[index])}`;
  });
  return out;
};

const ITEM_COL_WIDTHS = { qty: 4, rate: 7, amount: 8 };
const TAX_COL_WIDTHS = { percent: 6, amount: 8, total: 8 };

// Item names can run long; wraps at word boundaries (same algorithm the HTML receipt template
// uses, imported directly) and prints the numeric columns only on the wrapped line's first row.
const writeItemRow = (writer, { name, qty, rate, amount }, cpl) => {
  const nameWidth = Math.max(6, cpl - ITEM_COL_WIDTHS.qty - ITEM_COL_WIDTHS.rate - ITEM_COL_WIDTHS.amount - 3);
  const wrapped = wrapSalesReceiptText(name || "-", nameWidth).split("\n");
  writer.line(
    tableLine(
      wrapped[0] || "-",
      [qty, rate, amount],
      [ITEM_COL_WIDTHS.qty, ITEM_COL_WIDTHS.rate, ITEM_COL_WIDTHS.amount],
      cpl
    )
  );
  for (let i = 1; i < wrapped.length; i++) {
    writer.line(padRight(wrapped[i], nameWidth));
  }
};

// ── QR raster (GS v 0) ────────────────────────────────────────────────────
// qrcode's BitMatrix stores 1 = dark module, 0 = light module at data[row*size+col] (confirmed
// against the package's own canvas renderer, which maps a truthy cell to the dark palette entry).
// Packing that grid directly into ESC/POS's raster-bitmap command needs no anti-aliasing/threshold
// step at all - unlike the html2canvas path, every pixel is already exactly black or white.
// Some budget ESC/POS clone controllers (common on this class of thermal hardware) have a limited
// per-command raster receive buffer - a single GS v 0 command for a large image can silently drop
// or corrupt data past that limit even though the printer reports success. A short QR (few rows)
// stays under the limit and prints fine; a longer one (e.g. a full UPI URI needs a meaningfully
// bigger QR than a short bill number) can exceed it - which would show exactly as observed: the
// bill-code QR prints and scans fine, the payment QR looks structurally plausible but fails to
// decode. Splitting the same bitmap into several shorter GS v 0 commands (row-bands) keeps every
// single command small regardless of overall image size, without changing the printed result.
const RASTER_BAND_MAX_ROWS = 48;

const packRasterCommand = (bytesPerRow, heightDots, rowBytes) => {
  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = heightDots & 0xff;
  const yH = (heightDots >> 8) & 0xff;
  const header = new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  const out = new Uint8Array(header.length + rowBytes.length);
  out.set(header, 0);
  out.set(rowBytes, header.length);
  return out;
};

const buildQrRasterBytes = (value, { moduleDots = 5, marginModules = 2 } = {}) => {
  const qr = QRCode.create(String(value || ""), { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const totalModules = size + marginModules * 2;
  const widthDots = totalModules * moduleDots;
  const bytesPerRow = Math.ceil(widthDots / 8);
  const heightDots = widthDots;
  debugLog(
    "QR:", JSON.stringify(value).slice(0, 60), "moduleCount:", size, "moduleDots:", moduleDots,
    "widthDots:", widthDots, "heightDots:", heightDots, "bands:", Math.ceil(heightDots / RASTER_BAND_MAX_ROWS)
  );
  const raster = new Uint8Array(bytesPerRow * heightDots);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!data[row * size + col]) continue;
      const baseY = (row + marginModules) * moduleDots;
      const baseX = (col + marginModules) * moduleDots;
      for (let dy = 0; dy < moduleDots; dy++) {
        const y = baseY + dy;
        const rowOffset = y * bytesPerRow;
        for (let dx = 0; dx < moduleDots; dx++) {
          const x = baseX + dx;
          raster[rowOffset + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }
  }

  const bands = [];
  for (let y = 0; y < heightDots; y += RASTER_BAND_MAX_ROWS) {
    const bandHeight = Math.min(RASTER_BAND_MAX_ROWS, heightDots - y);
    const bandBytes = raster.subarray(y * bytesPerRow, (y + bandHeight) * bytesPerRow);
    bands.push(packRasterCommand(bytesPerRow, bandHeight, bandBytes));
  }
  const totalLen = bands.reduce((sum, b) => sum + b.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const band of bands) {
    out.set(band, offset);
    offset += band.length;
  }
  return out;
};

// ── CODE39 barcode (GS k) ─────────────────────────────────────────────────
const CODE39_DISALLOWED = /[^0-9A-Z \-.$/+%]/g;
const sanitizeCode39Value = (value) => String(value || "").toUpperCase().replace(CODE39_DISALLOWED, " ").trim();

const buildCode39Bytes = (value) => {
  const sanitized = sanitizeCode39Value(value);
  if (!sanitized) return new Uint8Array(0);
  const dataBytes = textEncoder.encode(sanitized);
  const out = new Uint8Array(3 + dataBytes.length + 1);
  out.set([GS, 0x6b, 0x04], 0); // GS k 4 (CODE39)
  out.set(dataBytes, 3);
  out[out.length - 1] = 0x00; // NUL terminator (classic GS k format)
  return out;
};

// ── fast-path eligibility ─────────────────────────────────────────────────
// The ESC/POS builder below only implements ONE layout: the default arrangement of every current
// customization dimension. Any deviation (a non-standard receipt format, non-default field
// visibility/position, column-mode discount, an uploaded QR image, or A4 paper) needs the full
// HTML/CSS rendering the image-based path already provides correctly - so those cases are turned
// away here rather than half-reproduced. See graceful-leaping-comet.md's "Scope decision" section.
export const isEscposReceiptEligible = (receiptData, customization) => {
  if (!receiptData || !customization) return false;

  const isA4 =
    String(receiptData?.paperSize || "").toUpperCase() === "A4"
    || String(customization?.receiptWidthInches || "").toUpperCase() === "A4";
  if (isA4) return false;

  if ((customization.receiptFormat || "standard") !== "standard") return false;
  if (customization.paymentQrMode === "image") return false;
  if ((customization.discountDisplayMode || "row") !== "row") return false;

  const defaultsMatch =
    JSON.stringify(customization.generalFields || {}) === JSON.stringify(DEFAULT_SALES_RECEIPT_GENERAL_FIELDS)
    && JSON.stringify(customization.productFields || {}) === JSON.stringify(DEFAULT_SALES_RECEIPT_PRODUCT_FIELDS)
    && JSON.stringify(customization.taxFields || {}) === JSON.stringify(DEFAULT_SALES_RECEIPT_TAX_FIELDS);

  return defaultsMatch;
};

// ── main builder ──────────────────────────────────────────────────────────
// Mirrors buildThermalSaleReceiptHtml/buildPosReturnReceiptHtml's DEFAULT-configuration output
// (posReceiptHtml.js) line for line, just serialized as ESC/POS text/barcode/raster commands
// instead of HTML/CSS. Only called once isEscposReceiptEligible has confirmed the job matches
// that default configuration.
const buildReceiptCodeSection = (writer, { value, visible, codeType }) => {
  if (!visible || !value) return;
  writer.raw(CMD.LINE_FEED);
  writer.raw(CMD.ALIGN_CENTER);
  if (codeType === "barcode") {
    writer.raw(CMD.BARCODE_HRI_OFF).raw(CMD.BARCODE_HEIGHT).raw(CMD.BARCODE_WIDTH).raw(buildCode39Bytes(value));
    writer.line(value);
  } else {
    writer.raw(buildQrRasterBytes(value, { moduleDots: 4 }));
    // A line feed of its own before the caption text - some clone controllers don't fully clear
    // the print head past the last raster row before the next line's dot data starts, which shows
    // up as the caption text underneath the QR looking torn/overlapped rather than crisp.
    writer.raw(CMD.LINE_FEED);
    writer.line(value);
  }
  writer.raw(CMD.ALIGN_LEFT);
};

export const buildEscposReceiptBytes = (receiptData = {}, customization = {}, { kind = "sale" } = {}) => {
  const cpl = resolveCpl(customization?.receiptWidthInches);
  const writer = new ReceiptByteWriter();
  const isSale = kind !== "return";
  debugLog("cpl:", cpl, "receiptWidthInches:", JSON.stringify(customization?.receiptWidthInches), "receiptCodeType:", customization?.receiptCodeType, "paymentQrMode:", customization?.paymentQrMode);

  const storeName = receiptData.storeName || "SRI BALAJI TEXTILE";
  const storeAddress = receiptData.storeAddress || "";
  const storeGstNo = receiptData.storeGstNo || "";
  const storePhone = receiptData.storePhone || "";

  writer.raw(CMD.INIT);

  // Header (default general-fields layout: company/address/gst centered, no logo/header banner)
  writer.raw(CMD.ALIGN_CENTER).raw(CMD.BOLD_ON).raw(CMD.DOUBLE_HEIGHT_ON);
  writer.line(storeName);
  writer.raw(CMD.DOUBLE_HEIGHT_OFF).raw(CMD.BOLD_OFF);
  if (storeAddress) writer.line(storeAddress);
  if (storeGstNo) writer.line(storeGstNo.startsWith("GST") ? storeGstNo : `GST No: ${storeGstNo}`);
  if (storePhone) writer.line(`Contact: ${storePhone}`);
  writer.line("-".repeat(cpl));

  // Meta rows (default line grouping: Sales No + Date, Cashier + Time, Customer alone)
  writer.raw(CMD.ALIGN_LEFT);
  const dateTime = receiptData.dateTime ? new Date(receiptData.dateTime) : null;
  const dateStr = dateTime ? dateTime.toLocaleDateString() : "";
  const timeStr = dateTime ? dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const salesNoLeft = `Sales No: ${receiptData.billNo || ""}`;
  const dateRight = `Date: ${dateStr}`;
  const cashierLeft = `Cashier: ${receiptData.cashierName || "Admin"}`;
  const timeRight = `Time: ${timeStr}`;
  debugLog(
    "salesNo/date lengths:", salesNoLeft.length, "+", dateRight.length, "=", salesNoLeft.length + dateRight.length,
    "vs cpl", cpl, "-> gap", cpl - salesNoLeft.length - dateRight.length
  );
  debugLog(
    "cashier/time lengths:", cashierLeft.length, "+", timeRight.length, "=", cashierLeft.length + timeRight.length,
    "vs cpl", cpl, "-> gap", cpl - cashierLeft.length - timeRight.length
  );
  writer.line(twoColLine(salesNoLeft, dateRight, cpl));
  writer.line(twoColLine(cashierLeft, timeRight, cpl));
  writer.line(`Customer: ${receiptData.customerName || "Walking customer"}`);
  if (isSale && receiptData.footerNote) {
    writer.line(`Salesman: ${String(receiptData.footerNote).replace(/^Salesman:\s*/, "")}`);
  }
  if (!isSale && receiptData.sourceBillNo) writer.line(`Source Bill: ${receiptData.sourceBillNo}`);
  if (!isSale && receiptData.returnReason) writer.line(`Reason: ${receiptData.returnReason}`);
  writer.line("-".repeat(cpl));

  // Item table (default visible columns: Name, Qty, Rate, Amount)
  const items = (receiptData.items || []).map((item) => ({
    ...item,
    grossAmount: round2(toNum(item.amount, 0) + Math.max(0, toNum(item.discountAmount, 0))),
  }));
  writer.raw(CMD.BOLD_ON);
  writer.line(tableLine("Item", ["Qty", "Rate", "Amt"], [ITEM_COL_WIDTHS.qty, ITEM_COL_WIDTHS.rate, ITEM_COL_WIDTHS.amount], cpl));
  writer.raw(CMD.BOLD_OFF);
  writer.line("-".repeat(cpl));
  if (items.length === 0) {
    writer.line("No items");
  } else {
    items.forEach((item) => {
      writeItemRow(
        writer,
        {
          name: item.name,
          qty: Number(item.qty || 0).toFixed(0),
          rate: Number(item.rate || 0).toFixed(2),
          amount: Number(item.grossAmount || 0).toFixed(2),
        },
        cpl
      );
    });
  }
  writer.line("-".repeat(cpl));

  // Totals
  writer.line(twoColLine("Bill Amount", Number(receiptData.billAmount || 0).toFixed(2), cpl));
  const discountAmount = toNum(receiptData.discountAmount, 0);
  if (customization?.showDiscountOnReceipt !== false && discountAmount > 0) {
    writer.line(twoColLine("Discount", discountAmount.toFixed(2), cpl));
  }
  writer.raw(CMD.BOLD_ON).raw(CMD.DOUBLE_HEIGHT_ON);
  writer.line(twoColLine("Net Amount", Number(receiptData.total || 0).toFixed(2), cpl));
  writer.raw(CMD.DOUBLE_HEIGHT_OFF).raw(CMD.BOLD_OFF);

  if (isSale) {
    if (receiptData.generalTaxVisible) writer.line(twoColLine("Tax", Number(receiptData.taxAmount || 0).toFixed(2), cpl));
    if (receiptData.generalPaidVisible) writer.line(twoColLine("Paid", Number(receiptData.paidAmount || 0).toFixed(2), cpl));
    if (receiptData.generalReceivedVisible) writer.line(twoColLine("Received Amount", Number(receiptData.receivedAmount || 0).toFixed(2), cpl));
    if (receiptData.generalBalanceVisible) writer.line(twoColLine("Balance Amount", Number(receiptData.balanceAmount || 0).toFixed(2), cpl));
    if (receiptData.generalYouSavedVisible) writer.line(twoColLine("You Saved", discountAmount.toFixed(2), cpl));
    if (toNum(receiptData.refundAmount, 0) > 0) writer.line(twoColLine("Refund", Number(receiptData.refundAmount).toFixed(2), cpl));
    if (receiptData.changeAmount) writer.line(twoColLine("Change", Number(receiptData.changeAmount || 0).toFixed(2), cpl));

    // Returned items adjusted into this sale bill, if any
    const returnItems = receiptData.returnItems || [];
    if (returnItems.length > 0) {
      writer.line("-".repeat(cpl));
      writer.raw(CMD.BOLD_ON);
      writer.line(`Returned Items${receiptData.appliedReturnNo ? ` - ${receiptData.appliedReturnNo}` : ""}`);
      writer.raw(CMD.BOLD_OFF);
      returnItems.forEach((item) => {
        writeItemRow(
          writer,
          {
            name: item.name,
            qty: Number(item.qty || 0).toFixed(0),
            rate: "",
            amount: Math.abs(toNum(item.amount, 0)).toFixed(2),
          },
          cpl
        );
      });
    }
  }

  // Tax summary table (default: taxName/%/AMT/Total all visible)
  const taxRows = buildSalesReceiptTaxRows(receiptData.items || []);
  if (taxRows.length > 0) {
    writer.line("-".repeat(cpl));
    writer.raw(CMD.BOLD_ON);
    writer.line("Tax Summary");
    writer.line(tableLine("Tax Name", ["%", "AMT", "Total"], [TAX_COL_WIDTHS.percent, TAX_COL_WIDTHS.amount, TAX_COL_WIDTHS.total], cpl));
    writer.raw(CMD.BOLD_OFF);
    taxRows.forEach((row) => {
      writer.line(
        tableLine(
          row.label,
          [row.taxPerc.toFixed(2), row.baseAmount.toFixed(2), row.taxAmount.toFixed(2)],
          [TAX_COL_WIDTHS.percent, TAX_COL_WIDTHS.amount, TAX_COL_WIDTHS.total],
          cpl
        )
      );
    });
  }

  // Bill code (default receiptCodeType: qr_code) and, for sale receipts, the UPI "Scan to Pay" QR
  const codeVisible = isSale
    ? customization?.showBarcodeOnBill !== false
    : customization?.showBarcodeOnReturnSlip !== false;
  const codeValue = String(receiptData.billBarcode || receiptData.billNo || "").trim();
  buildReceiptCodeSection(writer, {
    value: codeValue,
    visible: codeVisible,
    codeType: customization?.receiptCodeType === "barcode" ? "barcode" : "qr_code",
  });

  if (isSale && (customization?.paymentQrMode || "upi") === "upi") {
    const upiUri = buildUpiPaymentUri({
      upiId: customization?.paymentUpiId || "9876543210@upi",
      payeeName: storeName,
      amount: receiptData.total,
      transactionNote: receiptData.billNo ? `Bill ${receiptData.billNo}` : "",
    });
    if (upiUri) {
      writer.raw(CMD.LINE_FEED).raw(CMD.ALIGN_CENTER);
      writer.raw(buildQrRasterBytes(upiUri, { moduleDots: 5 }));
      writer.raw(CMD.LINE_FEED);
      writer.line("Scan to Pay");
      writer.raw(CMD.ALIGN_LEFT);
    }
  }

  // Footer
  writer.line("-".repeat(cpl));
  writer.raw(CMD.ALIGN_CENTER);
  String(receiptData.message || DEFAULT_SALES_RECEIPT_MESSAGE)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((l) => writer.line(l));
  writer.raw(CMD.LINE_FEED).raw(CMD.LINE_FEED).raw(CMD.LINE_FEED);
  writer.raw(CMD.PARTIAL_CUT);

  return writer.toBytes();
};

const bytesToBase64 = (bytes) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

// Builds the ready-to-send `label` payload for PrintContext's queue - {kind, jobName, dataBase64}
// rides the same generic `label`/`Label` slot the existing rendered-image path already uses, so no
// new plumbing is needed anywhere between here and the connector.
export const buildEscposReceiptJob = (receiptData, customization, { kind = "sale", jobName = "Receipt" } = {}) => {
  const bytes = buildEscposReceiptBytes(receiptData, customization, { kind });
  return {
    kind: "escpos_raw_v1",
    jobName,
    dataBase64: bytesToBase64(bytes),
    byteLength: bytes.length,
  };
};
