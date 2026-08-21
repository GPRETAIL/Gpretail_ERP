import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Printer, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";
import { usePrintContext } from "../../context/PrintContext";
import {
  canDeleteLatestPosDocument,
  formatLatestPosDocumentNumber,
  getLatestPosDocumentDeletePath,
  getLatestPosDocumentFetchPath,
  loadLatestPosDocument,
} from "../../utils/posLatestDocument";
import {
  buildSalesReceiptGeneralLayout,
  buildSalesReceiptTaxRows,
  buildPaymentQrMarkup,
  buildReceiptCodeMarkupAsync,
  buildReceiptCodeMarkupSync,
  DEFAULT_SALES_RECEIPT_MESSAGE,
  buildReceiptFormatCss,
  getVisibleSalesReceiptProductColumns,
  getVisibleSalesReceiptTaxColumns,
  getPosBillBarcodeValue,
  getPosReturnBarcodeValue,
  getSalesReceiptFontCss,
  getSalesReceiptPaperSize,
  getSalesReceiptRateWithTax,
  getSalesReceiptWidthCss,
  loadSalesReceiptCustomization,
  fetchSalesReceiptCustomization,
  RECEIPT_QR_CODE_DISPLAY_PX,
  shouldShowSalesReceiptDiscountColumn,
  wrapSalesReceiptText,
} from "../../utils/salesReceiptCustomization";

// Header-only historical import: no line items, no stock restored, no source-sale linkage.
// The backend records each row as a standalone unsettled return (see PosReturnService.bulkCreate).
const POS_RETURN_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    returnat: "returnAt", returndate: "returnAt", date: "returnAt",
    amount: "amount", returnamount: "amount",
    customerid: "customerId",
    customername: "customerName", customer: "customerName",
    customermobile: "customerMobile", mobile: "customerMobile",
  },
  required: ["amount"],
  sampleFileName: "pos_return_sample.xlsx",
  sampleHeaders: ["company", "returnAt", "amount", "customerName", "customerMobile"],
};

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatSaleBillNo = (value) => `SB/${toInt(value, 0)}`;
const isLikelySaleBillInput = (value) => /^(?:sb\/)?\d+$/i.test(String(value || "").trim());
const isLikelyReturnNoInput = (value) => /^(?:rr|ro)\/?\d+$/i.test(String(value || "").trim());
const formatReturnNo = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw.startsWith("RR/") || raw.startsWith("RO/")) return raw;
  return `RR/${toInt(value, 0)}`;
};
const WALKING_CUSTOMER_NAME = "Walking customer";
const RECEIPT_LOGO_TEXT = "LOGO";
const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

/** Upper bound for barcode-only returns (no source bill); server recomputes price/tax anyway. */
const STANDALONE_MAX_QTY = 999999;
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
const getSaleReceiptPaymentMethod = (sale = {}) => {
  const labels = [];
  if (Math.max(0, toNum(sale.cash_amount ?? sale.cashAmount, 0)) > 0) labels.push("Cash");
  if (Math.max(0, toNum(sale.card_amount ?? sale.cardAmount, 0)) > 0) labels.push("Card");
  if (Math.max(0, toNum(sale.upi_amount ?? sale.upiAmount, 0)) > 0) labels.push("UPI");
  if (Math.max(0, toNum(sale.return_refund_amount, 0)) > 0) labels.push("Refund");
  return labels.join(" / ");
};

const buildPosSaleReceiptHtml = (receiptData, customization) => {
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
    logo: receiptData.logoText || RECEIPT_LOGO_TEXT,
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
    customer: receiptData.customerName || WALKING_CUSTOMER_NAME,
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
    <tr>${productColumns.map((column) => `<td class="${column.key === "productName" ? "product-cell" : "num"}">${escapeHtml(productCellValue(item, column.key))}</td>`).join("")}</tr>
  `).join("");
  const returnCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name || "-");
    if (key === "qty") return Number(item.qty || 0).toFixed(2);
    if (key === "amount") return Number(item.amount || 0).toFixed(2);
    return "";
  };
  const returnRowsHtml = returnItems.map((item) => `
    <tr>${productColumns.map((column) => `<td class="${column.key === "productName" ? "product-cell" : "num"}">${escapeHtml(returnCellValue(item, column.key))}</td>`).join("")}</tr>
  `).join("");
  const taxCellValue = (row, key) => {
    if (key === "taxName") return row.label;
    if (key === "percent") return Number(row.taxPerc || 0).toFixed(2);
    if (key === "amount") return Number(row.baseAmount || 0).toFixed(2);
    if (key === "total") return Number(row.taxAmount || 0).toFixed(2);
    return "";
  };
  const taxRowsHtml = taxRows.map((row) => `
    <tr>${taxColumns.map((column) => `<td class="${column.key === "taxName" ? "" : "num"}">${escapeHtml(taxCellValue(row, column.key))}</td>`).join("")}</tr>
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
    <div class="meta">${groupedLines.map((line) => buildReceiptMetaLineHtml(line)).join("")}${receiptData.footerNote ? `<div class="meta-row"><span>Salesman</span><span>${escapeHtml(receiptData.footerNote.replace(/^Salesman:\s*/, ""))}</span></div>` : ""}</div>
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

const POS_TABLE_COLS = {
  sNo: "w-14 shrink-0",
  barcode: "w-36 shrink-0",
  product: "w-52 shrink-0",
  qty: "w-20 shrink-0",
  price: "w-20 shrink-0",
  tax: "w-16 shrink-0",
  cost: "w-20 shrink-0",
  discount: "w-20 shrink-0",
  total: "w-24 shrink-0",
  action: "w-12 shrink-0",
};
const POS_TABLE_WIDTH = "min-w-[1060px]";

const blankCustomer = {
  mobileNo: "",
  name: "",
};

const buildPosReturnReceiptHtml = (receiptData, customization) => {
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
    logo: receiptData.logoText || RECEIPT_LOGO_TEXT,
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
    customer: receiptData.customerName || WALKING_CUSTOMER_NAME,
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
  const rowsHtml = receiptItems
    .map(
      (item) => `
        <tr>
          ${productColumns.map((column) => `
            <td class="${column.key === "productName" ? "product-cell" : "num"}">${escapeHtml(productCellValue(item, column.key))}</td>
          `).join("")}
        </tr>
      `
    )
    .join("");
  const taxCellValue = (row, key) => {
    if (key === "taxName") return row.label;
    if (key === "percent") return Number(row.taxPerc || 0).toFixed(2);
    if (key === "amount") return Number(row.baseAmount || 0).toFixed(2);
    if (key === "total") return Number(row.taxAmount || 0).toFixed(2);
    return "";
  };
  const taxRowsHtml = taxRows
    .map(
      (row) => `
        <tr>
          ${taxColumns.map((column) => `
            <td class="${column.key === "taxName" ? "" : "num"}">${escapeHtml(taxCellValue(row, column.key))}</td>
          `).join("")}
        </tr>
      `
    )
    .join("");

  const receiptWidth = getSalesReceiptWidthCss(customization?.receiptWidthInches);
  const returnBarcode = String(receiptData.billBarcode || receiptData.billNo || "").trim();
  const barcodeMarkup =
    receiptData.returnCodeMarkup
    ?? buildReceiptCodeMarkupSync(returnBarcode, customization, "return");

  return `<!DOCTYPE html>
    <html>
      <head>
        <title>POS Return #${escapeHtml(receiptData.billNo)}</title>
        <style>
          @page { margin: 0.18in; size: auto; }
          * { box-sizing: border-box; }
          body {
            font-family: ${getSalesReceiptFontCss(customization?.receiptFontFamily)};
            margin: 0;
            padding: 12px;
            color: #111827;
            background: #ffffff;
          }
          .receipt {
            width: ${receiptWidth};
            max-width: 100%;
            margin: 0 auto;
            font-size: 12px;
          }
          .center { text-align: center; }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.08em; }
          .store-meta { margin: 2px 0; font-size: 11px; line-height: 1.35; color: #374151; }
          .meta { margin: 8px 0; }
          .meta-row { margin: 3px 0; }
          .meta-row-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; gap: 8px; }
          .meta-row-single { display: block; }
          .meta-group { display: flex; flex-wrap: wrap; gap: 2px 14px; width: 100%; }
          .meta-group.text-right { justify-content: flex-end; }
          .meta-group.text-center { justify-content: center; }
          .meta-group.text-left { justify-content: flex-start; }
          .meta-item { white-space: nowrap; }
          .line { border-top: 1px dashed #111827; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 2px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
          th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
          .product-cell { white-space: pre-line; line-height: 1.35; }
          .num { text-align: right; white-space: nowrap; }
          .totals-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .grand { font-weight: 700; font-size: 14px; }
          .section-label { margin: 8px 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; }
          .thanks { margin-top: 10px; text-align: center; font-size: 12px; font-weight: 700; line-height: 1.5; white-space: pre-line; }
          .barcode-wrap { margin-top: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
          .barcode-wrap svg { width: 100%; height: auto; max-width: 100%; }
          .barcode-wrap img { width: ${RECEIPT_QR_CODE_DISPLAY_PX}px; height: ${RECEIPT_QR_CODE_DISPLAY_PX}px; max-width: 100%; object-fit: contain; }
          ${buildReceiptFormatCss(customization?.receiptFormat)}
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="space-y-1">
            ${topRows.map((row) => `
              <div class="${escapeHtml(getReceiptPositionClass(row.position))} store-meta ${row.key === "company" ? "title" : ""}">
                ${row.key === "logo"
                  ? `<span style="display:inline-flex;border:1px dashed #d1d5db;border-radius:8px;padding:8px 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;color:#6b7280;">${escapeHtml(row.value)}</span>`
                  : escapeHtml(row.value)}
              </div>
            `).join("")}
            ${receiptData.storePhone ? `<div class="center store-meta">Contact: ${escapeHtml(receiptData.storePhone)}</div>` : ""}
          </div>
          <div class="meta">
            ${groupedLines.map((line) => buildReceiptMetaLineHtml(line)).join("")}
            ${receiptData.sourceBillNo ? `<div class="meta-row"><span>Source Bill</span><span>${escapeHtml(receiptData.sourceBillNo)}</span></div>` : ""}
            ${receiptData.returnReason ? `<div class="meta-row"><span>Reason</span><span>${escapeHtml(receiptData.returnReason)}</span></div>` : ""}
          </div>
          <div class="line"></div>
          ${
            productColumns.length > 0
              ? `<table>
                  <thead>
                    <tr>
                      ${productColumns.map((column) => `<th class="${column.key === "productName" ? "" : "num"}">${escapeHtml(column.label)}</th>`).join("")}
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml || `<tr><td colspan="${productColumns.length}" class="center">No items</td></tr>`}
                  </tbody>
                </table>`
              : ""
          }
          <div class="line"></div>
          <div class="totals-row"><span>Bill Amount</span><span>${escapeHtml(Number(receiptData.billAmount || 0).toFixed(2))}</span></div>
          ${
            customization?.showDiscountOnReceipt && !showDiscountColumn
              ? `<div class="totals-row"><span>Discount</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>`
              : ""
          }
          <div class="totals-row grand"><span>Net Amount</span><span>${escapeHtml(Number(receiptData.total || 0).toFixed(2))}</span></div>
          ${receiptData.generalTaxVisible ? `<div class="totals-row"><span>Tax</span><span>${escapeHtml(Number(receiptData.taxAmount || 0).toFixed(2))}</span></div>` : ""}
          ${receiptData.generalPaidVisible ? `<div class="totals-row"><span>Paid</span><span>${escapeHtml(Number(receiptData.paidAmount || 0).toFixed(2))}</span></div>` : ""}
          ${receiptData.generalReceivedVisible ? `<div class="totals-row"><span>Receivedamount</span><span>${escapeHtml(Number(receiptData.receivedAmount || 0).toFixed(2))}</span></div>` : ""}
          ${receiptData.generalBalanceVisible ? `<div class="totals-row"><span>Balanceamt</span><span>${escapeHtml(Number(receiptData.balanceAmount || 0).toFixed(2))}</span></div>` : ""}
          ${receiptData.generalYouSavedVisible ? `<div class="totals-row"><span>yousaved</span><span>${escapeHtml(Number(receiptData.discountAmount || 0).toFixed(2))}</span></div>` : ""}
          ${
            taxRowsHtml
              ? `<div class="section-label">Tax Summary</div>
                 <table>
                   <thead>
                     <tr>
                       ${taxColumns.map((column) => `<th class="${column.key === "taxName" ? "" : "num"}">${escapeHtml(column.label)}</th>`).join("")}
                     </tr>
                   </thead>
                   <tbody>
                     ${taxRowsHtml}
                   </tbody>
                 </table>`
              : ""
          }
          ${
            barcodeMarkup
              ? `<div class="barcode-wrap">${barcodeMarkup}</div>`
              : ""
          }
          <div class="thanks">${escapeHtml(receiptData.message || DEFAULT_SALES_RECEIPT_MESSAGE)}</div>
        </div>
      </body>
    </html>`;
};

const POSReturn = () => {
  const navigate = useNavigate();
  const billInputRef = useRef(null);
  const authUser = useSelector((state) => state.auth.user);
  const { connected: printerConnected, printHtml: queuePrintHtml } = usePrintContext();
  const [resolvedExportCompanyName, setResolvedExportCompanyName] = useState(
    () => String(authUser?.company_name || "").trim()
  );

  const [now, setNow] = useState(new Date());
  const [returnNo, setReturnNo] = useState(1);
  const [existingCustomerId, setExistingCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ ...blankCustomer });
  const [customers, setCustomers] = useState([]);
  const [returnReasons, setReturnReasons] = useState([]);
  const [selectedReturnReasonId, setSelectedReturnReasonId] = useState("");
  const [billLookup, setBillLookup] = useState("");
  const [sourceSale, setSourceSale] = useState(null);
  const [cart, setCart] = useState([]);
  const [latestPosDocument, setLatestPosDocument] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingLatestDocument, setDeletingLatestDocument] = useState(false);
  const [loadingBill, setLoadingBill] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    returnNo: "",
    customerName: "",
    product: "",
  });
  const searchFiltersRef = useRef(searchFilters);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(20);
  const [searchPagination, setSearchPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    let active = true;
    const fallbackName = String(authUser?.company_name || "").trim();
    if (fallbackName) {
      setResolvedExportCompanyName(fallbackName);
      return () => {
        active = false;
      };
    }

    const companyId = Number(authUser?.company_id || 0);
    if (!companyId) {
      setResolvedExportCompanyName("");
      return () => {
        active = false;
      };
    }

    const loadCompanyName = async () => {
      try {
        const res = await api.get(`/companies/${companyId}`);
        const companyName = String(res.data?.data?.name || res.data?.name || "").trim();
        if (active) setResolvedExportCompanyName(companyName);
      } catch {
        if (active) setResolvedExportCompanyName("");
      }
    };

    loadCompanyName();
    return () => {
      active = false;
    };
  }, [authUser?.company_id, authUser?.company_name]);

  const resolveExportCompanyTitle = useCallback((sourceRows = []) => {
    const uniqueNames = Array.from(
      new Set(
        (Array.isArray(sourceRows) ? sourceRows : [])
          .map((row) =>
            String(
              row?.company_name
              || row?.company?.name
              || row?.company
              || row?.store_name
              || ""
            ).trim()
          )
          .filter((value) => value && value !== "-")
      )
    );
    if (uniqueNames.length === 1) return uniqueNames[0];
    if (resolvedExportCompanyName) return resolvedExportCompanyName;
    if (uniqueNames.length > 0) return uniqueNames[0];
    return authUser?.company_id ? `Company ${authUser.company_id}` : "Company";
  }, [authUser?.company_id, resolvedExportCompanyName]);

  useEffect(() => {
    searchFiltersRef.current = searchFilters;
  }, [searchFilters]);

  useEffect(() => {
    const cid = authUser?.company_id;
    if (!cid) return undefined;
    fetchSalesReceiptCustomization(api, cid).catch(() => {});
    return undefined;
  }, [authUser?.company_id]);

  const cartWithTotals = useMemo(
    () =>
      cart.map((line) => {
        const qty = Math.max(0, toInt(line.qty, 0));
        const price = Math.max(0, toNum(line.price, 0));
        const tax = Math.max(0, toNum(line.tax, 0));
        const discount = Math.max(0, toNum(line.discount, 0));
        const subtotal = qty * price;
        const taxAmount = (subtotal * tax) / 100;
        const rawTotal = Math.max(subtotal + taxAmount - discount, 0);
        const total = -rawTotal;
        const gross = Math.max(0, toNum(line.cost, 0)) * qty;
        return { ...line, subtotal, taxAmount, rawTotal, total, gross, discount };
      }),
    [cart]
  );

  const summary = useMemo(() => {
    const amount = cartWithTotals.reduce((sum, line) => sum + line.total, 0);
    const totalQty = cartWithTotals.reduce((sum, line) => sum + toNum(line.qty, 0), 0);
    const grossValue = cartWithTotals.reduce((sum, line) => sum + line.gross, 0);
    const totalDiscount = cartWithTotals.reduce((sum, line) => sum + line.discount, 0);
    return { amount, totalQty, grossValue, totalDiscount };
  }, [cartWithTotals]);

  const loadNextReturnNo = useCallback(async () => {
    try {
      const res = await api.get("/pos-returns/next-return-no");
      setReturnNo(toNum(res.data?.data?.returnNo, 1));
    } catch {
      setReturnNo(1);
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      const cfg = (type) =>
        api
          .get(`/configurations/${type}`)
          .then((res) =>
            (res.data?.data || []).map((row) => ({
              value: String(row.id),
              label: row.name || "",
            }))
          )
          .catch(() => []);

      const [customersRes, returnReasonRows] = await Promise.all([
        api.get("/customers").catch(() => ({ data: { data: [] } })),
        cfg("return_reason"),
      ]);

      const customerRows = customersRes.data?.data || [];
      setCustomers(
        customerRows.map((row) => ({
          value: String(row.id),
          label: `${row.name || "Unnamed"}${row.mobile_no ? ` (${row.mobile_no})` : ""}`,
          id: String(row.id),
          name: row.name || "",
          mobileNo: row.mobile_no || "",
        }))
      );
      setReturnReasons(returnReasonRows);
    } catch {
      toast.error("Failed to load POS return data");
    }
  }, []);

  const refreshLatestPosDocument = useCallback(async () => {
    try {
      const latest = await loadLatestPosDocument();
      setLatestPosDocument(latest || null);
    } catch {
      setLatestPosDocument(null);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadMasterData(), loadNextReturnNo(), refreshLatestPosDocument()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadMasterData, loadNextReturnNo, refreshLatestPosDocument]);

  useEffect(() => {
    if (showSearchPage || loading) return;
    billInputRef.current?.focus();
  }, [showSearchPage, loading]);

  const applyCustomerFromSource = useCallback(
    (row) => {
      const customerId = row?.customerId ? String(row.customerId) : "";
      setExistingCustomerId(customerId);
      setNewCustomer({
        mobileNo: row?.customerMobile || "",
        name: row?.customerName || "",
      });
    },
    []
  );

  const mapApiItemsToCartLines = useCallback((items, options = {}) => {
    const isStandalone = options.standalone === true;
    return (items || []).map((item) => {
      const maxQty = isStandalone
        ? STANDALONE_MAX_QTY
        : Math.max(1, toInt(item.maxQty, 1));
      return {
        lineId: `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        stockId: item.productId,
        variantId: item.variantId ?? null,
        barcodeId: item.barcodeId ?? null,
        barcode: item.barcode || "",
        productName: item.productName || "",
        standaloneLine: isStandalone,
        qty: Math.max(1, toInt(item.qty, 1)),
        maxQty,
        originalQty: isStandalone ? 0 : Math.max(0, toInt(item.originalQty, 0)),
        returnedQty: isStandalone ? 0 : Math.max(0, toInt(item.returnedQty, 0)),
        price: Math.max(0, toNum(item.price, 0)),
        tax: Math.max(0, toNum(item.tax, 0)),
        cost: Math.max(0, toNum(item.cost, 0)),
        discount: isStandalone ? 0 : Math.max(0, toNum(item.discount, 0)),
      };
    });
  }, []);

  const replaceBillCart = useCallback(
    (data) => {
      if (sourceSale?.standalone) {
        toast.error("Reset the entry before loading a POS bill.");
        return;
      }
      const nextCart = mapApiItemsToCartLines(data?.items || []);
      setSourceSale({
        id: data?.id,
        billNo: data?.billNo,
        standalone: false,
      });
      applyCustomerFromSource(data);
      setCart(nextCart);
    },
    [applyCustomerFromSource, mapApiItemsToCartLines, sourceSale?.standalone]
  );

  const mergeStandaloneBarcodeIntoCart = useCallback(
    (data) => {
      if (!data?.standalone) return false;
      const nextCartLines = mapApiItemsToCartLines(data?.items || [], { standalone: true });
      const prev = sourceSale;
      if (prev && !prev.standalone && (prev.billNo || prev.id)) {
        toast.error("Cart is tied to a bill. Reset before barcode-only return.");
        return false;
      }
      if (!prev?.standalone) {
        setSourceSale({ standalone: true, id: null, billNo: null });
        setCart(nextCartLines);
        return true;
      }
      setCart((cartPrev) => {
        const next = [...cartPrev];
        for (const nl of nextCartLines) {
          const idx = next.findIndex((l) => l.stockId === nl.stockId);
          if (idx >= 0) {
            const existing = next[idx];
            next[idx] = {
              ...nl,
              lineId: existing.lineId,
              maxQty: nl.maxQty,
              qty: Math.min(Math.max(existing.qty, 1), nl.maxQty),
            };
          } else {
            next.push(nl);
          }
        }
        return next;
      });
      return true;
    },
    [mapApiItemsToCartLines, sourceSale]
  );

  const loadBillOrBarcode = useCallback(
    async (rawInput) => {
      const trimmed = String(rawInput || "").trim();
      if (!trimmed) {
        toast.error("Enter POS bill number or scan a product barcode");
        return;
      }

      setLoadingBill(true);
      try {
        if (isLikelyReturnNoInput(trimmed)) {
          toast.error("RR/… is a return number, not a product barcode. Enter a sale bill (e.g. SB/165) or scan a product barcode.");
          return;
        }

        const tryLoadBill = async () => {
          if (sourceSale?.standalone) {
            toast.error("Reset before loading a POS bill.");
            return false;
          }
          const billRes = await api.get("/pos-returns/source-bill", { params: { billNo: trimmed } });
          const billData = billRes.data?.data;
          if (!billData?.items?.length) return false;
          replaceBillCart(billData);
          setBillLookup("");
          toast.success(`Bill #${formatSaleBillNo(billData.billNo)} loaded`);
          return true;
        };

        const tryLoadBarcode = async () => {
          const barcodeRes = await api.get("/pos-returns/return-product-barcode", { params: { barcode: trimmed } });
          const barcodeData = barcodeRes.data?.data;
          const ok = mergeStandaloneBarcodeIntoCart(barcodeData);
          if (ok) {
            setBillLookup("");
            toast.success("Product added (pricing from catalogue / last sold barcode)");
          }
          return ok;
        };

        if (isLikelySaleBillInput(trimmed)) {
          try {
            const loaded = await tryLoadBill();
            if (loaded) return;
          } catch (billErr) {
            const status = billErr?.response?.status;
            if (status !== 404 && status !== 422) throw billErr;
          }
          await tryLoadBarcode();
          return;
        }

        await tryLoadBarcode();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Bill not found or unknown barcode");
      } finally {
        setLoadingBill(false);
      }
    },
    [mergeStandaloneBarcodeIntoCart, replaceBillCart, sourceSale?.standalone]
  );

  const handleCustomerNumberChange = (value) => {
    setNewCustomer((prev) => ({ ...prev, mobileNo: value }));
    if (existingCustomerId) {
      const matched = customers.find((row) => row.value === existingCustomerId);
      if (!matched || String(matched.mobileNo || "") !== String(value || "")) {
        setExistingCustomerId("");
      }
    }
  };

  const handleCustomerNameChange = (value) => {
    setNewCustomer((prev) => ({ ...prev, name: value }));
    if (existingCustomerId) {
      const matched = customers.find((row) => row.value === existingCustomerId);
      if (!matched || String(matched.name || "") !== String(value || "")) {
        setExistingCustomerId("");
      }
    }
  };

  const handleQtyChange = (lineId, rawValue) => {
    const enteredQty = Math.floor(toNum(rawValue, 0));
    setCart((prev) =>
      prev.map((line) => {
        if (line.lineId !== lineId) return line;
        const cap = line.standaloneLine ? STANDALONE_MAX_QTY : Math.max(1, toInt(line.maxQty, 1));
        return {
          ...line,
          qty: Math.min(Math.max(enteredQty, 1), cap),
        };
      })
    );
  };

  const handleRemoveLine = (lineId) => {
    setCart((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const handleResetEntry = () => {
    setExistingCustomerId("");
    setNewCustomer({ ...blankCustomer });
    setSelectedReturnReasonId("");
    setBillLookup("");
    setSourceSale(null);
    setCart([]);
    setTimeout(() => billInputRef.current?.focus(), 0);
  };

  const fetchReceiptCompanyInfo = useCallback(async () => {
    const companyId = Number(authUser?.company_id || 0);
    if (!companyId) {
      return {
        storeAddress: "",
        storePhone: "",
        storeGstNo: "",
      };
    }

    try {
      const res = await api.get(`/companies/${companyId}`);
      const company = res.data?.data || {};
      return {
        storeAddress: String(company.address || "").trim(),
        storePhone: String(company.contact_no || company.phone || "").trim(),
        storeGstNo: String(company.gst_no || company.gstin || "").trim(),
      };
    } catch {
      return {
        storeAddress: "",
        storePhone: "",
        storeGstNo: "",
      };
    }
  }, [authUser?.company_id]);

  const printReturnReceipt = useCallback(
    async (savedReturn) => {
      const savedItems = savedReturn?.items || [];
      const receiptCustomization = loadSalesReceiptCustomization(authUser?.company_id || "default");
      const [companyInfo] = await Promise.all([fetchReceiptCompanyInfo()]);
      const displayReturnNo = getPosReturnBarcodeValue(
        savedReturn?.display_return_no || savedReturn?.return_no || returnNo
      );
      const sourceBillNo = savedReturn?.source_bill_no
        ? formatSaleBillNo(savedReturn.source_bill_no)
        : sourceSale?.billNo
          ? formatSaleBillNo(sourceSale.billNo)
          : "";
      const storeName =
        String(authUser?.company_name || "").trim()
        || String(authUser?.name || "").trim()
        || "Store";
      const cashierName = String(authUser?.name || authUser?.email || "").trim();
      const receiptCustomerName =
        String(savedReturn?.customer_name || savedReturn?.customer?.name || "").trim()
        || String(newCustomer.name || "").trim()
        || WALKING_CUSTOMER_NAME;
      const receiptItems = (savedItems.length > 0 ? savedItems : cartWithTotals).map((item) => {
        const qty = Math.max(0, toNum(item.qty, 0));
        const rate = Math.max(0, toNum(item.price ?? item.rate, 0));
        const taxPerc = Math.max(0, toNum(item.tax_perc ?? item.taxPerc ?? item.tax, 0));
        const discount = Math.max(0, toNum(item.discount, 0));
        const subtotal = round2(qty * rate);
        const taxAmount = round2((subtotal * taxPerc) / 100);
        const amount = round2(
          Math.abs(toNum(item.total ?? item.amount, 0)) || Math.max(subtotal + taxAmount - discount, 0)
        );

        return {
          name: item.product_name || item.productName || item.barcode || "-",
          qty,
          rate,
          taxPerc,
          taxName: item.tax_name || item.taxName || "",
          taxType: item.tax_type || item.taxType || "",
          baseAmount: subtotal,
          taxAmount,
          discountAmount: round2(Math.max(0, toNum(item.discount, 0))),
          amount,
          code: item.barcode || item.barcodeRef?.barcode || "",
        };
      });
      const receiptTotalDiscount = Math.max(
        0,
        toNum(savedReturn?.total_discount, summary.totalDiscount)
      );
      const receiptGrossAmount = round2(
        receiptItems.reduce((sum, item) => sum + toNum(item.amount, 0), 0)
      );
      const receiptNetAmount = round2(-Math.abs(toNum(savedReturn?.amount, summary.amount || -receiptGrossAmount)));

      const receiptData = {
        storeName,
        storeAddress: companyInfo.storeAddress,
        storePhone: companyInfo.storePhone,
        storeGstNo: companyInfo.storeGstNo,
        billNo: displayReturnNo,
        billBarcode: displayReturnNo,
        dateTime: savedReturn?.return_at || now.toISOString(),
        cashierName,
        counterName: String(authUser?.counter_name || savedReturn?.counter_name || "").trim(),
        customerName: receiptCustomerName,
        sourceBillNo,
        returnReason:
          returnReasons.find((row) => row.value === String(selectedReturnReasonId || ""))?.label
          || String(savedReturn?.return_reason_name || "").trim(),
        paperSize: getSalesReceiptPaperSize(receiptCustomization.receiptWidthInches),
        items: receiptItems,
        billAmount: round2(receiptNetAmount - receiptTotalDiscount),
        discountAmount: receiptTotalDiscount,
        taxAmount: round2(
          receiptItems.reduce((sum, item) => sum + toNum(item.taxAmount, 0), 0)
        ),
        total: receiptNetAmount,
        paidAmount: 0,
        receivedAmount: 0,
        balanceAmount: 0,
        paymentMethod: "Return",
        generalTaxVisible: Boolean(receiptCustomization.generalFields?.tax?.visible),
        generalPaidVisible: Boolean(receiptCustomization.generalFields?.paid?.visible),
        generalReceivedVisible: Boolean(receiptCustomization.generalFields?.receivedAmount?.visible),
        generalBalanceVisible: Boolean(receiptCustomization.generalFields?.balanceAmt?.visible),
        generalYouSavedVisible: Boolean(receiptCustomization.generalFields?.youSaved?.visible),
        message: receiptCustomization.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
        returnCodeMarkup: await buildReceiptCodeMarkupAsync(displayReturnNo, receiptCustomization, "return"),
      };
      const browserReceiptHtml = buildPosReturnReceiptHtml(receiptData, receiptCustomization);

      if (printerConnected) {
        const jobId = await queuePrintHtml(browserReceiptHtml, {
          label: `POSReturn-${displayReturnNo}`,
          docType: "pos_return_receipt",
          copies: 1,
          companyId: authUser?.company_id,
          receiptData,
        });
        if (jobId) return;
      }

      const printWindow = window.open("", "_blank", "width=420,height=720");
      if (!printWindow) {
        toast.error("Popup blocked. Allow popups to use browser print.");
        return;
      }

      printWindow.document.write(browserReceiptHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    },
    [
      authUser?.company_id,
      authUser?.company_name,
      authUser?.counter_name,
      authUser?.email,
      authUser?.name,
      cartWithTotals,
      fetchReceiptCompanyInfo,
      newCustomer.name,
      now,
      printerConnected,
      queuePrintHtml,
      returnNo,
      returnReasons,
      selectedReturnReasonId,
      sourceSale?.billNo,
      summary.amount,
      summary.totalDiscount,
    ]
  );

  const printSaleReceipt = useCallback(
    async (savedSale) => {
      const detail = savedSale?.items?.length
        ? savedSale
        : (await api.get(`/pos-sales/${savedSale.id}`).catch(() => ({ data: { data: null } }))).data?.data;
      if (!detail) {
        toast.error("Failed to load POS sale for printing");
        return;
      }

      const receiptCustomization = loadSalesReceiptCustomization(authUser?.company_id || "default");
      const appliedReturnId = toNum(detail?.applied_pos_return_id ?? detail?.appliedPosReturnId, 0);
      const [companyInfo, linkedReturnRes] = await Promise.all([
        fetchReceiptCompanyInfo(),
        appliedReturnId
          ? api.get(`/pos-returns/${appliedReturnId}`).catch(() => ({ data: { data: null } }))
          : Promise.resolve({ data: { data: null } }),
      ]);
      const linkedReturn = linkedReturnRes?.data?.data || null;
      const displayBillNo = getPosBillBarcodeValue(detail?.bill_no || detail?.id);
      const storeName =
        String(authUser?.company_name || "").trim()
        || String(authUser?.name || "").trim()
        || "Store";
      const cashierName = String(authUser?.name || authUser?.email || "").trim();
      const allSalesMen = (detail?.items || []).map((item) => String(item.sales_man_name || item.salesManName || "").trim());
      const namedSalesMen = allSalesMen.filter(Boolean);
      const uniqueSalesMen = [...new Set(namedSalesMen)];
      const commonSalesMan =
        namedSalesMen.length === (detail?.items || []).length && uniqueSalesMen.length === 1 ? uniqueSalesMen[0] : "";
      const receiptItems = (detail?.items || []).map((item) => {
        const qty = Math.max(0, toNum(item.qty, 0));
        const rate = Math.max(0, toNum(item.price ?? item.rate, 0));
        const taxPerc = Math.max(0, toNum(item.tax_perc ?? item.taxPerc ?? item.tax, 0));
        const subtotal = round2(qty * rate);
        const taxAmount = round2((subtotal * taxPerc) / 100);
        const discountAmount = round2(Math.max(0, toNum(item.discount, 0)));
        const salesManName = String(item.sales_man_name || item.salesManName || "").trim();
        const baseName = item.product_name || item.productName || item.barcode || "-";
        const itemName = commonSalesMan || !salesManName ? baseName : `${baseName} / SM: ${salesManName}`;

        return {
          name: itemName,
          qty,
          rate,
          taxPerc,
          taxName: item.tax_name || "",
          taxType: item.tax_type || "",
          baseAmount: subtotal,
          taxAmount,
          discountAmount,
          amount: round2(toNum(item.total ?? item.amount, subtotal + taxAmount - discountAmount)),
          code: item.barcode || "",
        };
      });
      const receiptGrossAmount = round2(receiptItems.reduce((sum, item) => sum + toNum(item.amount, 0), 0));
      const receiptTotalDiscount = Math.max(0, toNum(detail?.total_discount, 0));
      const receiptBillAmount = round2(receiptGrossAmount + toNum(detail?.addnl_amount, 0) + receiptTotalDiscount);
      const receiptNetAmount = round2(toNum(detail?.amount, receiptGrossAmount));
      const receiptTaxAmount = round2(
        receiptItems.reduce((sum, item) => sum + toNum(item.taxAmount, 0), 0) + toNum(detail?.addnl_tax_amount, 0)
      );
      const receiptReturnItems = (linkedReturn?.items || []).map((item) => ({
        name: item.product_name || item.productName || item.barcode || "-",
        qty: Math.max(0, toNum(item.qty, 0)),
        amount: Math.abs(toNum(item.total ?? item.amount, 0)),
      }));
      const receiptReceivedAmount = Math.max(0, toNum(detail?.received_amount, 0));
      const receiptData = {
        storeName,
        storeAddress: companyInfo.storeAddress,
        storePhone: companyInfo.storePhone,
        storeGstNo: companyInfo.storeGstNo,
        billNo: displayBillNo,
        billBarcode: displayBillNo,
        dateTime: detail?.sale_at || detail?.created_at || now.toISOString(),
        cashierName,
        counterName: String(authUser?.counter_name || detail?.counter_name || "").trim(),
        customerName: String(detail?.customer_name || detail?.customer?.name || "").trim() || WALKING_CUSTOMER_NAME,
        paperSize: getSalesReceiptPaperSize(receiptCustomization.receiptWidthInches),
        items: receiptItems,
        billAmount: receiptBillAmount,
        discountAmount: receiptTotalDiscount,
        taxAmount: receiptTaxAmount,
        refundAmount: Math.max(0, toNum(detail?.return_refund_amount, 0)),
        appliedReturnNo: linkedReturn?.display_return_no || detail?.applied_return_no || "",
        returnItems: receiptReturnItems,
        total: receiptNetAmount,
        paidAmount: receiptReceivedAmount,
        receivedAmount: receiptReceivedAmount,
        balanceAmount: Math.max(0, receiptNetAmount - receiptReceivedAmount),
        changeAmount: Math.max(0, toNum(detail?.change_amount, 0)),
        paymentMethod: getSaleReceiptPaymentMethod(detail),
        generalTaxVisible: Boolean(receiptCustomization.generalFields?.tax?.visible),
        generalPaidVisible: Boolean(receiptCustomization.generalFields?.paid?.visible),
        generalReceivedVisible: Boolean(receiptCustomization.generalFields?.receivedAmount?.visible),
        generalBalanceVisible: Boolean(receiptCustomization.generalFields?.balanceAmt?.visible),
        generalYouSavedVisible: Boolean(receiptCustomization.generalFields?.youSaved?.visible),
        footerNote: commonSalesMan ? `Salesman: ${commonSalesMan}` : "",
        message: receiptCustomization.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
        billCodeMarkup: await buildReceiptCodeMarkupAsync(displayBillNo, receiptCustomization, "bill"),
        paymentQrMarkup: await buildPaymentQrMarkup(receiptCustomization, {
          billAmount: receiptNetAmount,
          billNo: displayBillNo,
          storeName,
        }),
      };
      const browserReceiptHtml = buildPosSaleReceiptHtml(receiptData, receiptCustomization);

      if (printerConnected) {
        const jobId = await queuePrintHtml(browserReceiptHtml, {
          label: `POSSale-${displayBillNo}`,
          docType: "pos_sale_receipt",
          copies: 1,
          companyId: authUser?.company_id,
          receiptData,
        });
        if (jobId) return;
      }

      const printWindow = window.open("", "_blank", "width=420,height=720");
      if (!printWindow) {
        toast.error("Popup blocked. Allow popups to use browser print.");
        return;
      }

      printWindow.document.write(browserReceiptHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    },
    [authUser?.company_id, authUser?.company_name, authUser?.counter_name, authUser?.email, authUser?.name, fetchReceiptCompanyInfo, now, printerConnected, queuePrintHtml]
  );

  const handlePrintLatestPosDocument = async () => {
    if (!latestPosDocument?.id) return;
    const fetchPath = getLatestPosDocumentFetchPath(latestPosDocument);
    if (!fetchPath) return;

    try {
      const res = await api.get(fetchPath);
      const detail = res.data?.data || latestPosDocument;
      if (latestPosDocument.type === "return") {
        await printReturnReceipt(detail);
        return;
      }
      await printSaleReceipt(detail);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to print last document");
    }
  };

  const handleSaveReturn = async () => {
    const isStandalone = sourceSale?.standalone === true;
    if (!isStandalone && (!sourceSale?.id || !sourceSale?.billNo)) {
      toast.error("Load a POS bill or scan a product barcode first");
      return;
    }

    if (cartWithTotals.length === 0) {
      toast.error("Add at least one product before save");
      return;
    }

    const activeItems = cartWithTotals.filter((line) => toInt(line.qty, 0) > 0);
    if (activeItems.length === 0) {
      toast.error("Select at least one product to return");
      return;
    }

    const payload = {
      customerMode: existingCustomerId ? "existing" : "walking",
      customerId: existingCustomerId || null,
      customerName: String(newCustomer.name || "").trim() || null,
      customerMobile: String(newCustomer.mobileNo || "").trim() || null,
      returnReasonId: selectedReturnReasonId || null,
      returnReasonName: returnReasons.find((row) => row.value === selectedReturnReasonId)?.label || null,
      ...(isStandalone ? { standalone: true } : { sourcePosSaleId: sourceSale.id, sourceBillNo: sourceSale.billNo }),
      returnAt: now.toISOString(),
      items: activeItems.map((line) => ({
        productId: line.stockId,
        variantId: line.variantId ?? null,
        barcodeId: line.barcodeId ?? null,
        barcode: line.barcode,
        productName: line.productName,
        qty: line.qty,
        maxQty: line.maxQty,
        price: line.price,
        tax: line.tax,
        cost: line.cost,
        discount: line.discount,
      })),
    };

    setSaving(true);
    try {
      const res = await api.post("/pos-returns", payload);
      const saved = res.data?.data;
      setLatestPosDocument(saved ? { type: "return", ...saved } : null);
      await printReturnReceipt(saved);
      toast.success(`POS return saved successfully (Return #${saved?.display_return_no || formatReturnNo(saved?.return_no)})`);
      handleResetEntry();
      await Promise.all([loadMasterData(), loadNextReturnNo(), refreshLatestPosDocument()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save POS return");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLastSavedReturn = async () => {
    if (!latestPosDocument?.id) return;
    const deletePath = getLatestPosDocumentDeletePath(latestPosDocument);
    if (!deletePath) {
      toast.error("This document type cannot be deleted from POS Return");
      return;
    }

    setDeletingLatestDocument(true);
    try {
      await api.delete(deletePath);
      if (latestPosDocument.type === "return") {
        toast.success(
          `Return #${latestPosDocument.display_return_no || formatReturnNo(latestPosDocument.return_no)} cancelled`
        );
      } else {
        toast.success(
          `Bill #${formatSaleBillNo(latestPosDocument.bill_no || latestPosDocument.id)} cancelled`
        );
      }
      setLatestPosDocument(null);
      await Promise.all([loadMasterData(), loadNextReturnNo(), refreshLatestPosDocument()]);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          (latestPosDocument.type === "return" ? "Failed to cancel POS return" : "Failed to delete POS sale")
      );
    } finally {
      setDeletingLatestDocument(false);
    }
  };

  const runPosReturnSearch = useCallback(
    async (overrideFilters = null, pageOverride = 1, limitOverride = searchLimit) => {
      const filters = overrideFilters || searchFiltersRef.current;
      setSearching(true);
      try {
        const params = { page: pageOverride, limit: limitOverride };
        if (String(filters.search || "").trim()) params.search = filters.search;
        if (String(filters.returnNo || "").trim()) params.returnNo = filters.returnNo;
        if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
        if (String(filters.product || "").trim()) params.product = filters.product;

        const res = await api.get("/pos-returns", { params });
        setSearchResults(res.data?.data || []);
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? 0) || 0;
        const totalPages = Math.max(Number(p.totalPages ?? Math.ceil(total / Math.max(limitOverride, 1))) || 1, 1);
        setSearchPagination({ total, totalPages });
        setSearchPage(pageOverride);
      } catch {
        toast.error("Failed to search POS returns");
      } finally {
        setSearching(false);
      }
    },
    [searchLimit]
  );

  const loadAllPosReturnSearchRows = useCallback(
    async (overrideFilters = null) => {
      const filters = overrideFilters || searchFilters;
      const params = { all: "true" };
      if (String(filters.search || "").trim()) params.search = filters.search;
      if (String(filters.returnNo || "").trim()) params.returnNo = filters.returnNo;
      if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
      if (String(filters.product || "").trim()) params.product = filters.product;

      const res = await api.get("/pos-returns", { params });
      return res.data?.data || [];
    },
    [searchFilters]
  );

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = { search: "", returnNo: "", customerName: "", product: "" };
    setSearchFilters(empty);
    await runPosReturnSearch(empty, 1, searchLimit);
  };

  const handleServerSearch = useCallback(
    ({ query }) => {
      setSearchFilters((prev) => {
        if (prev.search === query) return prev;
        const nextFilters = { ...prev, search: query };
        runPosReturnSearch(nextFilters, 1, searchLimit);
        return nextFilters;
      });
      setSearchPage(1);
    },
    [runPosReturnSearch, searchLimit]
  );

  const posReturnSearchColumns = useMemo(
    () => [
      {
        key: "return_no",
        label: "Return No",
        valueGetter: (row) => row.display_return_no || formatReturnNo(row.return_no),
      },
      {
        key: "source_bill_no",
        label: "Bill No",
        valueGetter: (row) => (row.source_bill_no ? formatSaleBillNo(row.source_bill_no) : "-"),
      },
      {
        key: "return_at",
        label: "Date",
        valueGetter: (row) => row.return_at || "",
        render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        searchValue: (row) => (row.return_at ? new Date(row.return_at).toLocaleString() : ""),
      },
      {
        key: "customer_name",
        label: "Customer",
        valueGetter: (row) => row.customer_name || row.customer?.name || "-",
      },
      {
        key: "user_name",
        label: "User",
        valueGetter: (row) => row.user_name || "-",
      },
      {
        key: "counter_name",
        label: "Counter",
        valueGetter: (row) => row.counter_name || "-",
      },
      {
        key: "products",
        label: "Products",
        valueGetter: (row) =>
          (row.items || []).map((item) => item.product_name || item.barcode || "-").join(", "),
        render: (_, row) => {
          const items = row.items || [];
          const productText = items
            .slice(0, 2)
            .map((item) => item.product_name || item.barcode || "-")
            .join(", ");
          const extra = items.length > 2 ? ` +${items.length - 2} more` : "";
          return `${productText || "-"}${extra}`;
        },
      },
      {
        key: "total_qty",
        label: "Total Qty",
        valueGetter: (row) => toNum(row.total_qty || 0),
        render: (value) => <div className="text-center">{toNum(value || 0)}</div>,
      },
      {
        key: "amount",
        label: "Amount",
        valueGetter: (row) => toNum(row.amount || 0),
        render: (value) => <div className="text-right">{formatMoney(value || 0)}</div>,
      },
    ],
    []
  );

  const renderEntryPage = () => (
    <div className="flex flex-col gap-2 xl:flex-1 xl:min-h-0 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-stretch">
      <div className="min-w-0 xl:flex xl:min-h-0">
        <div className="w-full bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden xl:flex xl:h-full xl:min-h-0 xl:flex-col dark:bg-gray-800 dark:border-gray-700">
          <div className="border-b bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)]">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Bill no. / barcode</label>
                <div className="relative">
                  <input
                    ref={billInputRef}
                    type="text"
                    value={billLookup}
                    onChange={(e) => setBillLookup(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const shortcut = String(billLookup || "").trim();
                        if (shortcut === "0") {
                          setBillLookup("");
                          handleSaveReturn();
                          return;
                        }
                        loadBillOrBarcode(billLookup);
                      }
                    }}
                    placeholder="Bill (SB/…) or product barcode"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Selected Bill</label>
                <input
                  type="text"
                  value={
                    sourceSale?.billNo
                      ? formatSaleBillNo(sourceSale.billNo)
                      : sourceSale?.standalone
                        ? "Barcode (no bill)"
                        : ""
                  }
                  readOnly
                  placeholder="No bill selected"
                  className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Reason</label>
                <select
                  value={selectedReturnReasonId}
                  onChange={(e) => setSelectedReturnReasonId(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">Select return reason</option>
                  {returnReasons.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
              {sourceSale?.billNo
                ? `Source bill #${formatSaleBillNo(sourceSale.billNo)}. Change line qty (up to sold minus prior returns), scan another barcode from the same bill to add lines, then save — return slip prints and the return stays unsettled until settled.`
                : sourceSale?.standalone
                  ? "Barcode-only return: no source bill — qty is not limited by a sale. Pricing matches your stock/product setup (fallback: last POS line for that barcode). Reset before switching to loading a bill by number."
                  : ""}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className={`flex h-[420px] min-h-[420px] flex-col xl:h-full xl:min-h-0 ${POS_TABLE_WIDTH}`}>
              <div className="flex border-b bg-blue-100 text-[10px] font-semibold text-gray-700 md:text-xs lg:text-sm dark:border-gray-700 dark:bg-blue-900/30 dark:text-gray-300">
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.sNo} border-r text-center dark:border-gray-700`}>S.No</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.barcode} border-r dark:border-gray-700`}>Barcode</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.product} border-r dark:border-gray-700`}>Product</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.qty} border-r text-center dark:border-gray-700`}>Qty</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.price} border-r text-right dark:border-gray-700`}>Price</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.tax} border-r text-right dark:border-gray-700`}>Tax%</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.cost} border-r text-right dark:border-gray-700`}>Cost</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.discount} border-r text-right dark:border-gray-700`}>Discount</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.total} border-r text-right dark:border-gray-700`}>Total</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.action} text-center`}>Action</div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                {loadingBill ? (
                  <div className="flex h-full items-center justify-center py-16 text-center text-xs text-gray-400 dark:text-gray-500">
                    Loading bill or barcode…
                  </div>
                ) : cartWithTotals.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-16 text-center text-xs text-gray-400 dark:text-gray-500">
                    No products loaded yet.
                  </div>
                ) : (
                  cartWithTotals.map((line, index) => (
                    <div key={line.lineId} className="flex border-b text-[10px] hover:bg-gray-50 md:text-xs lg:text-sm dark:border-gray-700 dark:hover:bg-gray-700/50">
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.sNo} border-r text-center dark:border-gray-700`}>{index + 1}</div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.barcode} border-r font-mono dark:border-gray-700`}>{line.barcode || "-"}</div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.product} border-r truncate dark:border-gray-700`}>
                        <div>{line.productName || "-"}</div>
                        {line.standaloneLine ? (
                          <div className="text-[10px] text-gray-400 md:text-xs dark:text-gray-500">No bill link — qty open</div>
                        ) : (
                          <div className="text-[10px] text-gray-400 md:text-xs dark:text-gray-500">
                            Original: {line.originalQty} | Returned: {line.returnedQty} | Max: {line.maxQty}
                          </div>
                        )}
                      </div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.qty} border-r dark:border-gray-700`}>
                        <input
                          type="number"
                          min="1"
                          max={line.standaloneLine ? STANDALONE_MAX_QTY : line.maxQty}
                          value={line.qty}
                          onChange={(e) => handleQtyChange(line.lineId, e.target.value)}
                          className="w-full rounded border border-gray-300 px-1 py-0.5 text-center text-[10px] md:text-xs lg:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.price} border-r text-right dark:border-gray-700`}>{formatMoney(line.price)}</div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.tax} border-r text-right dark:border-gray-700`}>{formatMoney(line.tax)}</div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.cost} border-r text-right dark:border-gray-700`}>{formatMoney(line.cost)}</div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.discount} border-r text-right dark:border-gray-700`}>{formatMoney(line.discount)}</div>
                      <div className={`px-1.5 py-1 ${POS_TABLE_COLS.total} border-r text-right font-medium dark:border-gray-700`}>{formatMoney(line.total)}</div>
                      <div className={`px-1 py-1 ${POS_TABLE_COLS.action} flex items-center justify-center`}>
                        <button
                          onClick={() => handleRemoveLine(line.lineId)}
                          className="inline-flex items-center justify-center text-red-600 hover:opacity-80 dark:text-red-400"
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex border-t bg-gray-100 text-[10px] font-bold text-gray-700 md:text-xs lg:text-sm dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.sNo} border-r text-center dark:border-gray-700`}>-</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.barcode} border-r dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.product} border-r dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.qty} border-r text-center text-red-600 dark:border-gray-700 dark:text-red-400`}>{summary.totalQty}</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.price} border-r dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.tax} border-r dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.cost} border-r text-right text-red-600 dark:border-gray-700 dark:text-red-400`}>{formatMoney(summary.grossValue)}</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.discount} border-r text-right text-red-600 dark:border-gray-700 dark:text-red-400`}>{formatMoney(summary.totalDiscount)}</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.total} border-r text-right text-red-600 dark:border-gray-700 dark:text-red-400`}>{formatMoney(summary.amount)}</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.action}`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full xl:flex xl:min-h-0">
        <div className="w-full bg-white border border-gray-300 rounded-lg shadow-sm p-3 xl:flex xl:h-full xl:flex-col dark:bg-gray-800 dark:border-gray-700">
          <div className="space-y-1 border-b border-gray-200 pb-2 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Return Number</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatReturnNo(returnNo)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Date</span>
              <span className="text-gray-900 dark:text-gray-100">{now.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Time</span>
              <span className="text-gray-900 dark:text-gray-100">{now.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="space-y-2 border-b border-gray-200 py-2 dark:border-gray-700">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Source Bill:{" "}
              {sourceSale?.billNo
                ? formatSaleBillNo(sourceSale.billNo)
                : sourceSale?.standalone
                  ? "— (barcode only)"
                  : "-"}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer Number</label>
              <input
                type="text"
                value={newCustomer.mobileNo}
                onChange={(e) => handleCustomerNumberChange(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Customer number"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer Name</label>
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Customer name"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 py-3 dark:border-gray-700">
            <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-[1.1fr_0.7fr_72px] border-b bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <div className="px-2 py-2">Last Doc</div>
                <div className="border-l border-gray-200 px-2 py-2 text-right dark:border-gray-700">Amount</div>
                <div className="border-l border-gray-200 px-2 py-2 text-center dark:border-gray-700">Action</div>
              </div>
              <div className="h-24 overflow-y-auto">
                {latestPosDocument ? (
                  <div className="grid grid-cols-[1.1fr_0.7fr_72px] items-center text-xs text-gray-700 dark:text-gray-300">
                    <div className="px-2 py-2 font-semibold">
                      {formatLatestPosDocumentNumber(latestPosDocument)}
                    </div>
                    <div className="border-l border-gray-200 px-2 py-2 text-right font-semibold dark:border-gray-700">
                      {formatMoney(latestPosDocument.amount || 0)}
                    </div>
                    <div className="border-l border-gray-200 px-1 py-1.5 dark:border-gray-700">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handlePrintLatestPosDocument}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title={latestPosDocument.type === "sale" ? "Print last saved bill" : "Print last saved return"}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteLastSavedReturn}
                          disabled={
                            deletingLatestDocument ||
                            !canDeleteLatestPosDocument(latestPosDocument) ||
                            (latestPosDocument.type === "return"
                              ? ["settled", "paid", "cancelled"].includes(
                                  String(latestPosDocument?.bill?.status || "").toLowerCase()
                                )
                              : latestPosDocument.type === "sale"
                                ? ["settled", "cancelled"].includes(
                                    String(latestPosDocument?.bill?.status || "").toLowerCase()
                                  )
                                : false)
                          }
                          className="text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-red-400 dark:hover:text-red-300 dark:disabled:text-gray-600"
                          title={
                            !canDeleteLatestPosDocument(latestPosDocument)
                              ? "This document cannot be deleted from POS Return"
                              : latestPosDocument.type === "sale"
                                ? ["settled", "cancelled"].includes(
                                    String(latestPosDocument?.bill?.status || "").toLowerCase()
                                  )
                                  ? "Closed bill cannot be deleted"
                                  : "Delete last saved bill"
                                : ["settled", "paid", "cancelled"].includes(
                                    String(latestPosDocument?.bill?.status || "").toLowerCase()
                                  )
                                  ? "Closed return cannot be deleted"
                                  : "Cancel last saved return"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-400 dark:text-gray-500">
                    No saved document yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-gray-200 pt-3 text-xs dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Amount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(summary.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Qty/Pcs</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{summary.totalQty.toFixed(2)}/{cartWithTotals.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Gross Value</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(summary.grossValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Addl Discount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Discount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(summary.totalDiscount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchPage = () => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 dark:bg-gray-800 dark:border-gray-700">
      <FilterableDataTable
        rows={searchResults}
        columns={posReturnSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No POS returns found"
        searchPlaceholder="Search in POS return fields..."
        exportFileName="pos_return_report"
        exportSheetName="POS Return"
        exportTitle={resolvedExportCompanyName}
        exportTitleResolver={resolveExportCompanyTitle}
        exportSubtitle="POS RETURN Report"
        enableColumnResize
        tablePreferenceKey="sales.pos_return.search"
        onRefresh={() => runPosReturnSearch(null, searchPage, searchLimit)}
        refreshDisabled={searching}
        onExportRows={() => loadAllPosReturnSearchRows()}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={(p) => {
          setSearchPage(p);
          runPosReturnSearch(null, p, searchLimit);
        }}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
          runPosReturnSearch(null, 1, value);
        }}
        paginationMode="server"
      />
    </div>
  );

  return (
    <div className="min-h-full bg-gray-100 text-gray-800 flex flex-col dark:bg-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-2 bg-white border-b shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={showSearchPage ? "Back to POS return entry" : "Back to sales"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sales
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>POS Return</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <UploadImportButton
            endpoint="/pos-returns/bulk"
            fieldConfig={POS_RETURN_IMPORT_CONFIG}
          />
          <button
            onClick={handleSaveReturn}
            disabled={saving || showSearchPage}
            className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary inline-flex items-center"
          >
            <Search className="w-4 h-4 mr-1" />
            {showSearchPage ? "Back" : "Search"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4 space-y-4 pb-28 xl:flex xl:flex-col xl:pb-4">
        {showSearchPage ? renderSearchPage() : renderEntryPage()}

        {loading && <p className="text-xs text-gray-500 px-1 dark:text-gray-400">Loading master data...</p>}
      </div>
    </div>
  );
};

export default POSReturn;
