import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileText, Pencil, PlusCircle, Printer, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";
import CounterAssignmentDialog from "../../components/CounterAssignmentDialog";
import { usePrintContext } from "../../context/PrintContext";
import { downloadHtmlAsPdf } from "../../utils/htmlToPdf";
import { buildPosSaleReceiptHtml, buildPosReturnReceiptHtml } from "../../utils/posReceiptHtml";

const POS_SALE_IMPORT_CONFIG = {
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
import { openNativeSelect } from "../../utils/enterToNextField";
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
  getSalesReceiptFontCss,
  getSalesReceiptRateWithTax,
  getPosBillBarcodeValue,
  getPosReturnBarcodeValue,
  getSalesReceiptPaperSize,
  getSalesReceiptWidthCss,
  loadSalesReceiptCustomization,
  fetchSalesReceiptCustomization,
  RECEIPT_QR_CODE_DISPLAY_PX,
  shouldShowSalesReceiptDiscountColumn,
  wrapSalesReceiptText,
} from "../../utils/salesReceiptCustomization";

const normalize = (value) => String(value || "").trim().toLowerCase();
const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

const clampReceiptCopies = (value) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, n));
};

/** Avoid window.open after async save — browsers block it as a popup. Uses a hidden iframe + print(). */
const browserPrintHtml = (html, { copies = 1 } = {}) => {
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

const computePaymentTotalsFromForm = (paymentFormLike, summaryLike) => {
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

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatSaleBillNo = (value) => `SB/${toNum(value, 0)}`;
const formatReturnNo = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw.startsWith("RR/") || raw.startsWith("RO/")) return raw;
  return `RR/${toNum(value, 0)}`;
};
const WALKING_CUSTOMER_NAME = "Walking customer";
const RECEIPT_LOGO_TEXT = "LOGO";

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
const getSaleReceiptPaymentMethod = (sale = {}, paymentTotals = {}) => {
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

const getAppliedReturnItemTotal = (item) => {
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

const POS_TABLE_COLS = {
  sNo: "w-10 shrink-0",
  barcode: "w-36 shrink-0",
  product: "w-52 shrink-0",
  qty: "w-14 shrink-0",
  price: "w-18 shrink-0",
  tax: "w-14 shrink-0",
  discount: "w-18 shrink-0",
  total: "w-20 shrink-0",
  salesMan: "w-28 shrink-0",
  action: "w-35 shrink-0",
};
const POS_TABLE_WIDTH = "min-w-[940px]";
const POS_ADDNL_TYPE_GROUPS = [
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
const POS_ADDNL_TYPE_LABELS = new Map(
  POS_ADDNL_TYPE_GROUPS.flatMap((group) => group.options).map((option) => [option.value, option.label])
);
const POS_ADDNL_DISCOUNT_TYPES = new Set(["Discount", "OnDiscount", "Agnt Discount", "Agnt Comm"]);

const createDefaultLineFilters = () => ({
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

const blankCustomer = {
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

const blankPaymentForm = {
  cashAmount: "",
  cardAmount: "0",
  cardTypeId: "",
  upiAmount: "0",
  upiProviderId: "",
  refundApproved: false,
};

const createBlankPosAddnlLine = () => ({
  id: `${Date.now()}-${Math.random()}`,
  typeValue: "",
  cost: "",
  taxPerc: "",
});

const blankQuickCustomer = {
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

const formatEditableDecimal = (value) => {
  const numeric = round2(toNum(value, 0));
  return numeric > 0 ? String(numeric) : "";
};

const quickCustomerFieldOrder = [
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

const TextInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}) => (
  <div className="flex items-center">
    <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-2"
    />
  </div>
);

const SelectInput = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  placeholder = "Select",
}) => (
  <div className="flex items-center">
    <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-2"
    >
      <option value="">{placeholder} {label}</option>
      {options.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  </div>
);

const DialogTextField = ({
  label,
  name,
  value,
  onChange,
  onKeyDown,
  placeholder = "",
  type = "text",
  inputRef = null,
}) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <input
      ref={inputRef}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  </div>
);

const DialogSelectField = ({
  label,
  name,
  value,
  onChange,
  onKeyDown,
  options = [],
  inputRef = null,
  placeholder = "Select",
}) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <select
      ref={inputRef}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      <option value="">{placeholder}</option>
      {options.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  </div>
);

const POSSales = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const { connected: printerConnected, printHtml: queuePrintHtml } = usePrintContext();
  const barcodeInputRef = useRef(null);
  const quickCustomerFieldRefs = useRef({});
  const [resolvedExportCompanyName, setResolvedExportCompanyName] = useState(
    () => String(authUser?.company_name || "").trim()
  );

  // Pops automatically once per login if this user has no counter assigned yet -- previously they'd
  // only discover this was required when a sale failed to save.
  const [counterAssignmentOpen, setCounterAssignmentOpen] = useState(false);
  useEffect(() => {
    if (authUser && !authUser.counter_id) {
      setCounterAssignmentOpen(true);
    }
  }, [authUser?.id]);

  const [now, setNow] = useState(new Date());
  const [billNo, setBillNo] = useState(1);
  const [existingCustomerId, setExistingCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ ...blankCustomer });
  const [customers, setCustomers] = useState([]);
  const [customerConfigOptions, setCustomerConfigOptions] = useState({
    cities: [],
    states: [],
    customerCategories: [],
    areas: [],
  });
  const [quickCustomerDialogOpen, setQuickCustomerDialogOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ ...blankQuickCustomer });
  const [quickCustomerSearchResults, setQuickCustomerSearchResults] = useState([]);
  const [quickCustomerSelectedId, setQuickCustomerSelectedId] = useState("");
  const [quickCustomerSaving, setQuickCustomerSaving] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountPercentInput, setDiscountPercentInput] = useState("");
  const [discountValueInput, setDiscountValueInput] = useState("");
  const [discountSelectedLineIds, setDiscountSelectedLineIds] = useState([]);
  const [discountRowDrafts, setDiscountRowDrafts] = useState({});
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditRemarks, setCreditRemarks] = useState("");
  const [igstEnabled, setIgstEnabled] = useState(false);
  const [addnlEnabled, setAddnlEnabled] = useState(false);
  const [placeOfSupplyStateId, setPlaceOfSupplyStateId] = useState("");
  const [posAddnlLines, setPosAddnlLines] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [addBarcode, setAddBarcode] = useState("");
  const [addProductKey, setAddProductKey] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [cart, setCart] = useState([]);
  const [appliedReturn, setAppliedReturn] = useState(null);
  const [applyingReturn, setApplyingReturn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    billNo: "",
    customerName: "",
    product: "",
    barcode: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(20);
  const [lineFilterDraft, setLineFilterDraft] = useState(createDefaultLineFilters);
  const [lineFilters, setLineFilters] = useState(createDefaultLineFilters);
  const [editingLineId, setEditingLineId] = useState(null);
  const [salesManDialog, setSalesManDialog] = useState({ open: false, lineId: null, value: "" });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ ...blankPaymentForm });
  const [posCheckoutPrefs, setPosCheckoutPrefs] = useState({
    saleSaveAs: "paid_settled",
    paymentDialogVisible: true,
    receiptPrintCopies: 1,
  });
  const [latestPosDocument, setLatestPosDocument] = useState(null);
  const [deletingLatestDocument, setDeletingLatestDocument] = useState(false);
  const [downloadingPosPdf, setDownloadingPosPdf] = useState(false);
  const [cardTypes, setCardTypes] = useState([]);
  const [upiProviders, setUpiProviders] = useState([]);
  const cardTypeSelectRef = useRef(null);
  const upiProviderSelectRef = useRef(null);
  const skipCardTypeSaveOnNextEnterRef = useRef(false);
  const skipUpiProviderSaveOnNextEnterRef = useRef(false);
  const searchFiltersRef = useRef(searchFilters);

  const resolvePosSearchFilters = useCallback((overrideFilters = null) => {
    const baseFilters = searchFiltersRef.current;
    if (!overrideFilters || typeof overrideFilters !== "object") return baseFilters;

    const hasKnownKeys = ["search", "billNo", "customerName", "product", "barcode"].some((key) =>
      Object.prototype.hasOwnProperty.call(overrideFilters, key)
    );

    if (!hasKnownKeys) return baseFilters;

    return {
      ...baseFilters,
      ...overrideFilters,
    };
  }, []);

  const posSearchColumns = useMemo(
    () => [
      {
        key: "bill_no",
        label: "Bill No",
        valueGetter: (row) => row.bill_no || row.id || "-",
      },
      {
        key: "sale_at",
        label: "Date",
        valueGetter: (row) => row.sale_date || "",
        render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        searchValue: (row) => (row.sale_date ? new Date(row.sale_date).toLocaleString() : ""),
      },
      {
        key: "customer_name",
        label: "Customer",
        valueGetter: (row) => row.customer?.name || "-",
      },
      {
        key: "user_name",
        label: "User",
        valueGetter: (row) => row.user?.name || "-",
      },
      {
        key: "counter_name",
        label: "Counter",
        valueGetter: (row) => row.counter_name || "-",
      },
      {
        key: "barcodes",
        label: "Barcode",
        valueGetter: (row) =>
          (row.items || [])
            .map((item) => item.barcode?.barcode || item.product?.barcode || "-")
            .join(", "),
        render: (_, row) => {
          const items = row.items || [];
          const barcodeText = items
            .slice(0, 2)
            .map((item) => item.barcode?.barcode || item.product?.barcode || "-")
            .join(", ");
          const extra = items.length > 2 ? ` +${items.length - 2} more` : "";
          return `${barcodeText || "-"}${extra}`;
        },
      },
      {
        key: "products",
        label: "Products",
        valueGetter: (row) =>
          (row.items || [])
            .map((item) => item.product?.name || item.barcode?.product_name || "-")
            .join(", "),
        render: (_, row) => {
          const items = row.items || [];
          const productText = items
            .slice(0, 2)
            .map((item) => item.product?.name || item.barcode?.product_name || "-")
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

  const loadNextBillNo = useCallback(async () => {
    try {
      const res = await api.get("/pos-sales/next-bill-no");
      setBillNo(toNum(res.data?.data?.billNo, 1));
    } catch {
      setBillNo(1);
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
              label: row.name,
            }))
          )
          .catch(() => []);

      const [customersRes, stockProductsRes, productsRes, cities, states, customerCategories, areas] =
        await Promise.all([
          api.get("/customers", { params: { all: true } }).catch(() => ({ data: { data: [] } })),
          api.get("/pos-sales/stock-products").catch(() => ({ data: { data: [] } })),
          api.get("/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
          cfg("city"),
          cfg("state"),
          cfg("customer_category"),
          cfg("sale_area"),
        ]);

      const customerRows = customersRes.data?.data || [];
      const areaMap = new Map(areas.map((row) => [String(row.value), row.label]));
      setCustomers(
        customerRows.map((row) => ({
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
          areaName: areaMap.get(String(row.area_id || "")) || "",
          sectionReligion: row.section_religion || "",
        }))
      );
      setCustomerConfigOptions({ cities, states, customerCategories, areas });

      const products = productsRes.data?.data || [];
      const productTaxMap = new Map();
      const productSellingModeMap = new Map();
      products.forEach((p) => {
        const key = normalize(p.name);
        if (!key) return;
        productTaxMap.set(key, {
          taxPerc: toNum(p?.salesTax?.tax_percentage, 0),
          taxName: String(p?.salesTax?.name || "").trim(),
          taxType: String(p?.salesTax?.tax_type || "").trim(),
        });
        productSellingModeMap.set(key, String(p?.selling_mode || "Piece").trim() || "Piece");
      });

      const stock = (stockProductsRes.data?.data || [])
        .map((row) => {
          const productName = row.productName || "Unknown Product";
          const taxInfo = productTaxMap.get(normalize(productName)) || {};
          return {
            id: String(row.id),
            barcode: row.barcode || "",
            productName,
            qty: Math.max(0, toNum(row.qty, 0)),
            cost: toNum(row.cost, 0),
            price: toNum(row.price || row.mrp, 0),
            tax: toNum(taxInfo.taxPerc ?? row.tax, 0),
            taxName: taxInfo.taxName || row.taxName || "",
            taxType: taxInfo.taxType || row.taxType || "",
            sellingMode: row.sellingMode || productSellingModeMap.get(normalize(productName)) || "Piece",
            variantId: row.variantId ?? null,
            requiresQuantityPrompt: !!row.requiresQuantityPrompt,
          };
        })
        .filter((row) => row.qty > 0);

      setStockRows(stock);

      const groupedProducts = new Map();
      stock.forEach((row) => {
        const key = normalize(row.productName);
        if (!key) return;
        const current = groupedProducts.get(key) || {
          value: key,
          label: row.productName,
          stockQty: 0,
        };
        current.stockQty += row.qty;
        groupedProducts.set(key, current);
      });

      const productList = Array.from(groupedProducts.values())
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((row) => ({
          value: row.value,
          label: `${row.label} (Stock: ${row.stockQty})`,
        }));
      setProductOptions(productList);
    } catch {
      toast.error("Failed to load POS sales data");
    }
  }, []);

  const loadPaymentOptions = useCallback(async () => {
    try {
      const mapRows = (rows) =>
        (rows || []).map((row) => ({
          value: String(row.id),
          label: String(row.name || "").trim(),
        }));

      const [cardRes, upiRes] = await Promise.all([
        api.get("/configurations/card_types").catch(() => ({ data: { data: [] } })),
        api.get("/configurations/upi_provider").catch(() => ({ data: { data: [] } })),
      ]);

      setCardTypes(mapRows(cardRes.data?.data));
      setUpiProviders(mapRows(upiRes.data?.data));
    } catch {
      toast.error("Failed to load card/UPI configuration");
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
      await Promise.all([loadMasterData(), loadNextBillNo(), loadPaymentOptions(), refreshLatestPosDocument()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadMasterData, loadNextBillNo, loadPaymentOptions, refreshLatestPosDocument]);

  useEffect(() => {
    const cid = authUser?.company_id;
    if (!cid) return undefined;

    let cancelled = false;
    fetchSalesReceiptCustomization(api, cid, { fallbackToLocal: false })
      .then((customization) => {
        if (cancelled) return;
        setPosCheckoutPrefs({
          saleSaveAs: customization.saleSaveAs || "paid_settled",
          paymentDialogVisible: customization.posPaymentDialogVisible !== false,
          receiptPrintCopies: clampReceiptCopies(customization.posReceiptPrintCopies),
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authUser?.company_id]);

  const selectedCustomer = useMemo(
    () => customers.find((row) => row.value === existingCustomerId) || null,
    [customers, existingCustomerId]
  );
  const selectedQuickCustomerSearchRow = useMemo(
    () => quickCustomerSearchResults.find((row) => row.value === quickCustomerSelectedId) || null,
    [quickCustomerSearchResults, quickCustomerSelectedId]
  );

  useEffect(() => {
    if (!quickCustomerDialogOpen) return;
    const timer = setTimeout(() => {
      quickCustomerFieldRefs.current.mobileNo?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [quickCustomerDialogOpen]);

  const applyCustomerPanelRow = useCallback((row) => {
    if (!row) return;
    setExistingCustomerId(String(row.value));
    setNewCustomer((prev) => ({
      ...prev,
      mobileNo: row.mobileNo || "",
      name: row.name || "",
      dateOfBirth: row.dateOfBirth || "",
      billingName: row.billingName || "",
      cardNo: row.cardNo || "",
      gstId: row.gstId || row.gstNo || "",
      address: row.address || "",
      cityId: row.cityId || "",
      stateId: row.stateId || "",
      customerCategoryId: row.customerCategoryId || "",
      emailId: row.emailId || "",
      areaId: row.areaId || "",
      sectionReligion: row.sectionReligion || "",
      active: true,
    }));
  }, []);

  const usedQtyByBarcode = useMemo(() => {
    const map = new Map();
    cart.forEach((line) => {
      map.set(line.stockId, (map.get(line.stockId) || 0) + toNum(line.qty, 0));
    });
    return map;
  }, [cart]);

  const selectedStockHint = useMemo(() => {
    const byBarcode = normalize(addBarcode);
    if (byBarcode) {
      if (byBarcode.startsWith("rr/")) {
        return "Press Enter to apply this POS return note as negative amount";
      }
      const row = stockRows.find((s) => normalize(s.barcode) === byBarcode);
      if (!row) return "Barcode not found in current stock";
      const remaining = row.qty - (usedQtyByBarcode.get(row.id) || 0);
      return `Available stock for ${row.barcode}: ${Math.max(remaining, 0)} pcs`;
    }

    const byProduct = normalize(addProductKey);
    if (byProduct) {
      const total = stockRows
        .filter((s) => normalize(s.productName) === byProduct)
        .reduce((sum, s) => sum + Math.max(0, s.qty - (usedQtyByBarcode.get(s.id) || 0)), 0);
      return `Available stock for selected product: ${total} pcs`;
    }

    return "";
  }, [addBarcode, addProductKey, stockRows, usedQtyByBarcode]);

  const cartWithTotals = useMemo(
    () =>
      cart.map((line) => {
        const qty = Math.max(0, toNum(line.qty, 0));
        const price = Math.max(0, toNum(line.price, 0));
        const tax = Math.max(0, toNum(line.tax, 0));
        const subtotal = round2(qty * price);
        const taxAmount = round2((subtotal * tax) / 100);
        const lineAmount = round2(subtotal + taxAmount);
        const discount = Math.min(Math.max(0, toNum(line.discount, 0)), lineAmount);
        const total = round2(Math.max(lineAmount - discount, 0));
        const gross = Math.max(0, toNum(line.cost, 0)) * qty;
        return { ...line, subtotal, taxAmount, lineAmount, total, gross, discount };
      }),
    [cart]
  );
  const appliedReturnDisplayLines = useMemo(() => {
    const returnItems = appliedReturn?.items || [];
    const returnLabel =
      appliedReturn?.displayReturnNo
      || (appliedReturn?.returnNo ? formatReturnNo(appliedReturn.returnNo) : "Applied Return");

    return returnItems.map((item, index) => {
      const qty = Math.max(0, toNum(item?.qty, 0));
      const price = Math.max(0, toNum(item?.price ?? item?.rate, 0));
      const tax = Math.max(0, toNum(item?.tax ?? item?.taxPerc, 0));
      const discount = Math.max(0, toNum(item?.discount, 0));
      const total = getAppliedReturnItemTotal(item);

      return {
        lineId: `applied-return-${appliedReturn?.id || "draft"}-${index}`,
        stockId: `applied-return-${appliedReturn?.id || "draft"}-${index}`,
        barcode: item?.barcode || item?.barcodeRef?.barcode || "",
        productName: item?.product_name || item?.productName || item?.barcode || "-",
        qty: -qty,
        price,
        tax,
        taxName: item?.tax_name || item?.taxName || "",
        taxType: item?.tax_type || item?.taxType || "",
        cost: -total,
        discount,
        discountSource: null,
        salesManId: "",
        salesManName: returnLabel,
        sellingMode: "Piece",
        subtotal: round2(-(qty * price)),
        taxAmount: round2(-((qty * price * tax) / 100)),
        lineAmount: round2(-(qty * price)),
        total: -total,
        gross: -total,
        isReturnDisplayLine: true,
      };
    });
  }, [appliedReturn]);
  const displayCartLines = useMemo(
    () => [...appliedReturnDisplayLines, ...cartWithTotals],
    [appliedReturnDisplayLines, cartWithTotals]
  );

  const focusBarcodeInput = useCallback(() => {
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  }, []);
  const discountDialogSelectedSet = useMemo(
    () => new Set(discountSelectedLineIds),
    [discountSelectedLineIds]
  );
  const discountDialogRows = useMemo(
    () =>
      cartWithTotals.map((line) => {
        const lineAmount = round2(toNum(line.lineAmount, 0));
        const appliedPercent = lineAmount > 0 ? round2((toNum(line.discount, 0) / lineAmount) * 100) : 0;
        const draft = discountRowDrafts[line.lineId] || {};
        const previewPercent = Math.min(100, Math.max(0, toNum(draft.percentInput, appliedPercent)));
        const previewDiscountValue = Math.min(
          lineAmount,
          Math.max(0, toNum(draft.valueInput, toNum(line.discount, 0)))
        );
        const previewNetAmount = round2(Math.max(lineAmount - previewDiscountValue, 0));

        return {
          ...line,
          lineAmount,
          appliedPercent,
          percentInput: draft.percentInput ?? formatEditableDecimal(appliedPercent),
          valueInput: draft.valueInput ?? formatEditableDecimal(toNum(line.discount, 0)),
          previewPercent,
          previewDiscountValue,
          previewNetAmount,
        };
      }),
    [cartWithTotals, discountRowDrafts]
  );
  const discountDialogTotals = useMemo(() => {
    const selectedAmount = discountDialogRows.reduce(
      (sum, line) => sum + (discountDialogSelectedSet.has(line.lineId) ? line.lineAmount : 0),
      0
    );
    const previewDiscountValue = discountDialogRows.reduce(
      (sum, line) => sum + line.previewDiscountValue,
      0
    );

    return {
      selectedAmount: round2(selectedAmount),
      previewDiscountValue: round2(previewDiscountValue),
    };
  }, [discountDialogRows, discountDialogSelectedSet]);
  const posAddnlRows = useMemo(
    () =>
      posAddnlLines.map((line) => {
        const taxPerc = Math.max(0, toNum(line.taxPerc, 0));
        const cost = Math.max(0, toNum(line.cost, 0));
        const taxAmount = round2((cost * taxPerc) / 100);
        const amount = round2(cost + taxAmount);
        const isDiscountType = POS_ADDNL_DISCOUNT_TYPES.has(line.typeValue);
        const sign = isDiscountType ? -1 : 1;
        return {
          ...line,
          typeLabel: POS_ADDNL_TYPE_LABELS.get(line.typeValue) || "",
          taxPerc,
          costValue: cost,
          taxAmount,
          amount,
          signedCost: round2(cost * sign),
          signedTaxAmount: round2(taxAmount * sign),
          signedAmount: round2(amount * sign),
          isDiscountType,
        };
      }),
    [posAddnlLines]
  );
  const posAddnlSummary = useMemo(
    () =>
      posAddnlRows.reduce(
        (acc, line) => ({
          cost: round2(acc.cost + line.signedCost),
          tax: round2(acc.tax + line.signedTaxAmount),
          amount: round2(acc.amount + line.signedAmount),
        }),
        { cost: 0, tax: 0, amount: 0 }
      ),
    [posAddnlRows]
  );
  const summary = useMemo(() => {
    const subTotal = cartWithTotals.reduce((sum, line) => sum + line.subtotal, 0) + posAddnlSummary.cost;
    const taxAmount = cartWithTotals.reduce((sum, line) => sum + line.taxAmount, 0) + posAddnlSummary.tax;
    const billsAmount = subTotal + taxAmount;
    const saleAmount = cartWithTotals.reduce((sum, line) => sum + line.total, 0) + posAddnlSummary.amount;
    const availableReturnAmount = Math.max(0, Math.abs(toNum(appliedReturn?.amount, 0)));
    const returnAppliedAmount = round2(Math.min(saleAmount, availableReturnAmount));
    const refundDue = round2(Math.max(availableReturnAmount - returnAppliedAmount, 0));
    const returnAdjustment = round2(-returnAppliedAmount);
    const amount = round2(Math.max(saleAmount + returnAdjustment, 0));
    const totalQty = cartWithTotals.reduce((sum, line) => sum + toNum(line.qty, 0), 0);
    const grossValue = amount;
    const totalDiscount = cartWithTotals.reduce((sum, line) => sum + line.discount, 0);
    const addlDiscount = cartWithTotals.reduce(
      (sum, line) => sum + (line.discountSource === "additional" ? line.discount : 0),
      0
    );
    return {
      billsAmount,
      subTotal,
      taxAmount,
      saleAmount: round2(saleAmount),
      returnAdjustment: round2(returnAdjustment),
      returnAppliedAmount,
      refundDue,
      amount,
      totalQty,
      grossValue,
      addlDiscount,
      totalDiscount,
    };
  }, [appliedReturn?.amount, cartWithTotals, posAddnlSummary]);
  const paymentTotals = useMemo(
    () => computePaymentTotalsFromForm(paymentForm, summary),
    [paymentForm, summary.amount, summary.billsAmount, summary.refundDue]
  );
  const paymentDisplayTotals = useMemo(() => {
    if (!paymentForm.refundApproved || paymentTotals.refundAmount <= 0) {
      return paymentTotals;
    }
    return {
      ...paymentTotals,
      billAmount: 0,
      netAmount: 0,
      balanceAmount: 0,
      receivedAmount: 0,
      changeAmount: 0,
      refundAmount: 0,
    };
  }, [paymentForm.refundApproved, paymentTotals]);

  const buildQuickPaymentFormSnapshot = useCallback(({ unsettled = false } = {}) => {
    const netAmount = round2(summary.amount);
    const refundScenario = round2(toNum(summary.refundDue, 0)) > 0;
    if (unsettled) {
      return {
        cashAmount: "",
        cardAmount: "0",
        cardTypeId: "",
        upiAmount: "0",
        upiProviderId: "",
        refundApproved: refundScenario,
      };
    }
    if (creditEnabled) {
      return {
        cashAmount: "",
        cardAmount: "0",
        cardTypeId: "",
        upiAmount: "0",
        upiProviderId: "",
        refundApproved: refundScenario,
      };
    }
    if (netAmount <= 0) {
      return {
        cashAmount: "",
        cardAmount: "0",
        cardTypeId: "",
        upiAmount: "0",
        upiProviderId: "",
        refundApproved: refundScenario,
      };
    }
    return {
      cashAmount: String(netAmount),
      cardAmount: "0",
      cardTypeId: "",
      upiAmount: "0",
      upiProviderId: "",
      refundApproved: false,
    };
  }, [creditEnabled, summary.amount]);
  const hasCreditEligibleCustomer = useMemo(
    () =>
      Boolean(
        String(existingCustomerId || "").trim()
        || (
          String(newCustomer.mobileNo || "").trim()
          && String(newCustomer.name || "").trim()
        )
      ),
    [existingCustomerId, newCustomer.mobileNo, newCustomer.name]
  );
  const summaryPanelTextClass = igstEnabled
    ? "text-[8px] md:text-[9px] lg:text-[10px]"
    : "text-[10px] md:text-xs lg:text-sm";
  const summaryPanelSpacingClass = igstEnabled ? "space-y-1.5" : "space-y-2";

  useEffect(() => {
    searchFiltersRef.current = searchFilters;
  }, [searchFilters]);

  useEffect(() => {
    if (!hasCreditEligibleCustomer && creditEnabled) {
      setCreditEnabled(false);
      setCreditRemarks("");
    }
  }, [creditEnabled, hasCreditEligibleCustomer]);

  const filteredCartLines = useMemo(() => {
    const activeFilters = Object.entries(lineFilters).filter(([, value]) => String(value || "").trim() !== "");
    if (activeFilters.length === 0) return displayCartLines;

    return displayCartLines.filter((line) => {
      const searchRow = {
        barcode: line.barcode || "",
        productName: line.productName || "",
        qty: String(line.qty ?? ""),
        price: String(line.price ?? ""),
        tax: String(line.tax ?? ""),
        cost: String(line.cost ?? ""),
        discount: String(line.discount ?? ""),
        total: String(line.total ?? ""),
        salesManName: line.salesManName || "",
      };

      return activeFilters.every(([key, value]) =>
        String(searchRow[key] ?? "").toLowerCase().includes(String(value).trim().toLowerCase())
      );
    });
  }, [displayCartLines, lineFilters]);

  useEffect(() => {
    if (showSearchPage || loading) return;
    barcodeInputRef.current?.focus();
  }, [showSearchPage, loading]);

  const handleCustomerNumberLookup = useCallback((rawValue) => {
    const query = String(rawValue || "").trim();
    const digitsQuery = query.replace(/\D/g, "");

    if (!query) {
      setExistingCustomerId("");
      setNewCustomer((prev) => ({ ...prev, mobileNo: "", name: "" }));
      return null;
    }

    const matched = customers.find((row) => {
      const mobileDigits = String(row.mobileNo || "").replace(/\D/g, "");
      return digitsQuery ? mobileDigits === digitsQuery : String(row.mobileNo || "").trim() === query;
    });

    if (matched) {
      applyCustomerPanelRow(matched);
      return matched;
    }

    setExistingCustomerId("");
    setNewCustomer((prev) => ({
      ...prev,
      mobileNo: query,
      name: prev.name || "",
    }));
    return null;
  }, [applyCustomerPanelRow, customers]);

  const handleCustomerNumberChange = (value) => {
    setNewCustomer((prev) => ({ ...prev, mobileNo: value }));
    const currentMatchedDigits = String(selectedCustomer?.mobileNo || "").replace(/\D/g, "");
    const nextDigits = String(value || "").replace(/\D/g, "");

    if (existingCustomerId && nextDigits !== currentMatchedDigits) {
      setExistingCustomerId("");
    }
  };

  const handleCustomerNamePanelChange = (value) => {
    setNewCustomer((prev) => ({ ...prev, name: value }));
    const currentMatchedName = String(selectedCustomer?.name || "").trim();
    const nextName = String(value || "").trim();

    if (existingCustomerId && nextName !== currentMatchedName) {
      setExistingCustomerId("");
    }
  };

  const openQuickCustomerDialog = () => {
    setQuickCustomer({ ...blankQuickCustomer });
    setQuickCustomerSearchResults([]);
    setQuickCustomerSelectedId("");
    setQuickCustomerDialogOpen(true);
  };

  const closeQuickCustomerDialog = () => {
    if (quickCustomerSaving) return;
    setQuickCustomerDialogOpen(false);
  };

  const handleQuickCustomerChange = (event) => {
    const { name, value } = event.target;
    setQuickCustomer((prev) => ({ ...prev, [name]: value }));
    if (name === "mobileNo") {
      setQuickCustomerSelectedId("");
      if (String(value || "").trim() === "") {
        setQuickCustomerSearchResults([]);
      }
    }
  };

  const runQuickCustomerSearch = useCallback((mobileValue = quickCustomer.mobileNo) => {
    const rawQuery = String(mobileValue || "").trim();
    if (!rawQuery) {
      setQuickCustomerSearchResults([]);
      setQuickCustomerSelectedId("");
      return [];
    }

    const digitsQuery = rawQuery.replace(/\D/g, "");
    const matched = customers
      .filter((row) => {
        const mobile = String(row.mobileNo || "").trim();
        const digitsMobile = mobile.replace(/\D/g, "");
        if (digitsQuery) return digitsMobile.includes(digitsQuery);
        return mobile.toLowerCase().includes(rawQuery.toLowerCase());
      })
      .sort((left, right) => {
        const leftDigits = String(left.mobileNo || "").replace(/\D/g, "");
        const rightDigits = String(right.mobileNo || "").replace(/\D/g, "");
        const leftExact = digitsQuery && leftDigits === digitsQuery ? 1 : 0;
        const rightExact = digitsQuery && rightDigits === digitsQuery ? 1 : 0;
        if (leftExact !== rightExact) return rightExact - leftExact;
        return left.name.localeCompare(right.name);
      })
      .slice(0, 20);

    setQuickCustomerSearchResults(matched);
    const exactMatch = matched.find(
      (row) => String(row.mobileNo || "").replace(/\D/g, "") === digitsQuery
    );
    setQuickCustomerSelectedId(exactMatch?.value || matched[0]?.value || "");
    return matched;
  }, [customers, quickCustomer.mobileNo]);

  const focusNextQuickCustomerField = (fieldName) => {
    const index = quickCustomerFieldOrder.indexOf(fieldName);
    const nextField = quickCustomerFieldOrder[index + 1];
    if (!nextField) return;
    quickCustomerFieldRefs.current[nextField]?.focus();
  };

  const handleQuickCustomerFieldKeyDown = (fieldName, event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (fieldName === "mobileNo") {
      runQuickCustomerSearch(event.currentTarget.value);
    }
    focusNextQuickCustomerField(fieldName);
  };

  const applyQuickCustomerSelection = (customerRow) => {
    if (!customerRow) {
      toast.error("Please select a customer first");
      return;
    }
    applyCustomerPanelRow(customerRow);
    setQuickCustomerDialogOpen(false);
    setQuickCustomer({ ...blankQuickCustomer });
    setQuickCustomerSearchResults([]);
    setQuickCustomerSelectedId("");
    setAddBarcode("");
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const saveQuickCustomer = async () => {
    const mobileNo = String(quickCustomer.mobileNo || "").trim();
    const name = String(quickCustomer.name || "").trim();

    if (!mobileNo) {
      toast.error("Mobile number is required");
      return;
    }
    if (!name) {
      toast.error("Customer name is required");
      return;
    }

    const exactExisting = customers.find(
      (row) => String(row.mobileNo || "").replace(/\D/g, "") === mobileNo.replace(/\D/g, "")
    );
    if (exactExisting) {
      setQuickCustomerSearchResults(runQuickCustomerSearch(mobileNo));
      setQuickCustomerSelectedId(exactExisting.value);
      toast.info("Customer already exists. Select it from search results.");
      return;
    }

    setQuickCustomerSaving(true);
    try {
      const payload = {
        mobileNo,
        name,
        dateOfBirth: quickCustomer.dateOfBirth || null,
        billingName: quickCustomer.billingName || null,
        cardNo: quickCustomer.cardNo || null,
        gstNo: quickCustomer.gstNo || null,
        address: quickCustomer.address || null,
        cityId: quickCustomer.cityId || null,
        stateId: quickCustomer.stateId || null,
        customerCategoryId: quickCustomer.customerCategoryId || null,
        sectionReligion: quickCustomer.sectionReligion || null,
        emailId: quickCustomer.emailId || null,
        areaId: quickCustomer.areaId || null,
        active: true,
      };
      const res = await api.post("/customers", payload);
      const createdCustomer = res.data?.data;
      await loadMasterData();
      applyCustomerPanelRow({
        value: String(createdCustomer?.id || ""),
        name: createdCustomer?.name || name,
        mobileNo: createdCustomer?.mobile_no || mobileNo,
        dateOfBirth: createdCustomer?.date_of_birth || quickCustomer.dateOfBirth || "",
        billingName: createdCustomer?.billing_name || quickCustomer.billingName || "",
        cardNo: createdCustomer?.card_no || quickCustomer.cardNo || "",
        gstId: createdCustomer?.gst_id ? String(createdCustomer.gst_id) : "",
        address: createdCustomer?.address || quickCustomer.address || "",
        cityId: createdCustomer?.city_id ? String(createdCustomer.city_id) : quickCustomer.cityId || "",
        stateId: createdCustomer?.state_id ? String(createdCustomer.state_id) : quickCustomer.stateId || "",
        customerCategoryId: createdCustomer?.customer_category_id
          ? String(createdCustomer.customer_category_id)
          : quickCustomer.customerCategoryId || "",
        emailId: createdCustomer?.email_id || quickCustomer.emailId || "",
        areaId: createdCustomer?.area_id ? String(createdCustomer.area_id) : quickCustomer.areaId || "",
        sectionReligion: createdCustomer?.section_religion || quickCustomer.sectionReligion || "",
      });
      setQuickCustomerDialogOpen(false);
      setQuickCustomer({ ...blankQuickCustomer });
      setQuickCustomerSearchResults([]);
      setQuickCustomerSelectedId("");
      setAddBarcode("");
      toast.success("Customer created and selected");
      setTimeout(() => barcodeInputRef.current?.focus(), 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save customer");
    } finally {
      setQuickCustomerSaving(false);
    }
  };

  const openDiscountDialog = () => {
    if (cartWithTotals.length === 0) {
      toast.error("Add at least one product before applying discount");
      return;
    }
    const nextDrafts = cartWithTotals.reduce((acc, line) => {
      const lineAmount = round2(toNum(line.lineAmount, 0));
      const appliedDiscountValue = Math.min(lineAmount, Math.max(0, toNum(line.discount, 0)));
      const appliedPercent = lineAmount > 0 ? round2((appliedDiscountValue / lineAmount) * 100) : 0;
      acc[line.lineId] = {
        percentInput: formatEditableDecimal(appliedPercent),
        valueInput: formatEditableDecimal(appliedDiscountValue),
      };
      return acc;
    }, {});
    setDiscountRowDrafts(nextDrafts);
    setDiscountSelectedLineIds(cartWithTotals.map((line) => line.lineId));
    setDiscountPercentInput("");
    setDiscountValueInput("");
    setDiscountDialogOpen(true);
  };

  const _handlePosAddnlFieldChange = (lineId, field, value) => {
    setPosAddnlLines((prev) => {
      const next = prev.map((line) => (line.id === lineId ? { ...line, [field]: value } : line));
      const hasBlankLine = next.some(
        (line) =>
          !String(line.typeValue || "").trim()
          && !String(line.cost || "").trim()
          && !String(line.taxPerc || "").trim()
      );
      return hasBlankLine ? next : [...next, createBlankPosAddnlLine()];
    });
  };

  const _handleRemovePosAddnlLine = (lineId) => {
    setPosAddnlLines((prev) => {
      const next = prev.filter((line) => line.id !== lineId);
      return next.length ? next : [createBlankPosAddnlLine()];
    });
  };

  const closeDiscountDialog = () => {
    setDiscountDialogOpen(false);
    setDiscountPercentInput("");
    setDiscountValueInput("");
  };

  const handleDiscountRowToggle = (lineId) => {
    setDiscountSelectedLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
    );
  };

  const handleDiscountToggleAll = () => {
    setDiscountSelectedLineIds((prev) =>
      prev.length === cartWithTotals.length ? [] : cartWithTotals.map((line) => line.lineId)
    );
  };

  const updateDiscountRowDraft = (lineId, patch) => {
    setDiscountRowDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        ...patch,
      },
    }));
    setDiscountSelectedLineIds((prev) => (prev.includes(lineId) ? prev : [...prev, lineId]));
  };

  const handleDiscountRowPercentChange = (lineId, rawValue) => {
    const line = cartWithTotals.find((entry) => entry.lineId === lineId);
    if (!line) return;
    const lineAmount = round2(toNum(line.lineAmount, 0));
    const percent = Math.min(100, Math.max(0, toNum(rawValue, 0)));
    const discountValue = round2((lineAmount * percent) / 100);
    updateDiscountRowDraft(lineId, {
      percentInput: rawValue,
      valueInput: formatEditableDecimal(discountValue),
    });
  };

  const handleDiscountRowValueChange = (lineId, rawValue) => {
    const line = cartWithTotals.find((entry) => entry.lineId === lineId);
    if (!line) return;
    const lineAmount = round2(toNum(line.lineAmount, 0));
    const discountValue = Math.min(lineAmount, Math.max(0, toNum(rawValue, 0)));
    const percent = lineAmount > 0 ? round2((discountValue / lineAmount) * 100) : 0;
    updateDiscountRowDraft(lineId, {
      percentInput: formatEditableDecimal(percent),
      valueInput: rawValue,
    });
  };

  const applyDiscountPercentToSelected = (rawValue) => {
    setDiscountPercentInput(rawValue);
    const percent = Math.min(100, Math.max(0, toNum(rawValue, 0)));
    setDiscountRowDrafts((prev) =>
      discountDialogRows.reduce((acc, line) => {
        if (!discountDialogSelectedSet.has(line.lineId)) return acc;
        const discountValue = round2((line.lineAmount * percent) / 100);
        acc[line.lineId] = {
          ...(prev[line.lineId] || {}),
          percentInput: rawValue,
          valueInput: formatEditableDecimal(discountValue),
        };
        return acc;
      }, { ...prev })
    );
    setDiscountValueInput(formatEditableDecimal(round2((discountDialogTotals.selectedAmount * percent) / 100)));
  };

  const applyDiscountValueToSelected = (rawValue) => {
    setDiscountValueInput(rawValue);
    const totalTargetDiscount = Math.min(discountDialogTotals.selectedAmount, Math.max(0, toNum(rawValue, 0)));
    if (discountDialogSelectedSet.size === 0) return;
    setDiscountRowDrafts((prev) => {
      const selectedRows = discountDialogRows.filter((line) => discountDialogSelectedSet.has(line.lineId));
      const selectedAmount = round2(selectedRows.reduce((sum, line) => sum + line.lineAmount, 0));
      let allocated = 0;
      const next = { ...prev };

      selectedRows.forEach((line, index) => {
        const value =
          index === selectedRows.length - 1
            ? round2(totalTargetDiscount - allocated)
            : round2(selectedAmount > 0 ? (totalTargetDiscount * line.lineAmount) / selectedAmount : 0);
        const safeValue = Math.min(line.lineAmount, Math.max(0, value));
        allocated = round2(allocated + safeValue);
        const percent = line.lineAmount > 0 ? round2((safeValue / line.lineAmount) * 100) : 0;
        next[line.lineId] = {
          ...(next[line.lineId] || {}),
          percentInput: formatEditableDecimal(percent),
          valueInput: formatEditableDecimal(safeValue),
        };
      });

      return next;
    });
    const selectedAmount = Math.max(discountDialogTotals.selectedAmount, 0);
    const percent = selectedAmount > 0 ? round2((totalTargetDiscount / selectedAmount) * 100) : 0;
    setDiscountPercentInput(formatEditableDecimal(percent));
  };

  const applyDiscountDialog = () => {
    if (discountSelectedLineIds.length === 0) {
      toast.error("Select at least one row");
      return;
    }

    setCart((prev) =>
      prev.map((line) => {
        if (!discountDialogSelectedSet.has(line.lineId)) return line;
        const draft = discountRowDrafts[line.lineId] || {};
        const subtotal = round2(toNum(line.price, 0) * toNum(line.qty, 0));
        const taxAmount = round2((subtotal * Math.max(0, toNum(line.tax, 0))) / 100);
        const lineAmount = round2(subtotal + taxAmount);
        const nextDiscount = Math.min(
          lineAmount,
          Math.max(0, toNum(draft.valueInput, line.discount))
        );
        return {
          ...line,
          discount: round2(nextDiscount),
          discountSource: nextDiscount > 0 ? "product" : null,
        };
      })
    );
    setDiscountDialogOpen(false);
    setDiscountPercentInput("");
    setDiscountValueInput("");
    setAddBarcode("");
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const clearAppliedReturn = useCallback(() => {
    setAppliedReturn(null);
  }, []);

  const applyReturnCredit = useCallback(async (returnQuery) => {
    const normalizedQuery = String(returnQuery || "").trim();
    if (!normalizedQuery) return;

    setApplyingReturn(true);
    try {
      const res = await api.get("/pos-returns/credit-return", { params: { returnNo: normalizedQuery } });
      let returnData = res.data?.data || null;
      if (!returnData) {
        toast.error("POS return not found");
        return;
      }

      if ((!Array.isArray(returnData.items) || returnData.items.length === 0) && returnData.id) {
        const detailRes = await api.get(`/pos-returns/${returnData.id}`).catch(() => ({ data: { data: null } }));
        const detailData = detailRes.data?.data || null;
        if (detailData) {
          returnData = {
            ...returnData,
            items: detailData.items || [],
          };
        }
      }

      setAppliedReturn(returnData);
      setAddBarcode("");
      setAddProductKey("");
      setAddQty("1");

      if (returnData.customerId) {
        const matchedCustomer = customers.find((row) => row.value === String(returnData.customerId));
        if (matchedCustomer) {
          applyCustomerPanelRow(matchedCustomer);
        } else {
          setExistingCustomerId(String(returnData.customerId));
          setNewCustomer((prev) => ({
            ...prev,
            mobileNo: returnData.customerMobile || "",
            name: returnData.customerName || "",
          }));
        }
      } else {
        setExistingCustomerId("");
        setNewCustomer((prev) => ({
          ...prev,
          mobileNo: returnData.customerMobile || prev.mobileNo,
          name: returnData.customerName || prev.name,
        }));
      }

      toast.success(`${returnData.displayReturnNo || formatReturnNo(returnData.returnNo)} applied`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to fetch POS return");
    } finally {
      setApplyingReturn(false);
      focusBarcodeInput();
    }
  }, [applyCustomerPanelRow, customers, focusBarcodeInput]);

  const handleAddLine = async () => {
    const quantity = Math.floor(toNum(addQty, 0));

    const barcodeQuery = normalize(addBarcode);
    const productQuery = normalize(addProductKey);
    if (barcodeQuery.startsWith("rr/") || barcodeQuery.startsWith("ro/")) {
      await applyReturnCredit(addBarcode);
      return;
    }

    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      focusBarcodeInput();
      return;
    }

    if (!barcodeQuery && !productQuery) {
      toast.error("Enter a barcode or select a product");
      focusBarcodeInput();
      return;
    }

    let source = null;
    if (barcodeQuery) {
      try {
        const res = await api.get("/pos-sales/barcode-lookup", { params: { barcode: addBarcode.trim() } });
        const found = res.data?.data;
        source = found
          ? {
              id: String(found.id),
              barcode: found.barcode || "",
              productName: found.name || "Unknown Product",
              qty: toNum(found.stock_qty, 0),
              cost: 0,
              price: toNum(found.selling_price || found.mrp, 0),
              tax: toNum(found.tax_rate, 0),
              taxName: "",
              taxType: "",
              sellingMode: found.sellingMode || "Piece",
              variantId: found.variantId ?? null,
              barcodeId: found.barcodeId ?? null,
              requiresQuantityPrompt: !!found.requiresQuantityPrompt,
            }
          : null;
      } catch {
        source = null;
      }

      if (!source) {
        toast.error("Barcode not found in stock");
        focusBarcodeInput();
        return;
      }
      const used = usedQtyByBarcode.get(source.id) || 0;
      const remaining = source.qty - used;
      if (quantity > remaining) {
        toast.error(`Quantity exceeds stock. Available: ${Math.max(remaining, 0)} pcs`);
        focusBarcodeInput();
        return;
      }
    } else {
      const candidates = stockRows
        .filter((row) => normalize(row.productName) === productQuery)
        .map((row) => ({
          row,
          remaining: row.qty - (usedQtyByBarcode.get(row.id) || 0),
        }))
        .filter((row) => row.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);

      source = candidates.find((c) => c.remaining >= quantity)?.row || null;
      if (!source) {
        toast.error("Selected quantity is higher than available stock for this product");
        focusBarcodeInput();
        return;
      }
    }

    setCart((prev) => {
      const index = prev.findIndex((line) => line.stockId === source.id);
      if (index === -1) {
        return [
          ...prev,
          {
            lineId: `${source.id}-${Date.now()}`,
            stockId: source.id,
            barcode: source.barcode,
            productName: source.productName,
            qty: quantity,
            price: source.price,
            tax: source.tax,
            taxName: source.taxName || "",
            taxType: source.taxType || "",
            cost: source.cost,
            discount: 0,
            discountSource: null,
            salesManId: "",
            salesManName: "",
            sellingMode: source.sellingMode || "Piece",
            variantId: source.variantId ?? null,
            barcodeId: source.barcodeId ?? null,
          },
        ];
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        qty: toNum(next[index].qty, 0) + quantity,
      };
      return next;
    });

    setAddBarcode("");
    setAddProductKey("");
    setAddQty("1");
    focusBarcodeInput();
  };

  const handleLineValueChange = (lineId, field, raw) => {
    const numeric = Math.max(0, toNum(raw, 0));
    setCart((prev) =>
      prev.map((line) =>
        line.lineId === lineId
          ? {
              ...line,
              [field]: numeric,
              ...(field === "discount" ? { discountSource: "manual" } : {}),
            }
          : line
      )
    );
  };

  const handleLineQtyChange = (lineId, raw) => {
    const nextQty = Math.max(1, Math.floor(toNum(raw, 0)));
    setCart((prev) => {
      const currentLine = prev.find((line) => line.lineId === lineId);
      if (!currentLine) return prev;

      const stockRow = stockRows.find((row) => row.id === currentLine.stockId);
      if (!stockRow) return prev;

      const usedByOthers = prev.reduce((sum, line) => {
        if (line.lineId === lineId || line.stockId !== currentLine.stockId) return sum;
        return sum + toNum(line.qty, 0);
      }, 0);
      const maxAllowed = Math.max(0, toNum(stockRow.qty, 0) - usedByOthers);
      if (nextQty > maxAllowed) {
        toast.error(`Available quantity for this is ${Math.max(maxAllowed, 0)}`);
        return prev;
      }

      const sanitizedQty = Math.min(nextQty, maxAllowed);

      return prev.map((line) =>
        line.lineId === lineId
          ? { ...line, qty: sanitizedQty }
          : line
      );
    });
  };

  const handleRemoveLine = (lineId) => {
    if (editingLineId === lineId) {
      setEditingLineId(null);
    }
    setCart((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const toggleLineEdit = (lineId) => {
    setEditingLineId((prev) => (prev === lineId ? null : lineId));
  };

  const handleLineFilterDraftChange = (key, value) => {
    setLineFilterDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleLineFilterKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setLineFilters({ ...lineFilterDraft });
  };

  const openSalesManDialog = (line) => {
    setSalesManDialog({
      open: true,
      lineId: line.lineId,
      value: String(line.salesManId || "").trim(),
    });
  };

  const closeSalesManDialog = () => {
    setSalesManDialog({ open: false, lineId: null, value: "" });
  };

  const saveSalesManDialog = async () => {
    if (!salesManDialog.lineId) return;
    const employeeCode = String(salesManDialog.value || "").trim();

    if (!employeeCode) {
      setCart((prev) =>
        prev.map((line) =>
          line.lineId === salesManDialog.lineId
            ? { ...line, salesManId: "", salesManName: "" }
            : line
        )
      );
      closeSalesManDialog();
      return;
    }

    try {
      const res = await api.get("/pos-sales/salesman-lookup", {
        params: { employeeCode },
      });
      const employee = res.data?.data;
      setCart((prev) =>
        prev.map((line) =>
          line.lineId === salesManDialog.lineId
            ? {
                ...line,
                salesManId: employee?.employeeCode || employeeCode,
                salesManName: employee?.name || "",
              }
            : line
        )
      );
      closeSalesManDialog();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Sales man code not found");
    }
  };

  const handleResetEntry = () => {
    setExistingCustomerId("");
    setNewCustomer({ ...blankCustomer });
    setCreditEnabled(false);
    setCreditRemarks("");
    setIgstEnabled(false);
    setAddnlEnabled(false);
    setPlaceOfSupplyStateId("");
    setPosAddnlLines([]);
    setAddBarcode("");
    setAddProductKey("");
    setAddQty("1");
    setCart([]);
    setEditingLineId(null);
    clearAppliedReturn();
    setPaymentForm({ ...blankPaymentForm });
    setPaymentDialogOpen(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const validateSaleEntry = () => {
    if (cartWithTotals.length === 0) {
      toast.error("Add at least one product before save");
      return false;
    }

    return true;
  };

  const openPaymentDialog = () => {
    if (!validateSaleEntry()) return;

    setPaymentForm({
      cashAmount: "",
      cardAmount: "0",
      cardTypeId: "",
      upiAmount: "0",
      upiProviderId: "",
      refundApproved: false,
    });
    skipCardTypeSaveOnNextEnterRef.current = false;
    skipUpiProviderSaveOnNextEnterRef.current = false;
    setPaymentDialogOpen(true);
  };

  const closePaymentDialog = () => {
    if (saving) return;
    setPaymentDialogOpen(false);
  };

  useEffect(() => {
    const handleGlobalEscape = (event) => {
      if (event.key !== "Escape") return;

      if (quickCustomerDialogOpen) {
        event.preventDefault();
        if (!quickCustomerSaving) {
          setQuickCustomerDialogOpen(false);
        }
        return;
      }

      if (discountDialogOpen) {
        event.preventDefault();
        setDiscountDialogOpen(false);
        return;
      }

      if (paymentDialogOpen) {
        event.preventDefault();
        if (!saving) {
          setPaymentDialogOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [quickCustomerDialogOpen, discountDialogOpen, paymentDialogOpen, saving, quickCustomerSaving]);

  const handlePaymentFieldChange = (field, value) => {
    setPaymentForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "cashAmount" || field === "cardAmount" || field === "upiAmount"
        ? { refundApproved: false }
        : {}),
    }));
  };

  const handleConfirmRefund = () => {
    setPaymentForm((prev) => ({
      ...prev,
      refundApproved: true,
      cashAmount: "",
      cardAmount: "0",
      cardTypeId: "",
      upiAmount: "0",
      upiProviderId: "",
    }));
  };

  const handlePaymentAmountKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!saving) {
      handleSaveSale({ shouldPrint: true });
    }
  };

  const handleCardAmountKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (toNum(paymentForm.cardAmount, 0) <= 0) {
      if (!saving) {
        handleSaveSale({ shouldPrint: true });
      }
      return;
    }
    skipCardTypeSaveOnNextEnterRef.current = true;
    cardTypeSelectRef.current?.focus();
    openNativeSelect(cardTypeSelectRef.current);
  };

  const handleUpiAmountKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (toNum(paymentForm.upiAmount, 0) <= 0) {
      if (!saving) {
        handleSaveSale({ shouldPrint: true });
      }
      return;
    }
    skipUpiProviderSaveOnNextEnterRef.current = true;
    upiProviderSelectRef.current?.focus();
    openNativeSelect(upiProviderSelectRef.current);
  };

  const handleCardTypeKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const selectedValue = String(event.currentTarget.value || "").trim();
    if (!selectedValue) {
      event.preventDefault();
      openNativeSelect(event.currentTarget);
      return;
    }
    if (skipCardTypeSaveOnNextEnterRef.current) {
      skipCardTypeSaveOnNextEnterRef.current = false;
      return;
    }
    event.preventDefault();
    if (!saving) {
      handleSaveSale({ shouldPrint: true });
    }
  };

  const handleUpiProviderKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const selectedValue = String(event.currentTarget.value || "").trim();
    if (!selectedValue) {
      event.preventDefault();
      openNativeSelect(event.currentTarget);
      return;
    }
    if (skipUpiProviderSaveOnNextEnterRef.current) {
      skipUpiProviderSaveOnNextEnterRef.current = false;
      return;
    }
    event.preventDefault();
    if (!saving) {
      handleSaveSale({ shouldPrint: true });
    }
  };

  const buildSavePayload = (formSnapshot = undefined, { allowUnsettledWithoutPayment = false } = {}) => {
    if (!validateSaleEntry()) return null;

    const pf = formSnapshot === undefined ? paymentForm : formSnapshot;
    const { cashAmount, cardAmount, upiAmount, receivedAmount, balanceAmount, netAmount, refundAmount } =
      computePaymentTotalsFromForm(pf, summary);
    const nonCashLimit = netAmount > 0 ? Math.max(netAmount - cashAmount, 0) : 0;

    if (netAmount > 0 && cardAmount > nonCashLimit) {
      toast.error(`Card amount cannot be greater than remaining balance (${formatMoney(nonCashLimit)})`);
      return null;
    }

    if (netAmount > 0 && upiAmount > nonCashLimit) {
      toast.error(`UPI amount cannot be greater than remaining balance (${formatMoney(nonCashLimit)})`);
      return null;
    }

    if (netAmount > 0 && cardAmount + upiAmount > nonCashLimit) {
      toast.error(`Card and UPI amount cannot exceed remaining balance (${formatMoney(nonCashLimit)})`);
      return null;
    }

    if (cardAmount > 0 && !pf.cardTypeId) {
      toast.error("Please select card type");
      return null;
    }

    if (upiAmount > 0 && !pf.upiProviderId) {
      toast.error("Please select UPI provider");
      return null;
    }

    const temporaryCustomerName = String(newCustomer.name || "").trim();
    const temporaryCustomerMobile = String(newCustomer.mobileNo || "").trim();
    const effectiveCustomerMode = existingCustomerId
      ? "existing"
      : (temporaryCustomerName || temporaryCustomerMobile ? "temporary" : "walking");
    const effectiveCustomerName =
      String(selectedCustomer?.name || "").trim()
      || temporaryCustomerName
      || WALKING_CUSTOMER_NAME;
    const sanitizedAddnlLines = addnlEnabled
      ? posAddnlRows
          .filter((line) => line.typeValue && line.costValue > 0)
          .map((line) => ({
            typeValue: line.typeValue,
            cost: line.costValue,
            taxPerc: line.taxPerc,
            taxAmount: line.taxAmount,
            amount: line.amount,
          }))
      : [];

    if (creditEnabled && !hasCreditEligibleCustomer) {
      toast.error("Customer number and customer name are required for credit invoice");
      return null;
    }

    if (igstEnabled && !placeOfSupplyStateId) {
      toast.error("Please select place of supply");
      return null;
    }

    if (!creditEnabled && netAmount > 0 && receivedAmount <= 0 && !allowUnsettledWithoutPayment) {
      toast.error("Received amount is required");
      return null;
    }

    if (!creditEnabled && netAmount > 0 && balanceAmount > 0 && !allowUnsettledWithoutPayment) {
      toast.error("Received amount must be equal to or greater than net amount");
      return null;
    }

    if (refundAmount > 0 && !pf.refundApproved) {
      toast.error(`Refund ${formatMoney(refundAmount)} before saving this sale`);
      return null;
    }

    return {
      customerMode: effectiveCustomerMode,
      customerId: effectiveCustomerMode === "existing" ? existingCustomerId : null,
      customerName: effectiveCustomerName,
      customer:
        effectiveCustomerMode === "temporary"
          ? {
              name: temporaryCustomerName || null,
              mobileNo: temporaryCustomerMobile || null,
            }
          : null,
      isCredit: creditEnabled,
      igst: igstEnabled,
      placeOfSupplyStateId: igstEnabled ? placeOfSupplyStateId || null : null,
      addnlLines: sanitizedAddnlLines,
      saleAt: now.toISOString(),
      cashAmount,
      cardAmount,
      cardTypeId: pf.cardTypeId || null,
      upiAmount,
      upiProviderId: pf.upiProviderId || null,
      receivedAmount,
      refundAmount: refundAmount > 0 ? refundAmount : 0,
      appliedPosReturnId:
        appliedReturn?.id != null && appliedReturn?.id !== ""
          ? Number(appliedReturn.id)
          : null,
      appliedReturnNo:
        appliedReturn?.displayReturnNo
        || (appliedReturn?.returnNo != null ? formatReturnNo(appliedReturn.returnNo) : null),
      appliedReturnBillId:
        appliedReturn?.billId != null && appliedReturn?.billId !== ""
          ? Number(appliedReturn.billId)
          : null,
      items: cartWithTotals.map((line) => ({
        productId: line.stockId,
        variantId: line.variantId ?? null,
        barcodeId: line.barcodeId ?? null,
        barcode: line.barcode,
        productName: line.productName,
        qty: line.qty,
        price: line.price,
        tax: line.tax,
        taxName: line.taxName || null,
        taxType: line.taxType || null,
        cost: line.cost,
        discount: line.discount,
        salesManId: line.salesManId || null,
        salesManName: line.salesManName || null,
      })),
    };
  };

  const fetchReceiptCompanyInfo = async () => {
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
        storeName: String(company.name || company.reg_name || company.regName || "").trim(),
        storeAddress: String(company.address || "").trim(),
        storePhone: String(company.contact_no || company.phone || company.contactNo || "").trim(),
        storeGstNo: String(company.gst_no || company.gstin || company.gstNo || "").trim(),
      };
    } catch {
      return {
        storeName: "",
        storeAddress: "",
        storePhone: "",
        storeGstNo: "",
      };
    }
  };

  const printSaleReceipt = async (savedSale) => {
    const savedItems = savedSale?.items || [];
    const billNumber = savedSale?.bill_no || billNo;
    const displayBillNo = getPosBillBarcodeValue(billNumber);
    const saleAt = savedSale?.sale_date || now.toISOString();
    const receiptCustomization = loadSalesReceiptCustomization(authUser?.company_id || "default");
    const printCopies = clampReceiptCopies(receiptCustomization.posReceiptPrintCopies);
    const appliedReturnId = toNum(
      savedSale?.applied_pos_return_id ?? savedSale?.appliedPosReturnId ?? appliedReturn?.id,
      0
    );
    const [companyInfo, linkedReturnRes] = await Promise.all([
      fetchReceiptCompanyInfo(),
      appliedReturnId
        ? api.get(`/pos-returns/${appliedReturnId}`).catch(() => ({ data: { data: null } }))
        : Promise.resolve({ data: { data: null } }),
    ]);
    const linkedReturn = linkedReturnRes?.data?.data || null;
    const storeName =
      String(companyInfo?.storeName || authUser?.company_name || "").trim()
      || "SRI BALAJI TEXTILE";
    const cashierName = String(authUser?.name || authUser?.email || "").trim();
    const receiptCustomerName =
      String(savedSale?.customer_name || savedSale?.customer?.name || "").trim()
      || String(selectedCustomer?.name || "").trim()
      || String(newCustomer.name || "").trim()
      || WALKING_CUSTOMER_NAME;
    const allSalesMen = savedItems.map((item) => String(item.sales_man_name || "").trim());
    const namedSalesMen = allSalesMen.filter(Boolean);
    const uniqueSalesMen = [...new Set(namedSalesMen)];
    const commonSalesMan =
      namedSalesMen.length === savedItems.length && uniqueSalesMen.length === 1 ? uniqueSalesMen[0] : "";
    const receiptReceivedAmount = Math.max(0, toNum(savedSale?.paid_amount, paymentTotals.receivedAmount));
    const receiptChangeAmount = Math.max(0, toNum(savedSale?.change_amount, paymentTotals.changeAmount));
    const receiptTaxAmount = round2(toNum(savedSale?.tax_amount, 0));
    // PosSaleItem's own columns (quantity/selling_price/tax_rate/subtotal/discount/product relation)
    // are always present, whether savedSale just came back from store() or was re-fetched later
    // (Last Bill reprint, PDF download) - liveLine (the in-memory cart line) is no longer needed as
    // the primary source, only these real columns are.
    const receiptItems = savedItems.map((item) => {
      const qty = Math.max(0, toNum(item.quantity, 0));
      const rate = Math.max(0, toNum(item.selling_price, 0));
      const taxPerc = Math.max(0, toNum(item.tax_rate, 0));
      const discountAmount = round2(Math.max(0, toNum(item.discount, 0)));
      const taxAmount = round2(toNum(item.tax_amount, 0));
      const amount = round2(toNum(item.subtotal, qty * rate - discountAmount + taxAmount));
      const subtotal = round2(amount - taxAmount);
      const salesManName = String(item.sales_man_name || "").trim();
      const baseName = String(item.product?.name || item.barcode?.product_name || "-").trim();
      const itemName =
        commonSalesMan || !salesManName ? baseName : `${baseName} / SM: ${salesManName}`;

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
        amount,
        code: item.barcode?.barcode || item.product?.barcode || "",
        hsnCode: item.product?.hsn_code || "",
      };
    });
    const receiptTotalDiscount = Math.max(0, toNum(savedSale?.discount_amount, summary.totalDiscount));
    const receiptReturnAdjustment = Math.min(0, toNum(summary.returnAdjustment, 0));
    const receiptRefundAmount = Math.max(0, toNum(paymentTotals.refundAmount, 0));
    const receiptNetAmount = round2(toNum(savedSale?.grand_total, summary.amount));
    const receiptBillAmount = round2(
      receiptNetAmount < 0
        ? receiptNetAmount
        : round2(toNum(savedSale?.subtotal, 0)) + receiptTotalDiscount
    );
    const receiptPaymentMethod = getSaleReceiptPaymentMethod(savedSale, paymentTotals);
    const receiptReturnItems = (linkedReturn?.items || appliedReturn?.items || []).map((item) => ({
      name: String(item.product?.name || item.product_name || item.productName || "-").trim(),
      qty: Math.max(0, toNum(item.qty ?? item.quantity, 0)),
      amount: Math.abs(toNum(item.total ?? item.amount ?? item.subtotal, 0)),
      code: item.barcode?.barcode || item.barcodeRef?.barcode || "",
    }));

    const receiptData = {
      storeName,
      storeAddress: companyInfo.storeAddress,
      storePhone: companyInfo.storePhone,
      storeGstNo: companyInfo.storeGstNo,
      billNo: displayBillNo,
      billBarcode: displayBillNo,
      dateTime: saleAt,
      cashierName,
      counterName: String(authUser?.counter_name || savedSale?.counter_name || "").trim(),
      customerName: receiptCustomerName,
      paperSize: getSalesReceiptPaperSize(receiptCustomization.receiptWidthInches),
      items: receiptItems,
      billAmount: receiptBillAmount,
      discountAmount: receiptTotalDiscount,
      taxAmount: receiptTaxAmount,
      returnAdjustment: receiptReturnAdjustment,
      refundAmount: receiptRefundAmount,
      appliedReturnNo:
        linkedReturn?.display_return_no ||
        appliedReturn?.displayReturnNo ||
        savedSale?.applied_return_no ||
        (appliedReturn?.returnNo ? formatReturnNo(appliedReturn.returnNo) : ""),
      returnItems: receiptReturnItems,
      total: receiptNetAmount,
      paidAmount: receiptReceivedAmount,
      receivedAmount: receiptReceivedAmount,
      balanceAmount: Math.max(0, toNum(paymentTotals.balanceAmount, 0)),
      changeAmount: receiptChangeAmount,
      paymentMethod: receiptPaymentMethod,
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

    const isDirectPrint = receiptCustomization.printMode !== "browser";

    if (isDirectPrint) {
      await queuePrintHtml(browserReceiptHtml, {
        label: `POSSale-${billNumber}`,
        docType: "pos_sale_receipt",
        copies: printCopies,
        companyId: authUser?.company_id,
        receiptData,
      });
      return;
    }

    browserPrintHtml(browserReceiptHtml, { copies: printCopies });
  };

  const printReturnReceipt = async (savedReturn) => {
    const detail = savedReturn?.items?.length
      ? savedReturn
      : (await api.get(`/pos-returns/${savedReturn.id}`).catch(() => ({ data: { data: null } }))).data?.data;
    if (!detail) {
      toast.error("Failed to load POS return for printing");
      return;
    }

    const receiptCustomization = loadSalesReceiptCustomization(authUser?.company_id || "default");
    const companyInfo = await fetchReceiptCompanyInfo();
    const displayReturnNo = getPosReturnBarcodeValue(
      detail?.display_return_no || detail?.return_no || detail?.id
    );
    const sourceBillNo = detail?.pos_sale?.id ? formatSaleBillNo(detail.pos_sale.id) : "";
    const storeName =
      String(authUser?.company_name || "").trim()
      || String(authUser?.name || "").trim()
      || "Store";
    const cashierName = String(authUser?.name || authUser?.email || "").trim();
    const receiptItems = (detail?.items || []).map((item) => {
      const qty = Math.max(0, toNum(item.quantity, 0));
      const rate = Math.max(0, toNum(item.refund_price, 0));
      const taxPerc = Math.max(0, toNum(item.tax_rate, 0));
      const discountAmount = round2(Math.max(0, toNum(item.discount, 0)));
      const taxAmount = round2(toNum(item.tax_amount, 0));
      const amount = round2(Math.abs(toNum(item.subtotal, qty * rate - discountAmount + taxAmount)));
      const subtotal = round2(amount - taxAmount);

      return {
        name: String(item.product?.name || "-").trim(),
        qty,
        rate,
        taxPerc,
        taxName: item.tax_name || "",
        taxType: item.tax_type || "",
        baseAmount: subtotal,
        taxAmount,
        discountAmount,
        amount,
        code: item.product?.barcode || "",
      };
    });
    const receiptTotalDiscount = round2(receiptItems.reduce((sum, item) => sum + toNum(item.discountAmount, 0), 0));
    const receiptNetAmount = round2(-Math.abs(toNum(detail?.total_refund, 0)));
    const receiptData = {
      storeName,
      storeAddress: companyInfo.storeAddress,
      storePhone: companyInfo.storePhone,
      storeGstNo: companyInfo.storeGstNo,
      billNo: displayReturnNo,
      billBarcode: displayReturnNo,
      dateTime: detail?.return_date || now.toISOString(),
      cashierName,
      counterName: String(authUser?.counter_name || "").trim(),
      customerName: String(detail?.customer?.name || "").trim() || WALKING_CUSTOMER_NAME,
      sourceBillNo,
      returnReason: String(detail?.return_reason_name || "").trim(),
      paperSize: getSalesReceiptPaperSize(receiptCustomization.receiptWidthInches),
      items: receiptItems,
      billAmount: round2(receiptNetAmount - receiptTotalDiscount),
      discountAmount: receiptTotalDiscount,
      taxAmount: round2(receiptItems.reduce((sum, item) => sum + toNum(item.taxAmount, 0), 0)),
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

    const isReturnDirectPrint = receiptCustomization.printMode !== "browser";
    if (isReturnDirectPrint) {
      await queuePrintHtml(browserReceiptHtml, {
        label: `POSReturn-${displayReturnNo}`,
        docType: "pos_return_receipt",
        copies: 1,
        companyId: authUser?.company_id,
        receiptData,
      });
      return;
    }

    browserPrintHtml(browserReceiptHtml, { copies: 1 });
  };

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

  const fetchLatestPosSaleDetail = async () => {
    const listRes = await api.get("/pos-sales", { params: { page: 1, limit: 1 } });
    const first = listRes.data?.data?.[0];
    if (!first?.id) return null;
    const res = await api.get(`/pos-sales/${first.id}`);
    return res.data?.data || null;
  };

  const downloadLastPosSalePdf = async () => {
    setDownloadingPosPdf(true);
    try {
      const saved = await fetchLatestPosSaleDetail();
      const items = saved?.items || [];
      if (!saved || items.length === 0) {
        toast.error("No saved POS bill to download yet");
        return;
      }

      const receiptCustomization = loadSalesReceiptCustomization(authUser?.company_id || "default");
      const companyInfo = await fetchReceiptCompanyInfo();
      const savedBillNo = saved.bill_no ?? billNo;
      const displayBillNo = getPosBillBarcodeValue(savedBillNo);

      const receiptItems = items.map((item) => {
        const qty = Math.max(0, toNum(item.quantity, 0));
        const rate = Math.max(0, toNum(item.selling_price, 0));
        const taxPerc = Math.max(0, toNum(item.tax_rate, 0));
        const discountAmount = Math.max(0, toNum(item.discount, 0));
        const amount = round2(toNum(item.subtotal, qty * rate - discountAmount));
        const baseAmount = taxPerc > 0 ? round2(amount / (1 + taxPerc / 100)) : amount;
        const taxAmount = round2(toNum(item.tax_amount, amount - baseAmount));

        return {
          name: String(item.product?.name || item.barcode?.product_name || "-").trim(),
          qty,
          rate,
          taxPerc,
          taxName: item.tax_name || "",
          taxType: item.tax_type || "",
          baseAmount,
          taxAmount,
          discountAmount,
          amount,
          code: item.barcode?.barcode || item.product?.barcode || "",
          hsnCode: item.product?.hsn_code || "",
        };
      });

      const storeName =
        String(authUser?.company_name || "").trim()
        || String(authUser?.name || "").trim()
        || "Store";

      const receiptData = {
        storeName,
        storeAddress: companyInfo.storeAddress,
        storePhone: companyInfo.storePhone,
        storeGstNo: companyInfo.storeGstNo,
        billNo: displayBillNo,
        billBarcode: displayBillNo,
        dateTime: saved.sale_date || new Date().toISOString(),
        cashierName: String(saved.user?.name || authUser?.name || authUser?.email || "").trim(),
        counterName: String(authUser?.counter_name || "").trim(),
        customerName: String(saved.customer?.name || "").trim() || WALKING_CUSTOMER_NAME,
        paperSize: getSalesReceiptPaperSize(receiptCustomization.receiptWidthInches),
        items: receiptItems,
        billAmount: round2(toNum(saved.subtotal, 0)),
        discountAmount: round2(toNum(saved.discount_amount, 0)),
        taxAmount: round2(toNum(saved.tax_amount, 0)),
        returnAdjustment: 0,
        refundAmount: 0,
        appliedReturnNo: "",
        returnItems: [],
        total: round2(toNum(saved.grand_total, 0)),
        paidAmount: round2(toNum(saved.paid_amount, 0)),
        receivedAmount: round2(toNum(saved.paid_amount, 0)),
        balanceAmount: Math.max(0, round2(toNum(saved.grand_total, 0) - toNum(saved.paid_amount, 0))),
        changeAmount: round2(toNum(saved.change_amount, 0)),
        paymentMethod: String(saved.payment_mode || "Cash").trim(),
        generalTaxVisible: Boolean(receiptCustomization.generalFields?.tax?.visible),
        generalPaidVisible: Boolean(receiptCustomization.generalFields?.paid?.visible),
        generalReceivedVisible: Boolean(receiptCustomization.generalFields?.receivedAmount?.visible),
        generalBalanceVisible: Boolean(receiptCustomization.generalFields?.balanceAmt?.visible),
        generalYouSavedVisible: Boolean(receiptCustomization.generalFields?.youSaved?.visible),
        footerNote: "",
        message: receiptCustomization.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
        billCodeMarkup: await buildReceiptCodeMarkupAsync(displayBillNo, receiptCustomization, "bill"),
        paymentQrMarkup: await buildPaymentQrMarkup(receiptCustomization, {
          billAmount: round2(toNum(saved.grand_total, 0)),
          billNo: displayBillNo,
          storeName,
        }),
      };

      const html = buildPosSaleReceiptHtml(receiptData, receiptCustomization);
      await downloadHtmlAsPdf(html, `pos-sale-${savedBillNo}.pdf`, { paperSize: receiptData.paperSize });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to load last bill for PDF");
    } finally {
      setDownloadingPosPdf(false);
    }
  };

  const handleSaveSale = async ({
    shouldPrint = false,
    paymentFormOverride,
    allowUnsettledWithoutPayment = false,
  } = {}) => {
    if (!authUser?.counter_id) {
      setCounterAssignmentOpen(true);
      toast.error("Please assign a counter before checkout");
      return;
    }
    const payload =
      paymentFormOverride !== undefined
        ? buildSavePayload(paymentFormOverride, { allowUnsettledWithoutPayment })
        : buildSavePayload(undefined, { allowUnsettledWithoutPayment });
    if (!payload) return;

    setSaving(true);
    try {
      const res = await api.post("/pos-sales", payload);
      const saved = res.data?.data;
      const savedBillNo = saved?.bill_no;
      setLatestPosDocument(saved ? { type: "sale", ...saved } : null);
      toast.success(`POS saved successfully (Bill #${formatSaleBillNo(savedBillNo)})`);
      if (shouldPrint) {
        await printSaleReceipt(saved);
      }
      handleResetEntry();
      await Promise.all([loadMasterData(), loadNextBillNo(), refreshLatestPosDocument()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save POS sale");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLastSavedSale = async () => {
    if (!latestPosDocument?.id) return;
    const deletePath = getLatestPosDocumentDeletePath(latestPosDocument);
    if (!deletePath) {
      toast.error("This document type cannot be deleted from POS Sale");
      return;
    }

    try {
      setDeletingLatestDocument(true);
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
      await Promise.all([loadMasterData(), loadNextBillNo(), refreshLatestPosDocument()]);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          (latestPosDocument.type === "return" ? "Failed to cancel POS return" : "Failed to delete POS sale")
      );
    } finally {
      setDeletingLatestDocument(false);
    }
  };

  const runPosSearch = useCallback(async (overrideFilters = null, pageOverride = 1, limitOverride = searchLimit) => {
    const filters = resolvePosSearchFilters(overrideFilters);
    setSearching(true);
    try {
      const params = { page: pageOverride, limit: limitOverride };
      if (String(filters.search || "").trim()) params.search = filters.search;
      if (String(filters.billNo || "").trim()) params.billNo = filters.billNo;
      if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
      if (String(filters.product || "").trim()) params.product = filters.product;
      if (String(filters.barcode || "").trim()) params.barcode = filters.barcode;

      const res = await api.get("/pos-sales", { params });
      setSearchResults(res.data?.data || []);
      const p = res.data?.pagination || {};
      const total = Number(p.total ?? res.data?.total ?? 0) || 0;
      const totalPages = Math.max(Number(p.totalPages ?? Math.ceil(total / Math.max(limitOverride, 1))) || 1, 1);
      setSearchPagination({ total, totalPages });
      setSearchPage(pageOverride);
    } catch {
      toast.error("Failed to search POS sales");
    } finally {
      setSearching(false);
    }
  }, [resolvePosSearchFilters, searchLimit]);

  const loadAllPosSearchRows = useCallback(async (overrideFilters = null) => {
    const filters = resolvePosSearchFilters(overrideFilters);
    const params = { all: "true" };
    if (String(filters.search || "").trim()) params.search = filters.search;
    if (String(filters.billNo || "").trim()) params.billNo = filters.billNo;
    if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
    if (String(filters.product || "").trim()) params.product = filters.product;
    if (String(filters.barcode || "").trim()) params.barcode = filters.barcode;

    const res = await api.get("/pos-sales", { params });
    return res.data?.data || [];
  }, [resolvePosSearchFilters]);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = { search: "", billNo: "", customerName: "", product: "", barcode: "" };
    setSearchFilters(empty);
    await runPosSearch(empty, 1, searchLimit);
  };

  const handleServerSearch = useCallback(({ query, field }) => {
    const normalizedQuery = String(query || "").trim();
    const normalizedField = String(field || "all").trim();
    setSearchFilters((prev) => {
      const nextFilters = {
        ...prev,
        search: "",
        billNo: "",
        customerName: "",
        product: "",
        barcode: "",
      };

      if (normalizedField === "bill_no") nextFilters.billNo = normalizedQuery;
      else if (normalizedField === "customer_name") nextFilters.customerName = normalizedQuery;
      else if (normalizedField === "products") nextFilters.product = normalizedQuery;
      else if (normalizedField === "barcodes") nextFilters.barcode = normalizedQuery;
      else nextFilters.search = normalizedQuery;

      runPosSearch(nextFilters, 1, searchLimit);
      return nextFilters;
    });
    setSearchPage(1);
  }, [runPosSearch, searchLimit]);

  const renderEntryPage = () => (
    <div className="flex flex-col gap-2 xl:flex-1 xl:min-h-0 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-stretch">
      <div className="min-w-0 xl:flex xl:min-h-0">
        <div className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden xl:flex xl:h-full xl:min-h-0 xl:flex-col">
          <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-full min-w-0 flex-1 md:min-w-[220px]">
                <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Barcode</label>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={addBarcode}
                  disabled={applyingReturn}
                  onChange={(e) => setAddBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const shortcut = String(addBarcode || "").trim().toUpperCase();
                      if (shortcut === "C") {
                        setAddBarcode("");
                        openQuickCustomerDialog();
                        return;
                      }
                      if (shortcut === "D") {
                        setAddBarcode("");
                        openDiscountDialog();
                        return;
                      }
                      if (shortcut === "0") {
                        setAddBarcode("");
                        if (!validateSaleEntry()) return;
                        handleSaveSale({ shouldPrint: true, paymentFormOverride: buildQuickPaymentFormSnapshot() });
                        return;
                      }
                      handleAddLine();
                      focusBarcodeInput();
                    }
                  }}
                  placeholder={applyingReturn ? "Fetching return..." : "Scan / enter barcode"}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="w-full min-w-0 flex-[1.3] md:min-w-[280px]">
                <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Product (In Stock)</label>
                <select
                  value={addProductKey}
                  onChange={(e) => setAddProductKey(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select product</option>
                  {productOptions.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLine();
                    }
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="w-10">
                <button
                  onClick={handleAddLine}
                  disabled={applyingReturn}
                  className="glass-btn glass-btn-primary h-[34px] w-full inline-flex items-center justify-center"
                  aria-label="Add product"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            {selectedStockHint ? <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{selectedStockHint}</p> : null}
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className={`flex h-[420px] min-h-[420px] flex-col xl:h-full xl:min-h-0 ${POS_TABLE_WIDTH}`}>
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-blue-100 dark:bg-blue-900/30 text-[10px] font-semibold text-gray-700 dark:text-gray-300 md:text-sm lg:text-base">
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.sNo} border-r border-gray-200 dark:border-gray-700 text-center`}>S.No</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.barcode} border-r border-gray-200 dark:border-gray-700`}>Barcode</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.product} border-r border-gray-200 dark:border-gray-700`}>Product</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.qty} border-r border-gray-200 dark:border-gray-700 text-center`}>Qty</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.price} border-r border-gray-200 dark:border-gray-700 text-right`}>Price</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.tax} border-r border-gray-200 dark:border-gray-700 text-right`}>Tax%</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.discount} border-r border-gray-200 dark:border-gray-700 text-right`}>Discount</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.total} border-r border-gray-200 dark:border-gray-700 text-right`}>Total</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.salesMan} border-r border-gray-200 dark:border-gray-700`}>Salesman</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.action} text-center`}>Action</div>
              </div>

              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-sky-50 dark:bg-sky-900/20">
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.sNo} border-r border-gray-200 dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.barcode} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.barcode}
                    onChange={(e) => handleLineFilterDraftChange("barcode", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Search barcode"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.product} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.productName}
                    onChange={(e) => handleLineFilterDraftChange("productName", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Search product"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.qty} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.qty}
                    onChange={(e) => handleLineFilterDraftChange("qty", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Qty"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-center text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.price} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.price}
                    onChange={(e) => handleLineFilterDraftChange("price", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Price"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-right text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.tax} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.tax}
                    onChange={(e) => handleLineFilterDraftChange("tax", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Tax"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-right text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.discount} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.discount}
                    onChange={(e) => handleLineFilterDraftChange("discount", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Discount"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-right text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.total} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.total}
                    onChange={(e) => handleLineFilterDraftChange("total", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Total"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-right text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.salesMan} border-r border-gray-200 dark:border-gray-700`}>
                  <input
                    type="text"
                    value={lineFilterDraft.salesManName}
                    onChange={(e) => handleLineFilterDraftChange("salesManName", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Salesman"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-[9px] md:text-[10px] lg:text-xs"
                  />
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.action}`}></div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                {displayCartLines.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-16 text-center text-xs text-gray-400 dark:text-gray-500">
                    No products added yet.
                  </div>
                ) : filteredCartLines.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-16 text-center text-xs text-gray-400 dark:text-gray-500">
                    No matching products found.
                  </div>
                ) : (
                  filteredCartLines.map((line, index) => {
                    const isLineEditable = editingLineId === line.lineId;
                    const isReturnDisplayLine = Boolean(line.isReturnDisplayLine);
                    return (
                      <div key={line.lineId} className="flex border-b border-gray-200 dark:border-gray-700 text-[11px] hover:bg-gray-50 md:text-base lg:text-lg">
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.sNo} border-r border-gray-200 dark:border-gray-700 text-center`}>
                          {index + 1}
                        </div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.barcode} border-r border-gray-200 dark:border-gray-700`}>
                          <div className="line-clamp-2 break-all font-mono leading-tight">
                            {line.barcode || "-"}
                          </div>
                        </div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.product} border-r border-gray-200 dark:border-gray-700`}>
                          <div className="line-clamp-2 break-words">{line.productName}</div>
                          {isReturnDisplayLine ? (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 md:text-xs lg:text-sm">{line.salesManName}</div>
                          ) : null}
                        </div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.qty} border-r border-gray-200 dark:border-gray-700 text-center`}>
                          {isReturnDisplayLine || !isLineEditable ? (
                            line.qty
                          ) : (
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={line.qty}
                              onChange={(e) => handleLineQtyChange(line.lineId, e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-center text-[11px] md:text-base lg:text-lg"
                            />
                          )}
                        </div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.price} border-r border-gray-200 dark:border-gray-700`}>
                          {isReturnDisplayLine || !isLineEditable ? (
                            <div className="text-right">{formatMoney(line.price)}</div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.price}
                              onChange={(e) => handleLineValueChange(line.lineId, "price", e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-right text-[11px] md:text-base lg:text-lg"
                            />
                          )}
                        </div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.tax} border-r border-gray-200 dark:border-gray-700`}>
                          <div className="text-right">{toNum(line.tax, 0).toFixed(2)}</div>
                        </div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.discount} border-r border-gray-200 dark:border-gray-700`}>
                          {isReturnDisplayLine || !isLineEditable ? (
                            <div className="text-right">{formatMoney(line.discount)}</div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.discount}
                              onChange={(e) => handleLineValueChange(line.lineId, "discount", e.target.value)}
                              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-right text-[11px] md:text-base lg:text-lg"
                            />
                          )}
                        </div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.total} border-r border-gray-200 dark:border-gray-700 text-right font-medium`}>{formatMoney(line.total)}</div>
                        <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.salesMan} border-r border-gray-200 dark:border-gray-700 truncate`}>
                          {isReturnDisplayLine ? "-" : (line.salesManName || "-")}
                        </div>
                        <div className={`px-1 py-1.5 ${POS_TABLE_COLS.action}`}>
                          {isReturnDisplayLine ? null : (
                            <div className="flex w-full items-center justify-end gap-1 pr-2">
                              <button
                                onClick={() => toggleLineEdit(line.lineId)}
                                className={`glass-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded p-1.5 ${
                                  isLineEditable ? "glass-btn-warning" : "glass-btn-secondary"
                                }`}
                                aria-label={isLineEditable ? "Lock row editing" : "Edit row"}
                                title={isLineEditable ? "Lock row editing" : "Edit qty, price and discount"}
                              >
                                <Pencil className="h-5 w-5 text-slate-700" />
                              </button>
                              <button
                                onClick={() => openSalesManDialog(line)}
                                className={`glass-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded p-1.5 ${
                                  line.salesManId ? "glass-btn-success" : "glass-btn-primary"
                                }`}
                                aria-label="Assign sales man"
                                title={line.salesManId ? `Sales Man ID: ${line.salesManId}` : "Assign sales man"}
                              >
                                <UserRound className="h-5 w-5 text-slate-700" />
                              </button>
                              <button
                                onClick={() => handleRemoveLine(line.lineId)}
                                className="glass-btn glass-btn-danger inline-flex h-9 w-9 shrink-0 items-center justify-center rounded p-1.5"
                                aria-label="Remove line"
                              >
                                <Trash2 className="inline h-5 w-5 text-slate-700" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex border-t border-gray-200 dark:border-gray-700 bg-gray-100 text-[11px] font-bold text-gray-700 dark:text-gray-300 md:text-base lg:text-lg">
                <div className={`px-1.5 py-2 ${POS_TABLE_COLS.sNo} border-r border-gray-200 dark:border-gray-700 text-center`}>-</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.barcode} border-r border-gray-200 dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.product} border-r border-gray-200 dark:border-gray-700`}></div>
                <div className={`px-1.5 py-2 ${POS_TABLE_COLS.qty} border-r border-gray-200 dark:border-gray-700 text-center text-red-600`}>
                  {displayCartLines.reduce((sum, line) => sum + toNum(line.qty, 0), 0)}
                </div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.price} border-r border-gray-200 dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.tax} border-r border-gray-200 dark:border-gray-700`}></div>
                <div className={`px-1.5 py-2 ${POS_TABLE_COLS.discount} border-r border-gray-200 dark:border-gray-700 text-right text-red-600`}>{formatMoney(summary.totalDiscount)}</div>
                <div className={`px-1.5 py-2 ${POS_TABLE_COLS.total} border-r border-gray-200 dark:border-gray-700 text-right text-red-600`}>{formatMoney(summary.amount)}</div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.salesMan} border-r border-gray-200 dark:border-gray-700`}></div>
                <div className={`px-1.5 py-1.5 ${POS_TABLE_COLS.action}`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full xl:flex xl:min-h-0">
        <div className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm p-3 xl:flex xl:h-full xl:flex-col">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Date</span>
                <span className="text-gray-900 dark:text-gray-100">{now.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Time</span>
                <span className="text-gray-900 dark:text-gray-100">{now.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-b border-gray-200 dark:border-gray-700 py-1.5">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_96px]">
              <div className="space-y-1.5">
                <div>
                  <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer Number</label>
                  <input
                    type="text"
                    value={newCustomer.mobileNo}
                    onChange={(e) => handleCustomerNumberChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCustomerNumberLookup(e.currentTarget.value);
                      }
                    }}
                    placeholder="Write customer number and press Enter"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1.5 py-0.5 text-[9px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer Name</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => handleCustomerNamePanelChange(e.target.value)}
                    placeholder="Customer name"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1.5 py-0.5 text-[9px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {creditEnabled ? (
                  <div>
                    <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Remarks</label>
                    <input
                      type="text"
                      value={creditRemarks}
                      onChange={(event) => setCreditRemarks(event.target.value)}
                      placeholder="Remarks"
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1.5 py-0.5 text-[9px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 pt-0 md:pt-6">
                <label className="inline-flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  <span>Credit</span>
                  <input
                    type="checkbox"
                    checked={creditEnabled}
                    disabled={!hasCreditEligibleCustomer}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setCreditEnabled(checked);
                      if (!checked) setCreditRemarks("");
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600"
                  />
                </label>
                <label className="inline-flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  <span>IGST</span>
                  <input
                    type="checkbox"
                    checked={igstEnabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setIgstEnabled(checked);
                      if (!checked) setPlaceOfSupplyStateId("");
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600"
                  />
                </label>
              </div>
            </div>

            {igstEnabled ? (
              <div>
                <label className="mb-0.5 block text-[8px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Place Of Supply
                </label>
                <select
                  value={placeOfSupplyStateId}
                  onChange={(event) => setPlaceOfSupplyStateId(event.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-[9px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select state</option>
                  {customerConfigOptions.states.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 py-3">
            <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-[1.1fr_0.9fr_72px] border-b bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                <div className="px-2 py-2">Last Bill</div>
                <div className="border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-right">Amount</div>
                <div className="border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-center">Action</div>
              </div>
              <div className="h-28 overflow-y-auto">
                {latestPosDocument ? (
                  <div className="grid grid-cols-[1.1fr_0.9fr_72px] items-center text-xs text-gray-700 dark:text-gray-300">
                    <div className="px-2 py-2 font-semibold">
                      {formatLatestPosDocumentNumber(latestPosDocument)}
                    </div>
                    <div className="border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-right font-semibold">
                      {formatMoney(latestPosDocument.amount || 0)}
                    </div>
                    <div className="border-l border-gray-200 dark:border-gray-700 px-1 py-1.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handlePrintLatestPosDocument}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title={latestPosDocument.type === "return" ? "Print last saved return" : "Print last saved bill"}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteLastSavedSale}
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
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-gray-600"
                          title={
                            !canDeleteLatestPosDocument(latestPosDocument)
                              ? "This document cannot be deleted from POS Sale"
                              : latestPosDocument.type === "return"
                                ? ["settled", "paid", "cancelled"].includes(
                                    String(latestPosDocument?.bill?.status || "").toLowerCase()
                                  )
                                  ? "Closed return cannot be deleted"
                                  : "Cancel last saved return"
                                : ["settled", "cancelled"].includes(
                                    String(latestPosDocument?.bill?.status || "").toLowerCase()
                                  )
                                  ? "Closed bill cannot be deleted"
                                  : "Delete last saved bill"
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

          <div className={`${summaryPanelSpacingClass} border-t border-gray-200 dark:border-gray-700 pt-3 ${summaryPanelTextClass}`}>
            <div className="flex items-center justify-between text-base md:text-lg lg:text-xl">
              <span className="font-extrabold text-gray-800 dark:text-gray-100">Amount</span>
              <span className={`font-extrabold ${summary.amount < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                {formatMoney(summary.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Qty/Pcs</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {displayCartLines.reduce((sum, line) => sum + toNum(line.qty, 0), 0).toFixed(2)}/{displayCartLines.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Gross Value</span>
              <span className={`font-bold ${summary.grossValue < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                {formatMoney(summary.grossValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Addl Discount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(summary.addlDiscount)}</span>
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
    <div className="flex flex-1 min-h-0 flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
      <FilterableDataTable
        rows={searchResults}
        columns={posSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No POS sales found"
        searchPlaceholder="Search in POS sale fields..."
        exportFileName="pos_sale_report"
        exportSheetName="POS Sale"
        exportTitle={resolvedExportCompanyName}
        exportTitleResolver={resolveExportCompanyTitle}
        exportSubtitle="POS SALE Report"
        enableColumnResize
        tablePreferenceKey="sales.pos_sale.search"
        onExportRows={loadAllPosSearchRows}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={(p) => {
          setSearchPage(p);
          runPosSearch(null, p, searchLimit);
        }}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
          runPosSearch(null, 1, value);
        }}
        paginationMode="server"
        fillHeight
      />
    </div>
  );

  return (
    <div className="pos-sale-page min-h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate("/sales")}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            aria-label="Back to sales"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="pos-sale-page-title text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Sales
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>POS Sale</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!showSearchPage && (
            <>
              <button
                onClick={() => void downloadLastPosSalePdf()}
                disabled={downloadingPosPdf}
                className="glass-btn glass-btn-secondary inline-flex items-center disabled:opacity-50"
              >
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </button>
              <button
                onClick={() => {
                  if (!validateSaleEntry()) return;
                  if (posCheckoutPrefs.paymentDialogVisible) {
                    openPaymentDialog();
                    return;
                  }
                  const isUnsettledSave = posCheckoutPrefs.saleSaveAs === "unsettled";
                  handleSaveSale({
                    shouldPrint: false,
                    paymentFormOverride: buildQuickPaymentFormSnapshot({ unsettled: isUnsettledSave }),
                    allowUnsettledWithoutPayment: isUnsettledSave,
                  });
                }}
                disabled={saving}
                className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1" />
                {saving ? "Saving..." : "Save"}
              </button>
              {!posCheckoutPrefs.paymentDialogVisible ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!validateSaleEntry()) return;
                    const isUnsettledSave = posCheckoutPrefs.saleSaveAs === "unsettled";
                    handleSaveSale({
                      shouldPrint: true,
                      paymentFormOverride: buildQuickPaymentFormSnapshot({ unsettled: isUnsettledSave }),
                      allowUnsettledWithoutPayment: isUnsettledSave,
                    });
                  }}
                  disabled={saving}
                  className="glass-btn glass-btn-primary inline-flex items-center disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  {saving ? "Saving..." : "Save & Print"}
                </button>
              ) : null}
            </>
          )}
          {showSearchPage && (
            <UploadImportButton
              endpoint="/pos-sales/bulk"
              fieldConfig={POS_SALE_IMPORT_CONFIG}
            />
          )}
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

        {loading && <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Loading master data...</p>}
      </div>

      {salesManDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closeSalesManDialog}
        >
          <div
            className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sales Man</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Write or scan the Sales Man ID</div>
              </div>
              <button
                type="button"
                onClick={closeSalesManDialog}
                className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-100"
                aria-label="Close sales man dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4">
              <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Sales Man ID</label>
              <input
                type="text"
                value={salesManDialog.value}
                onChange={(event) =>
                  setSalesManDialog((prev) => ({ ...prev, value: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveSalesManDialog();
                  }
                }}
                placeholder="Write or scan Sales Man ID"
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              <button
                type="button"
                onClick={closeSalesManDialog}
                className="glass-btn glass-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSalesManDialog}
                className="glass-btn glass-btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {quickCustomerDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closeQuickCustomerDialog}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-7xl flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quick Customer</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Press Enter to move to next field. On mobile number Enter, existing customers appear below.
                </div>
              </div>
              <button
                type="button"
                onClick={closeQuickCustomerDialog}
                className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-100"
                aria-label="Close quick customer dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 xl:grid-cols-2">
                <DialogTextField
                  label="Mobile No"
                  name="mobileNo"
                  value={quickCustomer.mobileNo}
                  onChange={handleQuickCustomerChange}
                  onKeyDown={(event) => handleQuickCustomerFieldKeyDown("mobileNo", event)}
                  inputRef={(node) => {
                    quickCustomerFieldRefs.current.mobileNo = node;
                  }}
                />
                <DialogTextField
                  label="Address"
                  name="address"
                  value={quickCustomer.address}
                  onChange={handleQuickCustomerChange}
                  onKeyDown={(event) => handleQuickCustomerFieldKeyDown("address", event)}
                  inputRef={(node) => {
                    quickCustomerFieldRefs.current.address = node;
                  }}
                />

                <DialogTextField
                  label="Name"
                  name="name"
                  value={quickCustomer.name}
                  onChange={handleQuickCustomerChange}
                  onKeyDown={(event) => handleQuickCustomerFieldKeyDown("name", event)}
                  inputRef={(node) => {
                    quickCustomerFieldRefs.current.name = node;
                  }}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DialogSelectField
                    label="City"
                    name="cityId"
                    value={quickCustomer.cityId}
                    options={customerConfigOptions.cities}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("cityId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.cityId = node;
                    }}
                  />
                  <DialogSelectField
                    label="State"
                    name="stateId"
                    value={quickCustomer.stateId}
                    options={customerConfigOptions.states}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("stateId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.stateId = node;
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DialogTextField
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={quickCustomer.dateOfBirth}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("dateOfBirth", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.dateOfBirth = node;
                    }}
                  />
                  <DialogTextField
                    label="Billing Name"
                    name="billingName"
                    value={quickCustomer.billingName}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("billingName", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.billingName = node;
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DialogSelectField
                    label="Customer Category"
                    name="customerCategoryId"
                    value={quickCustomer.customerCategoryId}
                    options={customerConfigOptions.customerCategories}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("customerCategoryId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.customerCategoryId = node;
                    }}
                  />
                  <DialogTextField
                    label="Section/Religion"
                    name="sectionReligion"
                    value={quickCustomer.sectionReligion}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("sectionReligion", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.sectionReligion = node;
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DialogTextField
                    label="Card No"
                    name="cardNo"
                    value={quickCustomer.cardNo}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("cardNo", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.cardNo = node;
                    }}
                  />
                  <DialogTextField
                    label="GST No"
                    name="gstNo"
                    value={quickCustomer.gstNo}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("gstNo", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.gstNo = node;
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DialogTextField
                    label="Email Id"
                    name="emailId"
                    value={quickCustomer.emailId}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("emailId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.emailId = node;
                    }}
                  />
                  <DialogSelectField
                    label="Area"
                    name="areaId"
                    value={quickCustomer.areaId}
                    options={customerConfigOptions.areas}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("areaId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.areaId = node;
                    }}
                  />
                </div>

                <div className="xl:col-span-2">
                  <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Search Results</div>
                  <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                    <div className="max-h-[320px] overflow-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="sticky top-0 bg-gray-50 text-gray-700 dark:text-gray-300">
                          <tr>
                            <th className="w-10 px-3 py-2 text-left"></th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">GSTNO</th>
                            <th className="px-3 py-2 text-left">Area</th>
                            <th className="px-3 py-2 text-left">Mobile</th>
                            <th className="px-3 py-2 text-left">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quickCustomerSearchResults.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                                No matched customers
                              </td>
                            </tr>
                          ) : (
                            quickCustomerSearchResults.map((row) => {
                              const isSelected = row.value === quickCustomerSelectedId;
                              return (
                                <tr
                                  key={row.value}
                                  className={`border-t dark:border-gray-700 ${isSelected ? "bg-blue-50 dark:bg-indigo-900/30" : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                                >
                                  <td className="px-3 py-2">
                                    <input
                                      type="radio"
                                      checked={isSelected}
                                      onChange={() => setQuickCustomerSelectedId(row.value)}
                                      className="h-4 w-4 accent-blue-600"
                                    />
                                  </td>
                                  <td className="px-3 py-2">{row.name || "-"}</td>
                                  <td className="px-3 py-2">{row.gstNo || "-"}</td>
                                  <td className="px-3 py-2">{row.areaName || "-"}</td>
                                  <td className="px-3 py-2">{row.mobileNo || "-"}</td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => applyQuickCustomerSelection(row)}
                                      className="glass-btn glass-btn-primary"
                                    >
                                      Select
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-5 py-4">
              <button
                type="button"
                onClick={saveQuickCustomer}
                disabled={quickCustomerSaving}
                className="glass-btn glass-btn-success disabled:opacity-50"
              >
                {quickCustomerSaving ? "Saving..." : "Save"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickCustomerSelection(selectedQuickCustomerSearchRow)}
                  disabled={!selectedQuickCustomerSearchRow}
                  className="glass-btn glass-btn-primary disabled:opacity-50"
                >
                  Select
                </button>
                <button
                  type="button"
                  onClick={closeQuickCustomerDialog}
                  disabled={quickCustomerSaving}
                  className="glass-btn glass-btn-secondary disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {discountDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closeDiscountDialog}
        >
          <div
            className="flex max-h-[86vh] w-full max-w-5xl flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sale Discount</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Select sale rows and apply a discount percentage to the current POS bill.
                </div>
              </div>
              <button
                type="button"
                onClick={closeDiscountDialog}
                className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-100"
                aria-label="Close discount dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">
              <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                <div className="max-h-[44vh] overflow-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="w-12 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={cartWithTotals.length > 0 && discountSelectedLineIds.length === cartWithTotals.length}
                            onChange={handleDiscountToggleAll}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </th>
                        <th className="px-3 py-3 text-left">Barcode</th>
                        <th className="px-3 py-3 text-left">Detail</th>
                        <th className="px-3 py-3 text-right">Price</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-left">Discount</th>
                        <th className="px-3 py-3 text-right">Addin %</th>
                        <th className="px-3 py-3 text-right">D.Value</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discountDialogRows.map((line, index) => (
                        <tr key={line.lineId} className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={discountDialogSelectedSet.has(line.lineId)}
                                onChange={() => handleDiscountRowToggle(line.lineId)}
                                className="h-4 w-4 accent-blue-600"
                              />
                              <span className="text-gray-600 dark:text-gray-300">{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono">{line.barcode || "-"}</td>
                          <td className="px-3 py-3">{line.productName || "-"}</td>
                          <td className="px-3 py-3 text-right">{formatMoney(line.price)}</td>
                          <td className="px-3 py-3 text-right">{toNum(line.qty, 0)}</td>
                          <td className="px-3 py-3">{`${formatMoney(line.discount)} @ ${line.appliedPercent}%`}</td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.percentInput}
                              onChange={(event) => handleDiscountRowPercentChange(line.lineId, event.target.value)}
                              className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-right text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.valueInput}
                              onChange={(event) => handleDiscountRowValueChange(line.lineId, event.target.value)}
                              className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-right text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">{formatMoney(line.previewNetAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountPercentInput}
                    onChange={(event) => applyDiscountPercentToSelected(event.target.value)}
                    className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">D.Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountValueInput}
                    onChange={(event) => applyDiscountValueToSelected(event.target.value)}
                    className="w-40 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="pb-2 text-sm text-gray-600 dark:text-gray-300">
                  Allowed on selected amount: {formatMoney(discountDialogTotals.selectedAmount)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={applyDiscountDialog}
                  className="glass-btn glass-btn-primary"
                >
                  Apply ({formatMoney(discountDialogTotals.previewDiscountValue)})
                </button>
                <button
                  type="button"
                  onClick={closeDiscountDialog}
                  className="glass-btn glass-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paymentDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closePaymentDialog}
        >
          <div
            className="w-full max-w-3xl rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">POS Payment</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Review bill amount and enter received payment</div>
              </div>
              <button
                type="button"
                onClick={closePaymentDialog}
                className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-100"
                aria-label="Close payment dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1.05fr_1.4fr]">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-300">Bill(s) Amount</span>
                  <span className={`font-semibold ${paymentDisplayTotals.billAmount < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {formatMoney(paymentDisplayTotals.billAmount)}
                  </span>
                </div>
                <div className="flex justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-300">Discount Amount</span>
                  <span className="font-semibold">{formatMoney(summary.totalDiscount)}</span>
                </div>
                <div className="flex justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-300">Net Amount</span>
                  <span className={`font-semibold ${paymentDisplayTotals.netAmount < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {formatMoney(paymentDisplayTotals.netAmount)}
                  </span>
                </div>
                <div className="flex justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-300">Balance</span>
                  <span className={`font-semibold ${paymentDisplayTotals.balanceAmount > 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                    {formatMoney(paymentDisplayTotals.balanceAmount)}
                  </span>
                </div>
                <div className="flex justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <span className="text-gray-600 dark:text-gray-300">Received</span>
                  <span className="font-semibold">{formatMoney(paymentDisplayTotals.receivedAmount)}</span>
                </div>
                {paymentDisplayTotals.changeAmount > 0 && (
                  <div className="flex justify-between rounded border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2">
                    <span className="text-gray-700 dark:text-gray-300">Change</span>
                    <span className="font-semibold">{formatMoney(paymentDisplayTotals.changeAmount)}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                {paymentTotals.refundAmount > 0 && (
                  <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-amber-800 dark:text-amber-400">
                        Confirm the refund before saving. Any received amount is added to the refund.
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          paymentForm.refundApproved
                            ? handlePaymentFieldChange("refundApproved", false)
                            : handleConfirmRefund()
                        }
                        className={`glass-btn ${paymentForm.refundApproved ? "glass-btn-success" : "glass-btn-primary"}`}
                      >
                        {paymentForm.refundApproved
                          ? `Refunded ${formatMoney(paymentTotals.refundAmount)}`
                          : `Refund ${formatMoney(paymentTotals.refundAmount)}`}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cash</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.cashAmount}
                    onChange={(event) => handlePaymentFieldChange("cashAmount", event.target.value)}
                    onKeyDown={handlePaymentAmountKeyDown}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter cash received"
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Card Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.cardAmount}
                      onChange={(event) => handlePaymentFieldChange("cardAmount", event.target.value)}
                      onKeyDown={handleCardAmountKeyDown}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Card Type</label>
                    <select
                      ref={cardTypeSelectRef}
                      value={paymentForm.cardTypeId}
                      onChange={(event) => {
                        skipCardTypeSaveOnNextEnterRef.current = false;
                        handlePaymentFieldChange("cardTypeId", event.target.value);
                      }}
                      onKeyDown={handleCardTypeKeyDown}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select card type</option>
                      {cardTypes.map((row) => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">UPI Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.upiAmount}
                      onChange={(event) => handlePaymentFieldChange("upiAmount", event.target.value)}
                      onKeyDown={handleUpiAmountKeyDown}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">UPI Provider</label>
                    <select
                      ref={upiProviderSelectRef}
                      value={paymentForm.upiProviderId}
                      onChange={(event) => {
                        skipUpiProviderSaveOnNextEnterRef.current = false;
                        handlePaymentFieldChange("upiProviderId", event.target.value);
                      }}
                      onKeyDown={handleUpiProviderKeyDown}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select UPI provider</option>
                      {upiProviders.map((row) => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              <button
                type="button"
                onClick={closePaymentDialog}
                disabled={saving}
                className="glass-btn glass-btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveSale({ shouldPrint: false })}
                disabled={saving}
                className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
              >
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => handleSaveSale({ shouldPrint: true })}
                disabled={saving}
                className="glass-btn glass-btn-primary inline-flex items-center disabled:opacity-50"
              >
                <Printer className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Save & Print"}
              </button>
            </div>
          </div>
        </div>
      )}
      <CounterAssignmentDialog
        open={counterAssignmentOpen}
        onClose={() => setCounterAssignmentOpen(false)}
      />
    </div>
  );
};

export default POSSales;
