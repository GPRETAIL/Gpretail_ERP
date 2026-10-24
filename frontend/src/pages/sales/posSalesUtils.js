// Extracted POS Sales pure utilities, calculators, receipt helpers, and constants

export const POS_SALE_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    saleat: "saleAt", saledate: "saleAt", date: "saleAt",
    amount: "amount", billamount: "amount",
    customerid: "customerId",
    customername: "customerName", customer: "customerName",
    customermobile: "customerMobile", mobile: "customerMobile",
  },
  required: ["amount"],
  sampleFileName: "pos_sale_sample.xlsx",
  sampleHeaders: ["company", "saleAt", "amount", "customerName", "customerMobile"],
};

// Shared shape for both the initial bulk customer preload and async search results below --
// keeping them identical means a customer found via search behaves exactly like one that was
// already cached (same fields available to applyCustomerPanelRow / the quick-customer dialog).
export const mapCustomerRow = (row, areaMap) => ({
  value: String(row.id),
  label: `${row.name || "Unnamed"}${row.phone ? ` (${row.phone})` : ""}`,
  id: String(row.id),
  name: row.name || "Unnamed",
  mobileNo: row.phone || "",
  dateOfBirth: row.date_of_birth || "",
  billingName: row.billing_name || "",
  cardNo: row.loyalty_card_number || "",
  gstNo: row.gstin || "",
  address: row.address || "",
  cityId: row.city_id ? String(row.city_id) : "",
  cityName: row.city?.name || "",
  stateId: row.state_id ? String(row.state_id) : "",
  stateName: row.state?.name || "",
  customerCategoryId: row.customer_category_id ? String(row.customer_category_id) : "",
  customerCategoryName: row.customerCategory?.name || "",
  emailId: row.email || "",
  areaId: row.area_id ? String(row.area_id) : "",
  areaName: (areaMap && areaMap.get(String(row.area_id || ""))) || "",
  sectionReligion: row.section_religion || "",
});

export const normalize = (value) => String(value || "").trim().toLowerCase();
export const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
export const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

export const clampReceiptCopies = (value) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, n));
};

/** Avoid window.open after async save — browsers block it as a popup. Uses a hidden iframe + print(). */
export const browserPrintHtml = (html, { copies = 1 } = {}) => {
  const n = Math.min(3, Math.max(1, Number.parseInt(copies, 10) || 1));
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;width:0;height:0;border:none;left:0;top:0;opacity:0;pointer-events:none"
  );
  iframe.setAttribute("title", "Receipt print");
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return false;
  }
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // ignore
    }
  };

  const runPrint = () => {
    try {
      win.focus();
      let remaining = n;
      const next = () => {
        win.print();
        remaining -= 1;
        if (remaining > 0) {
          setTimeout(next, 450);
        } else {
          setTimeout(cleanup, 600);
        }
      };
      next();
    } catch {
      cleanup();
      return false;
    }
    return true;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(runPrint);
  });
  return true;
};

export const computePaymentTotalsFromForm = (paymentFormLike, summaryLike) => {
  const cashAmount = Math.max(0, toNum(paymentFormLike.cashAmount, 0));
  const cardAmount = Math.max(0, toNum(paymentFormLike.cardAmount, 0));
  const upiAmount = Math.max(0, toNum(paymentFormLike.upiAmount, 0));
  const receivedAmount = cashAmount + cardAmount + upiAmount;
  const refundDue = Math.max(0, toNum(summaryLike.refundDue, 0));
  const netAmount = round2(summaryLike.amount);
  const billAmount = round2(summaryLike.billsAmount);
  const refundAmount = refundDue > 0 ? round2(refundDue + receivedAmount) : 0;
  const balanceAmount = netAmount > 0 ? Math.max(netAmount - receivedAmount, 0) : 0;
  const changeAmount = netAmount > 0 ? Math.max(receivedAmount - netAmount, 0) : 0;

  return {
    cashAmount,
    cardAmount,
    upiAmount,
    receivedAmount,
    billAmount,
    netAmount,
    refundAmount,
    balanceAmount,
    changeAmount,
  };
};

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export { formatSaleBillNo } from "../../utils/posBillNumbers";
export const formatReturnNo = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw.startsWith("RR/") || raw.startsWith("RO/")) return raw;
  return `RR/${toNum(value, 0)}`;
};
export const WALKING_CUSTOMER_NAME = "Walking customer";
export const RECEIPT_LOGO_TEXT = "LOGO";

export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
export const getReceiptPositionClass = (position) =>
  position === "right" ? "text-right" : position === "center" ? "text-center" : "text-left";

export const buildReceiptMetaInlineHtml = (items = []) =>
  items.map((item) => `
    <span class="meta-item">
      ${escapeHtml(item.label)}: <span${item.key === "salesNo" ? ' style="font-family:monospace;font-weight:600;"' : ""}>${escapeHtml(item.value)}</span>
    </span>
  `).join("");

export const _buildReceiptMetaLineHtml = (line) => {
  const items = Array.isArray(line?.items) ? line.items : [];
  const positions = Array.from(new Set(items.map((item) => item.position || "left")));

  if (positions.length <= 1) {
    const positionClass = getReceiptPositionClass(positions[0] || "left");
    return `
      <div class="meta-row meta-row-single">
        <div class="meta-group ${positionClass}">${buildReceiptMetaInlineHtml(items)}</div>
      </div>
    `;
  }

  return `
    <div class="meta-row meta-row-grid">
      <div class="meta-group text-left">${buildReceiptMetaInlineHtml(items.filter((item) => item.position === "left"))}</div>
      <div class="meta-group text-center">${buildReceiptMetaInlineHtml(items.filter((item) => item.position === "center"))}</div>
      <div class="meta-group text-right">${buildReceiptMetaInlineHtml(items.filter((item) => item.position === "right"))}</div>
    </div>
  `;
};

// PosSale itself has no cash_amount/card_amount/upi_amount columns - those only ever existed as
// live payment-form UI state. A saved sale's real tender breakdown lives in its `payments` relation
// (each row's own `payment_mode`), which is present whether this is a just-saved sale (store()
// eager-loads it) or a re-fetched historical one (index()/show() do too).
export const getSaleReceiptPaymentMethod = (sale = {}, paymentTotals = {}) => {
  const payments = Array.isArray(sale?.payments) ? sale.payments : [];
  if (payments.length > 0) {
    const modes = [...new Set(payments.map((p) => String(p.payment_mode || "").trim()).filter(Boolean))];
    if (modes.length > 0) {
      return modes
        .map((mode) => mode.charAt(0) + mode.slice(1).toLowerCase())
        .join(" / ");
    }
  }
  if (sale?.payment_mode) {
    const mode = String(sale.payment_mode).trim();
    return mode.charAt(0) + mode.slice(1).toLowerCase();
  }
  const labels = [];
  if (Math.max(0, toNum(paymentTotals.cashAmount, 0)) > 0) labels.push("Cash");
  if (Math.max(0, toNum(paymentTotals.cardAmount, 0)) > 0) labels.push("Card");
  if (Math.max(0, toNum(paymentTotals.upiAmount, 0)) > 0) labels.push("UPI");
  if (Math.max(0, toNum(paymentTotals.refundAmount, 0)) > 0) labels.push("Refund");
  return labels.join(" / ");
};

export const getAppliedReturnItemTotal = (item) => {
  const explicitTotal = Number(item?.total ?? item?.amount);
  if (Number.isFinite(explicitTotal)) return Math.abs(explicitTotal);

  const qty = Math.max(0, toNum(item?.qty, 0));
  const price = Math.max(0, toNum(item?.price ?? item?.rate, 0));
  const tax = Math.max(0, toNum(item?.tax ?? item?.taxPerc, 0));
  const discount = Math.max(0, toNum(item?.discount, 0));
  const subtotal = round2(qty * price);
  const taxAmount = round2((subtotal * tax) / 100);
  return round2(Math.max(subtotal + taxAmount - discount, 0));
};

export const POS_TABLE_COLS = {
  sNo: 40,
  barcode: 144,
  product: 208,
  qty: 56,
  price: 72,
  tax: 56,
  discount: 72,
  total: 80,
  salesMan: 112,
  action: 140,
};
export const POS_TABLE_MIN_WIDTH = 940;
export const posSalesColCellSx = (key, extra = {}) => ({
  px: 0.75,
  py: 0.75,
  width: POS_TABLE_COLS[key],
  flexShrink: 0,
  borderRight: 1,
  borderColor: "divider",
  ...extra,
});
export const posSalesFilterInputSx = {
  width: "100%",
  border: "1px solid",
  borderColor: "grey.300",
  borderRadius: "3.5px",
  bgcolor: "background.paper",
  color: "text.primary",
  px: 0.75,
  py: 0.5,
  fontSize: { xs: 9, md: 10, lg: 10.5 },
};
export const POS_ADDNL_TYPE_GROUPS = [
  {
    label: "Base Amount",
    options: [{ label: "Base Amount", value: "Amount" }],
  },
  {
    label: "Taxes",
    options: [
      { label: "Tax", value: "Tax" },
      { label: "Cess", value: "Cess" },
      { label: "TCS", value: "TCS" },
    ],
  },
  {
    label: "Discounts",
    options: [
      { label: "Discount", value: "Discount" },
      { label: "Discount on Discount", value: "OnDiscount" },
      { label: "Agent Discount", value: "Agnt Discount" },
      { label: "Agent Commission", value: "Agnt Comm" },
    ],
  },
  {
    label: "Charges",
    options: [
      { label: "Service Charge", value: "Service" },
      { label: "Courier Charge", value: "Courier" },
      { label: "Packing Charge", value: "Packing" },
      { label: "Freight Charge", value: "Fright" },
      { label: "Insurance", value: "Insurance" },
    ],
  },
  {
    label: "Other",
    options: [
      { label: "Rounding Adjustment", value: "Rounding" },
      { label: "Job Work Charge", value: "Job Work" },
    ],
  },
];
export const POS_ADDNL_TYPE_LABELS = new Map(
  POS_ADDNL_TYPE_GROUPS.flatMap((group) => group.options).map((option) => [option.value, option.label])
);
export const POS_ADDNL_DISCOUNT_TYPES = new Set(["Discount", "OnDiscount", "Agnt Discount", "Agnt Comm"]);

export const createDefaultLineFilters = () => ({
  barcode: "",
  productName: "",
  qty: "",
  price: "",
  tax: "",
  cost: "",
  discount: "",
  total: "",
  salesManName: "",
});

export const blankCustomer = {
  mobileNo: "",
  name: "",
  dateOfBirth: "",
  billingName: "",
  cardNo: "",
  gstId: "",
  address: "",
  cityId: "",
  stateId: "",
  customerCategoryId: "",
  sectionReligion: "",
  emailId: "",
  areaId: "",
  active: true,
};

export const blankPaymentForm = {
  cashAmount: "",
  cardAmount: "0",
  cardTypeId: "",
  upiAmount: "0",
  upiProviderId: "",
  refundApproved: false,
};

export const createBlankPosAddnlLine = () => ({
  id: `${Date.now()}-${Math.random()}`,
  typeValue: "",
  cost: "",
  taxPerc: "",
});

export const blankQuickCustomer = {
  mobileNo: "",
  name: "",
  dateOfBirth: "",
  billingName: "",
  cardNo: "",
  gstNo: "",
  address: "",
  cityId: "",
  stateId: "",
  customerCategoryId: "",
  sectionReligion: "",
  emailId: "",
  areaId: "",
};

export const formatEditableDecimal = (value) => {
  const numeric = round2(toNum(value, 0));
  return numeric > 0 ? String(numeric) : "";
};

export const quickCustomerFieldOrder = [
  "mobileNo",
  "name",
  "dateOfBirth",
  "billingName",
  "cardNo",
  "gstNo",
  "address",
  "cityId",
  "stateId",
  "customerCategoryId",
  "sectionReligion",
  "emailId",
  "areaId",
];

export const posSalesDialogNativeSelectSx = {
  width: "100%",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "3.5px",
  bgcolor: "background.paper",
  px: 1.5,
  py: 1,
  fontSize: 12.25,
  color: "text.primary",
};
