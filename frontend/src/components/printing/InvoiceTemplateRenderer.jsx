import React from "react";
import { Box } from "@mui/material";

const truncateSx = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// Format helper
const formatCurrency = (val) => {
  const num = Number(val || 0);
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function InvoiceTemplateRenderer({
  settings,
  data,
  isPrintMode = false,
}) {
  const {
    template = "general",
    pageSize = "A4",
    orientation = "portrait",
    accentColor = "#2563eb",
    watermark = {},
    header = {},
    columns = [],
    footer = {},
    typography = {},
  } = settings || {};

  const isLandscape = orientation === "landscape";
  const isThermal = pageSize === "2inch" || pageSize === "3inch" || settings.templateType === "standard_thermal";
  const activeCols = (columns || []).filter((col) => col.enabled);

  // Dynamic Transaction Type Metadata
  const currentTxnType = settings?.transactionType || data?.transactionType || "income";
  const isReceiptFormat = currentTxnType === "receipt";

  const defaultTitles = {
    income: "TAX INVOICE",
    estimate: "ESTIMATE / QUOTATION",
    delivery_challan: "DELIVERY CHALLAN",
    expense: "PURCHASE VOUCHER",
    sale_order: "SALE ORDER",
    receipt: "PAYMENT RECEIPT",
  };

  const resolvedDocumentTitle = header.documentTitle || defaultTitles[currentTxnType] || "TAX INVOICE";

  const docNumLabel =
    currentTxnType === "receipt"
      ? "Receipt No:"
      : currentTxnType === "estimate"
      ? "Estimate No:"
      : currentTxnType === "delivery_challan"
      ? "Challan No:"
      : currentTxnType === "expense"
      ? "Voucher No:"
      : currentTxnType === "sale_order"
      ? "Order No:"
      : "Invoice No:";

  const docDateLabel =
    currentTxnType === "receipt"
      ? "Receipt Date:"
      : currentTxnType === "delivery_challan"
      ? "Challan Date:"
      : currentTxnType === "estimate"
      ? "Estimate Date:"
      : currentTxnType === "sale_order"
      ? "Order Date:"
      : "Dated:";

  const docPartyLabel =
    currentTxnType === "receipt"
      ? "Received With Thanks From"
      : currentTxnType === "estimate"
      ? "Details of Receiver (Estimate To)"
      : currentTxnType === "delivery_challan"
      ? "Details of Consignee (Shipped To)"
      : currentTxnType === "expense"
      ? "Details of Supplier / Paid To"
      : currentTxnType === "sale_order"
      ? "Details of Customer (Order By)"
      : "Details of Receiver (Billed To)";

  const receiptData = data?.receiptDetails || {
    receiptNo: data?.invoiceNo || "RCP-2026-0842",
    date: data?.date || "18-Sep-2026",
    receivedFrom: data?.customer?.name || "Kovai Retails & Supermarket",
    customerPhone: data?.customer?.phone || "+91 98421 55678",
    customerEmail: data?.customer?.email || "karthik.retail@kovaimarket.in",
    customerAddress: data?.customer?.billingAddress || "Shop No. 12, Crosscut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu",
    customerGstin: data?.customer?.gstin || "33AAECK5678H1Z8",
    customerPan: data?.customer?.pan || "AAECK5678H",
    paymentMode: data?.payment?.mode || "Bank Transfer (NEFT / RTGS)",
    referenceNo: "UTR-HDFC99823104",
    bankAccount: `${footer.bankDetails?.bankName || "HDFC Bank"} - ${footer.bankDetails?.accountNo || "50200034981245"}`,
    amountReceived: data?.totals?.grandTotal || 30472.0,
    amountInWords: data?.totals?.amountInWords || "Rupees Thirty Thousand Four Hundred Seventy Two Only",
    previousBalance: data?.customer?.previousBalance || 42972.0,
    currentBalance: 12500.0,
    narration: `Payment received towards invoice ${data?.invoiceNo || "INV-2026-0894"} in full & final settlement.`,
    allocations: [
      {
        sn: 1,
        invoiceNo: data?.invoiceNo || "INV-2026-0894",
        invoiceDate: data?.date || "18-Sep-2026",
        invoiceAmount: data?.totals?.grandTotal || 30472.0,
        paidAmount: data?.totals?.grandTotal || 30472.0,
        balanceDue: 0.0,
        status: "Fully Settled",
      },
      {
        sn: 2,
        invoiceNo: "INV-2026-0711",
        invoiceDate: "05-Sep-2026",
        invoiceAmount: 12500.0,
        paidAmount: 0.0,
        balanceDue: 12500.0,
        status: "Pending",
      },
    ],
  };

  // Dynamic Styles
  const primaryColor = accentColor || "#2563eb";
  const bodyFontSize = typography.bodySize ? `${typography.bodySize}px` : "11px";
  const headerFontSize = typography.companyTitleSize ? `${typography.companyTitleSize}px` : "20px";

  // Thermal Slip Rendering
  if (isThermal) {
    const thermalWidth = pageSize === "2inch" ? "58mm" : "80mm";
    const isBoldThermal = template === "bold_thermal";
    const isTallyThermal = template === "tally_thermal";
    const isIndigoThermal = template === "indigo_thermal";
    const isEmeraldThermal = template === "emerald_thermal";
    const isSunsetThermal = template === "sunset_thermal";

    const thermalAccentColor = isIndigoThermal
      ? "#4f46e5"
      : isEmeraldThermal
      ? "#059669"
      : isSunsetThermal
      ? "#ea580c"
      : isTallyThermal || isBoldThermal
      ? "#000000"
      : primaryColor;

    const hasColoredHeader = isIndigoThermal || isEmeraldThermal || isSunsetThermal;

    return (
      <Box
        sx={{
          mx: "auto",
          bgcolor: "#ffffff",
          color: "#000000",
          fontFamily: "monospace",
          userSelect: "none",
          position: "relative",
          width: thermalWidth,
          minHeight: "140mm",
          padding: "5mm",
          fontSize: isBoldThermal ? "11.5px" : "11px",
          lineHeight: "1.35",
          boxShadow: isPrintMode ? "none" : "0 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        {/* Thermal Header */}
        <Box
          sx={{
            textAlign: "center",
            pb: "7px",
            ...(hasColoredHeader
              ? { p: "7px", color: "#ffffff", borderRadius: "3.5px", mb: "7px" }
              : isTallyThermal
                ? { border: "2px solid #000000", p: "5.25px", mb: "7px" }
                : isBoldThermal
                  ? { borderBottom: "2px solid #000000" }
                  : { borderBottom: "1px dashed #9ca3af" }),
          }}
          style={hasColoredHeader ? { backgroundColor: thermalAccentColor } : undefined}
        >
          <Box sx={{ fontSize: isBoldThermal ? 12.25 : 10.5, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: isBoldThermal ? 900 : 700 }}>
            {header.documentTitle || "TAX INVOICE"}
          </Box>
          {header.showCompanyName && (
            <Box sx={{ fontSize: isBoldThermal ? 15.75 : 14, mt: "1.75px", fontWeight: isBoldThermal ? 900 : 800 }}>
              {data.company.name}
            </Box>
          )}
          <Box sx={{ fontSize: 10, mt: "1.75px", lineHeight: 1.25, color: hasColoredHeader ? "rgba(255,255,255,0.9)" : "#374151" }}>
            {data.company.address}
          </Box>
          <Box sx={{ fontSize: 10, mt: "1.75px" }}>
            {header.showMobile && <span>Tel: {data.company.phone}</span>}
            {header.showEmail && <Box component="span" sx={{ display: "block" }}>Email: {data.company.email}</Box>}
          </Box>
          {header.showGstin && (
            <Box sx={{ fontSize: 10, fontWeight: 600, mt: "1.75px" }}>GSTIN: {data.company.gstin}</Box>
          )}
        </Box>

        {/* Invoice Meta */}
        <Box
          sx={{
            py: "7px",
            fontSize: 10,
            "& > * + *": { mt: "1.75px" },
            ...(isTallyThermal
              ? { border: "1px solid #000000", p: "3.5px", mb: "7px" }
              : isBoldThermal
                ? { borderBottom: "2px solid #000000", fontWeight: 600 }
                : { borderBottom: "1px dashed #9ca3af" }),
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>Bill No: <Box component="b" sx={{ fontFamily: "monospace" }}>{data.invoiceNo}</Box></span>
            <span>Date: {data.date}</span>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cust: <b>{data.customer.name}</b></span>
            <span>Ph: {data.customer.phone}</span>
          </Box>
        </Box>

        {/* Thermal Items Table */}
        <Box
          component="table"
          sx={{
            width: "100%",
            textAlign: "left",
            my: "7px",
            borderCollapse: "collapse",
            fontSize: 10,
            ...(isTallyThermal ? { border: "1px solid #000000" } : {}),
          }}
        >
          <thead>
            <Box
              component="tr"
              sx={{
                borderBottom: isBoldThermal ? "2px solid #000000" : "1px solid #000000",
                fontWeight: 700,
                ...(isTallyThermal ? { bgcolor: "#e5e7eb" } : {}),
                ...(isBoldThermal ? { textTransform: "uppercase", fontSize: 11 } : {}),
              }}
            >
              <Box component="th" sx={{ py: "3.5px", ...(isTallyThermal ? { borderRight: "1px solid #000000", px: "3.5px" } : {}) }}>Item</Box>
              <Box component="th" sx={{ py: "3.5px", textAlign: "center", ...(isTallyThermal ? { borderRight: "1px solid #000000" } : {}) }}>Qty</Box>
              <Box component="th" sx={{ py: "3.5px", textAlign: "right", ...(isTallyThermal ? { borderRight: "1px solid #000000", px: "3.5px" } : {}) }}>Rate</Box>
              <Box component="th" sx={{ py: "3.5px", textAlign: "right", ...(isTallyThermal ? { px: "3.5px" } : {}) }}>Amt</Box>
            </Box>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <Box
                component="tr"
                key={idx}
                sx={{
                  borderBottom: isTallyThermal ? "1px solid #000000" : isBoldThermal ? "1px solid #d1d5db" : "1px solid #e5e7eb",
                  fontWeight: isBoldThermal ? 500 : undefined,
                }}
              >
                <Box component="td" sx={{ py: "3.5px", pr: "3.5px", ...(isTallyThermal ? { borderRight: "1px solid #000000", px: "3.5px" } : {}) }}>
                  <Box sx={{ fontWeight: 500, maxWidth: 110, ...truncateSx }}>{item.name}</Box>
                  {item.hsn && <Box sx={{ fontSize: 9, color: "#6b7280" }}>HSN: {item.hsn}</Box>}
                </Box>
                <Box component="td" sx={{ py: "3.5px", textAlign: "center", whiteSpace: "nowrap", ...(isTallyThermal ? { borderRight: "1px solid #000000" } : {}) }}>
                  {item.qty} {item.unit}
                </Box>
                <Box component="td" sx={{ py: "3.5px", textAlign: "right", whiteSpace: "nowrap", ...(isTallyThermal ? { borderRight: "1px solid #000000", px: "3.5px" } : {}) }}>
                  {item.rate.toFixed(2)}
                </Box>
                <Box component="td" sx={{ py: "3.5px", textAlign: "right", fontWeight: 600, whiteSpace: "nowrap", ...(isTallyThermal ? { px: "3.5px" } : {}) }}>
                  {item.totalAmt.toFixed(2)}
                </Box>
              </Box>
            ))}
          </tbody>
        </Box>

        {/* Thermal Totals */}
        <Box
          sx={{
            pt: "3.5px",
            fontSize: 11,
            "& > * + *": { mt: "3.5px" },
            ...(isTallyThermal
              ? { border: "1px solid #000000", p: "5.25px", mb: "7px" }
              : isBoldThermal
                ? { borderTop: "2px solid #000000", fontWeight: 600 }
                : { borderTop: "1px dashed #000000" }),
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total Qty:</span>
            <Box component="span" sx={{ fontWeight: 700 }}>{data.totals.totalQty}</Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>Sub Total:</span>
            <span>₹{formatCurrency(data.totals.subTotal)}</span>
          </Box>
          {data.totals.totalDiscount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", color: "#374151" }}>
              <span>Discount:</span>
              <span>-₹{formatCurrency(data.totals.totalDiscount)}</span>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>Taxable Value:</span>
            <span>₹{formatCurrency(data.totals.taxableAmount)}</span>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>CGST:</span>
            <span>₹{formatCurrency(data.totals.totalCgst)}</span>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>SGST:</span>
            <span>₹{formatCurrency(data.totals.totalSgst)}</span>
          </Box>
          {data.totals.roundOff !== 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span>Round Off:</span>
              <span>₹{formatCurrency(data.totals.roundOff)}</span>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: "3.5px",
              px: "5.25px",
              ...(hasColoredHeader
                ? { color: "#ffffff", borderRadius: "3.5px", fontWeight: 900, fontSize: 12.25 }
                : isBoldThermal
                  ? { fontWeight: 900, fontSize: 14, borderTop: "2px solid #000000", borderBottom: "2px solid #000000" }
                  : { fontWeight: 800, fontSize: 12.25, borderTop: "1px solid #000000", borderBottom: "1px solid #000000" }),
            }}
            style={hasColoredHeader ? { backgroundColor: thermalAccentColor } : undefined}
          >
            <span>Total Payable:</span>
            <span>₹{formatCurrency(data.totals.grandTotal)}</span>
          </Box>
        </Box>

        {/* Amount in words */}
        {footer.showInWords && (
          <Box sx={{ fontSize: 10, fontStyle: "italic", py: "3.5px", borderBottom: "1px dashed #9ca3af" }}>
            In Words: {data.totals.amountInWords}
          </Box>
        )}

        {/* Payment & Outstanding */}
        {footer.showPaymentDetails && (
          <Box sx={{ fontSize: 10, py: "3.5px", borderBottom: "1px dashed #9ca3af" }}>
            <div>Payment: <b>{data.payment.mode}</b></div>
            {footer.showOutstanding && (
              <div>Current Outstanding: ₹{formatCurrency(data.customer.previousBalance + data.totals.grandTotal)}</div>
            )}
          </Box>
        )}

        {/* Bank & UPI */}
        {footer.showBankDetails && (
          <Box sx={{ fontSize: 9, py: "3.5px", color: "#1f2937" }}>
            <div>Bank: {footer.bankDetails?.bankName}</div>
            <div>A/C: {footer.bankDetails?.accountNo} | IFSC: {footer.bankDetails?.ifsc}</div>
            {footer.bankDetails?.upiId && <div>UPI: {footer.bankDetails?.upiId}</div>}
          </Box>
        )}

        {/* Terms & Footer */}
        {footer.showNotes && (
          <Box sx={{ textAlign: "center", fontWeight: 700, fontSize: 10, mt: "7px", pt: "3.5px", borderTop: "1px dashed #9ca3af" }}>
            {footer.notesText}
          </Box>
        )}
      </Box>
    );
  }

  // A4 / A5 Page Dimensions
  const canvasWidth = isLandscape ? "297mm" : "210mm";
  const canvasMinHeight = isLandscape ? "200mm" : "287mm";

  return (
    <Box
      id="vynerix-printable-invoice"
      sx={{
        position: "relative",
        mx: "auto",
        bgcolor: "#ffffff",
        color: "#111827",
        transition: "all 0.2s",
        userSelect: "none",
        boxShadow: isPrintMode ? "none" : "0 25px 50px -12px rgba(0,0,0,0.25)",
        width: canvasWidth,
        minHeight: canvasMinHeight,
        padding: `${settings.margins?.top || 6}mm ${settings.margins?.right || 8}mm ${settings.margins?.bottom || 6}mm ${settings.margins?.left || 8}mm`,
        fontSize: bodyFontSize,
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Dynamic Watermark */}
      {watermark.enabled && watermark.text && (
        <Box
          sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", overflow: "hidden", zIndex: 0 }}
          style={{ opacity: (watermark.opacity || 12) / 100 }}
        >
          <Box
            sx={{ fontWeight: 900, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", userSelect: "none" }}
            style={{
              fontSize: isLandscape ? "80px" : "64px",
              transform: `rotate(${watermark.angle || -30}deg)`,
              lineHeight: 1.1,
            }}
          >
            {watermark.text}
          </Box>
        </Box>
      )}

      {/* INNER CONTENT WRAPPER */}
      <Box sx={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
        <div>
          {/* ========================================================================= */}
          {/* HEADER SECTION (Template Specific Variations) */}
          {/* ========================================================================= */}

          {/* TEMPLATE 1: GENERAL (Standard GST Tax Invoice with Clean Borders) */}
          {template === "general" && (
            <Box sx={{ border: "1px solid #9ca3af", mb: "7px" }}>
              <Box
                sx={{ py: "3.5px", textAlign: "center", fontWeight: 700, letterSpacing: "0.05em", fontSize: 10.5, textTransform: "uppercase", borderBottom: "1px solid #9ca3af" }}
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                {resolvedDocumentTitle}
                {header.documentSubtitle && (
                  <Box component="span" sx={{ ml: "7px", fontWeight: 400, fontSize: 10, color: "#4b5563" }}>
                    {header.documentSubtitle}
                  </Box>
                )}
              </Box>

              <Box sx={{ p: "10.5px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px" }}>
                {/* Company Block */}
                <Box sx={{ flex: 1 }}>
                  {header.showCompanyName && (
                    <Box
                      component="h1"
                      sx={{ fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.025em", textTransform: "uppercase" }}
                      style={{ fontSize: headerFontSize, color: primaryColor }}
                    >
                      {data.company.name}
                    </Box>
                  )}
                  <Box component="p" sx={{ color: "#374151", fontSize: 10.5, mt: "1.75px", maxWidth: 448, lineHeight: 1.625 }}>
                    {data.company.address}
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: "10.5px", fontSize: 10.5, mt: "3.5px", color: "#1f2937" }}>
                    {header.showMobile && <span><b>Tel:</b> {data.company.phone}</span>}
                    {header.showEmail && <span><b>Email:</b> {data.company.email}</span>}
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: "14px", fontSize: 10.5, mt: "3.5px", fontWeight: 600, color: "#111827" }}>
                    {header.showGstin && <span>GSTIN: {data.company.gstin}</span>}
                    {header.showPan && <span>PAN: {data.company.pan}</span>}
                    {header.showState && <span>State: {data.company.state} (Code: {data.company.stateCode})</span>}
                  </Box>
                </Box>

                {/* Invoice Meta Grid */}
                <Box sx={{ width: 224, border: "1px solid #d1d5db", fontSize: 10.5, borderRadius: "3.5px", overflow: "hidden" }}>
                  <Box sx={{ bgcolor: "#f3f4f6", px: "7px", py: "3.5px", fontWeight: 700, color: "#374151", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #d1d5db" }}>
                    <span>Document Details</span>
                  </Box>
                  <Box sx={{ p: "7px", "& > * + *": { mt: "3.5px" } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>{docNumLabel}</Box>
                      <Box component="span" sx={{ fontWeight: 700, color: "#111827" }}>{data.invoiceNo}</Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>{docDateLabel}</Box>
                      <Box component="span" sx={{ fontWeight: 600, color: "#111827" }}>{data.date}</Box>
                    </Box>
                    {header.showDueDate && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Box component="span" sx={{ color: "#4b5563" }}>Due Date:</Box>
                        <Box component="span" sx={{ fontWeight: 500, color: "#111827" }}>{data.dueDate}</Box>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>Place of Supply:</Box>
                      <Box component="span" sx={{ fontWeight: 500, color: "#111827" }}>{data.placeOfSupply}</Box>
                    </Box>
                    {header.showReverseCharge && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Box component="span" sx={{ color: "#4b5563" }}>Reverse Charge:</Box>
                        <Box component="span" sx={{ fontWeight: 500, color: "#111827" }}>{data.reverseCharge}</Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE 2: GLASS MODERN (Gradient Header Bar & Rounded Aesthetic) */}
          {template === "glass" && (
            <Box sx={{ mb: "10.5px", borderRadius: "7px", overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
              <Box
                sx={{ px: "14px", py: "8.75px", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
              >
                <Box>
                  <Box component="h1" sx={{ fontWeight: 900, letterSpacing: "0.025em" }} style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#eff6ff", opacity: 0.9 }}>{data.company.address}</Box>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Box sx={{ fontSize: 12.25, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", bgcolor: "rgba(255,255,255,0.2)", px: "10.5px", py: "3.5px", borderRadius: "3.5px", backdropFilter: "blur(4px)", display: "inline-block" }}>
                    {resolvedDocumentTitle}
                  </Box>
                  <Box sx={{ fontSize: 10.5, color: "#dbeafe", mt: "3.5px" }}>{docNumLabel.replace(':', '')} #{data.invoiceNo} | {data.date}</Box>
                </Box>
              </Box>
              <Box sx={{ p: "8.75px", bgcolor: "#f9fafb", display: "flex", justifyContent: "space-between", fontSize: 10.5, borderTop: "1px solid #e5e7eb", color: "#374151" }}>
                <Box sx={{ display: "flex", gap: "14px" }}>
                  {header.showMobile && <span><b>Ph:</b> {data.company.phone}</span>}
                  {header.showEmail && <span><b>Email:</b> {data.company.email}</span>}
                  {header.showGstin && <span><b>GSTIN:</b> {data.company.gstin}</span>}
                </Box>
                <Box>
                  <b>Place of Supply:</b> {data.placeOfSupply}
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE 3: GST FOCUS (Tax-centric Top Block) */}
          {template === "gst" && (
            <Box sx={{ border: "2px solid #312e81", mb: "7px" }}>
              <Box sx={{ bgcolor: "#312e81", color: "#ffffff", textAlign: "center", py: "3.5px", fontSize: 12.25, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {resolvedDocumentTitle} {header.documentSubtitle}
              </Box>
              <Box sx={{ p: "10.5px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
                <Box>
                  <Box component="h1" sx={{ fontWeight: 800, color: "#1e1b4b" }} style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </Box>
                  <Box sx={{ fontSize: 10.5, color: "#374151", lineHeight: 1.375 }}>{data.company.address}</Box>
                  <Box sx={{ fontSize: 10.5, mt: "3.5px" }}>
                    <b>GSTIN:</b> {data.company.gstin} | <b>PAN:</b> {data.company.pan}
                  </Box>
                  <Box sx={{ fontSize: 10.5 }}>
                    <b>State:</b> {data.company.state} (Code: {data.company.stateCode})
                  </Box>
                </Box>
                <Box sx={{ fontSize: 10.5, borderLeft: "1px solid #d1d5db", pl: "14px", "& > * + *": { mt: "3.5px" } }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
                    <Box component="span" sx={{ fontWeight: 700, color: "#374151" }}>{docNumLabel}</Box>
                    <Box component="span" sx={{ fontWeight: 900, color: "#312e81" }}>{data.invoiceNo}</Box>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
                    <Box component="span" sx={{ fontWeight: 700, color: "#374151" }}>{docDateLabel}</Box>
                    <span>{data.date}</span>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
                    <Box component="span" sx={{ fontWeight: 700, color: "#374151" }}>Place of Supply:</Box>
                    <span>{data.placeOfSupply}</span>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
                    <Box component="span" sx={{ fontWeight: 700, color: "#374151" }}>Reverse Charge:</Box>
                    <span>{data.reverseCharge}</span>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE 4: CLASSIC COMPACT */}
          {template === "classic" && (
            <Box sx={{ borderBottom: "2px solid #000000", pb: "7px", mb: "7px" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Box component="h1" sx={{ fontWeight: 900, color: "#000000" }} style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#1f2937", lineHeight: 1.25 }}>{data.company.address}</Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#1f2937", mt: "1.75px" }}>
                    Ph: {data.company.phone} | GSTIN: {data.company.gstin}
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Box component="h2" sx={{ fontWeight: 800, fontSize: 12.25, textTransform: "uppercase", color: "#111827", letterSpacing: "0.05em" }}>
                    {resolvedDocumentTitle}
                  </Box>
                  <Box sx={{ fontSize: 10.5, mt: "3.5px" }}><b>{docNumLabel}</b> {data.invoiceNo}</Box>
                  <Box sx={{ fontSize: 10.5 }}><b>{docDateLabel}</b> {data.date}</Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE 5: TALLY GRID STYLE */}
          {template === "tally" && (
            <Box sx={{ border: "2px solid #000000", mb: "7px", color: "#000000" }}>
              <Box sx={{ textAlign: "center", fontWeight: 700, fontSize: 10.5, py: "3.5px", borderBottom: "1px solid #000000", textTransform: "uppercase", letterSpacing: "0.05em", bgcolor: "#f3f4f6" }}>
                {resolvedDocumentTitle}
              </Box>
              <Box sx={{ display: "flex", "& > * + *": { borderLeft: "1px solid #000000" } }}>
                <Box sx={{ p: "7px", flex: 1 }}>
                  <Box component="h1" sx={{ fontWeight: 900, fontSize: 15.75, textTransform: "uppercase", lineHeight: 1 }}>{data.company.name}</Box>
                  <Box component="p" sx={{ fontSize: 10.5, mt: "3.5px" }}>{data.company.address}</Box>
                  <Box component="p" sx={{ fontSize: 10.5, fontWeight: 600, mt: "3.5px" }}>GSTIN/UIN: {data.company.gstin}</Box>
                  <Box component="p" sx={{ fontSize: 10.5 }}>State Name: {data.company.state}, Code: {data.company.stateCode}</Box>
                  <Box component="p" sx={{ fontSize: 10.5 }}>E-Mail: {data.company.email}</Box>
                </Box>
                <Box sx={{ width: 224, fontSize: 10.5 }}>
                  <Box sx={{ p: "3.5px", borderBottom: "1px solid #000000", display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>{docNumLabel}</Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>{data.invoiceNo}</Box>
                  </Box>
                  <Box sx={{ p: "3.5px", borderBottom: "1px solid #000000", display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>{docDateLabel}</Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>{data.date}</Box>
                  </Box>
                  <Box sx={{ p: "3.5px", borderBottom: "1px solid #000000", display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>Place of Supply</Box>
                    <span>{data.placeOfSupply}</span>
                  </Box>
                  <Box sx={{ p: "3.5px", display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>Buyer's Order No.</Box>
                    <span>{data.purchaseOrder.poNumber}</span>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE 6: INDIGO THEME */}
          {template === "indigo" && (
            <Box sx={{ mb: "10.5px", borderTop: "4px solid #4f46e5", bgcolor: "rgba(238,242,255,0.4)", p: "10.5px", borderBottomLeftRadius: "5.25px", borderBottomRightRadius: "5.25px", borderLeft: "1px solid #e0e7ff", borderRight: "1px solid #e0e7ff", borderBottom: "1px solid #e0e7ff" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Box component="span" sx={{ display: "inline-block", px: "7px", py: "1.75px", borderRadius: "3.5px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", bgcolor: "#4f46e5", color: "#ffffff", mb: "3.5px" }}>
                    {resolvedDocumentTitle}
                  </Box>
                  <Box component="h1" sx={{ fontWeight: 900, color: "#1e1b4b" }} style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#4b5563" }}>{data.company.address}</Box>
                  <Box sx={{ fontSize: 10.5, color: "#374151", mt: "3.5px", display: "flex", gap: "10.5px" }}>
                    <span><b>GSTIN:</b> {data.company.gstin}</span>
                    <span><b>Mobile:</b> {data.company.phone}</span>
                  </Box>
                </Box>
                <Box sx={{ bgcolor: "#ffffff", p: "8.75px", borderRadius: "3.5px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", border: "1px solid #e0e7ff", fontSize: 10.5, textAlign: "right", "& > * + *": { mt: "1.75px" } }}>
                  <Box sx={{ color: "#6b7280", fontWeight: 600 }}>{docNumLabel.replace(':', '').toUpperCase()}</Box>
                  <Box sx={{ fontWeight: 800, color: "#4338ca", fontSize: 12.25 }}>{data.invoiceNo}</Box>
                  <Box sx={{ color: "#4b5563", fontSize: 11 }}>{docDateLabel} <b>{data.date}</b></Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE: EMERALD THEME */}
          {template === "emerald" && (
            <Box sx={{ mb: "10.5px", borderTop: "4px solid #059669", bgcolor: "rgba(236,253,245,0.4)", p: "10.5px", borderBottomLeftRadius: "5.25px", borderBottomRightRadius: "5.25px", borderLeft: "1px solid #d1fae5", borderRight: "1px solid #d1fae5", borderBottom: "1px solid #d1fae5" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Box component="span" sx={{ display: "inline-block", px: "7px", py: "1.75px", borderRadius: "3.5px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", bgcolor: "#059669", color: "#ffffff", mb: "3.5px" }}>
                    {resolvedDocumentTitle}
                  </Box>
                  <Box component="h1" sx={{ fontWeight: 900, color: "#022c22" }} style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#4b5563" }}>{data.company.address}</Box>
                  <Box sx={{ fontSize: 10.5, color: "#374151", mt: "3.5px", display: "flex", gap: "10.5px" }}>
                    <span><b>GSTIN:</b> {data.company.gstin}</span>
                    <span><b>Mobile:</b> {data.company.phone}</span>
                  </Box>
                </Box>
                <Box sx={{ bgcolor: "#ffffff", p: "8.75px", borderRadius: "3.5px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", border: "1px solid #d1fae5", fontSize: 10.5, textAlign: "right", "& > * + *": { mt: "1.75px" } }}>
                  <Box sx={{ color: "#6b7280", fontWeight: 600 }}>{docNumLabel.replace(':', '').toUpperCase()}</Box>
                  <Box sx={{ fontWeight: 800, color: "#047857", fontSize: 12.25 }}>{data.invoiceNo}</Box>
                  <Box sx={{ color: "#4b5563", fontSize: 11 }}>{docDateLabel} <b>{data.date}</b></Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE: SUNSET THEME */}
          {template === "sunset" && (
            <Box sx={{ mb: "10.5px", borderTop: "4px solid #ea580c", bgcolor: "rgba(255,247,237,0.4)", p: "10.5px", borderBottomLeftRadius: "5.25px", borderBottomRightRadius: "5.25px", borderLeft: "1px solid #ffedd5", borderRight: "1px solid #ffedd5", borderBottom: "1px solid #ffedd5" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Box component="span" sx={{ display: "inline-block", px: "7px", py: "1.75px", borderRadius: "3.5px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", bgcolor: "#ea580c", color: "#ffffff", mb: "3.5px" }}>
                    {resolvedDocumentTitle}
                  </Box>
                  <Box component="h1" sx={{ fontWeight: 900, color: "#431407" }} style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#4b5563" }}>{data.company.address}</Box>
                  <Box sx={{ fontSize: 10.5, color: "#374151", mt: "3.5px", display: "flex", gap: "10.5px" }}>
                    <span><b>GSTIN:</b> {data.company.gstin}</span>
                    <span><b>Mobile:</b> {data.company.phone}</span>
                  </Box>
                </Box>
                <Box sx={{ bgcolor: "#ffffff", p: "8.75px", borderRadius: "3.5px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", border: "1px solid #ffedd5", fontSize: 10.5, textAlign: "right", "& > * + *": { mt: "1.75px" } }}>
                  <Box sx={{ color: "#6b7280", fontWeight: 600 }}>{docNumLabel.replace(':', '').toUpperCase()}</Box>
                  <Box sx={{ fontWeight: 800, color: "#c2410c", fontSize: 12.25 }}>{data.invoiceNo}</Box>
                  <Box sx={{ color: "#4b5563", fontSize: 11 }}>{docDateLabel} <b>{data.date}</b></Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE 7: LANDSCAPE DUAL-COLUMN (Optimized for Wide Screens) */}
          {template === "landscape_dual" && (
            <Box sx={{ border: "1px solid #047857", mb: "7px" }}>
              <Box sx={{ bgcolor: "#047857", color: "#ffffff", px: "10.5px", py: "3.5px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>
                <span>{data.company.name}</span>
                <span>{resolvedDocumentTitle} - {data.invoiceNo}</span>
                <span>{data.date}</span>
              </Box>
              <Box sx={{ p: "7px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px", fontSize: 10.5, "& > * + *": { borderLeft: "1px solid #d1d5db" } }}>
                <Box sx={{ pr: "7px" }}>
                  <Box sx={{ fontWeight: 700, color: "#065f46", textTransform: "uppercase", fontSize: 10 }}>Seller Details</Box>
                  <Box sx={{ fontWeight: 600, color: "#111827" }}>{data.company.name}</Box>
                  <Box sx={{ fontSize: 11, color: "#4b5563" }}>{data.company.address}</Box>
                  <Box sx={{ fontSize: 11, mt: "1.75px" }}>GSTIN: <b>{data.company.gstin}</b> | State: {data.company.state}</Box>
                </Box>
                <Box sx={{ px: "7px" }}>
                  <Box sx={{ fontWeight: 700, color: "#065f46", textTransform: "uppercase", fontSize: 10 }}>{docPartyLabel}</Box>
                  <Box sx={{ fontWeight: 700, color: "#111827" }}>{data.customer.name}</Box>
                  <Box sx={{ fontSize: 11, color: "#4b5563" }}>{data.customer.billingAddress}</Box>
                  <Box sx={{ fontSize: 11, mt: "1.75px" }}>GSTIN: <b>{data.customer.gstin}</b> | Ph: {data.customer.phone}</Box>
                </Box>
                <Box sx={{ pl: "7px", fontSize: 11, "& > * + *": { mt: "1.75px" } }}>
                  <Box sx={{ fontWeight: 700, color: "#065f46", textTransform: "uppercase", fontSize: 10 }}>Dispatch & PO</Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>Transporter:</Box>
                    <Box component="span" sx={{ fontWeight: 500 }}>{data.transport.transporterName}</Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>LR / Doc No:</Box>
                    <Box component="span" sx={{ fontWeight: 500 }}>{data.transport.lrNumber}</Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>PO Number:</Box>
                    <Box component="span" sx={{ fontWeight: 500 }}>{data.purchaseOrder.poNumber}</Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box component="span" sx={{ color: "#4b5563" }}>E-Way Bill:</Box>
                    <Box component="span" sx={{ fontWeight: 500 }}>{data.ewayBill.ewayBillNo}</Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* TEMPLATE 8: MINIMALIST CLEAN */}
          {template === "minimal" && (
            <Box sx={{ borderBottom: "1px solid #e5e7eb", pb: "10.5px", mb: "10.5px" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <Box>
                  <Box component="h1" sx={{ fontWeight: 700, color: "#111827", letterSpacing: "-0.025em" }} style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#6b7280", maxWidth: 448, mt: "1.75px" }}>{data.company.address}</Box>
                  <Box component="p" sx={{ fontSize: 10.5, color: "#4b5563", mt: "3.5px" }}>
                    GSTIN: {data.company.gstin} &bull; Phone: {data.company.phone}
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Box component="span" sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af", fontWeight: 600, display: "block" }}>
                    {resolvedDocumentTitle}
                  </Box>
                  <Box component="span" sx={{ fontSize: 14, fontWeight: 700, color: "#111827", display: "block", mt: "1.75px" }}>{data.invoiceNo}</Box>
                  <Box component="span" sx={{ fontSize: 10.5, color: "#6b7280", display: "block" }}>{data.date}</Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* ========================================================================= */}
          {/* RECEIPT VOUCHER BODY vs INVOICE / CHALLAN BODY */}
          {/* ========================================================================= */}
          {isReceiptFormat ? (
            <Box sx={{ "& > * + *": { mt: "8.75px" }, my: "7px" }}>
              {/* Receipt Party & Voucher Details */}
              <Box sx={{ border: "1px solid #d1d5db", borderRadius: "3.5px", overflow: "hidden", fontSize: 10.5 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, "& > * + *": { borderLeft: { md: "1px solid #d1d5db" } } }}>
                  {/* Payer Card */}
                  <Box sx={{ p: "10.5px", bgcolor: "rgba(249,250,251,0.6)" }}>
                    <Box sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.025em", fontSize: 10, mb: "5.25px", display: "flex", alignItems: "center", gap: "5.25px" }}>
                      <Box component="span" sx={{ width: 7, height: 7, borderRadius: "9999px", display: "inline-block" }} style={{ backgroundColor: primaryColor }} />
                      {docPartyLabel}
                    </Box>
                    <Box sx={{ fontWeight: 700, color: "#111827", fontSize: 12.25 }}>{receiptData.receivedFrom}</Box>
                    <Box sx={{ color: "#4b5563", mt: "3.5px", lineHeight: 1.375 }}>{receiptData.customerAddress}</Box>
                    <Box sx={{ mt: "7px", display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "3.5px", color: "#1f2937", fontWeight: 500, fontSize: 11 }}>
                      {receiptData.customerPhone && <span><b>Ph:</b> {receiptData.customerPhone}</span>}
                      {receiptData.customerGstin && <span><b>GSTIN:</b> {receiptData.customerGstin}</span>}
                      {receiptData.customerPan && <span><b>PAN:</b> {receiptData.customerPan}</span>}
                    </Box>
                  </Box>

                  {/* Payment Meta */}
                  <Box sx={{ p: "10.5px", "& > * + *": { mt: "5.25px" } }}>
                    <Box sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.025em", fontSize: 10, mb: "3.5px", display: "flex", alignItems: "center", gap: "5.25px" }}>
                      <Box component="span" sx={{ width: 7, height: 7, borderRadius: "9999px", display: "inline-block" }} style={{ backgroundColor: primaryColor }} />
                      Payment Transaction Details
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>Receipt Voucher No:</Box>
                      <Box component="span" sx={{ fontWeight: 700, fontFamily: "monospace", color: "#111827" }}>{receiptData.receiptNo}</Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>Receipt Date:</Box>
                      <Box component="span" sx={{ fontWeight: 600, color: "#111827" }}>{receiptData.date}</Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>Payment Mode:</Box>
                      <Box component="span" sx={{ fontWeight: 700, color: "#4338ca" }}>{receiptData.paymentMode}</Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>Reference / UTR / Cheque:</Box>
                      <Box component="span" sx={{ fontFamily: "monospace", color: "#1f2937", fontWeight: 500 }}>{receiptData.referenceNo}</Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Box component="span" sx={{ color: "#4b5563" }}>Deposited Account:</Box>
                      <Box component="span" sx={{ color: "#1f2937", fontSize: 11, maxWidth: 170, ...truncateSx }}>{receiptData.bankAccount}</Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Amount Received Highlight Banner */}
              <Box
                sx={{
                  p: "12.25px",
                  borderRadius: "7px",
                  color: "#ffffff",
                  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: { md: "center" },
                  justifyContent: "space-between",
                  gap: "10.5px",
                }}
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
              >
                <Box>
                  <Box sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.9, fontWeight: 700 }}>Total Amount Received</Box>
                  <Box sx={{ fontSize: 21, fontWeight: 900, letterSpacing: "-0.025em", mt: "1.75px" }}>
                    ₹{formatCurrency(receiptData.amountReceived)}
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right", maxWidth: { md: 448 } }}>
                  <Box sx={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.85, fontWeight: 600 }}>Amount in Words</Box>
                  <Box sx={{ fontSize: 10.5, fontWeight: 600, fontStyle: "italic", color: "rgba(255,255,255,0.95)", mt: "1.75px", lineHeight: 1.375 }}>
                    {receiptData.amountInWords}
                  </Box>
                </Box>
              </Box>

              {/* Settled Bills / Invoices Allocation Table */}
              <Box sx={{ border: "1px solid #d1d5db", borderRadius: "3.5px", overflow: "hidden" }}>
                <Box sx={{ bgcolor: "#f3f4f6", px: "10.5px", py: "5.25px", fontWeight: 700, fontSize: 10.5, color: "#1f2937", textTransform: "uppercase", letterSpacing: "0.025em", borderBottom: "1px solid #d1d5db", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Bill / Invoice Settlement Allocation</span>
                  <Box component="span" sx={{ fontSize: 10, color: "#6b7280", fontWeight: 400 }}>Details of invoices cleared by this payment</Box>
                </Box>
                <Box component="table" sx={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 10.5 }}>
                  <thead>
                    <Box
                      component="tr"
                      sx={{ fontWeight: 700, borderBottom: "1px solid #d1d5db", userSelect: "none", fontSize: 11 }}
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    >
                      <Box component="th" sx={{ py: "7px", px: "7px", textAlign: "center", borderRight: "1px solid #d1d5db", width: 42 }}>SN</Box>
                      <Box component="th" sx={{ py: "7px", px: "7px", textAlign: "left", borderRight: "1px solid #d1d5db" }}>Invoice / Ref No</Box>
                      <Box component="th" sx={{ py: "7px", px: "7px", textAlign: "center", borderRight: "1px solid #d1d5db" }}>Invoice Date</Box>
                      <Box component="th" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db" }}>Bill Amount (₹)</Box>
                      <Box component="th" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db" }}>Amount Paid (₹)</Box>
                      <Box component="th" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db" }}>Balance (₹)</Box>
                      <Box component="th" sx={{ py: "7px", px: "7px", textAlign: "center" }}>Status</Box>
                    </Box>
                  </thead>
                  <tbody>
                    {receiptData.allocations.map((alloc, idx) => (
                      <Box component="tr" key={idx} sx={{ borderBottom: "1px solid #e5e7eb", bgcolor: idx % 2 === 1 ? "rgba(249,250,251,0.5)" : "#ffffff" }}>
                        <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "center", borderRight: "1px solid #e5e7eb", color: "#6b7280", fontFamily: "monospace", fontSize: 11 }}>{alloc.sn}</Box>
                        <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "left", borderRight: "1px solid #e5e7eb", fontWeight: 700, color: "#1f2937" }}>{alloc.invoiceNo}</Box>
                        <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "center", borderRight: "1px solid #e5e7eb", color: "#4b5563" }}>{alloc.invoiceDate}</Box>
                        <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #e5e7eb", color: "#374151" }}>{formatCurrency(alloc.invoiceAmount)}</Box>
                        <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #e5e7eb", fontWeight: 700, color: "#047857" }}>₹{formatCurrency(alloc.paidAmount)}</Box>
                        <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #e5e7eb", fontWeight: 500, color: "#374151" }}>₹{formatCurrency(alloc.balanceDue)}</Box>
                        <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "center" }}>
                          <Box
                            component="span"
                            sx={{
                              px: "7px",
                              py: "1.75px",
                              borderRadius: "9999px",
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: alloc.balanceDue === 0 ? "#d1fae5" : "#fef3c7",
                              color: alloc.balanceDue === 0 ? "#065f46" : "#92400e",
                            }}
                          >
                            {alloc.status}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </tbody>
                  <tfoot>
                    <Box component="tr" sx={{ bgcolor: "#f3f4f6", fontWeight: 700, borderTop: "2px solid #d1d5db", fontSize: 10.5 }}>
                      <Box component="td" colSpan={3} sx={{ py: "7px", px: "10.5px", textAlign: "left", borderRight: "1px solid #d1d5db" }}>Total Settlement Summary</Box>
                      <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db", fontWeight: 700, color: "#111827" }}>
                        ₹{formatCurrency(receiptData.allocations.reduce((s, a) => s + (a.invoiceAmount || 0), 0))}
                      </Box>
                      <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db", fontWeight: 800, color: "#065f46" }}>
                        ₹{formatCurrency(receiptData.amountReceived)}
                      </Box>
                      <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db", fontWeight: 700, color: "#111827" }}>
                        ₹{formatCurrency(receiptData.allocations.reduce((s, a) => s + (a.balanceDue || 0), 0))}
                      </Box>
                      <Box component="td" sx={{ py: "7px", px: "7px", textAlign: "center", color: "#047857", fontSize: 10, fontWeight: 700 }}>Cleared</Box>
                    </Box>
                  </tfoot>
                </Box>
              </Box>

              {/* Ledger Summary & Narration Box */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "10.5px", fontSize: 10.5 }}>
                {/* Customer Ledger Snapshot */}
                <Box sx={{ border: "1px solid #d1d5db", borderRadius: "3.5px", p: "10.5px", bgcolor: "#ffffff", "& > * + *": { mt: "5.25px" } }}>
                  <Box sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.025em", fontSize: 10, mb: "3.5px" }}>
                    Customer Account Balance Snapshot
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                    <span>Previous Outstanding Balance:</span>
                    <Box component="span" sx={{ fontWeight: 500 }}>₹{formatCurrency(receiptData.previousBalance)}</Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", color: "#047857", fontWeight: 600 }}>
                    <span>Payment Received (Credit):</span>
                    <span>-₹{formatCurrency(receiptData.amountReceived)}</span>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #d1d5db", pt: "3.5px", fontWeight: 700, color: "#111827" }}>
                    <span>Net Closing Balance Outstanding:</span>
                    <Box component="span" sx={{ fontSize: 12.25, color: "#4338ca" }}>₹{formatCurrency(receiptData.currentBalance)}</Box>
                  </Box>
                  <Box sx={{ fontSize: 10, color: "#6b7280", pt: "3.5px", fontStyle: "italic" }}>
                    Note: {receiptData.narration}
                  </Box>
                </Box>

                {/* Bank / Settlement Acknowledgement */}
                <Box sx={{ border: "1px solid #d1d5db", borderRadius: "3.5px", p: "10.5px", bgcolor: "rgba(249,250,251,0.6)", "& > * + *": { mt: "5.25px" } }}>
                  <Box sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.025em", fontSize: 10, mb: "3.5px" }}>
                    Payment Acknowledgement
                  </Box>
                  <Box component="p" sx={{ fontSize: 11, color: "#4b5563", lineHeight: 1.625 }}>
                    Received with thanks from <b>{receiptData.receivedFrom}</b> sum of <b>₹{formatCurrency(receiptData.amountReceived)}</b> via <b>{receiptData.paymentMode}</b> ({receiptData.referenceNo}).
                  </Box>
                  {footer.showBankDetails && (
                    <Box sx={{ fontSize: 10, color: "#4b5563", borderTop: "1px solid #e5e7eb", pt: "3.5px" }}>
                      <div><b>Deposited in:</b> {footer.bankDetails?.bankName} (A/C: {footer.bankDetails?.accountNo})</div>
                      {footer.bankDetails?.upiId && <div><b>UPI ID:</b> {footer.bankDetails?.upiId}</div>}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          ) : (
            <>
              {/* CUSTOMER & DISPATCH BLOCK (For templates other than Landscape Dual) */}
              {template !== "landscape_dual" && (
                <Box sx={{ border: "1px solid #d1d5db", mb: "7px", fontSize: 10.5, borderRadius: "3.5px", overflow: "hidden" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, "& > * + *": { borderLeft: { md: "1px solid #d1d5db" } } }}>
                    {/* Bill To */}
                    <Box sx={{ p: "8.75px", bgcolor: "rgba(249,250,251,0.5)" }}>
                      <Box sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.025em", fontSize: 10, mb: "3.5px", display: "flex", alignItems: "center", gap: "5.25px" }}>
                        <Box
                          component="span"
                          sx={{ width: 7, height: 7, borderRadius: "9999px", display: "inline-block" }}
                          style={{ backgroundColor: primaryColor }}
                        />
                        {docPartyLabel}
                      </Box>
                      <Box sx={{ fontWeight: 700, color: "#111827", fontSize: 12.25 }}>{data.customer.name}</Box>
                      <Box sx={{ color: "#4b5563", mt: "1.75px", lineHeight: 1.375 }}>{data.customer.billingAddress}</Box>
                      <Box sx={{ mt: "3.5px", display: "flex", flexWrap: "wrap", columnGap: "10.5px", color: "#1f2937", fontWeight: 500 }}>
                        <span>Ph: {data.customer.phone}</span>
                        <span>GSTIN: {data.customer.gstin}</span>
                        <span>State: {data.customer.state} ({data.customer.stateCode})</span>
                      </Box>
                    </Box>

                    {/* Ship To or Transport Details */}
                    <Box sx={{ p: "8.75px" }}>
                      {header.showShipTo ? (
                        <>
                          <Box sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.025em", fontSize: 10, mb: "3.5px" }}>
                            Details of Consignee (Shipped To)
                          </Box>
                          <Box sx={{ fontWeight: 600, color: "#1f2937" }}>{data.customer.name}</Box>
                          <Box sx={{ color: "#4b5563", mt: "1.75px", lineHeight: 1.375 }}>{data.customer.shippingAddress}</Box>
                        </>
                      ) : (
                        <Box sx={{ "& > * + *": { mt: "3.5px" } }}>
                          <Box sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.025em", fontSize: 10, mb: "3.5px" }}>
                            Transport & Order Details
                          </Box>
                          {header.showTransport && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Box component="span" sx={{ color: "#4b5563" }}>Transporter:</Box>
                              <Box component="span" sx={{ fontWeight: 500 }}>{data.transport.transporterName}</Box>
                            </Box>
                          )}
                          {header.showPo && (
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Box component="span" sx={{ color: "#4b5563" }}>PO Number:</Box>
                              <Box component="span" sx={{ fontWeight: 500 }}>{data.purchaseOrder.poNumber}</Box>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Supplemental Transport row */}
                      {(header.showTransport || header.showPo || header.showEway) && (
                        <Box sx={{ mt: "5.25px", pt: "5.25px", borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "3.5px", fontSize: 10, color: "#4b5563" }}>
                          {header.showTransport && <div>LR No: <b>{data.transport.lrNumber}</b></div>}
                          {header.showPo && <div>PO Date: <b>{data.purchaseOrder.poDate}</b></div>}
                          {header.showEway && <div>E-Way: <b>{data.ewayBill.ewayBillNo}</b></div>}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ITEMS TABLE */}
              <Box sx={{ overflowX: "auto", mb: "7px", border: "1px solid #9ca3af", borderRadius: "1.75px" }}>
                <Box component="table" sx={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 10.5 }}>
                  <thead>
                    <Box
                      component="tr"
                      sx={{ fontWeight: 700, color: "#1f2937", borderBottom: "1px solid #9ca3af", userSelect: "none" }}
                      style={{
                        backgroundColor: template === "glass" ? `${primaryColor}15` : template === "tally" ? "#e5e7eb" : `${primaryColor}18`,
                        color: template === "tally" ? "#000" : primaryColor,
                      }}
                    >
                      {activeCols.map((col) => {
                        const textAlign =
                          col.id === "sn"
                            ? "center"
                            : col.id === "item_name"
                            ? "left"
                            : ["qty", "unit", "discount", "gst_rate"].includes(col.id)
                            ? "center"
                            : "right";

                        return (
                          <Box
                            component="th"
                            key={col.id}
                            sx={{ py: "5.25px", px: "7px", borderRight: "1px solid #d1d5db", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10, textAlign }}
                            style={{ minWidth: col.minWidth }}
                          >
                            {col.label}
                          </Box>
                        );
                      })}
                    </Box>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => {
                      return (
                        <Box
                          component="tr"
                          key={item.sn}
                          sx={{ borderBottom: "1px solid #d1d5db", bgcolor: idx % 2 === 1 ? "rgba(249,250,251,0.6)" : "#ffffff" }}
                        >
                          {activeCols.map((col) => {
                            let content = null;
                            let cellSx = { textAlign: "right" };

                            switch (col.id) {
                              case "sn":
                                content = item.sn;
                                cellSx = { textAlign: "center", fontWeight: 600, color: "#4b5563" };
                                break;
                              case "item_name":
                                content = (
                                  <div>
                                    <Box component="span" sx={{ fontWeight: 600, color: "#111827" }}>{item.name}</Box>
                                    {item.code && (
                                      <Box component="span" sx={{ display: "block", fontSize: 10, color: "#6b7280" }}>
                                        Code: {item.code} {item.batchNo ? `| Batch: ${item.batchNo}` : ""}
                                      </Box>
                                    )}
                                  </div>
                                );
                                cellSx = { textAlign: "left" };
                                break;
                              case "item_code":
                                content = item.code;
                                cellSx = { textAlign: "left", fontFamily: "monospace", fontSize: 10 };
                                break;
                              case "batch_no":
                                content = item.batchNo;
                                cellSx = { textAlign: "center", fontFamily: "monospace", fontSize: 10 };
                                break;
                              case "exp_date":
                                content = item.expDate;
                                cellSx = { textAlign: "center", fontSize: 10 };
                                break;
                              case "hsn_sac":
                                content = item.hsn;
                                cellSx = { textAlign: "center", fontFamily: "monospace", fontSize: 10 };
                                break;
                              case "mrp":
                                content = formatCurrency(item.mrp);
                                break;
                              case "qty":
                                content = item.qty;
                                cellSx = { textAlign: "center", fontWeight: 700 };
                                break;
                              case "unit":
                                content = item.unit;
                                cellSx = { textAlign: "center", color: "#4b5563" };
                                break;
                              case "rate":
                                content = formatCurrency(item.rate);
                                break;
                              case "discount":
                                content = item.discountPerc ? `${item.discountPerc}%` : "-";
                                cellSx = { textAlign: "center", color: "#4b5563" };
                                break;
                              case "taxable_amt":
                                content = formatCurrency(item.taxableAmt);
                                cellSx = { textAlign: "right", fontWeight: 500 };
                                break;
                              case "gst_rate":
                                content = `${item.gstRate}%`;
                                cellSx = { textAlign: "center", fontWeight: 500 };
                                break;
                              case "total_amt":
                                content = formatCurrency(item.totalAmt);
                                cellSx = { textAlign: "right", fontWeight: 700, color: "#111827" };
                                break;
                              default:
                                content = "";
                            }

                            return (
                              <Box
                                component="td"
                                key={col.id}
                                sx={{ py: "5.25px", px: "7px", borderRight: "1px solid #d1d5db", ...cellSx }}
                              >
                                {content}
                              </Box>
                            );
                          })}
                        </Box>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <Box component="tr" sx={{ bgcolor: "#f3f4f6", fontWeight: 700, borderTop: "2px solid #9ca3af" }}>
                      {activeCols.map((col, cIdx) => {
                        if (cIdx === 0) {
                          return (
                            <Box component="td" key={col.id} sx={{ py: "5.25px", px: "7px", textAlign: "center", borderRight: "1px solid #d1d5db" }}>
                              Total
                            </Box>
                          );
                        }
                        if (col.id === "qty") {
                          return (
                            <Box component="td" key={col.id} sx={{ py: "5.25px", px: "7px", textAlign: "center", borderRight: "1px solid #d1d5db", fontWeight: 800 }}>
                              {data.totals.totalQty}
                            </Box>
                          );
                        }
                        if (col.id === "taxable_amt") {
                          return (
                            <Box component="td" key={col.id} sx={{ py: "5.25px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db" }}>
                              ₹{formatCurrency(data.totals.taxableAmount)}
                            </Box>
                          );
                        }
                        if (col.id === "total_amt") {
                          return (
                            <Box component="td" key={col.id} sx={{ py: "5.25px", px: "7px", textAlign: "right", borderRight: "1px solid #d1d5db", fontWeight: 800, color: "#111827" }}>
                              ₹{formatCurrency(data.totals.grandTotal)}
                            </Box>
                          );
                        }
                        return (
                          <Box component="td" key={col.id} sx={{ py: "3.5px", px: "7px", borderRight: "1px solid #d1d5db" }} />
                        );
                      })}
                    </Box>
                  </tfoot>
                </Box>
              </Box>

              {/* TAX BREAKDOWN & TOTALS SECTION */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "7px", mb: "7px", alignItems: "flex-start" }}>
                {/* Left: HSN Summary & Amount in Words */}
                <Box sx={{ "& > * + *": { mt: "7px" } }}>
                  {footer.showHsnSummary && (
                    <Box sx={{ border: "1px solid #d1d5db", borderRadius: "3.5px", overflow: "hidden" }}>
                      <Box sx={{ bgcolor: "#f3f4f6", px: "7px", py: "3.5px", fontWeight: 700, fontSize: 10, color: "#374151", textTransform: "uppercase", borderBottom: "1px solid #d1d5db" }}>
                        HSN / SAC Tax Summary
                      </Box>
                      <Box component="table" sx={{ width: "100%", fontSize: 10, textAlign: "center", borderCollapse: "collapse" }}>
                        <thead>
                          <Box component="tr" sx={{ borderBottom: "1px solid #d1d5db", bgcolor: "#f9fafb", color: "#4b5563", fontWeight: 600 }}>
                            <Box component="th" sx={{ py: "3.5px", px: "3.5px", borderRight: "1px solid #d1d5db" }}>HSN</Box>
                            <Box component="th" sx={{ py: "3.5px", px: "3.5px", borderRight: "1px solid #d1d5db", textAlign: "right" }}>Taxable</Box>
                            <Box component="th" sx={{ py: "3.5px", px: "3.5px", borderRight: "1px solid #d1d5db" }}>CGST</Box>
                            <Box component="th" sx={{ py: "3.5px", px: "3.5px", borderRight: "1px solid #d1d5db" }}>SGST</Box>
                            <Box component="th" sx={{ py: "3.5px", px: "3.5px", textAlign: "right" }}>Total Tax</Box>
                          </Box>
                        </thead>
                        <tbody>
                          {data.hsnSummary.map((h, i) => (
                            <Box component="tr" key={i} sx={{ borderBottom: "1px solid #e5e7eb" }}>
                              <Box component="td" sx={{ py: "1.75px", px: "3.5px", borderRight: "1px solid #d1d5db", fontFamily: "monospace" }}>{h.hsn}</Box>
                              <Box component="td" sx={{ py: "1.75px", px: "3.5px", borderRight: "1px solid #d1d5db", textAlign: "right" }}>₹{formatCurrency(h.taxableAmt)}</Box>
                              <Box component="td" sx={{ py: "1.75px", px: "3.5px", borderRight: "1px solid #d1d5db" }}>₹{formatCurrency(h.cgstAmt)}</Box>
                              <Box component="td" sx={{ py: "1.75px", px: "3.5px", borderRight: "1px solid #d1d5db" }}>₹{formatCurrency(h.sgstAmt)}</Box>
                              <Box component="td" sx={{ py: "1.75px", px: "3.5px", textAlign: "right", fontWeight: 500 }}>₹{formatCurrency(h.totalTax)}</Box>
                            </Box>
                          ))}
                        </tbody>
                      </Box>
                    </Box>
                  )}

                  {/* Amount in Words */}
                  {footer.showInWords && (
                    <Box sx={{ p: "7px", bgcolor: "#f9fafb", border: "1px solid #d1d5db", borderRadius: "3.5px", fontSize: 10.5, lineHeight: 1.25 }}>
                      <Box component="span" sx={{ color: "#6b7280", fontWeight: 600, fontSize: 10, display: "block", textTransform: "uppercase" }}>Invoice Amount in Words:</Box>
                      <Box component="span" sx={{ fontWeight: 700, color: "#111827", fontStyle: "italic" }}>{data.totals.amountInWords}</Box>
                    </Box>
                  )}

                  {/* Bank Details & UPI QR */}
                  {footer.showBankDetails && (
                    <Box sx={{ p: "7px", border: "1px solid #d1d5db", borderRadius: "3.5px", bgcolor: "#ffffff", fontSize: 10.5 }}>
                      <Box sx={{ fontWeight: 700, fontSize: 10, color: "#374151", textTransform: "uppercase", mb: "3.5px" }}>
                        Company Bank Account Details
                      </Box>
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: "7px", rowGap: "1.75px", fontSize: 11, color: "#1f2937" }}>
                        <div><b>Bank:</b> {footer.bankDetails?.bankName}</div>
                        <div><b>A/C No:</b> {footer.bankDetails?.accountNo}</div>
                        <div><b>IFSC:</b> {footer.bankDetails?.ifsc}</div>
                        <div><b>Branch:</b> {footer.bankDetails?.branch}</div>
                        {footer.bankDetails?.upiId && (
                          <Box sx={{ gridColumn: "span 2 / span 2", color: "#4338ca", fontWeight: 600, mt: "1.75px" }}>
                            UPI ID: {footer.bankDetails?.upiId}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Right: Calculations & Grand Total Box */}
                <Box sx={{ border: "1px solid #9ca3af", borderRadius: "3.5px", overflow: "hidden" }}>
                  <Box sx={{ bgcolor: "#f3f4f6", px: "10.5px", py: "3.5px", fontWeight: 700, fontSize: 10.5, color: "#374151", textTransform: "uppercase", borderBottom: "1px solid #d1d5db" }}>
                    Payment & Taxes Summary
                  </Box>
                  <Box sx={{ p: "7px", "& > * + *": { mt: "3.5px" }, fontSize: 10.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#374151" }}>
                      <span>Sub Total (Gross):</span>
                      <Box component="span" sx={{ fontWeight: 500 }}>₹{formatCurrency(data.totals.subTotal)}</Box>
                    </Box>
                    {data.totals.totalDiscount > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", color: "#047857", fontWeight: 500 }}>
                        <span>Total Discount:</span>
                        <span>-₹{formatCurrency(data.totals.totalDiscount)}</span>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#1f2937", borderTop: "1px solid #e5e7eb", pt: "3.5px", fontWeight: 600 }}>
                      <span>Taxable Value:</span>
                      <span>₹{formatCurrency(data.totals.taxableAmount)}</span>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                      <span>Central GST (CGST):</span>
                      <span>+₹{formatCurrency(data.totals.totalCgst)}</span>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                      <span>State GST (SGST):</span>
                      <span>+₹{formatCurrency(data.totals.totalSgst)}</span>
                    </Box>
                    {data.totals.roundOff !== 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", color: "#6b7280", fontSize: 11 }}>
                        <span>Round Off:</span>
                        <span>₹{formatCurrency(data.totals.roundOff)}</span>
                      </Box>
                    )}

                    {/* Grand Total Bar */}
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: "7px", px: "10.5px", mt: "5.25px", borderRadius: "3.5px", fontWeight: 900, fontSize: 12.25, color: "#ffffff" }}
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Box component="span" sx={{ textTransform: "uppercase", letterSpacing: "0.025em" }}>Grand Total:</Box>
                      <Box component="span" sx={{ fontSize: 14 }}>₹{formatCurrency(data.totals.grandTotal)}</Box>
                    </Box>

                    {/* Savings highlight */}
                    {footer.showSavings && data.totals.totalSavings > 0 && (
                      <Box sx={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#047857", py: "3.5px", bgcolor: "#ecfdf5", borderRadius: "3.5px", border: "1px solid #d1fae5" }}>
                        🎉 You Saved ₹{formatCurrency(data.totals.totalSavings)} on this purchase!
                      </Box>
                    )}

                    {/* Customer Outstanding */}
                    {footer.showOutstanding && (
                      <Box sx={{ pt: "5.25px", borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#374151", display: "flex", justifyContent: "space-between" }}>
                        <span>
                          Total Balance (
                          {footer.outstandingTiming === "after" ? "After this bill" : "Before bill"}):
                        </span>
                        <Box component="span" sx={{ fontWeight: 700, color: "#111827" }}>
                          ₹{formatCurrency(data.customer.previousBalance + (footer.outstandingTiming === "after" ? data.totals.grandTotal : 0))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER: TERMS & SIGNATURES */}
        {/* ========================================================================= */}
        <Box sx={{ borderTop: "2px solid #9ca3af", pt: "7px", mt: "7px" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", alignItems: "flex-end" }}>
            {/* Terms & Conditions */}
            <Box>
              {footer.showTerms && (
                <Box>
                  <Box sx={{ fontWeight: 700, fontSize: 10, color: "#374151", textTransform: "uppercase", mb: "1.75px" }}>
                    {isReceiptFormat ? "Receipt Terms & Notes:" : "Terms & Conditions:"}
                  </Box>
                  <Box component="p" sx={{ fontSize: 10, color: "#4b5563", whiteSpace: "pre-line", lineHeight: 1.25 }}>
                    {isReceiptFormat
                      ? "1. Cheque / Demand Draft payments are subject to bank realization.\n2. Official receipt valid only with authorized firm signature & stamp.\n3. Keep this receipt safe for future account settlement reference."
                      : footer.termsText}
                  </Box>
                </Box>
              )}
              {footer.showNotes && (
                <Box sx={{ mt: "3.5px", fontSize: 10, color: "#4b5563", fontWeight: 600, fontStyle: "italic" }}>
                  Note: {isReceiptFormat ? "Thank you for your timely payment!" : footer.notesText}
                </Box>
              )}
            </Box>

            {/* Authorized Signatory Block */}
            <Box sx={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-end" }}>
              {footer.showSignatory && (
                <Box sx={{ textAlign: "center", width: 182 }}>
                  <Box sx={{ fontWeight: 700, fontSize: 10.5, color: "#1f2937" }}>
                    {footer.signatoryFirm || `For ${data.company.name}`}
                  </Box>
                  <Box sx={{ height: 42, display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db", fontStyle: "italic", fontSize: 10 }}>
                    [Authorized Signatory & Seal]
                  </Box>
                  <Box sx={{ borderTop: "1px solid #9ca3af", pt: "3.5px", fontSize: 10, fontWeight: 600, color: "#374151" }}>
                    Authorized Signatory
                  </Box>
                </Box>
              )}
              {footer.showCustomerSign && (
                <Box sx={{ textAlign: "left", width: "100%", mt: "7px", fontSize: 10, color: "#6b7280" }}>
                  {isReceiptFormat ? "Receiver / Payer Signature: _______________________" : "Customer Signature: _______________________"}
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: "center", fontSize: 9, color: "#9ca3af", mt: "7px", borderTop: "1px solid #e5e7eb", pt: "3.5px" }}>
            {isReceiptFormat
              ? "This is a computer generated official payment receipt voucher and requires no physical seal where authorized digitally."
              : "This is a computer generated invoice and requires no physical signature under GST regulations."}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
