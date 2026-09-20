import React, { useEffect, useMemo, useState } from "react";
import { Eye, RotateCcw, Save, Minus, Plus } from "lucide-react";
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
  PAYMENT_QR_SIZE_MIN,
  PAYMENT_QR_SIZE_MAX,
  PAYMENT_QR_SIZE_STEP,
  buildPaymentQrMarkup,
  readPaymentQrImageFile,
  saveSalesReceiptCustomization,
  shouldShowSalesReceiptDiscountColumn,
  wrapSalesReceiptText,
} from "../../utils/salesReceiptCustomization";
import { buildPosSaleReceiptHtml } from "../../utils/posReceiptHtml";
import { Box, Stack, Typography, TextField, Button, IconButton, Switch, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const fieldLabelSx = { mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" };
const baseCardSx = { borderRadius: "14px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1 };
const radioPillSx = (active) => ({
  display: "flex",
  cursor: "pointer",
  alignItems: "center",
  gap: 1,
  borderRadius: "7px",
  border: "1px solid",
  borderColor: active ? "primary.main" : "divider",
  bgcolor: active ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "background.paper",
  color: active ? "primary.main" : "text.secondary",
  px: 2,
  py: 1,
  fontSize: 12.25,
});

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

const receiptTableHeadSx = { bgcolor: "#165da8", px: 1.5, py: 1.5, textAlign: "left", fontSize: 12.25, fontWeight: 600, color: "#fff" };
const receiptTableCellSx = { border: "1px solid", borderColor: "divider", px: 1.5, py: 1.5, verticalAlign: "middle", fontSize: 12.25, color: "text.secondary" };
const receiptTableInputSx = { "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } };

const RadioCell = ({ name, checked, onChange }) => (
  <Box component="label" sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Box component="input" type="radio" name={name} checked={checked} onChange={onChange} sx={{ height: 16, width: 16 }} />
  </Box>
);

const ReceiptFieldTable = ({
  title,
  rows,
  onToggleVisible,
  onPositionChange,
  onLineChange,
}) => (
  <Box sx={{ ...baseCardSx, overflow: "hidden" }}>
    <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
      <Typography sx={{ fontSize: 17.5, fontWeight: 600, color: "text.primary" }}>{title}</Typography>
    </Box>
    <Box sx={{ overflowX: "auto" }}>
      <Table sx={{ minWidth: "100%", borderCollapse: "collapse" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={receiptTableHeadSx}>Title</TableCell>
            <TableCell sx={receiptTableHeadSx}>Position</TableCell>
            <TableCell sx={{ ...receiptTableHeadSx, width: 96, textAlign: "center" }}>Hide</TableCell>
            <TableCell sx={{ ...receiptTableHeadSx, width: 96, textAlign: "center" }}>Show</TableCell>
            <TableCell sx={receiptTableHeadSx}>Line</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.key} sx={{ bgcolor: index % 2 === 0 ? "action.hover" : "background.paper" }}>
              <TableCell sx={receiptTableCellSx}>{row.label}</TableCell>
              <TableCell sx={receiptTableCellSx}>
                {row.hasPosition ? (
                  <TextField
                    select
                    value={row.position}
                    onChange={(event) => onPositionChange(row.key, event.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ select: { native: true } }}
                    sx={receiptTableInputSx}
                  >
                    {SALES_RECEIPT_POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label.toLowerCase()}
                      </option>
                    ))}
                  </TextField>
                ) : (
                  <Box sx={{ height: 40, borderRadius: "7px", bgcolor: "action.hover" }} />
                )}
              </TableCell>
              <TableCell sx={receiptTableCellSx}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={!row.visible}
                  onChange={() => onToggleVisible(row.key, false)}
                />
              </TableCell>
              <TableCell sx={receiptTableCellSx}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={row.visible}
                  onChange={() => onToggleVisible(row.key, true)}
                />
              </TableCell>
              <TableCell sx={receiptTableCellSx}>
                {row.hasLine ? (
                  <TextField
                    type="text"
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    value={row.line}
                    onChange={(event) => onLineChange(row.key, event.target.value)}
                    size="small"
                    fullWidth
                    sx={receiptTableInputSx}
                  />
                ) : (
                  <Box sx={{ height: 40, borderRadius: "7px", bgcolor: "action.hover" }} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  </Box>
);

const ReceiptVisibilityTable = ({ title, rows, onToggleVisible }) => (
  <Box sx={{ ...baseCardSx, overflow: "hidden" }}>
    <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
      <Typography sx={{ fontSize: 17.5, fontWeight: 600, color: "text.primary" }}>{title}</Typography>
    </Box>
    <Box sx={{ overflowX: "auto" }}>
      <Table sx={{ minWidth: "100%", borderCollapse: "collapse" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={receiptTableHeadSx}>Title</TableCell>
            <TableCell sx={{ ...receiptTableHeadSx, width: 96, textAlign: "center" }}>Hide</TableCell>
            <TableCell sx={{ ...receiptTableHeadSx, width: 96, textAlign: "center" }}>Show</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.key} sx={{ bgcolor: index % 2 === 0 ? "action.hover" : "background.paper" }}>
              <TableCell sx={receiptTableCellSx}>{row.label}</TableCell>
              <TableCell sx={receiptTableCellSx}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={!row.visible}
                  onChange={() => onToggleVisible(row.key, false)}
                />
              </TableCell>
              <TableCell sx={receiptTableCellSx}>
                <RadioCell
                  name={`${title}-${row.key}`}
                  checked={row.visible}
                  onChange={() => onToggleVisible(row.key, true)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  </Box>
);

/** Same chrome as Product table: Title + one radio per copy count (1–3). */
const PosReceiptCopiesTable = ({ copies, onChangeCopies }) => (
  <Box sx={{ ...baseCardSx, overflow: "hidden" }}>
    <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
      <Typography sx={{ fontSize: 17.5, fontWeight: 600, color: "text.primary" }}>Copies</Typography>
    </Box>
    <Box sx={{ overflowX: "auto" }}>
      <Table sx={{ minWidth: "100%", borderCollapse: "collapse" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={receiptTableHeadSx}>Title</TableCell>
            <TableCell sx={{ ...receiptTableHeadSx, width: 96, textAlign: "center" }}>1</TableCell>
            <TableCell sx={{ ...receiptTableHeadSx, width: 96, textAlign: "center" }}>2</TableCell>
            <TableCell sx={{ ...receiptTableHeadSx, width: 96, textAlign: "center" }}>3</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow sx={{ bgcolor: "action.hover" }}>
            <TableCell sx={receiptTableCellSx}>Receipt prints</TableCell>
            {[1, 2, 3].map((n) => (
              <TableCell key={n} sx={receiptTableCellSx}>
                <RadioCell
                  name="pos-receipt-copies-table"
                  checked={Number(copies ?? 1) === n}
                  onChange={() => onChangeCopies(n)}
                />
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  </Box>
);

const DiscountDisplayCard = ({ value, onChange }) => (
  <Box sx={{ ...baseCardSx, p: 2.5 }}>
    <Typography component="label" sx={fieldLabelSx}>Show Discount As</Typography>
    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
      {SALES_RECEIPT_DISCOUNT_DISPLAY_OPTIONS.map((option) => (
        <Stack
          component="label"
          key={option.value}
          direction="row"
          spacing={1}
          sx={radioPillSx(value === option.value)}
        >
          <Box
            component="input"
            type="radio"
            name="sales-discount-display"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            sx={{ height: 16, width: 16 }}
          />
          <Box component="span">{option.label}</Box>
        </Stack>
      ))}
    </Stack>
  </Box>
);

const ToggleCard = ({ label, hint, checked, onChange }) => (
  <Stack
    component="label"
    direction="row"
    spacing={2}
    sx={{
      cursor: "pointer",
      alignItems: "flex-start",
      justifyContent: "space-between",
      borderRadius: "10.5px",
      border: "1px solid",
      borderColor: "divider",
      bgcolor: "action.hover",
      px: 2,
      py: 1.5,
      "&:hover": { borderColor: "primary.light", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06) },
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>{hint}</Typography>
    </Box>
    <Box sx={{ pt: 0.25 }}>
      <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} size="small" />
    </Box>
  </Stack>
);

const SizeOption = ({ option, selected, onSelect }) => (
  <Button
    type="button"
    onClick={() => onSelect(selected ? "" : option.value)}
    sx={{
      display: "block",
      textAlign: "left",
      textTransform: "none",
      borderRadius: "10.5px",
      border: "1px solid",
      borderColor: selected ? "primary.main" : "divider",
      bgcolor: selected ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "background.paper",
      boxShadow: selected ? 1 : 0,
      color: selected ? "primary.main" : "text.secondary",
      px: 2,
      py: 1.5,
      "&:hover": { borderColor: selected ? "primary.main" : "primary.light", bgcolor: selected ? undefined : (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06) },
    }}
  >
    <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "inherit" }}>{option.label}</Typography>
    <Typography sx={{ mt: 0.5, fontSize: 10.5, color: selected ? "primary.main" : "text.secondary" }}>Receipt size</Typography>
  </Button>
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
      <Box sx={{ ...baseCardSx, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Receipt Preview</Typography>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Sample tax invoice at A4 size</Typography>
            </Box>
            <Eye size={16} style={{ color: "#9ca3af" }} />
          </Stack>
        </Box>
        <div className="bg-[#eef2f7] p-4 dark:bg-gray-900/40">
          <iframe
            title="A4 invoice preview"
            srcDoc={a4PreviewHtml}
            className="mx-auto block w-full rounded-2xl border border-gray-300 bg-white shadow-lg"
            style={{ height: "80vh" }}
          />
        </div>
      </Box>
    );
  }

  return (
    <Box sx={{ ...baseCardSx, overflow: "hidden" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Receipt Preview</Typography>
            <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
              Sample bill at {settings.receiptWidthInches || "default"} size
            </Typography>
          </Box>
          <Eye size={16} style={{ color: "#9ca3af" }} />
        </Stack>
      </Box>

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
    </Box>
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

  const handlePaymentQrSizeStep = (delta) => {
    const current = Number(settings.paymentQrSize) || PAYMENT_QR_SIZE_MIN;
    const next = current + delta;
    if (next > PAYMENT_QR_SIZE_MAX) {
      toast.info(`Maximum recommended QR size is ${PAYMENT_QR_SIZE_MAX}px -- larger may not fit on narrower receipt paper.`);
      return;
    }
    if (next < PAYMENT_QR_SIZE_MIN) {
      toast.info(`Minimum recommended QR size is ${PAYMENT_QR_SIZE_MIN}px -- smaller QR codes may not scan reliably on thermal printers.`);
      return;
    }
    updateSetting({ paymentQrSize: next });
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
    <Box sx={{ height: "calc(100vh - 53px)", overflow: "hidden", bgcolor: "background.default", px: 2, py: 2, color: "text.primary" }}>
      <Box sx={{ display: "grid", height: "100%", gap: 2, gridTemplateColumns: { xl: "minmax(0,1fr) 420px" } }}>
        <Stack spacing={2} sx={{ minHeight: 0, overflowY: "auto", pr: 0.5 }}>
          {/* Sticky so the header - title, description, and Save/Reset - stays reachable while
              scrolling through the settings below, instead of scrolling away with them. */}
          <Box sx={{ ...baseCardSx, position: "sticky", top: 0, zIndex: 20, px: 2.5, py: 2.5 }}>
            <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 17.5, fontWeight: 600, color: "text.primary" }}>Sales Customisation</Typography>
                <Typography sx={{ mt: 0.5, maxWidth: 672, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
                  Control bill barcode visibility, return-slip barcode preference, receipt size, and printed receipt field layout for POS sales.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Button
                  type="button"
                  onClick={handleReset}
                  startIcon={<RotateCcw size={16} />}
                  sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 1, fontSize: 12.25, fontWeight: 500, color: "text.secondary", textTransform: "none", "&:hover": { borderColor: "text.disabled" } }}
                >
                  Reset Draft
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  variant="contained"
                  startIcon={<Save size={16} />}
                  sx={{ borderRadius: "7px", px: 1.5, py: 1, fontSize: 12.25, fontWeight: 500, textTransform: "none" }}
                >
                  Save
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Sales number reset</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 768, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
              Applies only to new sales. Numbers already saved stay unchanged if you switch between daily, weekly, monthly, or yearly.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              {BILL_NUMBER_RESET_OPTIONS.map((option) => (
                <Stack
                  component="label"
                  key={option.value}
                  direction="row"
                  spacing={1}
                  sx={radioPillSx(settings.billNumberReset === option.value)}
                >
                  <Box
                    component="input"
                    type="radio"
                    name="bill-number-reset"
                    value={option.value}
                    checked={settings.billNumberReset === option.value}
                    onChange={() => updateSetting({ billNumberReset: option.value })}
                    sx={{ height: 16, width: 16 }}
                  />
                  <Box component="span">{option.label}</Box>
                </Stack>
              ))}
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Typography component="label" htmlFor="sales-number-override" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
                Custom next sales number (optional)
              </Typography>
              <TextField
                id="sales-number-override"
                type="number"
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                value={settings.billNumberOverride || ""}
                onChange={(event) => updateSetting({ billNumberOverride: event.target.value })}
                placeholder="e.g. 5001"
                size="small"
                sx={{ width: "100%", maxWidth: 320, "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
              />
              <Typography sx={{ mt: 0.5, fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>
                Set the next new sale to start from this number (e.g. continuing from another system). Leave blank for normal numbering.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Settlement number reset</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 768, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
              Applies only to new settlements. Numbers already saved stay unchanged if you switch between daily, weekly, monthly, or yearly.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              {SETTLEMENT_NUMBER_RESET_OPTIONS.map((option) => (
                <Stack
                  component="label"
                  key={option.value}
                  direction="row"
                  spacing={1}
                  sx={radioPillSx(settings.settlementNumberReset === option.value)}
                >
                  <Box
                    component="input"
                    type="radio"
                    name="settlement-number-reset"
                    value={option.value}
                    checked={settings.settlementNumberReset === option.value}
                    onChange={() => updateSetting({ settlementNumberReset: option.value })}
                    sx={{ height: 16, width: 16 }}
                  />
                  <Box component="span">{option.label}</Box>
                </Stack>
              ))}
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Typography component="label" htmlFor="settlement-number-override" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
                Custom next settlement number (optional)
              </Typography>
              <TextField
                id="settlement-number-override"
                type="number"
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                value={settings.settlementNumberOverride || ""}
                onChange={(event) => updateSetting({ settlementNumberOverride: event.target.value })}
                placeholder="e.g. 101"
                size="small"
                sx={{ width: "100%", maxWidth: 320, "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
              />
              <Typography sx={{ mt: 0.5, fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>
                Set the next new settlement to start from this sequence number within the current period. Leave blank for normal numbering.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Sale save as</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 768, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
              Default bill status for new sales from POS Sale, POS Old, and Touch Sale. Unsettled bills stay open until you settle them on the Settlement screen.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              {SALE_SAVE_AS_OPTIONS.map((option) => (
                <Stack
                  component="label"
                  key={option.value}
                  direction="row"
                  spacing={1}
                  sx={radioPillSx(settings.saleSaveAs === option.value)}
                >
                  <Box
                    component="input"
                    type="radio"
                    name="sale-save-as"
                    value={option.value}
                    checked={settings.saleSaveAs === option.value}
                    onChange={() => updateSetting({ saleSaveAs: option.value })}
                    sx={{ height: 16, width: 16 }}
                  />
                  <Box component="span">{option.label}</Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Printing Mode (Direct / Silent vs Browser Default)</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 768, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
              Choose whether sales receipts, return slips, and settlement summaries print directly to your thermal printer in the background (no popup) or open the browser print preview dialog.
            </Typography>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { sm: "1fr 1fr" } }}>
              {PRINT_MODE_OPTIONS.map((option) => (
                <Stack
                  component="label"
                  key={option.value}
                  spacing={0}
                  sx={{
                    cursor: "pointer",
                    justifyContent: "space-between",
                    borderRadius: "10.5px",
                    border: "1px solid",
                    borderColor: settings.printMode === option.value ? "primary.main" : "divider",
                    bgcolor: settings.printMode === option.value ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "background.paper",
                    boxShadow: settings.printMode === option.value ? 1 : 0,
                    p: 2,
                    "&:hover": { borderColor: settings.printMode === option.value ? "primary.main" : "text.disabled" },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box
                      component="input"
                      type="radio"
                      name="sales-print-mode"
                      value={option.value}
                      checked={settings.printMode === option.value}
                      onChange={() => updateSetting({ printMode: option.value })}
                      sx={{ height: 16, width: 16, accentColor: "primary.main" }}
                    />
                    <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>
                      {option.label}
                    </Typography>
                  </Stack>
                  <Typography sx={{ mt: 1, fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>
                    {option.description}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Receipt Barcode</Typography>
            <Stack spacing={1.5}>
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
              <Box sx={{ pt: 0.5 }}>
                <Typography sx={fieldLabelSx}>Show barcode or QR code</Typography>
                <Typography sx={{ mb: 1.5, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
                  Applies to sale and return slips when the barcode options above are enabled.
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                  {RECEIPT_CODE_TYPE_OPTIONS.map((option) => (
                    <Stack
                      component="label"
                      key={option.value}
                      direction="row"
                      spacing={1}
                      sx={radioPillSx(settings.receiptCodeType === option.value)}
                    >
                      <Box
                        component="input"
                        type="radio"
                        name="receipt-code-type"
                        value={option.value}
                        checked={settings.receiptCodeType === option.value}
                        onChange={() => updateSetting({ receiptCodeType: option.value })}
                        sx={{ height: 16, width: 16 }}
                      />
                      <Box component="span">{option.label}</Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
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
            </Stack>
          </Box>

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

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Receipt Size</Typography>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { sm: "1fr 1fr", xl: "repeat(4, 1fr)" } }}>
              {SALES_RECEIPT_SIZE_OPTIONS.map((option) => (
                <SizeOption
                  key={option.value}
                  option={option}
                  selected={settings.receiptWidthInches === option.value}
                  onSelect={(value) => updateSetting({ receiptWidthInches: value })}
                />
              ))}
            </Box>
            <Typography sx={{ mt: 1.5, borderRadius: "10.5px", border: "1px dashed", borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5, fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>
              Leave all sizes unselected to keep the current default receipt size.
            </Typography>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Receipt Font</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 768, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
              Applies to the printed receipt (and thermal printers) as well as the preview on the right. The monospace options keep amount columns aligned on narrow thermal paper.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              {RECEIPT_FONT_OPTIONS.map((option) => (
                <Stack
                  component="label"
                  key={option.value}
                  direction="row"
                  spacing={1}
                  sx={{ ...radioPillSx(settings.receiptFontFamily === option.value), fontFamily: option.cssStack }}
                >
                  <Box
                    component="input"
                    type="radio"
                    name="receipt-font-family"
                    value={option.value}
                    checked={settings.receiptFontFamily === option.value}
                    onChange={() => updateSetting({ receiptFontFamily: option.value })}
                    sx={{ height: 16, width: 16 }}
                  />
                  <Box component="span">{option.label}</Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Receipt / Invoice Format</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 768, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
              Choose the overall look of the printed receipt -- border and divider style, spacing, and how the header and total are emphasised. Applies to the preview on the right and every POS print.
            </Typography>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { sm: "1fr 1fr", xl: "repeat(5, 1fr)" } }}>
              {RECEIPT_FORMAT_OPTIONS.map((option) => (
                <Stack
                  component="label"
                  key={option.value}
                  spacing={0.5}
                  sx={{ cursor: "pointer", borderRadius: "7px", border: "1px solid", borderColor: settings.receiptFormat === option.value ? "primary.main" : "divider", bgcolor: settings.receiptFormat === option.value ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "background.paper", color: settings.receiptFormat === option.value ? "primary.main" : "text.secondary", px: 2, py: 1.5, fontSize: 12.25 }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontWeight: 500 }}>
                    <Box
                      component="input"
                      type="radio"
                      name="receipt-format"
                      value={option.value}
                      checked={settings.receiptFormat === option.value}
                      onChange={() => updateSetting({ receiptFormat: option.value })}
                      sx={{ height: 16, width: 16 }}
                    />
                    {option.label}
                  </Stack>
                  <Box component="span" sx={{ fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>{option.description}</Box>
                </Stack>
              ))}
            </Box>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" htmlFor="sales-thank-you-message" sx={fieldLabelSx}>
              Receipt Thank You Message
            </Typography>
            <TextField
              id="sales-thank-you-message"
              value={settings.thankYouMessage}
              onChange={(event) => updateSetting({ thankYouMessage: event.target.value })}
              multiline
              rows={5}
              fullWidth
              placeholder="Enter the closing message shown at the end of the receipt"
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, lineHeight: 1.7 } }}
            />
            <Typography sx={{ mt: 1.5, borderRadius: "10.5px", border: "1px dashed", borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5, fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>
              This message is printed at the end of the POS receipt. Line breaks entered here are preserved in the preview and on print.
            </Typography>
          </Box>

          <Box sx={{ ...baseCardSx, p: 2.5 }}>
            <Typography component="label" sx={fieldLabelSx}>Payment QR</Typography>
            <Typography sx={{ mb: 1.5, maxWidth: 768, fontSize: 12.25, lineHeight: 1.7, color: "text.secondary" }}>
              Prints a &ldquo;Scan to Pay&rdquo; QR at the end of the receipt. Only the UPI ID option can carry the bill amount -- an uploaded image is a fixed picture, so the customer types the amount themselves.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              {PAYMENT_QR_MODE_OPTIONS.map((option) => (
                <Stack
                  component="label"
                  key={option.value}
                  direction="row"
                  spacing={1}
                  sx={radioPillSx(settings.paymentQrMode === option.value)}
                >
                  <Box
                    component="input"
                    type="radio"
                    name="payment-qr-mode"
                    value={option.value}
                    checked={settings.paymentQrMode === option.value}
                    onChange={() => updateSetting({ paymentQrMode: option.value })}
                    sx={{ height: 16, width: 16 }}
                  />
                  <Box component="span">{option.label}</Box>
                </Stack>
              ))}
            </Stack>

            {settings.paymentQrMode !== "none" ? (
              <Box sx={{ mt: 2 }}>
                <Typography component="label" sx={fieldLabelSx}>QR Size</Typography>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <IconButton
                    type="button"
                    onClick={() => handlePaymentQrSizeStep(-PAYMENT_QR_SIZE_STEP)}
                    disabled={settings.paymentQrSize <= PAYMENT_QR_SIZE_MIN}
                    sx={{ height: 36, width: 36, borderRadius: "7px", border: "1px solid", borderColor: "divider", color: "text.secondary" }}
                    aria-label="Decrease QR size"
                  >
                    <Minus size={16} />
                  </IconButton>
                  <Typography sx={{ minWidth: 64, textAlign: "center", fontSize: 12.25, fontWeight: 500, color: "text.primary" }}>
                    {settings.paymentQrSize}px
                  </Typography>
                  <IconButton
                    type="button"
                    onClick={() => handlePaymentQrSizeStep(PAYMENT_QR_SIZE_STEP)}
                    disabled={settings.paymentQrSize >= PAYMENT_QR_SIZE_MAX}
                    sx={{ height: 36, width: 36, borderRadius: "7px", border: "1px solid", borderColor: "divider", color: "text.secondary" }}
                    aria-label="Increase QR size"
                  >
                    <Plus size={16} />
                  </IconButton>
                  <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                    Recommended: {PAYMENT_QR_SIZE_MIN}-{PAYMENT_QR_SIZE_MAX}px
                  </Typography>
                </Stack>
              </Box>
            ) : null}

            {settings.paymentQrMode === "upi" ? (
              <Box sx={{ mt: 2 }}>
                <Typography component="label" htmlFor="sales-payment-upi-id" sx={fieldLabelSx}>
                  UPI ID
                </Typography>
                <TextField
                  id="sales-payment-upi-id"
                  type="text"
                  value={settings.paymentUpiId}
                  onChange={(event) => updateSetting({ paymentUpiId: event.target.value })}
                  placeholder="yourstore@okicici"
                  slotProps={{ htmlInput: { autoComplete: "off", spellCheck: false } }}
                  sx={{ width: "100%", maxWidth: 448, "& .MuiInputBase-input": { fontSize: 12.25, py: 1.25 } }}
                />
                {settings.paymentUpiId.trim() ? null : (
                  <Typography sx={{ mt: 1, fontSize: 10.5, lineHeight: 1.4, color: "warning.dark" }}>
                    Enter a UPI ID -- without one, no QR is printed and this setting saves as &ldquo;None&rdquo;.
                  </Typography>
                )}
              </Box>
            ) : null}

            {settings.paymentQrMode === "image" ? (
              <Box sx={{ mt: 2 }}>
                <Typography component="label" htmlFor="sales-payment-qr-image" sx={fieldLabelSx}>
                  QR Image
                </Typography>
                <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "flex-start" }}>
                  <Box
                    component="input"
                    id="sales-payment-qr-image"
                    type="file"
                    accept="image/*"
                    onChange={handlePaymentQrImageChange}
                    sx={{ maxWidth: 448, fontSize: 12.25, color: "text.secondary" }}
                  />
                  {settings.paymentQrImageUrl ? (
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Box
                        component="img"
                        src={settings.paymentQrImageUrl}
                        alt="Payment QR preview"
                        sx={{ height: 96, width: 96, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", objectFit: "contain", p: 0.5 }}
                      />
                      <Button
                        type="button"
                        onClick={() => updateSetting({ paymentQrImageUrl: "" })}
                        sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", px: 1.5, py: 0.75, fontSize: 10.5, fontWeight: 500, color: "text.secondary", textTransform: "none" }}
                      >
                        Remove
                      </Button>
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: 10.5, lineHeight: 1.4, color: "warning.dark" }}>
                      Upload a QR image -- without one, no QR is printed and this setting saves as &ldquo;None&rdquo;.
                    </Typography>
                  )}
                </Stack>
                <Typography sx={{ mt: 1.5, borderRadius: "10.5px", border: "1px dashed", borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5, fontSize: 10.5, lineHeight: 1.4, color: "text.secondary" }}>
                  The image is resized to 512px and stored with these settings. Thermal printers render QR codes best in plain black on white.
                </Typography>
              </Box>
            ) : null}
          </Box>

          {hasUnsavedChanges ? (
            <Typography sx={{ borderRadius: "10.5px", border: "1px solid", borderColor: (theme) => alpha(theme.palette.warning.main, 0.4), bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 2, py: 1.5, fontSize: 12.25, color: "warning.dark" }}>
              You have unsaved changes in sales customisation.
            </Typography>
          ) : null}
        </Stack>

        <Box sx={{ position: { xl: "sticky" }, top: { xl: 16 }, alignSelf: { xl: "flex-start" } }}>
          <ReceiptPreview companyInfo={companyInfo} settings={settings} />
        </Box>
      </Box>
    </Box>
  );
}
