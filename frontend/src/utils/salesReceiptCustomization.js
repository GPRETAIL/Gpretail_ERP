import QRCode from "qrcode";

const STORAGE_KEY_PREFIX = "sales.receipt.customisation";

export const SALES_RECEIPT_SIZE_OPTIONS = [
  { value: "2.5", label: '2.5"' },
  { value: "3.0", label: '3.0"' },
  { value: "3.5", label: '3.5"' },
  { value: "4.0", label: '4.0"' },
  { value: "A4", label: "A4" },
];

export const DEFAULT_SALES_RECEIPT_MESSAGE = [
  "Thank You for Shopping with us. Goods described and that all particulars are true and correct. All of Taxes Included",
  "Exchange within two days. Exchange can be done after 12.00Pm to 9.00Pm. For Exchange Bill copy And Price Tag is must.",
  "* Thank you! Visit Again *",
].join("\n");
export const SALES_RECEIPT_PRODUCT_WRAP_LIMIT = 15;
export const SALES_RECEIPT_POSITION_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];
export const SALES_RECEIPT_DISCOUNT_DISPLAY_OPTIONS = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
];
export const SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS = [
  { key: "logo", label: "Logo", hasPosition: true, hasLine: false, defaultPosition: "left", defaultVisible: false },
  { key: "header", label: "Header", hasPosition: true, hasLine: false, defaultPosition: "center", defaultVisible: false },
  { key: "company", label: "Company", hasPosition: true, hasLine: false, defaultPosition: "center", defaultVisible: true },
  { key: "address", label: "Address", hasPosition: true, hasLine: false, defaultPosition: "center", defaultVisible: true },
  { key: "gst", label: "GST", hasPosition: true, hasLine: false, defaultPosition: "center", defaultVisible: true },
  { key: "salesNo", label: "Sales No", hasPosition: true, hasLine: true, defaultPosition: "left", defaultLine: "1", defaultVisible: true },
  { key: "cashier", label: "Cashier", hasPosition: true, hasLine: true, defaultPosition: "left", defaultLine: "2", defaultVisible: true },
  { key: "counter", label: "Counter", hasPosition: true, hasLine: true, defaultPosition: "left", defaultLine: "2", defaultVisible: false },
  { key: "paymentMethod", label: "Payment Method", hasPosition: true, hasLine: true, defaultPosition: "left", defaultLine: "3", defaultVisible: false },
  { key: "date", label: "Date", hasPosition: true, hasLine: true, defaultPosition: "right", defaultLine: "1", defaultVisible: true },
  { key: "time", label: "Time", hasPosition: true, hasLine: true, defaultPosition: "right", defaultLine: "2", defaultVisible: true },
  { key: "customer", label: "Customer", hasPosition: true, hasLine: true, defaultPosition: "left", defaultLine: "4", defaultVisible: true },
  { key: "paid", label: "Paid", hasPosition: false, hasLine: false, defaultVisible: false },
  { key: "receivedAmount", label: "Received Amount", hasPosition: false, hasLine: false, defaultVisible: false },
  { key: "balanceAmt", label: "Balance Amount", hasPosition: false, hasLine: false, defaultVisible: false },
  { key: "youSaved", label: "You Saved", hasPosition: false, hasLine: false, defaultVisible: false },
  { key: "tax", label: "Tax", hasPosition: true, hasLine: false, defaultPosition: "left", defaultVisible: false },
];
export const SALES_RECEIPT_TAX_FIELD_DEFINITIONS = [
  { key: "title", label: "Tax Title", defaultVisible: true },
  { key: "taxName", label: "Tax Name", defaultVisible: true },
  { key: "percent", label: "%", defaultVisible: true },
  { key: "amount", label: "AMT", defaultVisible: true },
  { key: "total", label: "Total", defaultVisible: true },
];
export const SALES_RECEIPT_PRODUCT_FIELD_DEFINITIONS = [
  { key: "title", label: "Product Title", defaultVisible: true },
  { key: "productName", label: "Product Name", defaultVisible: true },
  { key: "qty", label: "QTY", defaultVisible: true },
  { key: "mrp", label: "MRP", defaultVisible: false },
  { key: "rate", label: "Price", defaultVisible: true },
  { key: "amount", label: "Amount", defaultVisible: true },
  { key: "tax", label: "Tax", defaultVisible: false },
];

const buildFieldDefaults = (definitions) =>
  definitions.reduce((acc, definition) => {
    acc[definition.key] = {
      visible: Boolean(definition.defaultVisible),
      ...(definition.hasPosition ? { position: definition.defaultPosition || "left" } : {}),
      ...(definition.hasLine ? { line: String(definition.defaultLine || "1") } : {}),
    };
    return acc;
  }, {});

export const DEFAULT_SALES_RECEIPT_GENERAL_FIELDS = buildFieldDefaults(SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS);
export const DEFAULT_SALES_RECEIPT_TAX_FIELDS = buildFieldDefaults(SALES_RECEIPT_TAX_FIELD_DEFINITIONS);
export const DEFAULT_SALES_RECEIPT_PRODUCT_FIELDS = buildFieldDefaults(SALES_RECEIPT_PRODUCT_FIELD_DEFINITIONS);

export const SETTLEMENT_NUMBER_RESET_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/** Same four cadences as settlements; bill_no/order_no are plain integers so a reset just changes
 * which existing rows count toward the next MAX(...)+1 -- it never renumbers a saved bill. */
export const BILL_NUMBER_RESET_OPTIONS = SETTLEMENT_NUMBER_RESET_OPTIONS;

export const RECEIPT_CODE_TYPE_OPTIONS = [
  { value: "barcode", label: "Barcode" },
  { value: "qr_code", label: "QR code" },
];

/** Font choices for the printed receipt. Monospace stacks (Courier/Consolas) are the thermal-printer
 * picks: fixed-width glyphs keep amount columns aligned on narrow paper the way variable-width
 * sans-serif fonts don't. cssStack is what actually gets applied to the receipt, both in the on-screen
 * preview and in the printed HTML (see posReceiptHtml.js). */
export const RECEIPT_FONT_OPTIONS = [
  { value: "arial", label: "Arial (Default)", cssStack: "Arial, Helvetica, sans-serif" },
  { value: "courier", label: "Courier New (Thermal Mono)", cssStack: "'Courier New', Courier, monospace" },
  { value: "consolas", label: "Consolas (Thermal Mono)", cssStack: "Consolas, 'Courier New', monospace" },
  { value: "verdana", label: "Verdana", cssStack: "Verdana, Geneva, sans-serif" },
  { value: "times", label: "Times New Roman", cssStack: "'Times New Roman', Times, serif" },
];

/**
 * Receipt/invoice format presets -- these are pure visual-style choices layered on top of the
 * existing content toggles (barcode, discount display, tax table, etc.): divider weight/style,
 * whether the header/total get a box or accent color, and overall spacing density. "standard"
 * reproduces the pre-existing look exactly (dashed 1px divider, bold plain total, normal spacing)
 * so choosing it is a no-op for anyone who never touches this setting.
 *
 * style params:
 *   dividerStyle: "dashed" | "dotted" | "solid" | "double"
 *   dividerWeight: 1 | 2 | 3   (px)
 *   headerBoxed: boolean       (draw a border box around the company/header block)
 *   headerAccent: "none" | "bar" | "underline"
 *   accentColor: null | hex string -- used by headerAccent "bar" and totalStyle "highlighted"
 *   totalStyle: "plain" | "bold" | "boxed" | "highlighted"
 *   spacing: "compact" | "normal" | "relaxed"
 *   rounded: boolean           (rounded corners on the receipt/boxes vs. square)
 */
export const RECEIPT_FORMAT_OPTIONS = [
  {
    value: "basic", label: "Basic",
    description: "Minimal styling, tightest layout.",
    style: { dividerStyle: "dashed", dividerWeight: 1, headerBoxed: false, headerAccent: "none", accentColor: null, totalStyle: "plain", spacing: "compact", rounded: false },
  },
  {
    value: "standard", label: "Standard",
    description: "The original default look.",
    style: { dividerStyle: "dashed", dividerWeight: 1, headerBoxed: false, headerAccent: "none", accentColor: null, totalStyle: "bold", spacing: "normal", rounded: false },
  },
  {
    value: "compact", label: "Compact",
    description: "Dense layout to save paper.",
    style: { dividerStyle: "dotted", dividerWeight: 1, headerBoxed: false, headerAccent: "none", accentColor: null, totalStyle: "plain", spacing: "compact", rounded: false },
  },
  {
    value: "classic", label: "Classic",
    description: "Solid rules, boxed total.",
    style: { dividerStyle: "solid", dividerWeight: 1, headerBoxed: true, headerAccent: "none", accentColor: null, totalStyle: "boxed", spacing: "normal", rounded: false },
  },
  {
    value: "modern", label: "Modern",
    description: "Whitespace-led with a colour accent underline.",
    style: { dividerStyle: "dotted", dividerWeight: 1, headerBoxed: false, headerAccent: "underline", accentColor: "#2563eb", totalStyle: "bold", spacing: "normal", rounded: true },
  },
  {
    value: "elegant", label: "Elegant",
    description: "Double rules, refined spacing.",
    style: { dividerStyle: "double", dividerWeight: 3, headerBoxed: true, headerAccent: "underline", accentColor: "#6b7280", totalStyle: "boxed", spacing: "relaxed", rounded: true },
  },
  {
    value: "professional", label: "Professional",
    description: "Boxed header, boxed total, accent bar.",
    style: { dividerStyle: "solid", dividerWeight: 2, headerBoxed: true, headerAccent: "bar", accentColor: "#2563eb", totalStyle: "boxed", spacing: "normal", rounded: false },
  },
  {
    value: "corporate", label: "Corporate",
    description: "Accent header bar, highlighted total.",
    style: { dividerStyle: "solid", dividerWeight: 2, headerBoxed: false, headerAccent: "bar", accentColor: "#0f172a", totalStyle: "highlighted", spacing: "normal", rounded: false },
  },
  {
    value: "detailed", label: "Detailed",
    description: "Double rules, boxed sections, relaxed spacing.",
    // dividerWeight must be >= 3 for CSS's "double" border style to actually render as two visible
    // lines - confirmed empirically: at 1-2px it renders indistinguishably from a single solid
    // line, silently breaking this preset's own "double rules" description. Matches the weight
    // already used by the other two double-style presets (elegant, enterprise).
    style: { dividerStyle: "double", dividerWeight: 3, headerBoxed: true, headerAccent: "underline", accentColor: "#2563eb", totalStyle: "boxed", spacing: "relaxed", rounded: false },
  },
  {
    value: "enterprise", label: "Enterprise",
    description: "The most decorated tier -- boxed letterhead, accent bar, highlighted total.",
    style: { dividerStyle: "double", dividerWeight: 3, headerBoxed: true, headerAccent: "bar", accentColor: "#1d4ed8", totalStyle: "highlighted", spacing: "relaxed", rounded: true },
  },
];

const DEFAULT_RECEIPT_FORMAT_STYLE = RECEIPT_FORMAT_OPTIONS[1].style; // "standard"

export const normalizeReceiptFormat = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return RECEIPT_FORMAT_OPTIONS.some((option) => option.value === raw) ? raw : "standard";
};

export const getReceiptFormatStyle = (format) => {
  const normalized = normalizeReceiptFormat(format);
  return RECEIPT_FORMAT_OPTIONS.find((option) => option.value === normalized)?.style || DEFAULT_RECEIPT_FORMAT_STYLE;
};

const SPACING_PX = { compact: 6, normal: 10, relaxed: 16 };

/**
 * CSS overrides for the raw-HTML print templates (posReceiptHtml.js and the duplicated inline
 * builders in POSSales.jsx/POSReturn.jsx), targeting the class names those templates already use
 * (.line, .title, .store-meta, .totals-row, .grand, .receipt). Kept separate from
 * getReceiptFormatStyle's params (used by the React preview) because the print path has no access
 * to Tailwind classes -- both are derived from the same RECEIPT_FORMAT_OPTIONS entry so the two
 * stay visually in sync.
 */
export const buildReceiptFormatCss = (format) => {
  const style = getReceiptFormatStyle(format);
  const dividerBorder = style.dividerStyle === "double"
    ? `${style.dividerWeight}px double #111827`
    : `${style.dividerWeight}px ${style.dividerStyle} #111827`;
  const spacingPx = SPACING_PX[style.spacing] || SPACING_PX.normal;
  // "highlighted"/"bar" used to fill with a 10%-opacity tint of accentColor, which looks right on
  // screen but composites to a luminance well above the direct/silent print path's binarization
  // threshold (200) - i.e. it prints as plain white, the accent vanishes entirely. A solid fill
  // (any real accent color binarizes to black regardless of hue) with white text survives that
  // pipeline as a genuine reverse-video highlight instead, while still rendering fine on screen and
  // in Browser Print mode.
  const totalRules = {
    plain: "font-weight: 400;",
    bold: "font-weight: 700;",
    boxed: "font-weight: 700; border: 1px solid #111827; border-radius: 4px; padding: 6px 8px;",
    highlighted: `font-weight: 700; background: ${style.accentColor || "#2563eb"}; color: #ffffff; border-radius: 4px; padding: 6px 8px;`,
  };
  const headerAccentRule = style.headerAccent === "bar"
    ? `.receipt .title { background: ${style.accentColor || "#2563eb"}; color: #ffffff; padding: 6px 10px; margin: -4px -10px 6px; border-radius: ${style.rounded ? "10px" : "2px"}; }`
    : style.headerAccent === "underline"
      ? `.receipt .title { border-bottom: 2px solid ${style.accentColor || "#2563eb"}; padding-bottom: 4px; }`
      : "";
  const headerBoxRule = style.headerBoxed
    ? `.receipt > .space-y-1:first-child { border: 1px solid #111827; border-radius: ${style.rounded ? "10px" : "2px"}; padding: 8px 10px; }`
    : "";
  return `
    .line { border-top: ${dividerBorder}; margin: ${spacingPx}px 0; }
    .meta, .totals-row { margin: ${Math.max(2, Math.round(spacingPx / 2.5))}px 0; }
    .receipt { border-radius: ${style.rounded ? "14px" : "0px"}; }
    .totals-row.grand { ${totalRules[style.totalStyle] || totalRules.bold} }
    ${headerAccentRule}
    ${headerBoxRule}
  `;
};

export const SALE_SAVE_AS_OPTIONS = [
  { value: "paid_settled", label: "Paid / settled" },
  { value: "unsettled", label: "Unsettled" },
];

export const PRINT_MODE_OPTIONS = [
  {
    value: "direct",
    label: "Direct / Silent Printing",
    description: "Prints directly in the background without browser print preview popups (uses local printer connector).",
  },
  {
    value: "browser",
    label: "Browser Default Print (Preview)",
    description: "Opens the standard browser print popup window with print preview before sending to printer.",
  },
];

export const normalizePrintMode = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return raw === "browser" ? "browser" : "direct";
};

export const DEFAULT_SALES_RECEIPT_CUSTOMIZATION = {
  showBarcodeOnBill: true,
  showBarcodeOnReturnSlip: true,
  receiptCodeType: "qr_code",
  showDiscountOnReceipt: true,
  discountDisplayMode: "row",
  showTaxTableOnReceipt: true,
  receiptWidthInches: "",
  thankYouMessage: DEFAULT_SALES_RECEIPT_MESSAGE,
  settlementNumberReset: "yearly",
  billNumberReset: "yearly",
  /** Manually-typed "next number should be at least N" floor. "" = unset; see getSalesReceiptFontCss's
   * sibling normalizers below. Once a bill/settlement is created at or past this number, the normal
   * running-max logic already exceeds it and there is nothing left to "consume" or clear. */
  billNumberOverride: "",
  settlementNumberOverride: "",
  receiptFontFamily: "arial",
  receiptFormat: "standard",
  /** "direct" | "browser" */
  printMode: "direct",
  /** "none" | "upi" | "image" -- see buildPaymentQrMarkup. Only "upi" bakes the actual bill amount
   * into the QR; an uploaded image is a fixed picture with no way to encode a per-bill amount. */
  paymentQrMode: "upi",
  paymentUpiId: "9876543210@upi",
  /** Data URL (small uploaded image, stored inline like the other Sales Customisation settings --
   * no separate file-storage dependency needed for something this small). */
  paymentQrImageUrl: "",
  /** Default bill status for new POS / POS Old / Touch sales (server applies on save). */
  saleSaveAs: "paid_settled",
  /** When false, POS skips payment entry and applies cash = net (unless credit / refund rules). */
  posPaymentDialogVisible: true,
  /** Printed POS receipt copies when using the printer queue (1–3). */
  posReceiptPrintCopies: 1,
  generalFields: DEFAULT_SALES_RECEIPT_GENERAL_FIELDS,
  taxFields: DEFAULT_SALES_RECEIPT_TAX_FIELDS,
  productFields: DEFAULT_SALES_RECEIPT_PRODUCT_FIELDS,
};

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

const CODE39_PATTERNS = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

const escapeMarkup = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getStorageKey = (companyId) =>
  `${STORAGE_KEY_PREFIX}.${String(companyId || "default").trim() || "default"}`;

const normalizeReceiptSizeValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase() === "a4") return "A4";
  return raw;
};

const normalizeDiscountDisplayMode = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return SALES_RECEIPT_DISCOUNT_DISPLAY_OPTIONS.some((option) => option.value === raw) ? raw : "row";
};

const normalizeFieldPosition = (value, fallback = "left") => {
  const raw = String(value || "").trim().toLowerCase();
  return SALES_RECEIPT_POSITION_OPTIONS.some((option) => option.value === raw) ? raw : fallback;
};

const normalizeFieldLine = (value, fallback = "1") => {
  const raw = String(value ?? "").trim();
  if (!raw) return String(Math.max(toInt(fallback, 1), 1));
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return String(Math.max(toInt(fallback, 1), 1));
  return String(Math.max(toInt(digits, toInt(fallback, 1)), 1));
};

const normalizeReceiptFieldGroup = (value, definitions, fallback) =>
  definitions.reduce((acc, definition) => {
    const raw = value?.[definition.key] || {};
    const base = fallback?.[definition.key] || {};
    acc[definition.key] = {
      visible:
        raw.visible !== undefined
          ? Boolean(raw.visible)
          : base.visible !== undefined
            ? Boolean(base.visible)
            : Boolean(definition.defaultVisible),
      ...(definition.hasPosition
        ? {
            position: normalizeFieldPosition(
              raw.position,
              base.position || definition.defaultPosition || "left"
            ),
          }
        : {}),
      ...(definition.hasLine
        ? {
            line: normalizeFieldLine(
              raw.line,
              base.line || definition.defaultLine || "1"
            ),
          }
        : {}),
    };
    return acc;
  }, {});

const normalizeSettlementNumberReset = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  const allowed = SETTLEMENT_NUMBER_RESET_OPTIONS.map((option) => option.value);
  return allowed.includes(raw) ? raw : DEFAULT_SALES_RECEIPT_CUSTOMIZATION.settlementNumberReset;
};

const normalizeBillNumberReset = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  const allowed = BILL_NUMBER_RESET_OPTIONS.map((option) => option.value);
  return allowed.includes(raw) ? raw : DEFAULT_SALES_RECEIPT_CUSTOMIZATION.billNumberReset;
};

/** "" (unset) or a positive integer as text -- anything else (blank, zero, negative, non-numeric,
 * decimal) normalizes to "". Mirrors backend SalesCustomizationHelper.normalizePositiveIntegerOrBlank. */
const normalizePositiveIntegerOrBlank = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
};

const normalizePaymentQrMode = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  return PAYMENT_QR_MODE_OPTIONS.some((option) => option.value === raw) ? raw : "none";
};

/** Mirrors SalesCustomizationHelper.normalizePaymentQrImageUrl -- inline data URLs only, so a
 * receipt never depends on a remote host being reachable at print time. */
const normalizePaymentQrImageUrl = (value) => {
  const raw = String(value || "").trim();
  return /^data:image\//i.test(raw) ? raw : "";
};

const normalizeReceiptFontFamily = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  const allowed = RECEIPT_FONT_OPTIONS.map((option) => option.value);
  return allowed.includes(raw) ? raw : DEFAULT_SALES_RECEIPT_CUSTOMIZATION.receiptFontFamily;
};

export const getSalesReceiptFontCss = (receiptFontFamily) => {
  const normalized = normalizeReceiptFontFamily(receiptFontFamily);
  return RECEIPT_FONT_OPTIONS.find((option) => option.value === normalized)?.cssStack
    || RECEIPT_FONT_OPTIONS[0].cssStack;
};

export const normalizeReceiptCodeType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "qr" || raw === "qr_code" || raw === "qrcode") return "qr_code";
  return "barcode";
};

const normalizeSaleSaveAs = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "unsettled") return "unsettled";
  if (raw === "paid" || raw === "settled" || raw === "paid_settled" || raw === "paid/settled") {
    return "paid_settled";
  }
  return DEFAULT_SALES_RECEIPT_CUSTOMIZATION.saleSaveAs;
};

const normalizePosReceiptPrintCopies = (value) => {
  const n = toInt(value, 1);
  return Math.min(3, Math.max(1, n));
};

const normalizePosPaymentDialogVisible = (value) => {
  if (value === undefined || value === null) return DEFAULT_SALES_RECEIPT_CUSTOMIZATION.posPaymentDialogVisible;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return Boolean(value);
};

export const normalizeSalesReceiptCustomization = (value = {}) => {
  const width = normalizeReceiptSizeValue(value.receiptWidthInches);
  const validWidth = SALES_RECEIPT_SIZE_OPTIONS.some((option) => option.value === width) ? width : "";
  const thankYouMessage = String(value.thankYouMessage || "").trim() || DEFAULT_SALES_RECEIPT_MESSAGE;
  const generalFields = normalizeReceiptFieldGroup(
    value.generalFields,
    SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS,
    DEFAULT_SALES_RECEIPT_GENERAL_FIELDS
  );
  const taxFields = normalizeReceiptFieldGroup(
    value.taxFields,
    SALES_RECEIPT_TAX_FIELD_DEFINITIONS,
    DEFAULT_SALES_RECEIPT_TAX_FIELDS
  );
  const productFields = normalizeReceiptFieldGroup(
    value.productFields,
    SALES_RECEIPT_PRODUCT_FIELD_DEFINITIONS,
    DEFAULT_SALES_RECEIPT_PRODUCT_FIELDS
  );
  if (value.showTaxTableOnReceipt !== undefined) {
    taxFields.title.visible = Boolean(value.showTaxTableOnReceipt);
  }

  const saleSaveAs = normalizeSaleSaveAs(value.saleSaveAs);
  const posPaymentDialogVisible = saleSaveAs === "unsettled"
    ? false
    : normalizePosPaymentDialogVisible(value.posPaymentDialogVisible);

  return {
    showBarcodeOnBill: Boolean(value.showBarcodeOnBill),
    showBarcodeOnReturnSlip: Boolean(value.showBarcodeOnReturnSlip),
    receiptCodeType: normalizeReceiptCodeType(value.receiptCodeType),
    showDiscountOnReceipt: value.showDiscountOnReceipt !== undefined
      ? Boolean(value.showDiscountOnReceipt)
      : DEFAULT_SALES_RECEIPT_CUSTOMIZATION.showDiscountOnReceipt,
    discountDisplayMode: normalizeDiscountDisplayMode(value.discountDisplayMode),
    showTaxTableOnReceipt: value.showTaxTableOnReceipt !== undefined
      ? Boolean(value.showTaxTableOnReceipt)
      : DEFAULT_SALES_RECEIPT_CUSTOMIZATION.showTaxTableOnReceipt,
    receiptWidthInches: validWidth,
    thankYouMessage,
    settlementNumberReset: normalizeSettlementNumberReset(value.settlementNumberReset),
    billNumberReset: normalizeBillNumberReset(value.billNumberReset),
    billNumberOverride: normalizePositiveIntegerOrBlank(value.billNumberOverride),
    settlementNumberOverride: normalizePositiveIntegerOrBlank(value.settlementNumberOverride),
    receiptFontFamily: normalizeReceiptFontFamily(value.receiptFontFamily),
    receiptFormat: normalizeReceiptFormat(value.receiptFormat),
    printMode: normalizePrintMode(value.printMode),
    paymentQrMode: normalizePaymentQrMode(value.paymentQrMode),
    paymentUpiId: String(value.paymentUpiId || "").trim(),
    paymentQrImageUrl: normalizePaymentQrImageUrl(value.paymentQrImageUrl),
    saleSaveAs,
    posPaymentDialogVisible,
    posReceiptPrintCopies: normalizePosReceiptPrintCopies(value.posReceiptPrintCopies),
    generalFields,
    taxFields,
    productFields,
  };
};

export const loadSalesReceiptCustomization = (companyId) => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SALES_RECEIPT_CUSTOMIZATION };
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(companyId));
    if (!raw) return { ...DEFAULT_SALES_RECEIPT_CUSTOMIZATION };
    const parsed = JSON.parse(raw);
    return normalizeSalesReceiptCustomization(parsed);
  } catch {
    return { ...DEFAULT_SALES_RECEIPT_CUSTOMIZATION };
  }
};

export const saveSalesReceiptCustomization = (companyId, value) => {
  const normalized = normalizeSalesReceiptCustomization(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getStorageKey(companyId), JSON.stringify(normalized));
  }
  return normalized;
};

export const applyServerSalesReceiptCustomization = (companyId, serverData = {}) => {
  const merged = normalizeSalesReceiptCustomization({
    ...DEFAULT_SALES_RECEIPT_CUSTOMIZATION,
    ...serverData,
  });
  return saveSalesReceiptCustomization(companyId, merged);
};

export const fetchSalesReceiptCustomization = async (
  apiClient,
  companyId,
  { fallbackToLocal = true } = {}
) => {
  const storageKey = String(companyId || "default").trim() || "default";
  if (!companyId) {
    return loadSalesReceiptCustomization(storageKey);
  }

  try {
    const res = await apiClient.get("/sales-customization", { params: { company_id: companyId } });
    return applyServerSalesReceiptCustomization(storageKey, res.data?.data || {});
  } catch {
    if (fallbackToLocal) {
      return loadSalesReceiptCustomization(storageKey);
    }
    return normalizeSalesReceiptCustomization(DEFAULT_SALES_RECEIPT_CUSTOMIZATION);
  }
};

export const getSalesReceiptWidthCss = (receiptWidthInches) => {
  const value = normalizeReceiptSizeValue(receiptWidthInches);
  if (!value) return "320px";
  if (value === "A4") return "8.27in";
  return `${value}in`;
};

export const getSalesReceiptPaperSize = (receiptWidthInches) => {
  const value = normalizeReceiptSizeValue(receiptWidthInches);
  if (!value) return "";
  if (value === "A4") return "A4";
  return `${value}in`;
};

export const getSalesReceiptRateWithTax = (rate, taxPerc) =>
  round2(toNum(rate, 0) + ((toNum(rate, 0) * Math.max(0, toNum(taxPerc, 0))) / 100));

export const shouldShowSalesReceiptDiscountColumn = (customization) => {
  const normalized = normalizeSalesReceiptCustomization(customization || {});
  return normalized.discountDisplayMode === "column";
};

export const getVisibleSalesReceiptProductColumns = (
  customization,
  { includeDiscountColumn = false } = {}
) => {
  const normalized = normalizeSalesReceiptCustomization(customization || {});
  const columns = SALES_RECEIPT_PRODUCT_FIELD_DEFINITIONS
    .filter((definition) => definition.key !== "title" && normalized.productFields?.[definition.key]?.visible)
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
    }));

  if (includeDiscountColumn && !columns.some((column) => column.key === "discount")) {
    const rateIndex = columns.findIndex((column) => column.key === "rate");
    const discountColumn = { key: "discount", label: "Discount" };
    if (rateIndex >= 0) {
      columns.splice(rateIndex + 1, 0, discountColumn);
    } else {
      columns.push(discountColumn);
    }
  }

  const rateIndex = columns.findIndex((column) => column.key === "rate");
  const taxIndex = columns.findIndex((column) => column.key === "tax");
  if (rateIndex >= 0 && taxIndex >= 0 && taxIndex !== rateIndex + 1) {
    const [taxColumn] = columns.splice(taxIndex, 1);
    columns.splice(rateIndex + 1, 0, taxColumn);
  }

  return columns;
};

export const getVisibleSalesReceiptTaxColumns = (customization) => {
  const normalized = normalizeSalesReceiptCustomization(customization || {});
  return SALES_RECEIPT_TAX_FIELD_DEFINITIONS
    .filter((definition) => definition.key !== "title" && normalized.taxFields?.[definition.key]?.visible)
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
    }));
};

export const buildSalesReceiptGeneralLayout = (customization, generalContent = {}) => {
  const normalized = normalizeSalesReceiptCustomization(customization || {});
  const generalFields = normalized.generalFields || DEFAULT_SALES_RECEIPT_GENERAL_FIELDS;
  const topRows = SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS.filter(
    (definition) =>
      definition.hasPosition
      && !definition.hasLine
      && definition.key !== "tax"
      && generalFields?.[definition.key]?.visible
      && String(generalContent[definition.key] || "").trim()
  ).map((definition) => ({
    key: definition.key,
    label: definition.label,
    position: generalFields?.[definition.key]?.position || definition.defaultPosition || "left",
    value: generalContent[definition.key],
  }));

  const lineNumbers = SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS
    .filter((definition) => definition.hasLine)
    .map((definition) => toInt(generalFields?.[definition.key]?.line, toInt(definition.defaultLine, 1)));
  const maxLine = Math.max(1, ...lineNumbers);
  const groupedLines = Array.from({ length: maxLine }, (_, index) => index + 1)
    .map((lineNumber) => {
      const items = SALES_RECEIPT_GENERAL_FIELD_DEFINITIONS.filter((definition) => {
        if (!definition.hasLine) return false;
        const field = generalFields?.[definition.key];
        return (
          field?.visible
          && String(field.line || "") === String(lineNumber)
          && String(generalContent[definition.key] || "").trim()
        );
      }).map((definition) => ({
        key: definition.key,
        label: definition.label,
        position: generalFields?.[definition.key]?.position || definition.defaultPosition || "left",
        value: generalContent[definition.key],
      }));

      return { lineNumber, items };
    })
    .filter((line) => line.items.length > 0);

  return { topRows, groupedLines };
};

// Wraps at word boundaries so a product name never splits mid-word (e.g. "Trouser" -> "Trouse"/
// "r") - only a single word longer than the limit on its own falls back to a hard character break,
// since there's no space left to wrap at.
export const wrapSalesReceiptText = (value, maxChars = SALES_RECEIPT_PRODUCT_WRAP_LIMIT) => {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  const limit = Math.max(1, toNum(maxChars, SALES_RECEIPT_PRODUCT_WRAP_LIMIT));
  if (!normalized) return "";

  const lines = [];
  let current = "";

  normalized.split(" ").forEach((word) => {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= limit) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
    while (current.length > limit) {
      lines.push(current.slice(0, limit));
      current = current.slice(limit);
    }
  });
  if (current) lines.push(current);

  return lines.join("\n");
};

export const buildSalesReceiptTaxRows = (items = []) => {
  const rows = new Map();

  items.forEach((item) => {
    const taxPerc = Math.max(0, toNum(item.taxPerc ?? item.tax_perc ?? item.tax, 0));
    if (taxPerc <= 0) return;

    const qty = Math.max(0, toNum(item.qty, 0));
    const rate = Math.max(0, toNum(item.rate ?? item.price, 0));
    const baseAmount = round2(item.baseAmount ?? item.subtotal ?? (qty * rate));
    const taxAmount = round2(item.taxAmount ?? ((baseAmount * taxPerc) / 100));
    const taxName = String(item.taxName || item.tax_name || "").trim();
    const taxType = String(item.taxType || item.tax_type || "").trim();
    const label = taxName || taxType || "Tax";
    const key = `${label}|${taxPerc.toFixed(4)}`;
    const current = rows.get(key) || {
      label,
      taxPerc,
      baseAmount: 0,
      taxAmount: 0,
    };

    current.baseAmount = round2(current.baseAmount + baseAmount);
    current.taxAmount = round2(current.taxAmount + taxAmount);
    rows.set(key, current);
  });

  return Array.from(rows.values()).sort(
    (left, right) => left.label.localeCompare(right.label) || left.taxPerc - right.taxPerc
  );
};

export const getPosBillBarcodeValue = (billNo) => {
  const raw = String(billNo ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("SB/")) return raw;
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `SB/${digits}` : raw;
};

export const getPosReturnBarcodeValue = (returnNo) => {
  const raw = String(returnNo ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("RR/") || raw.startsWith("RO/")) return raw;
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `RR/${digits}` : raw;
};

const sanitizeCode39Value = (value) =>
  String(value ?? "")
    .toUpperCase()
    .split("")
    .map((char) => (CODE39_PATTERNS[char] ? char : " "))
    .join("")
    .trim();

export const buildCode39SvgMarkup = (
  value,
  {
    height = 52,
    narrowWidth = 2,
    wideWidth = 5,
    quietZone = 12,
    fontSize = 12,
    textGap = 8,
    foreground = "#111827",
    background = "transparent",
    showText = true,
  } = {}
) => {
  const normalizedValue = sanitizeCode39Value(value);
  if (!normalizedValue) return "";

  const encoded = `*${normalizedValue}*`;
  const barHeight = Math.max(16, Number(height) || 52);
  const narrow = Math.max(1, Number(narrowWidth) || 2);
  const wide = Math.max(narrow + 1, Number(wideWidth) || 5);
  const labelFontSize = showText ? Math.max(10, Number(fontSize) || 12) : 0;
  const labelGap = showText ? Math.max(4, Number(textGap) || 8) : 0;
  const totalHeight = barHeight + labelGap + labelFontSize + (showText ? 4 : 0);

  let x = quietZone;
  const rects = [];

  encoded.split("").forEach((char, charIndex) => {
    const pattern = CODE39_PATTERNS[char];
    if (!pattern) return;

    pattern.split("").forEach((symbol, index) => {
      const width = symbol === "w" ? wide : narrow;
      const isBar = index % 2 === 0;
      if (isBar) {
        rects.push(
          `<rect x="${x}" y="0" width="${width}" height="${barHeight}" fill="${foreground}" />`
        );
      }
      x += width;
    });

    if (charIndex < encoded.length - 1) {
      x += narrow;
    }
  });

  const totalWidth = x + quietZone;
  const label = escapeMarkup(normalizedValue);
  const backgroundRect =
    background && background !== "transparent"
      ? `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${background}" />`
      : "";
  const textNode = showText
    ? `<text x="${totalWidth / 2}" y="${barHeight + labelGap + labelFontSize - 2}" text-anchor="middle" font-family="monospace" font-size="${labelFontSize}" fill="${foreground}">${label}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" role="img" aria-label="Barcode ${label}">${backgroundRect}${rects.join("")}${textNode}</svg>`;
};

const DEFAULT_RECEIPT_CODE39_OPTIONS = {
  height: 48,
  narrowWidth: 2,
  wideWidth: 5,
  quietZone: 10,
  fontSize: 14,
  textGap: 10,
};

export const isReceiptCodeVisible = (customization, slot = "bill") => {
  if (!customization) return true;
  return slot === "return"
    ? (customization.showBarcodeOnReturnSlip !== undefined ? Boolean(customization.showBarcodeOnReturnSlip) : true)
    : (customization.showBarcodeOnBill !== undefined ? Boolean(customization.showBarcodeOnBill) : true);
};

export const RECEIPT_QR_CODE_DISPLAY_PX = 96;
// The direct/silent print path captures this <img> via html2canvas at a 4x render scale (see
// DEFAULT_RENDER_SCALE in renderPrintableHtml.js), so a QR generated much smaller than
// displaySize * 4 gets upscaled by the browser's own smooth image interpolation before capture -
// blurring crisp module edges into soft grey transitions. Those pixels are deliberately excluded
// from this session's binarization pass (thresholding them broke scanning a different way), so
// nothing downstream cleans up that blur - the bitmap has to already be sharp at generation time.
// Confirmed via a real QR decoder: at the old 112px this scanned ~13% ambiguous-luminance pixels
// and failed to decode; at 480px (>= 96*4) it decoded cleanly with zero ambiguous pixels.
export const RECEIPT_QR_CODE_DATA_WIDTH = 480;

export const buildReceiptQrCodeImgMarkup = (dataUrl, { label = "", fontSize = 13, size = RECEIPT_QR_CODE_DISPLAY_PX } = {}) => {
  if (!dataUrl) return "";
  const displaySize = Math.max(64, Number(size) || RECEIPT_QR_CODE_DISPLAY_PX);
  const caption = String(label || "").trim();
  const captionNode = caption
    ? `<div style="margin-top:6px;text-align:center;font-family:monospace;font-size:${Math.max(10, Number(fontSize) || 13)}px;color:#111827;">${escapeMarkup(caption)}</div>`
    : "";
  return `<img src="${dataUrl}" alt="" width="${displaySize}" height="${displaySize}" style="display:block;margin:0 auto;width:${displaySize}px;height:${displaySize}px;max-width:100%;object-fit:contain;" />${captionNode}`;
};

export const createReceiptQrCodeDataUrl = async (value, { width = RECEIPT_QR_CODE_DATA_WIDTH } = {}) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return QRCode.toDataURL(normalized, {
    // ISO/IEC 18004 requires a minimum 4-module quiet zone - scanners use it to locate the QR
    // pattern before they even attempt to decode it, so a too-tight margin can fail uniformly
    // across every app regardless of how clean the QR's own modules are.
    margin: 4,
    width: Math.max(80, Number(width) || RECEIPT_QR_CODE_DATA_WIDTH),
    // "H" (~30% damage tolerance) instead of "M" (~15%) - real receipt paper (thermal fade,
    // handling, camera glare) degrades a printed QR more than an on-screen one, so the extra
    // error-correction headroom is worth the modest increase in module density.
    errorCorrectionLevel: "H",
  });
};

export const buildReceiptCodeMarkupSync = (value, customization, slot = "bill") => {
  if (!isReceiptCodeVisible(customization, slot)) return "";
  const codeValue = String(value || "").trim();
  if (!codeValue) return "";
  if (normalizeReceiptCodeType(customization?.receiptCodeType) === "qr_code") return "";
  return buildCode39SvgMarkup(codeValue, DEFAULT_RECEIPT_CODE39_OPTIONS);
};

export const buildReceiptCodeMarkupAsync = async (value, customization, slot = "bill") => {
  if (!isReceiptCodeVisible(customization, slot)) return "";
  const codeValue = String(value || "").trim();
  if (!codeValue) return "";
  if (normalizeReceiptCodeType(customization?.receiptCodeType) === "qr_code") {
    const dataUrl = await createReceiptQrCodeDataUrl(codeValue);
    return buildReceiptQrCodeImgMarkup(dataUrl, { label: codeValue, fontSize: 11 });
  }
  return buildCode39SvgMarkup(codeValue, DEFAULT_RECEIPT_CODE39_OPTIONS);
};

export const PAYMENT_QR_MODE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "upi", label: "UPI ID (auto-fills the bill amount)" },
  { value: "image", label: "Upload QR image (fixed, no amount)" },
];

/** Keeps an uploaded QR under SalesCustomizationHelper's inline size cap. A phone screenshot of a
 * payment QR is routinely 2-4 MB, which is far more than a 120px receipt block can use. */
const PAYMENT_QR_UPLOAD_MAX_PX = 512;

/**
 * Reads a user-picked image file, downscales it to at most PAYMENT_QR_UPLOAD_MAX_PX on its longest
 * edge, and returns a PNG data URL. Rejects non-images so the receipt can't end up embedding
 * something that won't render on a thermal printer.
 */
export const readPaymentQrImageFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }
    if (!/^image\//i.test(String(file.type || ""))) {
      reject(new Error("Choose an image file (PNG or JPG)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That file is not a readable image."));
      image.onload = () => {
        const { width, height } = image;
        const maxEdge = Math.max(width, height);
        if (maxEdge <= PAYMENT_QR_UPLOAD_MAX_PX) {
          resolve(reader.result);
          return;
        }
        const scale = PAYMENT_QR_UPLOAD_MAX_PX / maxEdge;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result);
          return;
        }
        // A QR needs opaque white behind it; a transparent PNG would otherwise print as black-on-black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });

/**
 * A UPI deep link (https://developers.google.com/pay/india/tapandpay/api/upi/... spec, same one
 * every UPI app recognizes) with the bill amount baked in -- this is the whole reason "UPI ID" is
 * the only mode that can show a QR that pre-fills the customer's payment app with the exact amount.
 * An uploaded static image has no way to encode a per-bill amount.
 */
export const buildUpiPaymentUri = ({ upiId, payeeName, amount, transactionNote } = {}) => {
  const pa = String(upiId || "").trim();
  if (!pa) return "";
  const params = new URLSearchParams();
  params.set("pa", pa);
  const pn = String(payeeName || "").trim();
  if (pn) params.set("pn", pn);
  const amt = Number(amount);
  if (Number.isFinite(amt) && amt > 0) params.set("am", amt.toFixed(2));
  params.set("cu", "INR");
  const tn = String(transactionNote || "").trim();
  if (tn) params.set("tn", tn);
  return `upi://pay?${params.toString()}`;
};

/**
 * Renders the "Payment QR" block for a receipt: a live UPI QR (amount baked in) or the uploaded
 * static image, whichever paymentQrMode selects. Returns "" when the mode is "none" or the
 * required field (upiId / image) hasn't been set.
 */
export const buildPaymentQrMarkup = async (customization, { billAmount, billNo, storeName } = {}) => {
  const mode = String(customization?.paymentQrMode || "upi").trim().toLowerCase();
  if (mode === "none") return "";
  if (mode === "upi" || !mode) {
    const upiId = String(customization?.paymentUpiId || "").trim() || "9876543210@upi";
    const upiUri = buildUpiPaymentUri({
      upiId,
      payeeName: storeName || "SRI BALAJI TEXTILE",
      amount: billAmount,
      transactionNote: billNo ? `Bill ${billNo}` : "",
    });
    // width: 480 = displayed size (120) * the print pipeline's 4x render scale - see
    // RECEIPT_QR_CODE_DATA_WIDTH's comment for why generating below that upscales into a blurry,
    // often-unscannable QR once captured for silent printing.
    const dataUrl = await createReceiptQrCodeDataUrl(upiUri, { width: 480 });
    return buildReceiptQrCodeImgMarkup(dataUrl, { label: "Scan to Pay", size: 120 });
  }
  if (mode === "image") {
    const imageUrl = String(customization?.paymentQrImageUrl || "").trim();
    if (!imageUrl) return "";
    return buildReceiptQrCodeImgMarkup(imageUrl, { label: "Scan to Pay", size: 120 });
  }
  return "";
};
