// Default configuration schema, template definitions, and sample data for Receipt & Invoice Designer

export const PDF_FORMAT_OPTIONS = [
  { id: "a4", name: "A4", pageSize: "A4", orientation: "portrait", isThermal: false },
  { id: "a5", name: "A5", pageSize: "A5", orientation: "portrait", isThermal: false },
  { id: "thermal", name: "Thermal Print", pageSize: "3inch", orientation: "portrait", isThermal: true },
  { id: "landscape_a4", name: "Landscape A4", pageSize: "A4", orientation: "landscape", isThermal: false },
  { id: "landscape_a5", name: "Landscape A5", pageSize: "A5", orientation: "landscape", isThermal: false },
  { id: "letter_head", name: "Letter Head", pageSize: "A4", orientation: "portrait", isThermal: false, isLetterHead: true },
  { id: "a4_half", name: "A4 Half", pageSize: "A5", orientation: "landscape", isThermal: false },
];

export const A4_TEMPLATE_TYPES = [
  {
    id: "general",
    name: "General Template",
    badge: "Standard",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    description: "Standard GST tax invoice with clean borders & complete company details",
    previewColor: "#2563eb",
  },
  {
    id: "glass",
    name: "Glass Template",
    badge: "Modern",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    description: "Modern styled format with elegant gradient header & soft border accents",
    previewColor: "#0891b2",
  },
  {
    id: "gst",
    name: "GST Tax Invoice",
    badge: "GST Focus",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    description: "Structured layout emphasizing tax breakdown, HSN code summary & multi-tier tax split",
    previewColor: "#4f46e5",
  },
  {
    id: "classic",
    name: "Classic Template",
    badge: "Classic",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    description: "Traditional compact invoice format optimized for fast printing & paper economy",
    previewColor: "#d97706",
  },
  {
    id: "tally",
    name: "Tally Template",
    badge: "Tally Style",
    badgeColor: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    description: "Tight black grid and bold headings matching Tally ERP printed vouchers",
    previewColor: "#1e293b",
  },
  {
    id: "indigo",
    name: "Indigo Template",
    badge: "Colour",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    description: "Vibrant indigo themed styling with distinctive summary and totals badges",
    previewColor: "#7c3aed",
  },
  {
    id: "emerald",
    name: "Emerald Template",
    badge: "Emerald",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    description: "Professional emerald green theme with accented borders and clean summaries",
    previewColor: "#059669",
  },
  {
    id: "sunset",
    name: "Sunset Template",
    badge: "Sunset",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    description: "Warm sunset orange styled format with bold header highlights",
    previewColor: "#ea580c",
  },
  {
    id: "landscape_dual",
    name: "Landscape Dual-Column",
    badge: "Wide Format",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    description: "Specially engineered for Landscape A4 with split two-column party, transport & wide table",
    previewColor: "#0d9488",
  },
  {
    id: "minimal",
    name: "Minimalist Clean",
    badge: "Minimal",
    badgeColor: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    description: "Clean typography, subtle horizontal dividers without heavy borders",
    previewColor: "#475569",
  },
];

export const THERMAL_TEMPLATE_TYPES = [
  {
    id: "standard_thermal",
    name: "Standard Thermal",
    badge: "Standard",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    description: "Standard clean thermal receipt layout with dash dividers and tax breakdown",
    previewColor: "#2563eb",
  },
  {
    id: "bold_thermal",
    name: "Bold Thermal",
    badge: "High Contrast",
    badgeColor: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    description: "Heavy bold typography with highlighted totals and prominent shop name",
    previewColor: "#0f172a",
  },
  {
    id: "tally_thermal",
    name: "Tally Thermal",
    badge: "Grid Style",
    badgeColor: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
    description: "Structured box border grid formatted specifically for thermal roll paper",
    previewColor: "#18181b",
  },
  {
    id: "indigo_thermal",
    name: "Indigo Thermal",
    badge: "Indigo",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    description: "Vibrant indigo header accents and styled summary lines on thermal slips",
    previewColor: "#4f46e5",
  },
  {
    id: "emerald_thermal",
    name: "Emerald Thermal",
    badge: "Emerald",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    description: "Clean emerald green header banners with elegant summary boxes",
    previewColor: "#059669",
  },
  {
    id: "sunset_thermal",
    name: "Sunset Thermal",
    badge: "Sunset",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    description: "Warm sunset orange accented thermal receipt layout",
    previewColor: "#ea580c",
  },
];

export const INVOICE_TEMPLATES = [...A4_TEMPLATE_TYPES, ...THERMAL_TEMPLATE_TYPES];

export const ACCENT_COLOR_PALETTES = [
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Coral Red", hex: "#dc2626" },
  { name: "Sky Cyan", hex: "#0284c7" },
  { name: "Deep Indigo", hex: "#4f46e5" },
  { name: "Amethyst Purple", hex: "#7c3aed" },
  { name: "Slate Charcoal", hex: "#1e293b" },
];

export const DEFAULT_TABLE_COLUMNS = [
  { id: "sn", label: "SN", enabled: true, minWidth: "35px" },
  { id: "item_name", label: "Item Description", enabled: true, minWidth: "180px" },
  { id: "item_code", label: "Item Code", enabled: true, minWidth: "80px" },
  { id: "batch_no", label: "Batch No", enabled: false, minWidth: "75px" },
  { id: "exp_date", label: "Exp Date", enabled: false, minWidth: "75px" },
  { id: "hsn_sac", label: "HSN/SAC", enabled: true, minWidth: "75px" },
  { id: "mrp", label: "MRP (₹)", enabled: false, minWidth: "70px" },
  { id: "qty", label: "Qty", enabled: true, minWidth: "55px" },
  { id: "unit", label: "Unit", enabled: true, minWidth: "50px" },
  { id: "rate", label: "Rate (₹)", enabled: true, minWidth: "80px" },
  { id: "discount", label: "Disc %", enabled: true, minWidth: "60px" },
  { id: "taxable_amt", label: "Taxable (₹)", enabled: true, minWidth: "85px" },
  { id: "gst_rate", label: "GST %", enabled: true, minWidth: "60px" },
  { id: "total_amt", label: "Amount (₹)", enabled: true, minWidth: "90px" },
];

export const TRANSACTION_TYPES = [
  {
    id: "income",
    name: "Income Transaction",
    badge: "Sales / Tax",
    documentTitle: "TAX INVOICE",
    documentSubtitle: "(ORIGINAL FOR RECIPIENT)",
    docNumberLabel: "Invoice No",
    dateLabel: "Invoice Date",
    partyLabel: "Details of Receiver (Billed To)",
    samplePrefix: "INV-2026-0894",
  },
  {
    id: "estimate",
    name: "Estimate / Quote",
    badge: "Pre-Sales",
    documentTitle: "ESTIMATE / QUOTATION",
    documentSubtitle: "(ESTIMATE / NOT A TAX INVOICE)",
    docNumberLabel: "Estimate No",
    dateLabel: "Estimate Date",
    partyLabel: "Quotation For / Estimate To",
    samplePrefix: "EST-2026-0142",
  },
  {
    id: "delivery_challan",
    name: "Delivery Challan",
    badge: "Dispatch",
    documentTitle: "DELIVERY CHALLAN",
    documentSubtitle: "(GOODS DISPATCH SLIP)",
    docNumberLabel: "Challan No",
    dateLabel: "Challan Date",
    partyLabel: "Details of Consignee (Shipped To)",
    samplePrefix: "DC-2026-0089",
  },
  {
    id: "expense",
    name: "Expense Transaction",
    badge: "Purchase",
    documentTitle: "PURCHASE VOUCHER",
    documentSubtitle: "(EXPENSE / VENDOR BILL)",
    docNumberLabel: "Voucher No",
    dateLabel: "Voucher Date",
    partyLabel: "Supplier / Paid To",
    samplePrefix: "EXP-2026-0055",
  },
  {
    id: "sale_order",
    name: "Sale Order",
    badge: "Order",
    documentTitle: "SALE ORDER",
    documentSubtitle: "(ORDER CONFIRMATION)",
    docNumberLabel: "Order No",
    dateLabel: "Order Date",
    partyLabel: "Customer / Billed To",
    samplePrefix: "SO-2026-0219",
  },
  {
    id: "receipt",
    name: "Receipt",
    badge: "Payment In",
    documentTitle: "PAYMENT RECEIPT",
    documentSubtitle: "(OFFICIAL MONEY RECEIPT)",
    docNumberLabel: "Receipt No",
    dateLabel: "Receipt Date",
    partyLabel: "Received With Thanks From",
    samplePrefix: "RCP-2026-0842",
  },
];

export const DEFAULT_PRINT_SETTINGS = {
  template: "general",
  templateType: "standard_a4", // standard_a4 | standard_thermal
  transactionType: "income", // income | estimate | delivery_challan | expense | sale_order | receipt
  pdfFormat: "a4", // a4 | thermal
  pageSize: "A4", // A4 | A5 | Letter | 3inch | 2inch
  orientation: "portrait", // portrait | landscape
  accentColor: "#2563eb",
  watermark: {
    enabled: false,
    text: "VYNERIX ERP",
    opacity: 12, // 5 to 50%
    angle: -30,
  },
  margins: {
    top: 6,
    bottom: 6,
    left: 8,
    right: 8,
  },
  typography: {
    companyTitleSize: 22,
    bodySize: 11,
    tableCompact: false,
    fontWeight: 400,
  },
  header: {
    showLogo: true,
    showCompanyName: true,
    showMobile: true,
    showEmail: true,
    showGstin: true,
    showPan: true,
    showState: true,
    showQr: true,
    documentTitle: "TAX INVOICE",
    documentSubtitle: "(ORIGINAL FOR RECIPIENT)",
    showTransport: true,
    showPo: true,
    showEway: true,
    showShipTo: true,
    showReverseCharge: false,
    showDueDate: true,
  },
  columns: DEFAULT_TABLE_COLUMNS,
  footer: {
    showHsnSummary: true,
    showGstRateSummary: true,
    showOutstanding: true,
    outstandingTiming: "after", // after | before
    showPaymentDetails: true,
    showLoyaltyPoints: false,
    showOfferDiscount: true,
    showTerms: true,
    termsText:
      "1. Goods once sold will not be taken back without valid bill.\n2. Subject to local jurisdiction.\n3. Interest @ 18% p.a. will be charged if payment is not made within 15 days of bill date.\n4. Disputes, if any, subject to Coimbatore jurisdiction only.",
    showNotes: true,
    notesText: "Thank you for doing business with us! Visit again.",
    showInWords: true,
    showSavings: true,
    showBankDetails: true,
    bankDetails: {
      bankName: "HDFC Bank Ltd",
      accountName: "Vinoth Enterprises Pvt Ltd",
      accountNo: "50200034981245",
      ifsc: "HDFC0001245",
      branch: "Main Branch, Coimbatore",
      upiId: "vinothcomp@hdfcbank",
    },
    showSignatory: true,
    signatoryFirm: "For Vinoth Enterprises Pvt Ltd",
    showCustomerSign: true,
  },
};

export const SAMPLE_INVOICE_DATA = {
  invoiceNo: "INV-2026-0894",
  date: "18-Sep-2026",
  dueDate: "03-Oct-2026",
  placeOfSupply: "33-Tamil Nadu",
  reverseCharge: "No",
  company: {
    name: "Vinoth Enterprises Pvt Ltd",
    tradeName: "Vinoth Comp",
    address: "No. 45, Avinashi Road, Peelamedu, Coimbatore - 641004, Tamil Nadu",
    phone: "+91 93614 74706",
    email: "vinoth1300@gmail.com",
    gstin: "33AABCV1234F1Z5",
    pan: "AABCV1234F",
    state: "Tamil Nadu",
    stateCode: "33",
    logoUrl: "",
    upiQrUrl: "",
  },
  customer: {
    name: "Kovai Retails & Supermarket",
    contactPerson: "Mr. R. Karthik",
    billingAddress: "Shop No. 12, Crosscut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu",
    shippingAddress: "Warehouse Shed 4, Trichy Road, Singanallur, Coimbatore - 641005, Tamil Nadu",
    phone: "+91 98421 55678",
    email: "karthik.retail@kovaimarket.in",
    gstin: "33AAECK5678H1Z8",
    pan: "AAECK5678H",
    state: "Tamil Nadu",
    stateCode: "33",
    previousBalance: 12500.0,
  },
  transport: {
    transporterName: "VRL Logistics Express",
    lrNumber: "VRL-CBE-98231",
    lrDate: "18-Sep-2026",
    vehicleNumber: "TN 38 BX 4492",
    destination: "Coimbatore",
  },
  purchaseOrder: {
    poNumber: "PO/2026/09/441",
    poDate: "16-Sep-2026",
  },
  ewayBill: {
    ewayBillNo: "5412 8904 3319",
    ewayDate: "18-Sep-2026",
  },
  items: [
    {
      sn: 1,
      name: "Men's Premium Oxford Cotton Formal Shirt (Light Blue - 40)",
      code: "SHIRT-OXF-40",
      batchNo: "BT-2026-09A",
      expDate: "N/A",
      hsn: "6205",
      mrp: 1499.0,
      qty: 10,
      unit: "Pcs",
      rate: 980.0,
      discountPerc: 5,
      discountAmt: 490.0,
      taxableAmt: 9310.0,
      gstRate: 5,
      cgstRate: 2.5,
      cgstAmt: 232.75,
      sgstRate: 2.5,
      sgstAmt: 232.75,
      igstRate: 0,
      igstAmt: 0,
      totalAmt: 9775.5,
    },
    {
      sn: 2,
      name: "Slim Fit Chinos Casual Trousers (Khaki - 32)",
      code: "TR-CHINO-32",
      batchNo: "BT-2026-08C",
      expDate: "N/A",
      hsn: "6203",
      mrp: 1899.0,
      qty: 6,
      unit: "Pcs",
      rate: 1240.0,
      discountPerc: 0,
      discountAmt: 0,
      taxableAmt: 7440.0,
      gstRate: 12,
      cgstRate: 6.0,
      cgstAmt: 446.4,
      sgstRate: 6.0,
      sgstAmt: 446.4,
      igstRate: 0,
      igstAmt: 0,
      totalAmt: 8332.8,
    },
    {
      sn: 3,
      name: "Organic Combed Cotton Crew Neck T-Shirt (Navy - L)",
      code: "TSHIRT-ORG-NV",
      batchNo: "BT-2026-09B",
      expDate: "N/A",
      hsn: "6109",
      mrp: 799.0,
      qty: 20,
      unit: "Pcs",
      rate: 420.0,
      discountPerc: 10,
      discountAmt: 840.0,
      taxableAmt: 7560.0,
      gstRate: 5,
      cgstRate: 2.5,
      cgstAmt: 189.0,
      sgstRate: 2.5,
      sgstAmt: 189.0,
      igstRate: 0,
      igstAmt: 0,
      totalAmt: 7938.0,
    },
    {
      sn: 4,
      name: "Pure Leather Reversible Formal Belt (Black/Brown)",
      code: "ACC-BELT-REV",
      batchNo: "BT-2026-05L",
      expDate: "N/A",
      hsn: "4203",
      mrp: 1299.0,
      qty: 5,
      unit: "Pcs",
      rate: 750.0,
      discountPerc: 0,
      discountAmt: 0,
      taxableAmt: 3750.0,
      gstRate: 18,
      cgstRate: 9.0,
      cgstAmt: 337.5,
      sgstRate: 9.0,
      sgstAmt: 337.5,
      igstRate: 0,
      igstAmt: 0,
      totalAmt: 4425.0,
    },
  ],
  totals: {
    totalQty: 41,
    subTotal: 30040.0,
    totalDiscount: 1330.0,
    taxableAmount: 28060.0,
    totalCgst: 1205.65,
    totalSgst: 1205.65,
    totalIgst: 0.0,
    totalTax: 2411.3,
    roundOff: 0.7,
    grandTotal: 30472.0,
    totalSavings: 5797.0,
    amountInWords:
      "Thirty Thousand Four Hundred and Seventy Two Rupees Only",
  },
  hsnSummary: [
    {
      hsn: "6205",
      taxableAmt: 9310.0,
      cgstRate: 2.5,
      cgstAmt: 232.75,
      sgstRate: 2.5,
      sgstAmt: 232.75,
      igstRate: 0,
      igstAmt: 0,
      totalTax: 465.5,
    },
    {
      hsn: "6203",
      taxableAmt: 7440.0,
      cgstRate: 6.0,
      cgstAmt: 446.4,
      sgstRate: 6.0,
      sgstAmt: 446.4,
      igstRate: 0,
      igstAmt: 0,
      totalTax: 892.8,
    },
    {
      hsn: "6109",
      taxableAmt: 7560.0,
      cgstRate: 2.5,
      cgstAmt: 189.0,
      sgstRate: 2.5,
      sgstAmt: 189.0,
      igstRate: 0,
      igstAmt: 0,
      totalTax: 378.0,
    },
    {
      hsn: "4203",
      taxableAmt: 3750.0,
      cgstRate: 9.0,
      cgstAmt: 337.5,
      sgstRate: 9.0,
      sgstAmt: 337.5,
      igstRate: 0,
      igstAmt: 0,
      totalTax: 675.0,
    },
  ],
  payment: {
    mode: "Cash / Bank Transfer",
    paidAmount: 30472.0,
    balanceDue: 0.0,
    loyaltyPointsEarned: 305,
    loyaltyPointsBalance: 1420,
  },
};

export const SAMPLE_RECEIPT_DATA = {
  receiptNo: "RCP-2026-0842",
  date: "18-Sep-2026",
  receivedFrom: "Kovai Retails & Supermarket",
  customerPhone: "+91 98421 55678",
  customerEmail: "karthik.retail@kovaimarket.in",
  customerAddress: "Shop No. 12, Crosscut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu",
  customerGstin: "33AAECK5678H1Z8",
  customerPan: "AAECK5678H",
  paymentMode: "Bank Transfer (NEFT / RTGS)",
  referenceNo: "UTR-HDFC99823104",
  bankAccount: "HDFC Bank - 50200034981245 (IFSC: HDFC0001245)",
  amountReceived: 30472.0,
  amountInWords: "Rupees Thirty Thousand Four Hundred Seventy Two Only",
  previousBalance: 42972.0,
  currentBalance: 12500.0,
  narration: "Payment received towards invoice INV-2026-0894 in full & final settlement. Thank you for prompt payment.",
  allocations: [
    {
      sn: 1,
      invoiceNo: "INV-2026-0894",
      invoiceDate: "18-Sep-2026",
      invoiceAmount: 30472.0,
      paidAmount: 30472.0,
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

export const getTransactionTypeMeta = (typeId) => {
  return TRANSACTION_TYPES.find((t) => t.id === typeId) || TRANSACTION_TYPES[0];
};

export const getSampleDataForTransactionType = (typeId, baseData = SAMPLE_INVOICE_DATA) => {
  const meta = getTransactionTypeMeta(typeId);
  if (typeId === "receipt") {
    return {
      ...baseData,
      transactionType: "receipt",
      receiptNo: SAMPLE_RECEIPT_DATA.receiptNo,
      invoiceNo: SAMPLE_RECEIPT_DATA.receiptNo,
      date: SAMPLE_RECEIPT_DATA.date,
      receiptDetails: SAMPLE_RECEIPT_DATA,
    };
  }

  if (typeId === "estimate") {
    return {
      ...baseData,
      transactionType: "estimate",
      invoiceNo: "EST-2026-0142",
      dueDate: "03-Oct-2026",
    };
  }

  if (typeId === "delivery_challan") {
    return {
      ...baseData,
      transactionType: "delivery_challan",
      invoiceNo: "DC-2026-0089",
    };
  }

  if (typeId === "expense") {
    return {
      ...baseData,
      transactionType: "expense",
      invoiceNo: "EXP-2026-0055",
    };
  }

  if (typeId === "sale_order") {
    return {
      ...baseData,
      transactionType: "sale_order",
      invoiceNo: "SO-2026-0219",
    };
  }

  return {
    ...baseData,
    transactionType: "income",
    invoiceNo: "INV-2026-0894",
  };
};

const STORAGE_KEY = "vynerix_print_format_settings_v1";

export const loadPrintFormatSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRINT_SETTINGS,
      ...parsed,
      watermark: { ...DEFAULT_PRINT_SETTINGS.watermark, ...(parsed.watermark || {}) },
      margins: { ...DEFAULT_PRINT_SETTINGS.margins, ...(parsed.margins || {}) },
      typography: { ...DEFAULT_PRINT_SETTINGS.typography, ...(parsed.typography || {}) },
      header: { ...DEFAULT_PRINT_SETTINGS.header, ...(parsed.header || {}) },
      footer: {
        ...DEFAULT_PRINT_SETTINGS.footer,
        ...(parsed.footer || {}),
        bankDetails: {
          ...DEFAULT_PRINT_SETTINGS.footer.bankDetails,
          ...(parsed.footer?.bankDetails || {}),
        },
      },
      columns: Array.isArray(parsed.columns) && parsed.columns.length > 0
        ? parsed.columns
        : DEFAULT_TABLE_COLUMNS,
    };
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
};

export const savePrintFormatSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error("Failed to persist print format settings", err);
    return false;
  }
};
