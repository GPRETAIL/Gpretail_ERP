import React from "react";

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
      <div
        className="mx-auto bg-white text-black font-mono select-none relative"
        style={{
          width: thermalWidth,
          minHeight: "140mm",
          padding: "5mm",
          fontSize: isBoldThermal ? "11.5px" : "11px",
          lineHeight: "1.35",
          boxShadow: isPrintMode ? "none" : "0 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        {/* Thermal Header */}
        <div
          className={`text-center pb-2 ${
            hasColoredHeader
              ? "p-2 text-white rounded mb-2"
              : isTallyThermal
              ? "border-2 border-black p-1.5 mb-2"
              : isBoldThermal
              ? "border-b-2 border-black"
              : "border-b border-dashed border-gray-400"
          }`}
          style={hasColoredHeader ? { backgroundColor: thermalAccentColor } : {}}
        >
          <div className={`text-xs uppercase tracking-wider ${isBoldThermal ? "font-black text-sm" : "font-bold"}`}>
            {header.documentTitle || "TAX INVOICE"}
          </div>
          {header.showCompanyName && (
            <div className={`text-base mt-0.5 ${isBoldThermal ? "font-black text-lg" : "font-extrabold"}`}>
              {data.company.name}
            </div>
          )}
          <div className={`text-[10px] mt-0.5 leading-tight ${hasColoredHeader ? "text-white/90" : "text-gray-700"}`}>
            {data.company.address}
          </div>
          <div className="text-[10px] mt-0.5">
            {header.showMobile && <span>Tel: {data.company.phone}</span>}
            {header.showEmail && <span className="block">Email: {data.company.email}</span>}
          </div>
          {header.showGstin && (
            <div className="text-[10px] font-semibold mt-0.5">GSTIN: {data.company.gstin}</div>
          )}
        </div>

        {/* Invoice Meta */}
        <div
          className={`py-2 text-[10px] space-y-0.5 ${
            isTallyThermal
              ? "border border-black p-1 mb-2"
              : isBoldThermal
              ? "border-b-2 border-black font-semibold"
              : "border-b border-dashed border-gray-400"
          }`}
        >
          <div className="flex justify-between">
            <span>Bill No: <b className="font-mono">{data.invoiceNo}</b></span>
            <span>Date: {data.date}</span>
          </div>
          <div className="flex justify-between">
            <span>Cust: <b>{data.customer.name}</b></span>
            <span>Ph: {data.customer.phone}</span>
          </div>
        </div>

        {/* Thermal Items Table */}
        <table
          className={`w-full text-left my-2 border-collapse text-[10px] ${
            isTallyThermal ? "border border-black" : ""
          }`}
        >
          <thead>
            <tr
              className={`border-b font-bold ${
                isTallyThermal
                  ? "bg-gray-200 border-black"
                  : isBoldThermal
                  ? "border-b-2 border-black uppercase text-[11px]"
                  : "border-black"
              }`}
            >
              <th className={`py-1 ${isTallyThermal ? "border-r border-black px-1" : ""}`}>Item</th>
              <th className={`py-1 text-center ${isTallyThermal ? "border-r border-black" : ""}`}>Qty</th>
              <th className={`py-1 text-right ${isTallyThermal ? "border-r border-black px-1" : ""}`}>Rate</th>
              <th className={`py-1 text-right ${isTallyThermal ? "px-1" : ""}`}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr
                key={idx}
                className={
                  isTallyThermal
                    ? "border-b border-black"
                    : isBoldThermal
                    ? "border-b border-gray-300 font-medium"
                    : "border-b border-gray-200"
                }
              >
                <td className={`py-1 pr-1 ${isTallyThermal ? "border-r border-black px-1" : ""}`}>
                  <div className="font-medium truncate max-w-[110px]">{item.name}</div>
                  {item.hsn && <div className="text-[9px] text-gray-500">HSN: {item.hsn}</div>}
                </td>
                <td className={`py-1 text-center whitespace-nowrap ${isTallyThermal ? "border-r border-black" : ""}`}>
                  {item.qty} {item.unit}
                </td>
                <td className={`py-1 text-right whitespace-nowrap ${isTallyThermal ? "border-r border-black px-1" : ""}`}>
                  {item.rate.toFixed(2)}
                </td>
                <td className={`py-1 text-right font-semibold whitespace-nowrap ${isTallyThermal ? "px-1" : ""}`}>
                  {item.totalAmt.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Thermal Totals */}
        <div
          className={`pt-1 text-[11px] space-y-1 ${
            isTallyThermal
              ? "border border-black p-1.5 mb-2"
              : isBoldThermal
              ? "border-t-2 border-black font-semibold"
              : "border-t border-dashed border-black"
          }`}
        >
          <div className="flex justify-between">
            <span>Total Qty:</span>
            <span className="font-bold">{data.totals.totalQty}</span>
          </div>
          <div className="flex justify-between">
            <span>Sub Total:</span>
            <span>₹{formatCurrency(data.totals.subTotal)}</span>
          </div>
          {data.totals.totalDiscount > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Discount:</span>
              <span>-₹{formatCurrency(data.totals.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Taxable Value:</span>
            <span>₹{formatCurrency(data.totals.taxableAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST:</span>
            <span>₹{formatCurrency(data.totals.totalCgst)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST:</span>
            <span>₹{formatCurrency(data.totals.totalSgst)}</span>
          </div>
          {data.totals.roundOff !== 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Round Off:</span>
              <span>₹{formatCurrency(data.totals.roundOff)}</span>
            </div>
          )}
          <div
            className={`flex justify-between py-1 px-1.5 ${
              hasColoredHeader
                ? "text-white rounded font-black text-sm"
                : isBoldThermal
                ? "font-black text-base border-t-2 border-b-2 border-black"
                : "font-extrabold text-sm border-t border-b border-black"
            }`}
            style={hasColoredHeader ? { backgroundColor: thermalAccentColor } : {}}
          >
            <span>Total Payable:</span>
            <span>₹{formatCurrency(data.totals.grandTotal)}</span>
          </div>
        </div>

        {/* Amount in words */}
        {footer.showInWords && (
          <div className="text-[10px] italic py-1 border-b border-dashed border-gray-400">
            In Words: {data.totals.amountInWords}
          </div>
        )}

        {/* Payment & Outstanding */}
        {footer.showPaymentDetails && (
          <div className="text-[10px] py-1 border-b border-dashed border-gray-400">
            <div>Payment: <b>{data.payment.mode}</b></div>
            {footer.showOutstanding && (
              <div>Current Outstanding: ₹{formatCurrency(data.customer.previousBalance + data.totals.grandTotal)}</div>
            )}
          </div>
        )}

        {/* Bank & UPI */}
        {footer.showBankDetails && (
          <div className="text-[9px] py-1 text-gray-800">
            <div>Bank: {footer.bankDetails?.bankName}</div>
            <div>A/C: {footer.bankDetails?.accountNo} | IFSC: {footer.bankDetails?.ifsc}</div>
            {footer.bankDetails?.upiId && <div>UPI: {footer.bankDetails?.upiId}</div>}
          </div>
        )}

        {/* Terms & Footer */}
        {footer.showNotes && (
          <div className="text-center font-bold text-[10px] mt-2 pt-1 border-t border-dashed border-gray-400">
            {footer.notesText}
          </div>
        )}
      </div>
    );
  }

  // A4 / A5 Page Dimensions
  const canvasWidth = isLandscape ? "297mm" : "210mm";
  const canvasMinHeight = isLandscape ? "200mm" : "287mm";

  return (
    <div
      id="vynerix-printable-invoice"
      className={`relative mx-auto bg-white text-gray-900 transition-all duration-200 select-none ${
        isPrintMode ? "p-0 shadow-none" : "shadow-2xl"
      }`}
      style={{
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
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0"
          style={{ opacity: (watermark.opacity || 12) / 100 }}
        >
          <div
            className="font-black text-gray-400 uppercase tracking-widest text-center select-none"
            style={{
              fontSize: isLandscape ? "80px" : "64px",
              transform: `rotate(${watermark.angle || -30}deg)`,
              lineHeight: 1.1,
            }}
          >
            {watermark.text}
          </div>
        </div>
      )}

      {/* INNER CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          {/* ========================================================================= */}
          {/* HEADER SECTION (Template Specific Variations) */}
          {/* ========================================================================= */}

          {/* TEMPLATE 1: GENERAL (Standard GST Tax Invoice with Clean Borders) */}
          {template === "general" && (
            <div className="border border-gray-400 mb-2">
              <div
                className="py-1 text-center font-bold tracking-wider text-xs uppercase border-b border-gray-400"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                {resolvedDocumentTitle}
                {header.documentSubtitle && (
                  <span className="ml-2 font-normal text-[10px] text-gray-600">
                    {header.documentSubtitle}
                  </span>
                )}
              </div>

              <div className="p-3 flex justify-between items-start gap-4">
                {/* Company Block */}
                <div className="flex-1">
                  {header.showCompanyName && (
                    <h1
                      className="font-black leading-tight tracking-tight uppercase"
                      style={{ fontSize: headerFontSize, color: primaryColor }}
                    >
                      {data.company.name}
                    </h1>
                  )}
                  <p className="text-gray-700 text-xs mt-0.5 max-w-md leading-relaxed">
                    {data.company.address}
                  </p>
                  <div className="flex flex-wrap gap-x-3 text-xs mt-1 text-gray-800">
                    {header.showMobile && <span><b>Tel:</b> {data.company.phone}</span>}
                    {header.showEmail && <span><b>Email:</b> {data.company.email}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 text-xs mt-1 font-semibold text-gray-900">
                    {header.showGstin && <span>GSTIN: {data.company.gstin}</span>}
                    {header.showPan && <span>PAN: {data.company.pan}</span>}
                    {header.showState && <span>State: {data.company.state} (Code: {data.company.stateCode})</span>}
                  </div>
                </div>

                {/* Invoice Meta Grid */}
                <div className="w-64 border border-gray-300 text-xs rounded overflow-hidden">
                  <div className="bg-gray-100 px-2 py-1 font-bold text-gray-700 flex justify-between border-b border-gray-300">
                    <span>Document Details</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{docNumLabel}</span>
                      <span className="font-bold text-gray-900">{data.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{docDateLabel}</span>
                      <span className="font-semibold text-gray-900">{data.date}</span>
                    </div>
                    {header.showDueDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="font-medium text-gray-900">{data.dueDate}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Place of Supply:</span>
                      <span className="font-medium text-gray-900">{data.placeOfSupply}</span>
                    </div>
                    {header.showReverseCharge && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reverse Charge:</span>
                        <span className="font-medium text-gray-900">{data.reverseCharge}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 2: GLASS MODERN (Gradient Header Bar & Rounded Aesthetic) */}
          {template === "glass" && (
            <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 shadow-xs">
              <div
                className="px-4 py-2.5 text-white flex justify-between items-center"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                }}
              >
                <div>
                  <h1 className="font-black tracking-wide" style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </h1>
                  <p className="text-xs text-blue-50 opacity-90">{data.company.address}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold tracking-wider uppercase bg-white/20 px-3 py-1 rounded backdrop-blur-xs inline-block">
                    {resolvedDocumentTitle}
                  </div>
                  <div className="text-xs text-blue-100 mt-1">{docNumLabel.replace(':', '')} #{data.invoiceNo} | {data.date}</div>
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 flex justify-between text-xs border-t border-gray-200 text-gray-700">
                <div className="flex gap-4">
                  {header.showMobile && <span><b>Ph:</b> {data.company.phone}</span>}
                  {header.showEmail && <span><b>Email:</b> {data.company.email}</span>}
                  {header.showGstin && <span><b>GSTIN:</b> {data.company.gstin}</span>}
                </div>
                <div>
                  <b>Place of Supply:</b> {data.placeOfSupply}
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 3: GST FOCUS (Tax-centric Top Block) */}
          {template === "gst" && (
            <div className="border-2 border-indigo-900 mb-2">
              <div className="bg-indigo-900 text-white text-center py-1 text-sm font-extrabold uppercase tracking-wider">
                {resolvedDocumentTitle} {header.documentSubtitle}
              </div>
              <div className="p-3 grid grid-cols-2 gap-4">
                <div>
                  <h1 className="font-extrabold text-indigo-950" style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </h1>
                  <div className="text-xs text-gray-700 leading-snug">{data.company.address}</div>
                  <div className="text-xs mt-1">
                    <b>GSTIN:</b> {data.company.gstin} | <b>PAN:</b> {data.company.pan}
                  </div>
                  <div className="text-xs">
                    <b>State:</b> {data.company.state} (Code: {data.company.stateCode})
                  </div>
                </div>
                <div className="text-xs border-l border-gray-300 pl-4 space-y-1">
                  <div className="grid grid-cols-2">
                    <span className="font-bold text-gray-700">{docNumLabel}</span>
                    <span className="font-black text-indigo-900">{data.invoiceNo}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="font-bold text-gray-700">{docDateLabel}</span>
                    <span>{data.date}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="font-bold text-gray-700">Place of Supply:</span>
                    <span>{data.placeOfSupply}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="font-bold text-gray-700">Reverse Charge:</span>
                    <span>{data.reverseCharge}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 4: CLASSIC COMPACT */}
          {template === "classic" && (
            <div className="border-b-2 border-black pb-2 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="font-black text-black" style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </h1>
                  <p className="text-xs text-gray-800 leading-tight">{data.company.address}</p>
                  <p className="text-xs text-gray-800 mt-0.5">
                    Ph: {data.company.phone} | GSTIN: {data.company.gstin}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="font-extrabold text-sm uppercase text-gray-900 tracking-wider">
                    {resolvedDocumentTitle}
                  </h2>
                  <div className="text-xs mt-1"><b>{docNumLabel}</b> {data.invoiceNo}</div>
                  <div className="text-xs"><b>{docDateLabel}</b> {data.date}</div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 5: TALLY GRID STYLE */}
          {template === "tally" && (
            <div className="border-2 border-black mb-2 text-black">
              <div className="text-center font-bold text-xs py-1 border-b border-black uppercase tracking-wider bg-gray-100">
                {resolvedDocumentTitle}
              </div>
              <div className="flex divide-x border-black">
                <div className="p-2 flex-1">
                  <h1 className="font-black text-lg uppercase leading-none">{data.company.name}</h1>
                  <p className="text-xs mt-1">{data.company.address}</p>
                  <p className="text-xs font-semibold mt-1">GSTIN/UIN: {data.company.gstin}</p>
                  <p className="text-xs">State Name: {data.company.state}, Code: {data.company.stateCode}</p>
                  <p className="text-xs">E-Mail: {data.company.email}</p>
                </div>
                <div className="w-64 text-xs">
                  <div className="p-1 border-b border-black flex justify-between">
                    <span className="text-gray-600">{docNumLabel}</span>
                    <span className="font-bold">{data.invoiceNo}</span>
                  </div>
                  <div className="p-1 border-b border-black flex justify-between">
                    <span className="text-gray-600">{docDateLabel}</span>
                    <span className="font-bold">{data.date}</span>
                  </div>
                  <div className="p-1 border-b border-black flex justify-between">
                    <span className="text-gray-600">Place of Supply</span>
                    <span>{data.placeOfSupply}</span>
                  </div>
                  <div className="p-1 flex justify-between">
                    <span className="text-gray-600">Buyer's Order No.</span>
                    <span>{data.purchaseOrder.poNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 6: INDIGO THEME */}
          {template === "indigo" && (
            <div className="mb-3 border-t-4 border-indigo-600 bg-indigo-50/40 p-3 rounded-b-md border-x border-b border-indigo-100">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-600 text-white mb-1">
                    {resolvedDocumentTitle}
                  </span>
                  <h1 className="font-black text-indigo-950" style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </h1>
                  <p className="text-xs text-gray-600">{data.company.address}</p>
                  <div className="text-xs text-gray-700 mt-1 flex gap-3">
                    <span><b>GSTIN:</b> {data.company.gstin}</span>
                    <span><b>Mobile:</b> {data.company.phone}</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded shadow-xs border border-indigo-100 text-xs text-right space-y-0.5">
                  <div className="text-gray-500 font-semibold">{docNumLabel.replace(':', '').toUpperCase()}</div>
                  <div className="font-extrabold text-indigo-700 text-sm">{data.invoiceNo}</div>
                  <div className="text-gray-600 text-[11px]">{docDateLabel} <b>{data.date}</b></div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE: EMERALD THEME */}
          {template === "emerald" && (
            <div className="mb-3 border-t-4 border-emerald-600 bg-emerald-50/40 p-3 rounded-b-md border-x border-b border-emerald-100">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-600 text-white mb-1">
                    {resolvedDocumentTitle}
                  </span>
                  <h1 className="font-black text-emerald-950" style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </h1>
                  <p className="text-xs text-gray-600">{data.company.address}</p>
                  <div className="text-xs text-gray-700 mt-1 flex gap-3">
                    <span><b>GSTIN:</b> {data.company.gstin}</span>
                    <span><b>Mobile:</b> {data.company.phone}</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded shadow-xs border border-emerald-100 text-xs text-right space-y-0.5">
                  <div className="text-gray-500 font-semibold">{docNumLabel.replace(':', '').toUpperCase()}</div>
                  <div className="font-extrabold text-emerald-700 text-sm">{data.invoiceNo}</div>
                  <div className="text-gray-600 text-[11px]">{docDateLabel} <b>{data.date}</b></div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE: SUNSET THEME */}
          {template === "sunset" && (
            <div className="mb-3 border-t-4 border-orange-600 bg-orange-50/40 p-3 rounded-b-md border-x border-b border-orange-100">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-600 text-white mb-1">
                    {resolvedDocumentTitle}
                  </span>
                  <h1 className="font-black text-orange-950" style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </h1>
                  <p className="text-xs text-gray-600">{data.company.address}</p>
                  <div className="text-xs text-gray-700 mt-1 flex gap-3">
                    <span><b>GSTIN:</b> {data.company.gstin}</span>
                    <span><b>Mobile:</b> {data.company.phone}</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded shadow-xs border border-orange-100 text-xs text-right space-y-0.5">
                  <div className="text-gray-500 font-semibold">{docNumLabel.replace(':', '').toUpperCase()}</div>
                  <div className="font-extrabold text-orange-700 text-sm">{data.invoiceNo}</div>
                  <div className="text-gray-600 text-[11px]">{docDateLabel} <b>{data.date}</b></div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 7: LANDSCAPE DUAL-COLUMN (Optimized for Wide Screens) */}
          {template === "landscape_dual" && (
            <div className="border border-emerald-700 mb-2">
              <div className="bg-emerald-700 text-white px-3 py-1 flex justify-between items-center text-xs font-bold uppercase">
                <span>{data.company.name}</span>
                <span>{resolvedDocumentTitle} - {data.invoiceNo}</span>
                <span>{data.date}</span>
              </div>
              <div className="p-2 grid grid-cols-3 gap-2 text-xs divide-x divide-gray-300">
                <div className="pr-2">
                  <div className="font-bold text-emerald-800 uppercase text-[10px]">Seller Details</div>
                  <div className="font-semibold text-gray-900">{data.company.name}</div>
                  <div className="text-[11px] text-gray-600">{data.company.address}</div>
                  <div className="text-[11px] mt-0.5">GSTIN: <b>{data.company.gstin}</b> | State: {data.company.state}</div>
                </div>
                <div className="px-2">
                  <div className="font-bold text-emerald-800 uppercase text-[10px]">{docPartyLabel}</div>
                  <div className="font-bold text-gray-900">{data.customer.name}</div>
                  <div className="text-[11px] text-gray-600">{data.customer.billingAddress}</div>
                  <div className="text-[11px] mt-0.5">GSTIN: <b>{data.customer.gstin}</b> | Ph: {data.customer.phone}</div>
                </div>
                <div className="pl-2 space-y-0.5 text-[11px]">
                  <div className="font-bold text-emerald-800 uppercase text-[10px]">Dispatch & PO</div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transporter:</span>
                    <span className="font-medium">{data.transport.transporterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">LR / Doc No:</span>
                    <span className="font-medium">{data.transport.lrNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PO Number:</span>
                    <span className="font-medium">{data.purchaseOrder.poNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">E-Way Bill:</span>
                    <span className="font-medium">{data.ewayBill.ewayBillNo}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 8: MINIMALIST CLEAN */}
          {template === "minimal" && (
            <div className="border-b border-gray-200 pb-3 mb-3">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="font-bold text-gray-900 tracking-tight" style={{ fontSize: headerFontSize }}>
                    {data.company.name}
                  </h1>
                  <p className="text-xs text-gray-500 max-w-md mt-0.5">{data.company.address}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    GSTIN: {data.company.gstin} &bull; Phone: {data.company.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold block">
                    {resolvedDocumentTitle}
                  </span>
                  <span className="text-base font-bold text-gray-900 block mt-0.5">{data.invoiceNo}</span>
                  <span className="text-xs text-gray-500 block">{data.date}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* RECEIPT VOUCHER BODY vs INVOICE / CHALLAN BODY */}
          {/* ========================================================================= */}
          {isReceiptFormat ? (
            <div className="space-y-2.5 my-2">
              {/* Receipt Party & Voucher Details */}
              <div className="border border-gray-300 rounded overflow-hidden text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-300">
                  {/* Payer Card */}
                  <div className="p-3 bg-gray-50/60">
                    <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: primaryColor }} />
                      {docPartyLabel}
                    </div>
                    <div className="font-bold text-gray-900 text-sm">{receiptData.receivedFrom}</div>
                    <div className="text-gray-600 mt-1 leading-snug">{receiptData.customerAddress}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-gray-800 font-medium text-[11px]">
                      {receiptData.customerPhone && <span><b>Ph:</b> {receiptData.customerPhone}</span>}
                      {receiptData.customerGstin && <span><b>GSTIN:</b> {receiptData.customerGstin}</span>}
                      {receiptData.customerPan && <span><b>PAN:</b> {receiptData.customerPan}</span>}
                    </div>
                  </div>

                  {/* Payment Meta */}
                  <div className="p-3 space-y-1.5">
                    <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: primaryColor }} />
                      Payment Transaction Details
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Receipt Voucher No:</span>
                      <span className="font-bold font-mono text-gray-900">{receiptData.receiptNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Receipt Date:</span>
                      <span className="font-semibold text-gray-900">{receiptData.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Mode:</span>
                      <span className="font-bold text-indigo-700">{receiptData.paymentMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference / UTR / Cheque:</span>
                      <span className="font-mono text-gray-800 font-medium">{receiptData.referenceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deposited Account:</span>
                      <span className="text-gray-800 text-[11px] truncate max-w-[170px]">{receiptData.bankAccount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Received Highlight Banner */}
              <div
                className="p-3.5 rounded-lg text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                }}
              >
                <div>
                  <div className="text-[11px] uppercase tracking-widest opacity-90 font-bold">Total Amount Received</div>
                  <div className="text-2xl font-black tracking-tight mt-0.5">
                    ₹{formatCurrency(receiptData.amountReceived)}
                  </div>
                </div>
                <div className="text-right md:max-w-md">
                  <div className="text-[10px] uppercase tracking-wider opacity-85 font-semibold">Amount in Words</div>
                  <div className="text-xs font-semibold italic text-white/95 mt-0.5 leading-snug">
                    {receiptData.amountInWords}
                  </div>
                </div>
              </div>

              {/* Settled Bills / Invoices Allocation Table */}
              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 font-bold text-xs text-gray-800 uppercase tracking-wide border-b border-gray-300 flex justify-between items-center">
                  <span>Bill / Invoice Settlement Allocation</span>
                  <span className="text-[10px] text-gray-500 font-normal">Details of invoices cleared by this payment</span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className="font-bold border-b border-gray-300 select-none text-[11px]"
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    >
                      <th className="py-2 px-2 text-center border-r border-gray-300 w-12">SN</th>
                      <th className="py-2 px-2 text-left border-r border-gray-300">Invoice / Ref No</th>
                      <th className="py-2 px-2 text-center border-r border-gray-300">Invoice Date</th>
                      <th className="py-2 px-2 text-right border-r border-gray-300">Bill Amount (₹)</th>
                      <th className="py-2 px-2 text-right border-r border-gray-300">Amount Paid (₹)</th>
                      <th className="py-2 px-2 text-right border-r border-gray-300">Balance (₹)</th>
                      <th className="py-2 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.allocations.map((alloc, idx) => (
                      <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}>
                        <td className="py-2 px-2 text-center border-r border-gray-200 text-gray-500 font-mono text-[11px]">{alloc.sn}</td>
                        <td className="py-2 px-2 text-left border-r border-gray-200 font-bold text-gray-800">{alloc.invoiceNo}</td>
                        <td className="py-2 px-2 text-center border-r border-gray-200 text-gray-600">{alloc.invoiceDate}</td>
                        <td className="py-2 px-2 text-right border-r border-gray-200 text-gray-700">{formatCurrency(alloc.invoiceAmount)}</td>
                        <td className="py-2 px-2 text-right border-r border-gray-200 font-bold text-emerald-700">₹{formatCurrency(alloc.paidAmount)}</td>
                        <td className="py-2 px-2 text-right border-r border-gray-200 font-medium text-gray-700">₹{formatCurrency(alloc.balanceDue)}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alloc.balanceDue === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {alloc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-300 text-xs">
                      <td colSpan={3} className="py-2 px-3 text-left border-r border-gray-300">Total Settlement Summary</td>
                      <td className="py-2 px-2 text-right border-r border-gray-300 font-bold text-gray-900">
                        ₹{formatCurrency(receiptData.allocations.reduce((s, a) => s + (a.invoiceAmount || 0), 0))}
                      </td>
                      <td className="py-2 px-2 text-right border-r border-gray-300 font-extrabold text-emerald-800">
                        ₹{formatCurrency(receiptData.amountReceived)}
                      </td>
                      <td className="py-2 px-2 text-right border-r border-gray-300 font-bold text-gray-900">
                        ₹{formatCurrency(receiptData.allocations.reduce((s, a) => s + (a.balanceDue || 0), 0))}
                      </td>
                      <td className="py-2 px-2 text-center text-emerald-700 text-[10px] font-bold">Cleared</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Ledger Summary & Narration Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Customer Ledger Snapshot */}
                <div className="border border-gray-300 rounded p-3 bg-white space-y-1.5">
                  <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                    Customer Account Balance Snapshot
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Previous Outstanding Balance:</span>
                    <span className="font-medium">₹{formatCurrency(receiptData.previousBalance)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Payment Received (Credit):</span>
                    <span>-₹{formatCurrency(receiptData.amountReceived)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-1 font-bold text-gray-900">
                    <span>Net Closing Balance Outstanding:</span>
                    <span className="text-sm text-indigo-700">₹{formatCurrency(receiptData.currentBalance)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 pt-1 italic">
                    Note: {receiptData.narration}
                  </div>
                </div>

                {/* Bank / Settlement Acknowledgement */}
                <div className="border border-gray-300 rounded p-3 bg-gray-50/60 space-y-1.5">
                  <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                    Payment Acknowledgement
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Received with thanks from <b>{receiptData.receivedFrom}</b> sum of <b>₹{formatCurrency(receiptData.amountReceived)}</b> via <b>{receiptData.paymentMode}</b> ({receiptData.referenceNo}).
                  </p>
                  {footer.showBankDetails && (
                    <div className="text-[10px] text-gray-600 border-t border-gray-200 pt-1">
                      <div><b>Deposited in:</b> {footer.bankDetails?.bankName} (A/C: {footer.bankDetails?.accountNo})</div>
                      {footer.bankDetails?.upiId && <div><b>UPI ID:</b> {footer.bankDetails?.upiId}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* CUSTOMER & DISPATCH BLOCK (For templates other than Landscape Dual) */}
              {template !== "landscape_dual" && (
                <div className="border border-gray-300 mb-2 text-xs rounded overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-300">
                    {/* Bill To */}
                    <div className="p-2.5 bg-gray-50/50">
                      <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: primaryColor }}
                        />
                        {docPartyLabel}
                      </div>
                      <div className="font-bold text-gray-900 text-sm">{data.customer.name}</div>
                      <div className="text-gray-600 mt-0.5 leading-snug">{data.customer.billingAddress}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-gray-800 font-medium">
                        <span>Ph: {data.customer.phone}</span>
                        <span>GSTIN: {data.customer.gstin}</span>
                        <span>State: {data.customer.state} ({data.customer.stateCode})</span>
                      </div>
                    </div>

                    {/* Ship To or Transport Details */}
                    <div className="p-2.5">
                      {header.showShipTo ? (
                        <>
                          <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                            Details of Consignee (Shipped To)
                          </div>
                          <div className="font-semibold text-gray-800">{data.customer.name}</div>
                          <div className="text-gray-600 mt-0.5 leading-snug">{data.customer.shippingAddress}</div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                            Transport & Order Details
                          </div>
                          {header.showTransport && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Transporter:</span>
                              <span className="font-medium">{data.transport.transporterName}</span>
                            </div>
                          )}
                          {header.showPo && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">PO Number:</span>
                              <span className="font-medium">{data.purchaseOrder.poNumber}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Supplemental Transport row */}
                      {(header.showTransport || header.showPo || header.showEway) && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-200 grid grid-cols-2 gap-1 text-[10px] text-gray-600">
                          {header.showTransport && <div>LR No: <b>{data.transport.lrNumber}</b></div>}
                          {header.showPo && <div>PO Date: <b>{data.purchaseOrder.poDate}</b></div>}
                          {header.showEway && <div>E-Way: <b>{data.ewayBill.ewayBillNo}</b></div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ITEMS TABLE */}
              <div className="overflow-x-auto mb-2 border border-gray-400 rounded-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className="font-bold text-gray-800 border-b border-gray-400 select-none"
                      style={{
                        backgroundColor: template === "glass" ? `${primaryColor}15` : template === "tally" ? "#e5e7eb" : `${primaryColor}18`,
                        color: template === "tally" ? "#000" : primaryColor,
                      }}
                    >
                      {activeCols.map((col) => {
                        const alignClass =
                          col.id === "sn"
                            ? "text-center"
                            : col.id === "item_name"
                            ? "text-left"
                            : ["qty", "unit", "discount", "gst_rate"].includes(col.id)
                            ? "text-center"
                            : "text-right";

                        return (
                          <th
                            key={col.id}
                            className={`py-1.5 px-2 border-r border-gray-300 font-bold uppercase tracking-wider text-[10px] ${alignClass}`}
                            style={{ minWidth: col.minWidth }}
                          >
                            {col.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => {
                      return (
                        <tr
                          key={item.sn}
                          className={`border-b border-gray-300 ${
                            idx % 2 === 1 ? "bg-gray-50/60" : "bg-white"
                          }`}
                        >
                          {activeCols.map((col) => {
                            let content = null;
                            let alignClass = "text-right";

                            switch (col.id) {
                              case "sn":
                                content = item.sn;
                                alignClass = "text-center font-semibold text-gray-600";
                                break;
                              case "item_name":
                                content = (
                                  <div>
                                    <span className="font-semibold text-gray-900">{item.name}</span>
                                    {item.code && (
                                      <span className="block text-[10px] text-gray-500">
                                        Code: {item.code} {item.batchNo ? `| Batch: ${item.batchNo}` : ""}
                                      </span>
                                    )}
                                  </div>
                                );
                                alignClass = "text-left";
                                break;
                              case "item_code":
                                content = item.code;
                                alignClass = "text-left font-mono text-[10px]";
                                break;
                              case "batch_no":
                                content = item.batchNo;
                                alignClass = "text-center font-mono text-[10px]";
                                break;
                              case "exp_date":
                                content = item.expDate;
                                alignClass = "text-center text-[10px]";
                                break;
                              case "hsn_sac":
                                content = item.hsn;
                                alignClass = "text-center font-mono text-[10px]";
                                break;
                              case "mrp":
                                content = formatCurrency(item.mrp);
                                break;
                              case "qty":
                                content = item.qty;
                                alignClass = "text-center font-bold";
                                break;
                              case "unit":
                                content = item.unit;
                                alignClass = "text-center text-gray-600";
                                break;
                              case "rate":
                                content = formatCurrency(item.rate);
                                break;
                              case "discount":
                                content = item.discountPerc ? `${item.discountPerc}%` : "-";
                                alignClass = "text-center text-gray-600";
                                break;
                              case "taxable_amt":
                                content = formatCurrency(item.taxableAmt);
                                alignClass = "text-right font-medium";
                                break;
                              case "gst_rate":
                                content = `${item.gstRate}%`;
                                alignClass = "text-center font-medium";
                                break;
                              case "total_amt":
                                content = formatCurrency(item.totalAmt);
                                alignClass = "text-right font-bold text-gray-900";
                                break;
                              default:
                                content = "";
                            }

                            return (
                              <td
                                key={col.id}
                                className={`py-1.5 px-2 border-r border-gray-300 ${alignClass}`}
                              >
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                      {activeCols.map((col, cIdx) => {
                        if (cIdx === 0) {
                          return (
                            <td key={col.id} className="py-1.5 px-2 text-center border-r border-gray-300">
                              Total
                            </td>
                          );
                        }
                        if (col.id === "qty") {
                          return (
                            <td key={col.id} className="py-1.5 px-2 text-center border-r border-gray-300 font-extrabold">
                              {data.totals.totalQty}
                            </td>
                          );
                        }
                        if (col.id === "taxable_amt") {
                          return (
                            <td key={col.id} className="py-1.5 px-2 text-right border-r border-gray-300">
                              ₹{formatCurrency(data.totals.taxableAmount)}
                            </td>
                          );
                        }
                        if (col.id === "total_amt") {
                          return (
                            <td key={col.id} className="py-1.5 px-2 text-right border-r border-gray-300 font-extrabold text-gray-900">
                              ₹{formatCurrency(data.totals.grandTotal)}
                            </td>
                          );
                        }
                        return (
                          <td key={col.id} className="py-1 px-2 border-r border-gray-300"></td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TAX BREAKDOWN & TOTALS SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 items-start">
                {/* Left: HSN Summary & Amount in Words */}
                <div className="space-y-2">
                  {footer.showHsnSummary && (
                    <div className="border border-gray-300 rounded overflow-hidden">
                      <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] text-gray-700 uppercase border-b border-gray-300">
                        HSN / SAC Tax Summary
                      </div>
                      <table className="w-full text-[10px] text-center border-collapse">
                        <thead>
                          <tr className="border-b border-gray-300 bg-gray-50 text-gray-600 font-semibold">
                            <th className="py-1 px-1 border-r border-gray-300">HSN</th>
                            <th className="py-1 px-1 border-r border-gray-300 text-right">Taxable</th>
                            <th className="py-1 px-1 border-r border-gray-300">CGST</th>
                            <th className="py-1 px-1 border-r border-gray-300">SGST</th>
                            <th className="py-1 px-1 text-right">Total Tax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.hsnSummary.map((h, i) => (
                            <tr key={i} className="border-b border-gray-200">
                              <td className="py-0.5 px-1 border-r border-gray-300 font-mono">{h.hsn}</td>
                              <td className="py-0.5 px-1 border-r border-gray-300 text-right">₹{formatCurrency(h.taxableAmt)}</td>
                              <td className="py-0.5 px-1 border-r border-gray-300">₹{formatCurrency(h.cgstAmt)}</td>
                              <td className="py-0.5 px-1 border-r border-gray-300">₹{formatCurrency(h.sgstAmt)}</td>
                              <td className="py-0.5 px-1 text-right font-medium">₹{formatCurrency(h.totalTax)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Amount in Words */}
                  {footer.showInWords && (
                    <div className="p-2 bg-gray-50 border border-gray-300 rounded text-xs leading-tight">
                      <span className="text-gray-500 font-semibold text-[10px] block uppercase">Invoice Amount in Words:</span>
                      <span className="font-bold text-gray-900 italic">{data.totals.amountInWords}</span>
                    </div>
                  )}

                  {/* Bank Details & UPI QR */}
                  {footer.showBankDetails && (
                    <div className="p-2 border border-gray-300 rounded bg-white text-xs">
                      <div className="font-bold text-[10px] text-gray-700 uppercase mb-1">
                        Company Bank Account Details
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-gray-800">
                        <div><b>Bank:</b> {footer.bankDetails?.bankName}</div>
                        <div><b>A/C No:</b> {footer.bankDetails?.accountNo}</div>
                        <div><b>IFSC:</b> {footer.bankDetails?.ifsc}</div>
                        <div><b>Branch:</b> {footer.bankDetails?.branch}</div>
                        {footer.bankDetails?.upiId && (
                          <div className="col-span-2 text-indigo-700 font-semibold mt-0.5">
                            UPI ID: {footer.bankDetails?.upiId}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Calculations & Grand Total Box */}
                <div className="border border-gray-400 rounded overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 font-bold text-xs text-gray-700 uppercase border-b border-gray-300">
                    Payment & Taxes Summary
                  </div>
                  <div className="p-2 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-700">
                      <span>Sub Total (Gross):</span>
                      <span className="font-medium">₹{formatCurrency(data.totals.subTotal)}</span>
                    </div>
                    {data.totals.totalDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Total Discount:</span>
                        <span>-₹{formatCurrency(data.totals.totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-800 border-t border-gray-200 pt-1 font-semibold">
                      <span>Taxable Value:</span>
                      <span>₹{formatCurrency(data.totals.taxableAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Central GST (CGST):</span>
                      <span>+₹{formatCurrency(data.totals.totalCgst)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>State GST (SGST):</span>
                      <span>+₹{formatCurrency(data.totals.totalSgst)}</span>
                    </div>
                    {data.totals.roundOff !== 0 && (
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>Round Off:</span>
                        <span>₹{formatCurrency(data.totals.roundOff)}</span>
                      </div>
                    )}

                    {/* Grand Total Bar */}
                    <div
                      className="flex justify-between items-center py-2 px-3 mt-1.5 rounded font-black text-sm text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span className="uppercase tracking-wide">Grand Total:</span>
                      <span className="text-base">₹{formatCurrency(data.totals.grandTotal)}</span>
                    </div>

                    {/* Savings highlight */}
                    {footer.showSavings && data.totals.totalSavings > 0 && (
                      <div className="text-center text-[10px] font-bold text-emerald-700 py-1 bg-emerald-50 rounded border border-emerald-200">
                        🎉 You Saved ₹{formatCurrency(data.totals.totalSavings)} on this purchase!
                      </div>
                    )}

                    {/* Customer Outstanding */}
                    {footer.showOutstanding && (
                      <div className="pt-1.5 border-t border-gray-200 text-[11px] text-gray-700 flex justify-between">
                        <span>
                          Total Balance (
                          {footer.outstandingTiming === "after" ? "After this bill" : "Before bill"}):
                        </span>
                        <span className="font-bold text-gray-900">
                          ₹{formatCurrency(data.customer.previousBalance + (footer.outstandingTiming === "after" ? data.totals.grandTotal : 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER: TERMS & SIGNATURES */}
        {/* ========================================================================= */}
        <div className="border-t-2 border-gray-400 pt-2 mt-2">
          <div className="grid grid-cols-2 gap-4 items-end">
            {/* Terms & Conditions */}
            <div>
              {footer.showTerms && (
                <div>
                  <div className="font-bold text-[10px] text-gray-700 uppercase mb-0.5">
                    {isReceiptFormat ? "Receipt Terms & Notes:" : "Terms & Conditions:"}
                  </div>
                  <p className="text-[10px] text-gray-600 whitespace-pre-line leading-tight">
                    {isReceiptFormat
                      ? "1. Cheque / Demand Draft payments are subject to bank realization.\n2. Official receipt valid only with authorized firm signature & stamp.\n3. Keep this receipt safe for future account settlement reference."
                      : footer.termsText}
                  </p>
                </div>
              )}
              {footer.showNotes && (
                <div className="mt-1 text-[10px] text-gray-600 font-semibold italic">
                  Note: {isReceiptFormat ? "Thank you for your timely payment!" : footer.notesText}
                </div>
              )}
            </div>

            {/* Authorized Signatory Block */}
            <div className="text-right flex flex-col justify-end items-end">
              {footer.showSignatory && (
                <div className="text-center w-52">
                  <div className="font-bold text-xs text-gray-800">
                    {footer.signatoryFirm || `For ${data.company.name}`}
                  </div>
                  <div className="h-12 flex items-center justify-center text-gray-300 italic text-[10px]">
                    [Authorized Signatory & Seal]
                  </div>
                  <div className="border-t border-gray-400 pt-1 text-[10px] font-semibold text-gray-700">
                    Authorized Signatory
                  </div>
                </div>
              )}
              {footer.showCustomerSign && (
                <div className="text-left w-full mt-2 text-[10px] text-gray-500">
                  {isReceiptFormat ? "Receiver / Payer Signature: _______________________" : "Customer Signature: _______________________"}
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-[9px] text-gray-400 mt-2 border-t border-gray-200 pt-1">
            {isReceiptFormat
              ? "This is a computer generated official payment receipt voucher and requires no physical seal where authorized digitally."
              : "This is a computer generated invoice and requires no physical signature under GST regulations."}
          </div>
        </div>
      </div>
    </div>
  );
}
