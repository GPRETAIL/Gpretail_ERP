import {
  buildSalesReceiptGeneralLayout,
  buildSalesReceiptTaxRows,
  buildReceiptCodeMarkupSync,
  buildReceiptFormatCss,
  DEFAULT_SALES_RECEIPT_MESSAGE,
  RECEIPT_QR_CODE_DISPLAY_PX,
  getVisibleSalesReceiptProductColumns,
  getVisibleSalesReceiptTaxColumns,
  getSalesReceiptFontCss,
  getSalesReceiptRateWithTax,
  getSalesReceiptWidthCss,
  shouldShowSalesReceiptDiscountColumn,
  wrapSalesReceiptText,
} from "./salesReceiptCustomization";

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

// buildCode39SvgMarkup returns a raw <svg>...</svg> string with its own embedded <text> label (the
// human-readable code below the bars). Injected as inline SVG, that works fine in a real browser
// print, but html2canvas (used for direct/silent printing) has long-standing, well-known gaps
// rendering nested SVG <text> - the bars render, the text label often doesn't (or renders cut off/
// mispositioned), which is exactly the "barcode number half-showing" symptom. Wrapping the same SVG
// as a data-URI <img> instead makes html2canvas rasterize it via its (far more reliable) ordinary
// image-loading path rather than walking the SVG DOM itself - and a plain <img> pointing at an SVG
// data URI still renders identically in a real browser print, so this is safe either way.
const wrapSvgMarkupAsImg = (markup) => {
  const str = String(markup || "").trim();
  if (!str.startsWith("<svg")) return str;
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`;
  return `<img src="${dataUrl}" alt="" style="display:block;margin:0 auto;width:100%;height:auto;" />`;
};

// getSalesReceiptWidthCss returns mixed units ("3.0in", "320px") depending on the setting: convert
// to a raw px number so it can be compared/capped in JS. CSS min()/clamp() would be simpler, but
// html2canvas's CSS support is inconsistent enough (this whole file exists because of html2canvas
// rendering surprises) that resolving the cap in JS first is the safer bet.
const cssLengthToPx = (cssLength) => {
  const str = String(cssLength || "").trim();
  const inchMatch = str.match(/^([\d.]+)in$/);
  if (inchMatch) return parseFloat(inchMatch[1]) * 96;
  const pxMatch = str.match(/^([\d.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);
  return 265;
};

// A "3 inch" thermal roll's real printable width is very often narrower than its nominal size
// (measured on real hardware: a printer reporting "3 inch" media actually only prints ~2.83in wide)
// - the connector caps to whatever the printer driver actually reports as a last-resort safety net,
// but starting from a width that's already safely under typical thermal printable widths avoids
// relying on that cap to squeeze the whole receipt down at print time.
const THERMAL_RECEIPT_SAFE_MAX_WIDTH_PX = 265;
const getThermalReceiptMaxWidthPx = (receiptWidthInches) =>
  Math.min(THERMAL_RECEIPT_SAFE_MAX_WIDTH_PX, cssLengthToPx(getSalesReceiptWidthCss(receiptWidthInches)));

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

// wrapSalesReceiptText() embeds literal "\n" line breaks (word-wrapped product names) - relying on
// CSS `white-space: pre-line` to render those visually is fragile under html2canvas (used for the
// PDF download), which doesn't reliably honor it and was collapsing wrapped names back onto one
// line. Real <br> tags render correctly everywhere (browser print, html2canvas, the local silent-
// print connector's headless-browser path).
const escapeHtmlWithBreaks = (value) => escapeHtml(value).replaceAll("\n", "<br>");

const getReceiptPositionClass = (position) =>
  position === "right" ? "text-right" : position === "center" ? "text-center" : "text-left";

const buildReceiptMetaInlineHtml = (items = []) =>
  items.map((item) => `
    <span class="meta-item">
      ${escapeHtml(item.label)}: <span${item.key === "salesNo" ? ' style="font-weight:700;"' : ""}>${escapeHtml(item.value)}</span>
    </span>
  `).join("");

const buildReceiptMetaLineHtml = (line) => {
  const items = Array.isArray(line?.items) ? line.items : [];
  const positions = Array.from(new Set(items.map((item) => item.position || "left")));

  if (positions.length <= 1) {
    const positionClass = getReceiptPositionClass(positions[0] || "left");
    return `<div class="meta-row meta-row-single"><div class="meta-group ${positionClass}">${buildReceiptMetaInlineHtml(items)}</div></div>`;
  }

  return `<div class="meta-row meta-row-grid"><div class="meta-group text-left">${buildReceiptMetaInlineHtml(items.filter((item) => item.position === "left"))}</div><div class="meta-group text-right">${buildReceiptMetaInlineHtml(items.filter((item) => item.position !== "left"))}</div></div>`;
};

const buildThermalSaleReceiptHtml = (receiptData, customization) => {
  const receiptItems = (receiptData.items || []).map((item) => ({
    ...item,
    rateWithTax: getSalesReceiptRateWithTax(item.rate, item.taxPerc),
    grossAmount: round2(toNum(item.amount, 0) + Math.max(0, toNum(item.discountAmount, 0))),
  }));
  const returnItems = (receiptData.returnItems || []).map((item) => ({
    ...item,
    qty: Math.max(0, toNum(item.qty, 0)),
    amount: Math.abs(toNum(item.amount, 0)),
  }));
  const showDiscountColumn = shouldShowSalesReceiptDiscountColumn(customization, receiptItems);
  const productColumns = getVisibleSalesReceiptProductColumns(customization, {
    includeDiscountColumn: showDiscountColumn,
  });
  const taxColumns = getVisibleSalesReceiptTaxColumns(customization);
  const taxRows = customization?.showTaxTableOnReceipt && taxColumns.length > 0
    ? buildSalesReceiptTaxRows(receiptItems)
    : [];

  const storeName = receiptData.storeName || "SRI BALAJI TEXTILE";
  const storeAddress = receiptData.storeAddress || "Main Bazaar, Retail Street";
  const storeGstNo = receiptData.storeGstNo || "33AAAAA0000A1Z5";
  const storePhone = receiptData.storePhone || "9876543210";

  const generalContent = {
    logo: receiptData.logoText || "LOGO",
    header: receiptData.headerTitle || "POS RECEIPT",
    company: storeName,
    address: storeAddress,
    gst: storeGstNo ? (storeGstNo.startsWith("GST") ? storeGstNo : `GST No: ${storeGstNo}`) : "",
    salesNo: receiptData.billNo || "",
    cashier: receiptData.cashierName || "Admin",
    counter: receiptData.counterName || "",
    paymentMethod: receiptData.paymentMethod || "",
    date: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleDateString() : "",
    time: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
    customer: receiptData.customerName || "Walking customer",
  };
  const { topRows, groupedLines } = buildSalesReceiptGeneralLayout(customization, generalContent);

  const productCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name || "-");
    if (key === "qty") return Number(item.qty || 0).toFixed(0);
    if (key === "mrp") return Number(item.rateWithTax || 0).toFixed(2);
    if (key === "rate") return Number(item.rate || 0).toFixed(2);
    if (key === "discount") return Number(item.discountAmount || 0).toFixed(2);
    if (key === "amount") return Number(showDiscountColumn ? item.amount : item.grossAmount).toFixed(2);
    if (key === "tax") return Number(item.taxPerc || 0).toFixed(2);
    return "";
  };

  const rowsHtml = receiptItems.map((item) => `
    <tr>
      ${productColumns.map((column) => `
        <td class="${column.key === "productName" ? "product-cell" : "num"}">${column.key === "productName" ? escapeHtmlWithBreaks(productCellValue(item, column.key)) : escapeHtml(productCellValue(item, column.key))}</td>
      `).join("")}
    </tr>
  `).join("");

  const returnCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name || "-");
    if (key === "qty") return Number(item.qty || 0).toFixed(0);
    if (key === "amount") return Number(item.amount || 0).toFixed(2);
    return "";
  };

  const returnRowsHtml = returnItems.map((item) => `
    <tr>
      ${productColumns.map((column) => `
        <td class="${column.key === "productName" ? "product-cell" : "num"}">${column.key === "productName" ? escapeHtmlWithBreaks(returnCellValue(item, column.key)) : escapeHtml(returnCellValue(item, column.key))}</td>
      `).join("")}
    </tr>
  `).join("");

  const taxCellValue = (row, key) => {
    if (key === "taxName") return row.label;
    if (key === "percent") return Number(row.taxPerc || 0).toFixed(2);
    if (key === "amount") return Number(row.baseAmount || 0).toFixed(2);
    if (key === "total") return Number(row.taxAmount || 0).toFixed(2);
    return "";
  };

  const taxRowsHtml = taxRows.map((row) => `
    <tr>
      ${taxColumns.map((column) => `
        <td class="${column.key === "taxName" ? "" : "num"}">${escapeHtml(taxCellValue(row, column.key))}</td>
      `).join("")}
    </tr>
  `).join("");

  const billBarcode = String(receiptData.billBarcode || receiptData.billNo || "").trim();
  const barcodeMarkup = wrapSvgMarkupAsImg(
    receiptData.billCodeMarkup
    || (billBarcode ? buildReceiptCodeMarkupSync(billBarcode, customization, "bill") : "")
  );
  const paymentQrMarkup = receiptData.paymentQrMarkup || "";

  return `<!DOCTYPE html><html><head><title>POS Receipt #${escapeHtml(receiptData.billNo)}</title><style>
    @page { margin: 0; size: auto; }
    * { box-sizing: border-box; }
    body {
      font-family: ${getSalesReceiptFontCss(customization?.receiptFontFamily)};
      margin: 0;
      padding: 4px;
      color: #111827;
      background: #ffffff;
    }
    .receipt {
      width: 100%;
      max-width: ${getThermalReceiptMaxWidthPx(customization?.receiptWidthInches)}px;
      margin: 0 auto;
      font-size: 11px;
    }
    .center { text-align: center; }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .title { font-size: 16px; font-weight: 800; letter-spacing: 0.12em; text-align: center; margin-bottom: 2px; }
    .store-meta { margin: 1px 0; font-size: 10.5px; line-height: 1.35; color: #4b5563; text-align: center; }
    .meta { margin: 6px 0; font-size: 10.5px; }
    .meta-row { margin: 2px 0; }
    .meta-row-flex { display: flex; justify-content: space-between; align-items: center; margin: 2px 0; width: 100%; font-size: 10.5px; }
    .meta-row-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 4px; }
    .meta-row-single { display: block; }
    .meta-group { display: flex; flex-wrap: wrap; gap: 2px 8px; width: 100%; }
    .meta-group.text-right { justify-content: flex-end; }
    .meta-group.text-center { justify-content: center; }
    .meta-group.text-left { justify-content: flex-start; }
    .meta-item { white-space: nowrap; }
    .line { border-top: 1px dashed #9ca3af; margin: 6px 0; }
    .receipt-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      margin: 4px 0;
    }
    .receipt-table th {
      background: #f9fafb;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #4b5563;
      padding: 4px 3px;
      border-bottom: 1px solid #e5e7eb;
    }
    .receipt-table td {
      padding: 4px 3px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 10.5px;
      vertical-align: top;
    }
    .receipt-table tr:last-child td { border-bottom: none; }
    .product-cell { white-space: pre-line; line-height: 1.3; font-weight: 500; }
    .num { text-align: right; white-space: nowrap; }
    .totals-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
    .grand { font-weight: 800; font-size: 13px; margin: 4px 0; }
    .section-label { margin: 6px 0 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; }
    .thanks { margin-top: 8px; text-align: center; font-size: 10px; font-weight: 600; line-height: 1.4; white-space: pre-line; color: #374151; }
    /* text-align (not flexbox) for centering - html2canvas's flexbox/cross-axis centering support
       has been unreliable enough in this codebase already (see the container-hiding rewrite in
       renderPrintableHtml.js) that plain block/inline-block centering, supported since its earliest
       versions, is the safer bet here too. */
    /* No overflow:hidden here - it was clipping the caption text underneath the QR/barcode image
       (and risked clipping the image itself) whenever this container's computed height came out
       even slightly short of its actual content during capture. Nothing in this wrapper is meant
       to be cropped, so there's nothing for overflow:hidden to safely protect against. */
    .barcode-wrap { margin: 8px 0; text-align: center; }
    .barcode-wrap svg { width: 100%; height: auto; max-width: 160px; display: block; margin: 0 auto; }
    .barcode-wrap img { max-width: 100%; object-fit: contain; display: block; margin: 0 auto; }
    ${buildReceiptFormatCss(customization?.receiptFormat)}
  </style></head><body><div class="receipt">
    <div class="space-y-1">
      ${topRows.length > 0
        ? topRows.map((row) => `<div class="${escapeHtml(getReceiptPositionClass(row.position))} store-meta ${row.key === "company" ? "title" : ""}">${row.key === "logo" ? `<span style="display:inline-flex;border:1px dashed #d1d5db;border-radius:8px;padding:8px 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#6b7280;">${escapeHtml(row.value)}</span>` : escapeHtml(row.value)}</div>`).join("")
        : `
          <div class="title">${escapeHtml(storeName)}</div>
          <div class="store-meta">${escapeHtml(storeAddress)}</div>
          <div class="store-meta">${escapeHtml(storeGstNo ? (storeGstNo.startsWith("GST") ? storeGstNo : `GST No: ${storeGstNo}`) : "GST No: 33AAAAA0000A1Z5")}</div>
        `
      }
      ${storePhone ? `<div class="store-meta">Contact: ${escapeHtml(storePhone)}</div>` : ""}
    </div>
    <div class="line"></div>
    <div class="meta">${groupedLines.map((line) => buildReceiptMetaLineHtml(line)).join("")}${receiptData.footerNote ? `<div class="meta-row"><span>Salesman: <b>${escapeHtml(receiptData.footerNote.replace(/^Salesman:\s*/, ""))}</b></span></div>` : ""}</div>
    <div class="line"></div>
    ${productColumns.length > 0 ? `<table class="receipt-table"><thead><tr>${productColumns.map((column) => `<th class="${column.key === "productName" ? "text-left" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${productColumns.length}" class="center">No items</td></tr>`}</tbody></table>` : ""}
    <div class="line"></div>
    <div class="totals-row"><span>Bill Amount</span><span>${escapeHtml(Number(receiptData.billAmount || 0).toFixed(2))}</span></div>${customization?.showDiscountOnReceipt && !showDiscountColumn ? `<div class="totals-row"><span>Discount</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}<div class="totals-row grand"><span>Net Amount</span><span>${escapeHtml(Number(receiptData.total || 0).toFixed(2))}</span></div>
    ${receiptData.generalTaxVisible ? `<div class="totals-row"><span>Tax</span><span>${escapeHtml(Number(receiptData.taxAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalPaidVisible ? `<div class="totals-row"><span>Paid</span><span>${escapeHtml(Number(receiptData.paidAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalReceivedVisible ? `<div class="totals-row"><span>Received Amount</span><span>${escapeHtml(Number(receiptData.receivedAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalBalanceVisible ? `<div class="totals-row"><span>Balance Amount</span><span>${escapeHtml(Number(receiptData.balanceAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalYouSavedVisible ? `<div class="totals-row"><span>You Saved</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}
    ${Number(receiptData.refundAmount || 0) > 0 ? `<div class="totals-row"><span>Refund</span><span>${escapeHtml(Number(receiptData.refundAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.changeAmount ? `<div class="totals-row"><span>Change</span><span>${escapeHtml(Number(receiptData.changeAmount || 0).toFixed(2))}</span></div>` : ""}
    ${returnRowsHtml ? `<div class="section-label">Returned Items${receiptData.appliedReturnNo ? ` - ${escapeHtml(receiptData.appliedReturnNo)}` : ""}</div><table class="receipt-table"><thead><tr>${productColumns.map((column) => `<th class="${column.key === "productName" ? "text-left" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${returnRowsHtml}</tbody></table>` : ""}
    ${taxRowsHtml ? `<div class="section-label">Tax Summary</div><table class="receipt-table"><thead><tr>${taxColumns.map((column) => `<th class="${column.key === "taxName" ? "text-left" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${taxRowsHtml}</tbody></table>` : ""}
    ${barcodeMarkup ? `<div class="line"></div><div class="barcode-wrap">${barcodeMarkup}</div>` : ""}
    ${paymentQrMarkup ? `<div class="line"></div><div class="barcode-wrap">${paymentQrMarkup}</div>` : ""}
    <div class="line"></div>
    <div class="thanks">${escapeHtml(receiptData.message || DEFAULT_SALES_RECEIPT_MESSAGE)}</div>
  </div></body></html>`;
};

// Formal A4 GST tax invoice - a genuinely different layout from the thermal receipt (letterhead,
// HSN/tax-rate columns, signature block), not the same narrow design just stretched wider. Used
// automatically whenever the store's configured receipt width is A4 (see the dispatcher below).
const buildA4SaleInvoiceHtml = (receiptData, customization) => {
  const items = (receiptData.items || []).map((item) => ({
    ...item,
    grossAmount: round2(toNum(item.amount, 0) + Math.max(0, toNum(item.discountAmount, 0))),
  }));
  const taxRows = buildSalesReceiptTaxRows(items);
  const hasDiscount = items.some((item) => toNum(item.discountAmount, 0) > 0);

  const formattedDate = receiptData.dateTime
    ? new Date(receiptData.dateTime).toLocaleDateString()
    : new Date().toLocaleDateString();
  const formattedTime = receiptData.dateTime
    ? new Date(receiptData.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const storeName = receiptData.storeName || "Store";
  const storeAddress = receiptData.storeAddress || "";
  const storeGstNo = receiptData.storeGstNo || "";
  const storePhone = receiptData.storePhone || "";

  const itemRowsHtml = items.map((item, index) => `
    <tr>
      <td class="num">${index + 1}</td>
      <td>${escapeHtmlWithBreaks(String(item.name || "-").trim())}</td>
      <td>${escapeHtml(item.hsnCode || "-")}</td>
      <td class="num">${Number(item.qty || 0).toFixed(2)}</td>
      <td class="num">${Number(item.rate || 0).toFixed(2)}</td>
      ${hasDiscount ? `<td class="num">${Number(item.discountAmount || 0).toFixed(2)}</td>` : ""}
      <td class="num">${Number(item.baseAmount || 0).toFixed(2)}</td>
      <td class="num">${Number(item.taxPerc || 0).toFixed(2)}%</td>
      <td class="num">${Number(item.taxAmount || 0).toFixed(2)}</td>
      <td class="num">${Number(item.amount || 0).toFixed(2)}</td>
    </tr>
  `).join("") || `<tr><td colspan="${hasDiscount ? 9 : 8}" class="center">No items</td></tr>`;

  const taxRowsHtml = taxRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td class="num">${Number(row.taxPerc || 0).toFixed(2)}%</td>
      <td class="num">${Number(row.baseAmount || 0).toFixed(2)}</td>
      <td class="num">${Number(row.taxAmount || 0).toFixed(2)}</td>
    </tr>
  `).join("");

  const billBarcode = String(receiptData.billBarcode || receiptData.billNo || "").trim();
  const barcodeMarkup = wrapSvgMarkupAsImg(
    receiptData.billCodeMarkup
    || (billBarcode ? buildReceiptCodeMarkupSync(billBarcode, customization, "bill") : "")
  );
  const paymentQrMarkup = receiptData.paymentQrMarkup || "";

  return `<!DOCTYPE html><html><head><title>Tax Invoice #${escapeHtml(receiptData.billNo)}</title><style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: ${getSalesReceiptFontCss(customization?.receiptFontFamily)}; margin: 0; padding: 0; color: #1f2937; background: #ffffff; font-size: 12px; }
    .invoice { width: 100%; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1f2937; padding-bottom: 12px; margin-bottom: 16px; }
    .company-name { font-size: 21px; font-weight: 800; }
    .company-meta { font-size: 11px; color: #4b5563; line-height: 1.6; margin-top: 4px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 20px; letter-spacing: 0.08em; margin: 0; }
    .invoice-title .inv-no { font-size: 13px; font-weight: 700; margin-top: 8px; }
    .meta-grid { display: flex; justify-content: space-between; gap: 24px; font-size: 11.5px; margin-bottom: 16px; }
    .meta-grid .label { color: #6b7280; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .items-table th { background: #1f2937; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; padding: 7px 6px; text-align: left; }
    .items-table .num { text-align: right; }
    .items-table td { padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .totals { width: 300px; font-size: 11.5px; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { border-top: 2px solid #1f2937; margin-top: 4px; padding-top: 6px; font-size: 15px; font-weight: 800; }
    .tax-summary { margin-bottom: 16px; }
    .tax-summary-table { width: auto; min-width: 320px; border-collapse: collapse; font-size: 11px; }
    .tax-summary-table th { background: #f3f4f6; padding: 5px 8px; text-align: left; }
    .tax-summary-table td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; }
    .terms { font-size: 10px; color: #6b7280; max-width: 55%; line-height: 1.5; }
    .signature { text-align: center; font-size: 11px; }
    .sig-line { border-top: 1px solid #1f2937; width: 170px; margin-bottom: 4px; }
    .qr-wrap { text-align: center; margin-top: 14px; }
    .qr-wrap img { width: 90px; height: 90px; }
    .qr-wrap svg { width: 90px; height: 90px; }
    .center { text-align: center; }
  </style></head><body><div class="invoice">
    <div class="header">
      <div>
        <div class="company-name">${escapeHtml(storeName)}</div>
        <div class="company-meta">
          ${escapeHtml(storeAddress)}<br>
          ${storeGstNo ? `GSTIN: ${escapeHtml(storeGstNo)}<br>` : ""}
          ${storePhone ? `Contact: ${escapeHtml(storePhone)}` : ""}
        </div>
      </div>
      <div class="invoice-title">
        <h1>TAX INVOICE</h1>
        <div class="inv-no">${escapeHtml(receiptData.billNo || "")}</div>
      </div>
    </div>
    <div class="meta-grid">
      <div>
        <div><span class="label">Date:</span> ${escapeHtml(formattedDate)} &nbsp; <span class="label">Time:</span> ${escapeHtml(formattedTime)}</div>
        <div><span class="label">Cashier:</span> ${escapeHtml(receiptData.cashierName || "")}</div>
        ${receiptData.counterName ? `<div><span class="label">Counter:</span> ${escapeHtml(receiptData.counterName)}</div>` : ""}
      </div>
      <div>
        <div><span class="label">Billed To:</span> ${escapeHtml(receiptData.customerName || "Walking customer")}</div>
        <div><span class="label">Payment Mode:</span> ${escapeHtml(receiptData.paymentMethod || "-")}</div>
      </div>
    </div>
    <table class="items-table">
      <thead><tr>
        <th class="num">#</th>
        <th>Product Description</th>
        <th>HSN</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        ${hasDiscount ? `<th class="num">Discount</th>` : ""}
        <th class="num">Taxable Value</th>
        <th class="num">GST %</th>
        <th class="num">GST Amt</th>
        <th class="num">Total</th>
      </tr></thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>
    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${escapeHtml(Number(receiptData.billAmount || 0).toFixed(2))}</span></div>
        ${hasDiscount ? `<div class="totals-row"><span>Discount</span><span>-${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}
        <div class="totals-row"><span>Total GST</span><span>${escapeHtml(Number(receiptData.taxAmount || 0).toFixed(2))}</span></div>
        <div class="totals-row grand"><span>Grand Total</span><span>${escapeHtml(Number(receiptData.total || 0).toFixed(2))}</span></div>
        ${toNum(receiptData.paidAmount, 0) > 0 ? `<div class="totals-row"><span>Paid</span><span>${escapeHtml(Number(receiptData.paidAmount || 0).toFixed(2))}</span></div>` : ""}
        ${toNum(receiptData.balanceAmount, 0) > 0 ? `<div class="totals-row"><span>Balance Due</span><span>${escapeHtml(Number(receiptData.balanceAmount || 0).toFixed(2))}</span></div>` : ""}
      </div>
    </div>
    ${taxRowsHtml ? `<div class="tax-summary"><table class="tax-summary-table"><thead><tr><th>Tax</th><th class="num">Rate</th><th class="num">Taxable Amt</th><th class="num">Tax Amt</th></tr></thead><tbody>${taxRowsHtml}</tbody></table></div>` : ""}
    <div class="footer">
      <div class="terms">${escapeHtml(receiptData.message || DEFAULT_SALES_RECEIPT_MESSAGE)}</div>
      <div class="signature">
        ${paymentQrMarkup ? `<div class="qr-wrap">${paymentQrMarkup}<div>Scan to Pay</div></div>` : ""}
        <div class="sig-line"></div>
        <div>Authorized Signatory</div>
      </div>
    </div>
    ${barcodeMarkup ? `<div class="center" style="margin-top:10px;">${barcodeMarkup}</div>` : ""}
  </div></body></html>`;
};

// Dispatches to the A4 tax-invoice layout when the store is configured for A4 paper, otherwise the
// thermal receipt layout - every existing call site (live print, "Last Bill" reprint, PDF download)
// picks up the right template automatically with no changes needed at the call site.
export const buildPosSaleReceiptHtml = (receiptData, customization) => {
  const isA4 =
    String(receiptData?.paperSize || "").toUpperCase() === "A4"
    || String(customization?.receiptWidthInches || "").toUpperCase() === "A4";
  return isA4
    ? buildA4SaleInvoiceHtml(receiptData, customization)
    : buildThermalSaleReceiptHtml(receiptData, customization);
};

export const buildPosReturnReceiptHtml = (receiptData, customization) => {
  const receiptItems = (receiptData.items || []).map((item) => ({
    ...item,
    rateWithTax: getSalesReceiptRateWithTax(item.rate, item.taxPerc),
    grossAmount: round2(toNum(item.amount, 0) + Math.max(0, toNum(item.discountAmount, 0))),
  }));
  const showDiscountColumn = shouldShowSalesReceiptDiscountColumn(customization, receiptItems);
  const productColumns = getVisibleSalesReceiptProductColumns(customization, {
    includeDiscountColumn: showDiscountColumn,
  });
  const taxColumns = getVisibleSalesReceiptTaxColumns(customization);
  const taxRows = customization?.showTaxTableOnReceipt && taxColumns.length > 0
    ? buildSalesReceiptTaxRows(receiptItems)
    : [];

  const storeName = receiptData.storeName || "SRI BALAJI TEXTILE";
  const storeAddress = receiptData.storeAddress || "Main Bazaar, Retail Street";
  const storeGstNo = receiptData.storeGstNo || "33AAAAA0000A1Z5";
  const storePhone = receiptData.storePhone || "9876543210";

  const generalContent = {
    logo: receiptData.logoText || "LOGO",
    header: receiptData.headerTitle || "POS RETURN",
    company: storeName,
    address: storeAddress,
    gst: storeGstNo ? (storeGstNo.startsWith("GST") ? storeGstNo : `GST No: ${storeGstNo}`) : "",
    salesNo: receiptData.billNo || "",
    cashier: receiptData.cashierName || "Admin",
    counter: receiptData.counterName || "",
    paymentMethod: receiptData.paymentMethod || "",
    date: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleDateString() : "",
    time: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
    customer: receiptData.customerName || "Walking customer",
  };
  const { topRows, groupedLines } = buildSalesReceiptGeneralLayout(customization, generalContent);

  const productCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name || "-");
    if (key === "qty") return Number(item.qty || 0).toFixed(0);
    if (key === "mrp") return Number(item.rateWithTax || 0).toFixed(2);
    if (key === "rate") return Number(item.rate || 0).toFixed(2);
    if (key === "discount") return Number(item.discountAmount || 0).toFixed(2);
    if (key === "amount") return Number(showDiscountColumn ? item.amount : item.grossAmount).toFixed(2);
    if (key === "tax") return Number(item.taxPerc || 0).toFixed(2);
    return "";
  };

  const rowsHtml = receiptItems.map((item) => `
    <tr>
      ${productColumns.map((column) => `
        <td class="${column.key === "productName" ? "product-cell" : "num"}">${column.key === "productName" ? escapeHtmlWithBreaks(productCellValue(item, column.key)) : escapeHtml(productCellValue(item, column.key))}</td>
      `).join("")}
    </tr>
  `).join("");

  const taxCellValue = (row, key) => {
    if (key === "taxName") return row.label;
    if (key === "percent") return Number(row.taxPerc || 0).toFixed(2);
    if (key === "amount") return Number(row.baseAmount || 0).toFixed(2);
    if (key === "total") return Number(row.taxAmount || 0).toFixed(2);
    return "";
  };

  const taxRowsHtml = taxRows.map((row) => `
    <tr>
      ${taxColumns.map((column) => `
        <td class="${column.key === "taxName" ? "" : "num"}">${escapeHtml(taxCellValue(row, column.key))}</td>
      `).join("")}
    </tr>
  `).join("");

  const returnBarcode = String(receiptData.billBarcode || receiptData.billNo || "").trim();
  const barcodeMarkup = wrapSvgMarkupAsImg(
    receiptData.returnCodeMarkup
    ?? buildReceiptCodeMarkupSync(returnBarcode, customization, "return")
  );

  return `<!DOCTYPE html><html><head><title>POS Return #${escapeHtml(receiptData.billNo)}</title><style>
    @page { margin: 0; size: auto; }
    * { box-sizing: border-box; }
    body {
      font-family: ${getSalesReceiptFontCss(customization?.receiptFontFamily)};
      margin: 0;
      padding: 4px;
      color: #111827;
      background: #ffffff;
    }
    .receipt {
      width: 100%;
      max-width: ${getThermalReceiptMaxWidthPx(customization?.receiptWidthInches)}px;
      margin: 0 auto;
      font-size: 11px;
    }
    .center { text-align: center; }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .title { font-size: 16px; font-weight: 800; letter-spacing: 0.12em; text-align: center; margin-bottom: 2px; }
    .store-meta { margin: 1px 0; font-size: 10.5px; line-height: 1.35; color: #4b5563; text-align: center; }
    .meta { margin: 6px 0; font-size: 10.5px; }
    .meta-row { margin: 2px 0; }
    .meta-row-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 4px; }
    .meta-row-single { display: block; }
    .meta-group { display: flex; flex-wrap: wrap; gap: 2px 8px; width: 100%; }
    .meta-group.text-right { justify-content: flex-end; }
    .meta-group.text-center { justify-content: center; }
    .meta-group.text-left { justify-content: flex-start; }
    .meta-item { white-space: nowrap; }
    .line { border-top: 1px dashed #9ca3af; margin: 6px 0; }
    .receipt-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      margin: 4px 0;
    }
    .receipt-table th {
      background: #f9fafb;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #4b5563;
      padding: 4px 3px;
      border-bottom: 1px solid #e5e7eb;
    }
    .receipt-table td {
      padding: 4px 3px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 10.5px;
      vertical-align: top;
    }
    .receipt-table tr:last-child td { border-bottom: none; }
    .product-cell { white-space: pre-line; line-height: 1.3; font-weight: 500; }
    .num { text-align: right; white-space: nowrap; }
    .totals-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
    .grand { font-weight: 800; font-size: 13px; margin: 4px 0; }
    .section-label { margin: 6px 0 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; }
    .thanks { margin-top: 8px; text-align: center; font-size: 10px; font-weight: 600; line-height: 1.4; white-space: pre-line; color: #374151; }
    /* No overflow:hidden here - it was clipping the caption text underneath the QR/barcode image
       (and risked clipping the image itself) whenever this container's computed height came out
       even slightly short of its actual content during capture. Nothing in this wrapper is meant
       to be cropped, so there's nothing for overflow:hidden to safely protect against. */
    .barcode-wrap { margin: 8px 0; text-align: center; }
    .barcode-wrap svg { width: 100%; height: auto; max-width: 160px; display: block; margin: 0 auto; }
    .barcode-wrap img { max-width: 100%; object-fit: contain; display: block; margin: 0 auto; }
    ${buildReceiptFormatCss(customization?.receiptFormat)}
  </style></head><body><div class="receipt">
    <div class="space-y-1">
      ${topRows.length > 0
        ? topRows.map((row) => `<div class="${escapeHtml(getReceiptPositionClass(row.position))} store-meta ${row.key === "company" ? "title" : ""}">${row.key === "logo" ? `<span style="display:inline-flex;border:1px dashed #d1d5db;border-radius:8px;padding:8px 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#6b7280;">${escapeHtml(row.value)}</span>` : escapeHtml(row.value)}</div>`).join("")
        : `
          <div class="title">${escapeHtml(storeName)}</div>
          <div class="store-meta">${escapeHtml(storeAddress)}</div>
          <div class="store-meta">${escapeHtml(storeGstNo ? `GST No: ${storeGstNo}` : "")}</div>
        `
      }
      ${storePhone ? `<div class="store-meta">Contact: ${escapeHtml(storePhone)}</div>` : ""}
    </div>
    <div class="line"></div>
    <div class="meta">${groupedLines.map((line) => buildReceiptMetaLineHtml(line)).join("")}${receiptData.sourceBillNo ? `<div class="meta-row"><span>Source Bill</span><span>${escapeHtml(receiptData.sourceBillNo)}</span></div>` : ""}${receiptData.returnReason ? `<div class="meta-row"><span>Reason</span><span>${escapeHtml(receiptData.returnReason)}</span></div>` : ""}</div>
    <div class="line"></div>
    ${productColumns.length > 0 ? `<table class="receipt-table"><thead><tr>${productColumns.map((column) => `<th class="${column.key === "productName" ? "text-left" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${productColumns.length}" class="center">No items</td></tr>`}</tbody></table>` : ""}
    <div class="line"></div>
    <div class="totals-row"><span>Bill Amount</span><span>${escapeHtml(Number(receiptData.billAmount || 0).toFixed(2))}</span></div>${customization?.showDiscountOnReceipt && !showDiscountColumn ? `<div class="totals-row"><span>Discount</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}<div class="totals-row grand"><span>Net Amount</span><span>${escapeHtml(Number(receiptData.total || 0).toFixed(2))}</span></div>
    ${taxRowsHtml ? `<div class="section-label">Tax Summary</div><table class="receipt-table"><thead><tr>${taxColumns.map((column) => `<th class="${column.key === "taxName" ? "text-left" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${taxRowsHtml}</tbody></table>` : ""}
    ${barcodeMarkup ? `<div class="line"></div><div class="barcode-wrap">${barcodeMarkup}</div>` : ""}
    <div class="line"></div>
    <div class="thanks">${escapeHtml(receiptData.message || DEFAULT_SALES_RECEIPT_MESSAGE)}</div>
  </div></body></html>`;
};

