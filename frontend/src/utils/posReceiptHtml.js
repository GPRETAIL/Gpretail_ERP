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

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getReceiptPositionClass = (position) =>
  position === "right" ? "text-right" : position === "center" ? "text-center" : "text-left";

const buildReceiptMetaInlineHtml = (items = []) =>
  items.map((item) => `
    <span class="meta-item">
      ${escapeHtml(item.label)}: <span${item.key === "salesNo" ? ' style="font-family:monospace;font-weight:600;"' : ""}>${escapeHtml(item.value)}</span>
    </span>
  `).join("");

const buildReceiptMetaLineHtml = (line) => {
  const items = Array.isArray(line?.items) ? line.items : [];
  const positions = Array.from(new Set(items.map((item) => item.position || "left")));

  if (positions.length <= 1) {
    const positionClass = getReceiptPositionClass(positions[0] || "left");
    return `<div class="meta-row meta-row-single"><div class="meta-group ${positionClass}">${buildReceiptMetaInlineHtml(items)}</div></div>`;
  }

  return `<div class="meta-row meta-row-grid"><div class="meta-group text-left">${buildReceiptMetaInlineHtml(items.filter((item) => item.position === "left"))}</div><div class="meta-group text-center">${buildReceiptMetaInlineHtml(items.filter((item) => item.position === "center"))}</div><div class="meta-group text-right">${buildReceiptMetaInlineHtml(items.filter((item) => item.position === "right"))}</div></div>`;
};

export const buildPosSaleReceiptHtml = (receiptData, customization) => {
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
  const generalContent = {
    logo: receiptData.logoText || "LOGO",
    header: receiptData.headerTitle || "POS RECEIPT",
    company: receiptData.storeName || "",
    address: receiptData.storeAddress || "",
    gst: receiptData.storeGstNo ? `GST No: ${receiptData.storeGstNo}` : "",
    salesNo: receiptData.billNo || "",
    cashier: receiptData.cashierName || "",
    counter: receiptData.counterName || "",
    paymentMethod: receiptData.paymentMethod || "",
    date: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleDateString() : "",
    time: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleTimeString() : "",
    customer: receiptData.customerName || "Walking customer",
  };
  const { topRows, groupedLines } = buildSalesReceiptGeneralLayout(customization, generalContent);
  const productCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name || "-");
    if (key === "qty") return Number(item.qty || 0).toFixed(2);
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
        <td class="${column.key === "productName" ? "product-cell" : "num"}">${escapeHtml(productCellValue(item, column.key))}</td>
      `).join("")}
    </tr>
  `).join("");
  const returnCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name || "-");
    if (key === "qty") return Number(item.qty || 0).toFixed(2);
    if (key === "amount") return Number(item.amount || 0).toFixed(2);
    return "";
  };
  const returnRowsHtml = returnItems.map((item) => `
    <tr>
      ${productColumns.map((column) => `
        <td class="${column.key === "productName" ? "product-cell" : "num"}">${escapeHtml(returnCellValue(item, column.key))}</td>
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
  const receiptWidth = getSalesReceiptWidthCss(customization?.receiptWidthInches);
  const billBarcode = String(receiptData.billBarcode || receiptData.billNo || "").trim();
  const barcodeMarkup =
    receiptData.billCodeMarkup
    ?? buildReceiptCodeMarkupSync(billBarcode, customization, "bill");

  return `<!DOCTYPE html><html><head><title>POS Receipt #${escapeHtml(receiptData.billNo)}</title><style>
    @page { margin: 0.18in; size: auto; } * { box-sizing: border-box; } body { font-family: ${getSalesReceiptFontCss(customization?.receiptFontFamily)}; margin: 0; padding: 12px; color: #111827; background: #ffffff; }
    .receipt { width: ${receiptWidth}; max-width: 100%; margin: 0 auto; font-size: 12px; } .center { text-align: center; } .text-left { text-align: left; } .text-center { text-align: center; } .text-right { text-align: right; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.08em; } .store-meta { margin: 2px 0; font-size: 11px; line-height: 1.35; color: #374151; } .meta { margin: 8px 0; }
    .meta-row { margin: 3px 0; } .meta-row-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 8px; } .meta-row-single { display: block; } .meta-group { display: flex; flex-wrap: wrap; gap: 2px 14px; width: 100%; } .meta-group.text-right { justify-content: flex-end; } .meta-group.text-center { justify-content: center; } .meta-group.text-left { justify-content: flex-start; } .meta-item { white-space: nowrap; } .line { border-top: 1px dashed #111827; margin: 8px 0; } table { width: 100%; border-collapse: collapse; }
    th, td { padding: 4px 2px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; } th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; } .product-cell { white-space: pre-line; line-height: 1.35; }
    .num { text-align: right; white-space: nowrap; } .totals-row { display: flex; justify-content: space-between; margin: 4px 0; } .grand { font-weight: 700; font-size: 14px; } .section-label { margin: 8px 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; }
    .thanks { margin-top: 10px; text-align: center; font-size: 12px; font-weight: 700; line-height: 1.5; white-space: pre-line; } .barcode-wrap { margin-top: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; } .barcode-wrap svg { width: 100%; height: auto; max-width: 100%; } .barcode-wrap img { width: ${RECEIPT_QR_CODE_DISPLAY_PX}px; height: ${RECEIPT_QR_CODE_DISPLAY_PX}px; max-width: 100%; object-fit: contain; }
    ${buildReceiptFormatCss(customization?.receiptFormat)}
  </style></head><body><div class="receipt">
    <div class="space-y-1">${topRows.map((row) => `<div class="${escapeHtml(getReceiptPositionClass(row.position))} store-meta ${row.key === "company" ? "title" : ""}">${row.key === "logo" ? `<span style="display:inline-flex;border:1px dashed #d1d5db;border-radius:8px;padding:8px 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#6b7280;">${escapeHtml(row.value)}</span>` : escapeHtml(row.value)}</div>`).join("")}${receiptData.storePhone ? `<div class="center store-meta">Contact: ${escapeHtml(receiptData.storePhone)}</div>` : ""}</div>
    <div class="meta">${groupedLines.map((line) => buildReceiptMetaLineHtml(line)).join("")}${receiptData.footerNote ? `<div class="meta-row"><span>Salesman</span><span>${escapeHtml(receiptData.footerNote.replace(/^Salesman:\\s*/, ""))}</span></div>` : ""}</div>
    <div class="line"></div>
    ${productColumns.length > 0 ? `<table><thead><tr>${productColumns.map((column) => `<th class="${column.key === "productName" ? "" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${productColumns.length}" class="center">No items</td></tr>`}</tbody></table>` : ""}
    <div class="line"></div><div class="totals-row"><span>Bill Amount</span><span>${escapeHtml(Number(receiptData.billAmount || 0).toFixed(2))}</span></div>${customization?.showDiscountOnReceipt && !showDiscountColumn ? `<div class="totals-row"><span>Discount</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}<div class="totals-row grand"><span>Net Amount</span><span>${escapeHtml(Number(receiptData.total || 0).toFixed(2))}</span></div>
    ${receiptData.generalTaxVisible ? `<div class="totals-row"><span>Tax</span><span>${escapeHtml(Number(receiptData.taxAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalPaidVisible ? `<div class="totals-row"><span>Paid</span><span>${escapeHtml(Number(receiptData.paidAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalReceivedVisible ? `<div class="totals-row"><span>Receivedamount</span><span>${escapeHtml(Number(receiptData.receivedAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalBalanceVisible ? `<div class="totals-row"><span>Balanceamt</span><span>${escapeHtml(Number(receiptData.balanceAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalYouSavedVisible ? `<div class="totals-row"><span>yousaved</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}
    ${Number(receiptData.refundAmount || 0) > 0 ? `<div class="totals-row"><span>Refund</span><span>${escapeHtml(Number(receiptData.refundAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.changeAmount ? `<div class="totals-row"><span>Change</span><span>${escapeHtml(Number(receiptData.changeAmount || 0).toFixed(2))}</span></div>` : ""}
    ${returnRowsHtml ? `<div class="section-label">Returned Items${receiptData.appliedReturnNo ? ` - ${escapeHtml(receiptData.appliedReturnNo)}` : ""}</div><table><thead><tr>${productColumns.map((column) => `<th class="${column.key === "productName" ? "" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${returnRowsHtml}</tbody></table>` : ""}
    ${taxRowsHtml ? `<div class="section-label">Tax Summary</div><table><thead><tr>${taxColumns.map((column) => `<th class="${column.key === "taxName" ? "" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${taxRowsHtml}</tbody></table>` : ""}
    ${barcodeMarkup ? `<div class="barcode-wrap">${barcodeMarkup}</div>` : ""}${receiptData.paymentQrMarkup ? `<div class="barcode-wrap">${receiptData.paymentQrMarkup}</div>` : ""}<div class="thanks">${escapeHtml(receiptData.message || DEFAULT_SALES_RECEIPT_MESSAGE)}</div>
  </div></body></html>`;
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
  const generalContent = {
    logo: receiptData.logoText || "LOGO",
    header: receiptData.headerTitle || "POS RETURN",
    company: receiptData.storeName || "",
    address: receiptData.storeAddress || "",
    gst: receiptData.storeGstNo ? `GST No: ${receiptData.storeGstNo}` : "",
    salesNo: receiptData.billNo || "",
    cashier: receiptData.cashierName || "",
    counter: receiptData.counterName || "",
    paymentMethod: receiptData.paymentMethod || "",
    date: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleDateString() : "",
    time: receiptData.dateTime ? new Date(receiptData.dateTime).toLocaleTimeString() : "",
    customer: receiptData.customerName || "Walking customer",
    paid: toNum(receiptData.paidAmount, 0) > 0 ? Number(receiptData.paidAmount).toFixed(2) : "",
    receivedAmount: toNum(receiptData.receivedAmount, 0) > 0 ? Number(receiptData.receivedAmount).toFixed(2) : "",
    balanceAmt: toNum(receiptData.balanceAmount, 0) > 0 ? Number(receiptData.balanceAmount).toFixed(2) : "",
    youSaved: toNum(receiptData.discountAmount, 0) > 0 ? Number(receiptData.discountAmount).toFixed(2) : "",
    tax: toNum(receiptData.taxAmount, 0) > 0 ? `Tax: ${Number(receiptData.taxAmount).toFixed(2)}` : "",
  };
  const { topRows, groupedLines } = buildSalesReceiptGeneralLayout(customization, generalContent);
  const productCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name || "-");
    if (key === "qty") return Number(item.qty || 0).toFixed(2);
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
        <td class="${column.key === "productName" ? "product-cell" : "num"}">${escapeHtml(productCellValue(item, column.key))}</td>
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
  const receiptWidth = getSalesReceiptWidthCss(customization?.receiptWidthInches);
  const returnBarcode = String(receiptData.billBarcode || receiptData.billNo || "").trim();
  const barcodeMarkup =
    receiptData.returnCodeMarkup
    ?? buildReceiptCodeMarkupSync(returnBarcode, customization, "return");

  return `<!DOCTYPE html><html><head><title>POS Return #${escapeHtml(receiptData.billNo)}</title><style>
    @page { margin: 0.18in; size: auto; } * { box-sizing: border-box; } body { font-family: ${getSalesReceiptFontCss(customization?.receiptFontFamily)}; margin: 0; padding: 12px; color: #111827; background: #ffffff; }
    .receipt { width: ${receiptWidth}; max-width: 100%; margin: 0 auto; font-size: 12px; } .center { text-align: center; } .text-left { text-align: left; } .text-center { text-align: center; } .text-right { text-align: right; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.08em; } .store-meta { margin: 2px 0; font-size: 11px; line-height: 1.35; color: #374151; } .meta { margin: 8px 0; }
    .meta-row { margin: 3px 0; } .meta-row-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 8px; } .meta-row-single { display: block; } .meta-group { display: flex; flex-wrap: wrap; gap: 2px 14px; width: 100%; } .meta-group.text-right { justify-content: flex-end; } .meta-group.text-center { justify-content: center; } .meta-group.text-left { justify-content: flex-start; } .meta-item { white-space: nowrap; } .line { border-top: 1px dashed #111827; margin: 8px 0; } table { width: 100%; border-collapse: collapse; }
    th, td { padding: 4px 2px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; } th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; } .product-cell { white-space: pre-line; line-height: 1.35; }
    .num { text-align: right; white-space: nowrap; } .totals-row { display: flex; justify-content: space-between; margin: 4px 0; } .grand { font-weight: 700; font-size: 14px; } .section-label { margin: 8px 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; }
    .thanks { margin-top: 10px; text-align: center; font-size: 12px; font-weight: 700; line-height: 1.5; white-space: pre-line; } .barcode-wrap { margin-top: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; } .barcode-wrap svg { width: 100%; height: auto; max-width: 100%; } .barcode-wrap img { width: ${RECEIPT_QR_CODE_DISPLAY_PX}px; height: ${RECEIPT_QR_CODE_DISPLAY_PX}px; max-width: 100%; object-fit: contain; }
    ${buildReceiptFormatCss(customization?.receiptFormat)}
  </style></head><body><div class="receipt">
    <div class="space-y-1">${topRows.map((row) => `<div class="${escapeHtml(getReceiptPositionClass(row.position))} store-meta ${row.key === "company" ? "title" : ""}">${row.key === "logo" ? `<span style="display:inline-flex;border:1px dashed #d1d5db;border-radius:8px;padding:8px 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#6b7280;">${escapeHtml(row.value)}</span>` : escapeHtml(row.value)}</div>`).join("")}${receiptData.storePhone ? `<div class="center store-meta">Contact: ${escapeHtml(receiptData.storePhone)}</div>` : ""}</div>
    <div class="meta">${groupedLines.map((line) => buildReceiptMetaLineHtml(line)).join("")}${receiptData.sourceBillNo ? `<div class="meta-row"><span>Source Bill</span><span>${escapeHtml(receiptData.sourceBillNo)}</span></div>` : ""}${receiptData.returnReason ? `<div class="meta-row"><span>Reason</span><span>${escapeHtml(receiptData.returnReason)}</span></div>` : ""}</div>
    <div class="line"></div>
    ${productColumns.length > 0 ? `<table><thead><tr>${productColumns.map((column) => `<th class="${column.key === "productName" ? "" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${productColumns.length}" class="center">No items</td></tr>`}</tbody></table>` : ""}
    <div class="line"></div><div class="totals-row"><span>Bill Amount</span><span>${escapeHtml(Number(receiptData.billAmount || 0).toFixed(2))}</span></div>${customization?.showDiscountOnReceipt && !showDiscountColumn ? `<div class="totals-row"><span>Discount</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}<div class="totals-row grand"><span>Net Amount</span><span>${escapeHtml(Number(receiptData.total || 0).toFixed(2))}</span></div>
    ${receiptData.generalTaxVisible ? `<div class="totals-row"><span>Tax</span><span>${escapeHtml(Number(receiptData.taxAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalPaidVisible ? `<div class="totals-row"><span>Paid</span><span>${escapeHtml(Number(receiptData.paidAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalReceivedVisible ? `<div class="totals-row"><span>Receivedamount</span><span>${escapeHtml(Number(receiptData.receivedAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalBalanceVisible ? `<div class="totals-row"><span>Balanceamt</span><span>${escapeHtml(Number(receiptData.balanceAmount || 0).toFixed(2))}</span></div>` : ""}${receiptData.generalYouSavedVisible ? `<div class="totals-row"><span>yousaved</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}
    ${taxRowsHtml ? `<div class="section-label">Tax Summary</div><table><thead><tr>${taxColumns.map((column) => `<th class="${column.key === "taxName" ? "" : "num"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${taxRowsHtml}</tbody></table>` : ""}
    ${barcodeMarkup ? `<div class="barcode-wrap">${barcodeMarkup}</div>` : ""}<div class="thanks">${escapeHtml(receiptData.message || DEFAULT_SALES_RECEIPT_MESSAGE)}</div>
  </div></body></html>`;
};
