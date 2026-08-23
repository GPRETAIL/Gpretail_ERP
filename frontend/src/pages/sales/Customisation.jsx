import React, { useEffect, useMemo, useState } from "react";
import { Eye, RotateCcw, Save } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../api/axios";
import {
  buildSalesReceiptGeneralLayout,
  buildSalesReceiptTaxRows,
  buildReceiptCodeMarkupAsync,
  buildReceiptCodeMarkupSync,
  buildReceiptFormatCss,
  DEFAULT_SALES_RECEIPT_CUSTOMIZATION,
  DEFAULT_SALES_RECEIPT_GENERAL_FIELDS,
  DEFAULT_SALES_RECEIPT_PRODUCT_FIELDS,
  DEFAULT_SALES_RECEIPT_TAX_FIELDS,
  getVisibleSalesReceiptProductColumns,
  getVisibleSalesReceiptTaxColumns,
  getSalesReceiptFontCss,
  getSalesReceiptRateWithTax,
  getPosBillBarcodeValue,
  getSalesReceiptWidthCss,
  loadSalesReceiptCustomization,
  normalizeSalesReceiptCustomization,
  fetchSalesReceiptCustomization,
  SALES_RECEIPT_DISCOUNT_DISPLAY_OPTIONS,
  SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS,
  SALES_RECEIPT_POSITION_OPTIONS,
  SALES_RECEIPT_PRODUCT_FIELD_DEFINITIONS,
  SALES_RECEIPT_SIZE_OPTIONS,
  SALES_RECEIPT_TAX_FIELD_DEFINITIONS,
  SETTLEMENT_NUMBER_RESET_OPTIONS,
  BILL_NUMBER_RESET_OPTIONS,
  RECEIPT_FONT_OPTIONS,
  RECEIPT_FORMAT_OPTIONS,
  SALE_SAVE_AS_OPTIONS,
  PRINT_MODE_OPTIONS,
  RECEIPT_CODE_TYPE_OPTIONS,
  PAYMENT_QR_MODE_OPTIONS,
  buildPaymentQrMarkup,
  readPaymentQrImageFile,
  saveSalesReceiptCustomization,
  shouldShowSalesReceiptDiscountColumn,
  wrapSalesReceiptText,
} from "../../utils/salesReceiptCustomization";
import { buildPosSaleReceiptHtml } from "../../utils/posReceiptHtml";

const fieldLabelClass = "mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const baseCardClass = "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800";

const sampleItems = [
  { name: "Premium Cotton Shirt", qty: 1, rate: 1237.14, taxPerc: 5 },
  { name: "Slim Fit Trouser", qty: 1, rate: 1695.54, taxPerc: 12 },
  { name: "Casual Denim", qty: 2, rate: 973.21, taxPerc: 5 },
];

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const RECEIPT_TABLE_HEAD_CLASS = "bg-[#165da8] px-3 py-3 text-left text-sm font-semibold text-white";
const RECEIPT_TABLE_CELL_CLASS = "border border-gray-200 px-3 py-3 align-middle text-sm text-slate-700 dark:border-gray-700 dark:text-gray-300";
const RECEIPT_TABLE_INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/30";

const RadioCell = ({ name, checked, onChange }) => (
  <label className="flex items-center justify-center">
    <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4" />
  </label>
);

const ReceiptFieldTable = ({
  title,
  rows,
  onToggleVisible,
  onPositionChange,
  onLineChange,
}) => (
  <div className={`${baseCardClass} overflow-hidden`}>
    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
      <div className="text-xl font-semibold text-slate-800 dark:text-gray-100">{title}</div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={RECEIPT_TABLE_HEAD_CLASS}>Title</th>
            <th className={RECEIPT_TABLE_HEAD_CLASS}>Position</th>
            <th className={`${RECEIPT_TABLE_HEAD_CLASS} w-24 text-center`}>Hide</th>
            <th className={`${RECEIPT_TABLE_HEAD_CLASS} w-24 text-center`}>Show</th>
            <th className={RECEIPT_TABLE_HEAD_CLASS}>Line</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className={index % 2 === 0 ? "bg-gray-50/80 dark:bg-gray-700/40" : "bg-white dark:bg-gray-800"}>
              <td className={RECEIPT_TABLE_CELL_CLASS}>{row.label}</td>
              <td className={RECEIPT_TABLE_CELL_CLASS}>
                {row.hasPosition ? (
                  <select
                    value={row.position}
                    onChange={(event) => onPositionChange(row.key, event.target.value)}
                    className={RECEIPT_TABLE_INPUT_CLASS}
                  >
                    {SALES_RECEIPT_POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label.toLowerCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700" />
                )}
              </td>
              <td className={RECEIPT_TABLE_CELL_CLASS}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={!row.visible}
                  onChange={() => onToggleVisible(row.key, false)}
                />
              </td>
              <td className={RECEIPT_TABLE_CELL_CLASS}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={row.visible}
                  onChange={() => onToggleVisible(row.key, true)}
                />
              </td>
              <td className={RECEIPT_TABLE_CELL_CLASS}>
                {row.hasLine ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.line}
                    onChange={(event) => onLineChange(row.key, event.target.value)}
                    className={RECEIPT_TABLE_INPUT_CLASS}
                  />
                ) : (
                  <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ReceiptVisibilityTable = ({ title, rows, onToggleVisible }) => (
  <div className={`${baseCardClass} overflow-hidden`}>
    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
      <div className="text-xl font-semibold text-slate-800 dark:text-gray-100">{title}</div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={RECEIPT_TABLE_HEAD_CLASS}>Title</th>
            <th className={`${RECEIPT_TABLE_HEAD_CLASS} w-24 text-center`}>Hide</th>
            <th className={`${RECEIPT_TABLE_HEAD_CLASS} w-24 text-center`}>Show</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className={index % 2 === 0 ? "bg-gray-50/80 dark:bg-gray-700/40" : "bg-white dark:bg-gray-800"}>
              <td className={RECEIPT_TABLE_CELL_CLASS}>{row.label}</td>
              <td className={RECEIPT_TABLE_CELL_CLASS}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={!row.visible}
                  onChange={() => onToggleVisible(row.key, false)}
                />
              </td>
              <td className={RECEIPT_TABLE_CELL_CLASS}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={row.visible}
                  onChange={() => onToggleVisible(row.key, true)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/** Same chrome as Product table: Title + one radio per copy count (1–3). */
const PosReceiptCopiesTable = ({ copies, onChangeCopies }) => (
  <div className={`${baseCardClass} overflow-hidden`}>
    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
      <div className="text-xl font-semibold text-slate-800 dark:text-gray-100">Copies</div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={RECEIPT_TABLE_HEAD_CLASS}>Title</th>
            <th className={`${RECEIPT_TABLE_HEAD_CLASS} w-24 text-center`}>1</th>
            <th className={`${RECEIPT_TABLE_HEAD_CLASS} w-24 text-center`}>2</th>
            <th className={`${RECEIPT_TABLE_HEAD_CLASS} w-24 text-center`}>3</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-gray-50/80 dark:bg-gray-700/40">
            <td className={RECEIPT_TABLE_CELL_CLASS}>Receipt prints</td>
            {[1, 2, 3].map((n) => (
              <td key={n} className={RECEIPT_TABLE_CELL_CLASS}>
                <RadioCell
                  name="pos-receipt-copies-table"
                  checked={Number(copies ?? 1) === n}
                  onChange={() => onChangeCopies(n)}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const DiscountDisplayCard = ({ value, onChange }) => (
  <div className={`${baseCardClass} p-5`}>
    <label className={fieldLabelClass}>Show Discount As</label>
    <div className="flex flex-wrap gap-3">
      {SALES_RECEIPT_DISCOUNT_DISPLAY_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
            value === option.value
              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
              : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          <input
            type="radio"
            name="sales-discount-display"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  </div>
);

const ToggleCard = ({ label, hint, checked, onChange }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-700/40 dark:hover:border-blue-500 dark:hover:bg-blue-900/20">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</div>
      <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{hint}</div>
    </div>
    <div className="pt-0.5">
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </div>
  </label>
);

const SizeOption = ({ option, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(selected ? "" : option.value)}
    className={`rounded-xl border px-4 py-3 text-left transition ${
      selected
        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
    }`}
  >
    <div className="text-sm font-semibold">{option.label}</div>
    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Receipt size</div>
  </button>
);

const PreviewMetaInlineGroup = ({ items, align = "left" }) => {
  // Always render the wrapper, even with zero items: this is one of three fixed CSS Grid columns
  // (see PreviewMetaLine below). Returning null here removes the DOM node entirely, which drops it
  // out of the grid's auto-placement -- the next group then slides into this one's column instead
  // of its own (e.g. a line with only a left + right item, no center, was rendering "right" in the
  // middle column because the empty center group vanished and right auto-placed into column 2).
  const alignClass =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left";

  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-0.5 ${alignClass}`}>
      {items.map((item) => (
        <span key={item.key} className="whitespace-nowrap">
          <span>{item.label}: </span>
          <span className={item.key === "salesNo" ? "font-mono font-semibold" : ""}>{item.value}</span>
        </span>
      ))}
    </div>
  );
};

const PreviewMetaLine = ({ line }) => {
  const items = Array.isArray(line?.items) ? line.items : [];
  const positions = Array.from(new Set(items.map((item) => item.position || "left")));

  if (positions.length <= 1) {
    return <PreviewMetaInlineGroup items={items} align={positions[0] || "left"} />;
  }

  const leftItems = items.filter((item) => item.position === "left");
  const centerItems = items.filter((item) => item.position === "center");
  const rightItems = items.filter((item) => item.position === "right");

  return (
    <div className="grid grid-cols-3 items-start gap-2">
      <PreviewMetaInlineGroup items={leftItems} align="left" />
      <PreviewMetaInlineGroup items={centerItems} align="center" />
      <PreviewMetaInlineGroup items={rightItems} align="right" />
    </div>
  );
};

const ReceiptPreview = ({ companyInfo, settings }) => {
  const billBarcode = getPosBillBarcodeValue("29");
  const widthCss = getSalesReceiptWidthCss(settings.receiptWidthInches);
  const [billCodeMarkup, setBillCodeMarkup] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadBillCodeMarkup = async () => {
      if (!settings.showBarcodeOnBill) {
        if (!cancelled) setBillCodeMarkup("");
        return;
      }
      try {
        const markup = await buildReceiptCodeMarkupAsync(billBarcode, settings, "bill");
        if (!cancelled) setBillCodeMarkup(markup);
      } catch {
        if (!cancelled) {
          setBillCodeMarkup(buildReceiptCodeMarkupSync(billBarcode, settings, "bill"));
        }
      }
    };
    void loadBillCodeMarkup();
    return () => {
      cancelled = true;
    };
  }, [billBarcode, settings]);

  const [paymentQrMarkup, setPaymentQrMarkup] = useState("");
  const sampleStoreName = companyInfo.storeName || "A TO Z FASHION";
  const sampleAddress = companyInfo.storeAddress || "Main Bazar, Karachi";
  const samplePhone = companyInfo.storePhone || "+92 300 1234567";
  const sampleGst = companyInfo.storeGstNo || "GST-22ABCDE1234F1Z5";
  const lineDiscountEnabled = settings.discountDisplayMode === "column";
  const previewItems = sampleItems.map((item, index) => {
    const subtotal = item.qty * item.rate;
    const taxAmount = (subtotal * item.taxPerc) / 100;
    const discountAmount = lineDiscountEnabled ? [40, 35, 45][index] || 0 : 0;
    return {
      ...item,
      discountAmount,
      amount: subtotal + taxAmount - discountAmount,
      taxAmount,
      taxName: "GST",
      taxType: "GST",
    };
  });
  const discount = 120;
  const grossTotal = previewItems.reduce((sum, item) => sum + item.amount + Number(item.discountAmount || 0), 0);
  const total = lineDiscountEnabled ? previewItems.reduce((sum, item) => sum + item.amount, 0) : grossTotal;
  const taxRows = buildSalesReceiptTaxRows(previewItems);
  const generalFields = settings.generalFields || DEFAULT_SALES_RECEIPT_GENERAL_FIELDS;
  const sampleDate = new Date("2026-05-01T12:45:00");
  const paymentMethod = "Cash";
  const paidAmount = total - discount;
  const receivedAmount = total - discount;
  const balanceAmount = 0;
  const youSavedAmount = discount;
  const taxAmountTotal = taxRows.reduce((sum, row) => sum + Number(row.taxAmount || 0), 0);
  const generalContent = {
    logo: "LOGO",
    header: "RETAIL INVOICE",
    company: sampleStoreName,
    address: sampleAddress,
    gst: `GST No: ${sampleGst}`,
    salesNo: getPosBillBarcodeValue("29"),
    cashier: "Admin",
    counter: "Main Counter",
    paymentMethod,
    date: sampleDate.toLocaleDateString(),
    time: sampleDate.toLocaleTimeString(),
    customer: "Walking customer",
    paid: formatMoney(paidAmount),
    receivedAmount: formatMoney(receivedAmount),
    balanceAmt: formatMoney(balanceAmount),
    youSaved: formatMoney(youSavedAmount),
    tax: `Tax: ${formatMoney(taxAmountTotal)}`,
  };
  const { topRows: topGeneralRows, groupedLines: groupedGeneralLines } = buildSalesReceiptGeneralLayout(
    settings,
    generalContent
  );
  const showDiscountColumn = shouldShowSalesReceiptDiscountColumn(settings, previewItems);
  const visibleProductColumns = getVisibleSalesReceiptProductColumns(settings, {
    includeDiscountColumn: showDiscountColumn,
  });
  const visibleTaxColumns = getVisibleSalesReceiptTaxColumns(settings);
  const previewProductCellValue = (item, key) => {
    if (key === "productName") return wrapSalesReceiptText(item.name);
    if (key === "qty") return item.qty;
    if (key === "mrp") return formatMoney(getSalesReceiptRateWithTax(item.rate, item.taxPerc));
    if (key === "rate") return formatMoney(item.rate);
    if (key === "discount") return formatMoney(item.discountAmount || 0);
    if (key === "amount") return formatMoney(showDiscountColumn ? item.amount : item.amount + Number(item.discountAmount || 0));
    if (key === "tax") return formatMoney(item.taxPerc);
    return "";
  };
  const previewTaxCellValue = (row, key) => {
    if (key === "taxName") return row.label;
    if (key === "percent") return formatMoney(row.taxPerc);
    if (key === "amount") return formatMoney(row.baseAmount);
    if (key === "total") return formatMoney(row.taxAmount);
    return "";
  };
  const previewTotals = [
    { key: "billAmount", label: "Bill Amount", value: formatMoney(showDiscountColumn ? total : grossTotal) },
    ...(settings.showDiscountOnReceipt && !showDiscountColumn
      ? [{ key: "discount", label: "Discount", value: formatMoney(discount) }]
      : []),
    { key: "netAmount", label: "Net Amount", value: formatMoney(showDiscountColumn ? total : grossTotal - discount), grand: true },
    ...(generalFields.tax?.visible ? [{ key: "tax", label: "Tax", value: formatMoney(taxAmountTotal) }] : []),
    ...(generalFields.paid?.visible ? [{ key: "paid", label: "Paid", value: formatMoney(paidAmount) }] : []),
    ...(generalFields.receivedAmount?.visible
      ? [{ key: "receivedAmount", label: "Received Amount", value: formatMoney(receivedAmount) }]
      : []),
    ...(generalFields.balanceAmt?.visible
      ? [{ key: "balanceAmt", label: "Balance Amount", value: formatMoney(balanceAmount) }]
      : []),
    ...(generalFields.youSaved?.visible
      ? [{ key: "youSaved", label: "You Saved", value: formatMoney(youSavedAmount) }]
      : []),
  ];

  const previewNetAmount = showDiscountColumn ? total : grossTotal - discount;
  useEffect(() => {
    let cancelled = false;
    const loadPaymentQrMarkup = async () => {
      try {
        // The same call the real receipt makes, so the preview shows exactly what prints --
        // including rendering nothing while the chosen mode's required field is still blank.
        const markup = await buildPaymentQrMarkup(settings, {
          billAmount: previewNetAmount,
          billNo: billBarcode,
          storeName: companyInfo.storeName || "",
        });
        if (!cancelled) setPaymentQrMarkup(markup);
      } catch {
        if (!cancelled) setPaymentQrMarkup("");
      }
    };
    void loadPaymentQrMarkup();
    return () => {
      cancelled = true;
    };
  }, [billBarcode, companyInfo.storeName, previewNetAmount, settings]);

  // A4 uses a genuinely different layout (buildPosSaleReceiptHtml dispatches to the real tax-
  // invoice template), not just a wider version of the thermal preview above - render the real
  // generated HTML here too, so this preview never drifts from what printing/PDF actually produce.
  const isA4Preview = String(settings.receiptWidthInches || "").toUpperCase() === "A4";
  const a4PreviewHtml = useMemo(() => {
    if (!isA4Preview) return "";
    const receiptItems = previewItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      rate: item.rate,
      taxPerc: item.taxPerc,
      taxName: item.taxName,
      taxType: item.taxType,
      baseAmount: item.qty * item.rate - Number(item.discountAmount || 0),
      taxAmount: item.taxAmount,
      discountAmount: item.discountAmount,
      amount: item.amount,
      hsnCode: "",
      code: "",
    }));
    const receiptData = {
      storeName: sampleStoreName,
      storeAddress: sampleAddress,
      storePhone: samplePhone,
      storeGstNo: sampleGst,
      billNo: billBarcode,
      billBarcode,
      dateTime: sampleDate.toISOString(),
      cashierName: "Admin",
      counterName: "Main Counter",
      customerName: "Walking customer",
      paperSize: "A4",
      items: receiptItems,
      billAmount: grossTotal,
      discountAmount: discount,
      taxAmount: taxAmountTotal,
      total: previewNetAmount,
      paidAmount,
      receivedAmount,
      balanceAmount,
      paymentMethod,
      billCodeMarkup,
      paymentQrMarkup,
      message: settings.thankYouMessage,
    };
    return buildPosSaleReceiptHtml(receiptData, settings);
  }, [
    isA4Preview, previewItems, sampleStoreName, sampleAddress, samplePhone, sampleGst, billBarcode,
    sampleDate, grossTotal, discount, taxAmountTotal, previewNetAmount, paidAmount, receivedAmount,
    balanceAmount, paymentMethod, billCodeMarkup, paymentQrMarkup, settings,
  ]);

  if (isA4Preview) {
    return (
      <div className={`${baseCardClass} overflow-hidden`}>
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Receipt Preview</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Sample tax invoice at A4 size</div>
            </div>
            <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-[#eef2f7] p-4 dark:bg-gray-900/40">
          <iframe
            title="A4 invoice preview"
            srcDoc={a4PreviewHtml}
            className="mx-auto block w-full rounded-2xl border border-gray-300 bg-white shadow-lg"
            style={{ height: "80vh" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseCardClass} overflow-hidden`}>
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Receipt Preview</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Sample bill at {settings.receiptWidthInches || "default"} size
            </div>
          </div>
          <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      <div className="bg-[#eef2f7] p-4 dark:bg-gray-900/40">
        <style>{buildReceiptFormatCss(settings.receiptFormat)}</style>
        <div
          className="receipt mx-auto max-w-full rounded-2xl border border-gray-300 bg-white p-4 shadow-lg"
          style={{ width: `min(100%, ${widthCss})`, fontFamily: getSalesReceiptFontCss(settings.receiptFontFamily) }}
        >
          <div className="space-y-1">
            {topGeneralRows.map((row) => (
              <div
                key={row.key}
                className={`text-[11px] leading-4 text-gray-600 ${
                  generalFields[row.key]?.position === "left"
                    ? "text-left"
                    : generalFields[row.key]?.position === "right"
                      ? "text-right"
                      : "text-center"
                }`}
              >
                {row.key === "logo" ? (
                  <div className="inline-flex h-10 min-w-[84px] items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-[10px] font-semibold tracking-[0.18em] text-gray-500">
                    {generalContent.logo}
                  </div>
                ) : row.key === "company" ? (
                  <div className="title text-base font-extrabold tracking-[0.18em] text-gray-900">{generalContent.company}</div>
                ) : (
                  generalContent[row.key]
                )}
              </div>
            ))}
            {!topGeneralRows.some((row) => row.key === "company") ? (
              <div className="title text-center text-base font-extrabold tracking-[0.18em] text-gray-900">{sampleStoreName}</div>
            ) : null}
            {!topGeneralRows.some((row) => row.key === "address") ? (
              <div className="text-center text-[11px] leading-4 text-gray-500">{sampleAddress}</div>
            ) : null}
            {!topGeneralRows.some((row) => row.key === "gst") ? (
              <div className="text-center text-[11px] leading-4 text-gray-500">GST No: {sampleGst}</div>
            ) : null}
            <div className="text-center text-[11px] leading-4 text-gray-500">Contact: {samplePhone}</div>
          </div>

          <div className="line my-3 border-t border-dashed border-gray-300" />

          <div className="space-y-1 text-[11px] text-gray-700">
            {groupedGeneralLines.map((line) => (
              <PreviewMetaLine key={line.lineNumber} line={line} />
            ))}
          </div>

          <div className="line my-3 border-t border-dashed border-gray-300" />

          <div className="overflow-hidden rounded-lg border border-gray-200">
            {visibleProductColumns.length > 0 ? (
              <div
                className="grid bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500"
                style={{ gridTemplateColumns: `repeat(${Math.max(visibleProductColumns.length, 1)}, minmax(0, 1fr))` }}
              >
                {visibleProductColumns.map((column) => (
                  <div
                    key={column.key}
                    className={`px-2 py-2 ${
                      column.key === "productName" ? "text-left" : "text-right"
                    }`}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
            ) : null}
            {previewItems.map((item) => (
              <div
                key={item.name}
                className="grid border-t border-gray-100 text-[11px] text-gray-700"
                style={{ gridTemplateColumns: `repeat(${Math.max(visibleProductColumns.length, 1)}, minmax(0, 1fr))` }}
              >
                {visibleProductColumns.map((column) => (
                  <div
                    key={`${item.name}-${column.key}`}
                    className={`px-2 py-2 ${
                      column.key === "productName" ? "whitespace-pre-line leading-4 text-left" : "text-right"
                    }`}
                  >
                    {previewProductCellValue(item, column.key)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="my-3 space-y-1 text-[11px] text-gray-700">
            {previewTotals.map((row) => (
              <div
                key={row.key}
                className={`totals-row flex items-center justify-between gap-3 ${row.grand ? "grand" : ""}`}
              >
                <span>{row.label}</span>
                <span className={row.grand ? "text-sm font-bold text-gray-900" : ""}>{row.value}</span>
              </div>
            ))}
          </div>

          {settings.showTaxTableOnReceipt && taxRows.length > 0 && visibleTaxColumns.length > 0 ? (
            <div className="mb-3 overflow-hidden rounded-lg border border-gray-200">
              <div
                className="grid bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500"
                style={{ gridTemplateColumns: `repeat(${visibleTaxColumns.length}, minmax(0, 1fr))` }}
              >
                {visibleTaxColumns.map((column) => (
                  <div
                    key={column.key}
                    className={`px-2 py-2 ${column.key === "taxName" ? "text-left" : "text-right"}`}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
              {taxRows.map((row) => (
                <div
                  key={`${row.label}-${row.taxPerc}`}
                  className="grid border-t border-gray-100 text-[11px] text-gray-700"
                  style={{ gridTemplateColumns: `repeat(${visibleTaxColumns.length}, minmax(0, 1fr))` }}
                >
                  {visibleTaxColumns.map((column) => (
                    <div
                      key={`${row.label}-${row.taxPerc}-${column.key}`}
                      className={`px-2 py-2 ${column.key === "taxName" ? "truncate text-left" : "text-right"}`}
                    >
                      {previewTaxCellValue(row, column.key)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {billCodeMarkup ? (
            <>
              <div className="line my-3 border-t border-dashed border-gray-300" />
              <div
                className="flex flex-col items-center justify-center overflow-hidden [&_img]:h-24 [&_img]:w-24 [&_img]:max-w-full [&_img]:object-contain [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: billCodeMarkup }}
              />
            </>
          ) : null}

          {paymentQrMarkup ? (
            <>
              <div className="line my-3 border-t border-dashed border-gray-300" />
              <div
                className="flex flex-col items-center justify-center overflow-hidden [&_img]:h-24 [&_img]:w-24 [&_img]:max-w-full [&_img]:object-contain [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: paymentQrMarkup }}
              />
            </>
          ) : null}

          <div className="mt-4 whitespace-pre-line text-center text-[11px] font-medium leading-5 text-gray-700">
            {settings.thankYouMessage}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Customisation() {
  const authUser = useSelector((state) => state.auth.user);
  const companyId = authUser?.company_id || "default";
  const [settings, setSettings] = useState(DEFAULT_SALES_RECEIPT_CUSTOMIZATION);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SALES_RECEIPT_CUSTOMIZATION);
  const [companyInfo, setCompanyInfo] = useState({
    storeName: "",
    storeAddress: "",
    storePhone: "",
    storeGstNo: "",
  });

  useEffect(() => {
    let cancelled = false;
    const cid = authUser?.company_id;
    const storageKey = cid || companyId;

    const loadSettings = async () => {
      const local = loadSalesReceiptCustomization(storageKey);
      if (!cancelled) {
        setSettings(local);
        setSavedSettings(local);
      }
      if (!cid) return;

      const synced = await fetchSalesReceiptCustomization(api, cid);
      if (!cancelled) {
        setSettings(synced);
        setSavedSettings(synced);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [authUser?.company_id, companyId]);

  useEffect(() => {
    let mounted = true;

    const loadCompany = async () => {
      const resolvedStoreName =
        String(authUser?.company_name || "").trim()
        || String(authUser?.name || "").trim()
        || "Store";

      if (!authUser?.company_id) {
        if (mounted) {
          setCompanyInfo({
            storeName: resolvedStoreName,
            storeAddress: "",
            storePhone: "",
            storeGstNo: "",
          });
        }
        return;
      }

      try {
        const res = await api.get(`/companies/${authUser.company_id}`);
        const company = res.data?.data || {};
        if (!mounted) return;
        setCompanyInfo({
          storeName: resolvedStoreName,
          storeAddress: String(company.address || "").trim(),
          storePhone: String(company.contact_no || company.phone || "").trim(),
          storeGstNo: String(company.gst_no || company.gstin || "").trim(),
        });
      } catch {
        if (!mounted) return;
        setCompanyInfo({
          storeName: resolvedStoreName,
          storeAddress: "",
          storePhone: "",
          storeGstNo: "",
        });
      }
    };

    loadCompany();
    return () => {
      mounted = false;
    };
  }, [authUser]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings]
  );
  const generalFieldRows = useMemo(
    () =>
      SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS.map((definition) => ({
        ...definition,
        ...(settings.generalFields?.[definition.key] || {}),
      })),
    [settings.generalFields]
  );
  const taxFieldRows = useMemo(
    () =>
      SALES_RECEIPT_TAX_FIELD_DEFINITIONS
        .filter((definition) => definition.key !== "title")
        .map((definition) => ({
          ...definition,
          ...(settings.taxFields?.[definition.key] || {}),
        })),
    [settings.taxFields]
  );
  const productFieldRows = useMemo(
    () =>
      SALES_RECEIPT_PRODUCT_FIELD_DEFINITIONS
        .filter((definition) => definition.key !== "title")
        .map((definition) => ({
          ...definition,
          ...(settings.productFields?.[definition.key] || {}),
        })),
    [settings.productFields]
  );

  const handlePaymentQrImageChange = async (event) => {
    const file = event.target.files?.[0];
    // Clear the input either way, so re-picking the same file after a failure still fires onChange.
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await readPaymentQrImageFile(file);
      updateSetting({ paymentQrImageUrl: dataUrl });
    } catch (err) {
      toast.error(err?.message || "Could not read that image.");
    }
  };

  const updateSetting = (patch) => {
    setSettings((prev) => {
      const nextPatch = { ...patch };
      const nextSaleSaveAs = nextPatch.saleSaveAs ?? prev.saleSaveAs;

      if (nextSaleSaveAs === "unsettled") {
        nextPatch.posPaymentDialogVisible = false;
      } else if (
        Object.prototype.hasOwnProperty.call(nextPatch, "posPaymentDialogVisible")
        && Boolean(nextPatch.posPaymentDialogVisible)
        && prev.saleSaveAs === "unsettled"
      ) {
        nextPatch.saleSaveAs = "paid_settled";
      }

      return normalizeSalesReceiptCustomization({ ...prev, ...nextPatch });
    });
  };
  const updateGeneralField = (key, patch) => {
    setSettings((prev) =>
      normalizeSalesReceiptCustomization({
        ...prev,
        generalFields: {
          ...prev.generalFields,
          [key]: {
            ...prev.generalFields?.[key],
            ...patch,
          },
        },
      })
    );
  };
  const updateTaxField = (key, patch) => {
    setSettings((prev) =>
      normalizeSalesReceiptCustomization({
        ...prev,
        taxFields: {
          ...prev.taxFields,
          [key]: {
            ...prev.taxFields?.[key],
            ...patch,
          },
        },
      })
    );
  };
  const updateProductField = (key, patch) => {
    setSettings((prev) =>
      normalizeSalesReceiptCustomization({
        ...prev,
        productFields: {
          ...prev.productFields,
          [key]: {
            ...prev.productFields?.[key],
            ...patch,
          },
        },
      })
    );
  };

  const handleSave = async () => {
    const next = normalizeSalesReceiptCustomization(settings);
    try {
      if (authUser?.company_id) {
        await api.put("/sales-customization", {
          companyId: authUser.company_id,
          ...next,
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save sales customisation on server");
      return;
    }
    saveSalesReceiptCustomization(companyId, next);
    setSettings(next);
    setSavedSettings(next);
    toast.success("Sales customisation saved");
  };

  const handleReset = () => {
    setSettings(normalizeSalesReceiptCustomization(DEFAULT_SALES_RECEIPT_CUSTOMIZATION));
  };

  return (
    <div className="h-[calc(100vh-53px)] overflow-hidden bg-gray-100 px-4 py-4 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          {/* Sticky so the header - title, description, and Save/Reset - stays reachable while
              scrolling through the settings below, instead of scrolling away with them. */}
          <div className={`${baseCardClass} sticky top-0 z-20 px-5 py-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sales Customisation</div>
                <div className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Control bill barcode visibility, return-slip barcode preference, receipt size, and printed receipt field layout for POS sales.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Draft
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Sales number reset</label>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Applies only to new sales. Numbers already saved stay unchanged if you switch between daily, weekly, monthly, or yearly.
            </p>
            <div className="flex flex-wrap gap-3">
              {BILL_NUMBER_RESET_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                    settings.billNumberReset === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="bill-number-reset"
                    value={option.value}
                    checked={settings.billNumberReset === option.value}
                    onChange={() => updateSetting({ billNumberReset: option.value })}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <label htmlFor="sales-number-override" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Custom next sales number (optional)
              </label>
              <input
                id="sales-number-override"
                type="number"
                min="1"
                step="1"
                value={settings.billNumberOverride || ""}
                onChange={(event) => updateSetting({ billNumberOverride: event.target.value })}
                placeholder="e.g. 5001"
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
              />
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                Set the next new sale to start from this number (e.g. continuing from another system). Leave blank for normal numbering.
              </p>
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Settlement number reset</label>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Applies only to new settlements. Numbers already saved stay unchanged if you switch between daily, weekly, monthly, or yearly.
            </p>
            <div className="flex flex-wrap gap-3">
              {SETTLEMENT_NUMBER_RESET_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                    settings.settlementNumberReset === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="settlement-number-reset"
                    value={option.value}
                    checked={settings.settlementNumberReset === option.value}
                    onChange={() => updateSetting({ settlementNumberReset: option.value })}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <label htmlFor="settlement-number-override" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Custom next settlement number (optional)
              </label>
              <input
                id="settlement-number-override"
                type="number"
                min="1"
                step="1"
                value={settings.settlementNumberOverride || ""}
                onChange={(event) => updateSetting({ settlementNumberOverride: event.target.value })}
                placeholder="e.g. 101"
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
              />
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                Set the next new settlement to start from this sequence number within the current period. Leave blank for normal numbering.
              </p>
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Sale save as</label>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Default bill status for new sales from POS Sale, POS Old, and Touch Sale. Unsettled bills stay open until you settle them on the Settlement screen.
            </p>
            <div className="flex flex-wrap gap-3">
              {SALE_SAVE_AS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                    settings.saleSaveAs === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="sale-save-as"
                    value={option.value}
                    checked={settings.saleSaveAs === option.value}
                    onChange={() => updateSetting({ saleSaveAs: option.value })}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Printing Mode (Direct / Silent vs Browser Default)</label>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Choose whether sales receipts, return slips, and settlement summaries print directly to your thermal printer in the background (no popup) or open the browser print preview dialog.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRINT_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                    settings.printMode === option.value
                      ? "border-blue-600 bg-blue-50/70 shadow-sm dark:border-blue-500 dark:bg-blue-900/30"
                      : "border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="sales-print-mode"
                      value={option.value}
                      checked={settings.printMode === option.value}
                      onChange={() => updateSetting({ printMode: option.value })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {option.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">
                    {option.description}
                  </p>
                </label>
              ))}
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Receipt Barcode</label>
            <div className="space-y-3">
              <ToggleCard
                label="Show barcode on bill"
                hint="Print a scannable barcode at the bottom of the POS bill using the formatted bill number, for example SB/29."
                checked={settings.showBarcodeOnBill}
                onChange={(checked) => updateSetting({ showBarcodeOnBill: checked })}
              />
              <ToggleCard
                label="Show barcode on return slip"
                hint="Store a separate preference for return-slip barcode printing inside the sales module."
                checked={settings.showBarcodeOnReturnSlip}
                onChange={(checked) => updateSetting({ showBarcodeOnReturnSlip: checked })}
              />
              <div className="pt-1">
              <div className={fieldLabelClass}>Show barcode or QR code</div>
              <p className="mb-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Applies to sale and return slips when the barcode options above are enabled.
              </p>
              <div className="flex flex-wrap gap-3">
                {RECEIPT_CODE_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                      settings.receiptCodeType === option.value
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                        : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="receipt-code-type"
                      value={option.value}
                      checked={settings.receiptCodeType === option.value}
                      onChange={() => updateSetting({ receiptCodeType: option.value })}
                      className="h-4 w-4"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
              <ToggleCard
                label="Show discount on receipt"
                hint="Show the discount row in the printed POS receipt totals section."
                checked={settings.showDiscountOnReceipt}
                onChange={(checked) => updateSetting({ showDiscountOnReceipt: checked })}
              />
              <ToggleCard
                label="Show GST table on receipt"
                hint="Print a grouped tax summary table near the end of the POS receipt."
                checked={settings.showTaxTableOnReceipt}
                onChange={(checked) => updateSetting({ showTaxTableOnReceipt: checked })}
              />
            </div>
          </div>

          <DiscountDisplayCard
            value={settings.discountDisplayMode}
            onChange={(discountDisplayMode) => updateSetting({ discountDisplayMode })}
          />

          <ReceiptFieldTable
            title="General"
            rows={generalFieldRows}
            onToggleVisible={(key, visible) => updateGeneralField(key, { visible })}
            onPositionChange={(key, position) => updateGeneralField(key, { position })}
            onLineChange={(key, line) => updateGeneralField(key, { line })}
          />

          <ReceiptVisibilityTable
            title="Tax"
            rows={taxFieldRows}
            onToggleVisible={(key, visible) => {
              updateTaxField(key, { visible });
              if (key === "title") {
                updateSetting({ showTaxTableOnReceipt: visible });
              }
            }}
          />

          <ReceiptVisibilityTable
            title="Product"
            rows={productFieldRows}
            onToggleVisible={(key, visible) => updateProductField(key, { visible })}
          />

          <ReceiptVisibilityTable
            title="POS checkout"
            rows={[
              {
                key: "paymentDialog",
                label: "Payment dialogue",
                visible: settings.posPaymentDialogVisible !== false,
              },
            ]}
            onToggleVisible={(key, visible) => {
              if (key === "paymentDialog") {
                updateSetting({ posPaymentDialogVisible: visible });
              }
            }}
          />

          <PosReceiptCopiesTable
            copies={settings.posReceiptPrintCopies ?? 1}
            onChangeCopies={(n) => updateSetting({ posReceiptPrintCopies: n })}
          />

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Receipt Size</label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {SALES_RECEIPT_SIZE_OPTIONS.map((option) => (
                <SizeOption
                  key={option.value}
                  option={option}
                  selected={settings.receiptWidthInches === option.value}
                  onSelect={(value) => updateSetting({ receiptWidthInches: value })}
                />
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
              Leave all sizes unselected to keep the current default receipt size.
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Receipt Font</label>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Applies to the printed receipt (and thermal printers) as well as the preview on the right. The monospace options keep amount columns aligned on narrow thermal paper.
            </p>
            <div className="flex flex-wrap gap-3">
              {RECEIPT_FONT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                    settings.receiptFontFamily === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                  style={{ fontFamily: option.cssStack }}
                >
                  <input
                    type="radio"
                    name="receipt-font-family"
                    value={option.value}
                    checked={settings.receiptFontFamily === option.value}
                    onChange={() => updateSetting({ receiptFontFamily: option.value })}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Receipt / Invoice Format</label>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Choose the overall look of the printed receipt -- border and divider style, spacing, and how the header and total are emphasised. Applies to the preview on the right and every POS print.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {RECEIPT_FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 text-sm ${
                    settings.receiptFormat === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="receipt-format"
                      value={option.value}
                      checked={settings.receiptFormat === option.value}
                      onChange={() => updateSetting({ receiptFormat: option.value })}
                      className="h-4 w-4"
                    />
                    {option.label}
                  </span>
                  <span className="text-xs leading-5 text-gray-500 dark:text-gray-400">{option.description}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label htmlFor="sales-thank-you-message" className={fieldLabelClass}>
              Receipt Thank You Message
            </label>
            <textarea
              id="sales-thank-you-message"
              value={settings.thankYouMessage}
              onChange={(event) => updateSetting({ thankYouMessage: event.target.value })}
              rows={5}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
              placeholder="Enter the closing message shown at the end of the receipt"
            />
            <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
              This message is printed at the end of the POS receipt. Line breaks entered here are preserved in the preview and on print.
            </div>
          </div>

          <div className={`${baseCardClass} p-5`}>
            <label className={fieldLabelClass}>Payment QR</label>
            <p className="mb-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Prints a &ldquo;Scan to Pay&rdquo; QR at the end of the receipt. Only the UPI ID option can carry the bill amount -- an uploaded image is a fixed picture, so the customer types the amount themselves.
            </p>
            <div className="flex flex-wrap gap-3">
              {PAYMENT_QR_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                    settings.paymentQrMode === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                      : "border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-qr-mode"
                    value={option.value}
                    checked={settings.paymentQrMode === option.value}
                    onChange={() => updateSetting({ paymentQrMode: option.value })}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            {settings.paymentQrMode === "upi" ? (
              <div className="mt-4">
                <label htmlFor="sales-payment-upi-id" className={fieldLabelClass}>
                  UPI ID
                </label>
                <input
                  id="sales-payment-upi-id"
                  type="text"
                  value={settings.paymentUpiId}
                  onChange={(event) => updateSetting({ paymentUpiId: event.target.value })}
                  placeholder="yourstore@okicici"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full max-w-md rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
                />
                {settings.paymentUpiId.trim() ? null : (
                  <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    Enter a UPI ID -- without one, no QR is printed and this setting saves as &ldquo;None&rdquo;.
                  </p>
                )}
              </div>
            ) : null}

            {settings.paymentQrMode === "image" ? (
              <div className="mt-4">
                <label htmlFor="sales-payment-qr-image" className={fieldLabelClass}>
                  QR Image
                </label>
                <div className="flex flex-wrap items-start gap-4">
                  <input
                    id="sales-payment-qr-image"
                    type="file"
                    accept="image/*"
                    onChange={handlePaymentQrImageChange}
                    className="max-w-md text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 dark:text-gray-300"
                  />
                  {settings.paymentQrImageUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={settings.paymentQrImageUrl}
                        alt="Payment QR preview"
                        className="h-24 w-24 rounded-lg border border-gray-200 bg-white object-contain p-1 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => updateSetting({ paymentQrImageUrl: "" })}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs leading-5 text-amber-700 dark:text-amber-400">
                      Upload a QR image -- without one, no QR is printed and this setting saves as &ldquo;None&rdquo;.
                    </p>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  The image is resized to 512px and stored with these settings. Thermal printers render QR codes best in plain black on white.
                </div>
              </div>
            ) : null}
          </div>

          {hasUnsavedChanges ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-400">
              You have unsaved changes in sales customisation.
            </div>
          ) : null}
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <ReceiptPreview companyInfo={companyInfo} settings={settings} />
        </div>
      </div>
    </div>
  );
}
