import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileText, Pencil, PlusCircle, Printer, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import { fetchReceiptCompanyInfo } from "../../utils/receiptCompanyInfo";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import UploadImportButton from "../../components/UploadImportButton";
import CounterAssignmentDialog from "../../components/CounterAssignmentDialog";
import { usePrintContext } from "../../context/PrintContext";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Checkbox, Radio, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";
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

// Matches config('pagination.resources.pos_sales.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchPosSaleGroupSummaries, onFetchGroupRows: fetchPosSaleGroupRows } =
  createGroupFetchers("/pos-sales", { customer_name: "customer_id", user_name: "user_id" });

// Shared shape for both the initial bulk customer preload and async search results below --
// keeping them identical means a customer found via search behaves exactly like one that was
// already cached (same fields available to applyCustomerPanelRow / the quick-customer dialog).
const mapCustomerRow = (row, areaMap) => ({
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
const POS_TABLE_MIN_WIDTH = 940;
const posSalesColCellSx = (key, extra = {}) => ({
  px: 0.75,
  py: 0.75,
  width: POS_TABLE_COLS[key],
  flexShrink: 0,
  borderRight: 1,
  borderColor: "divider",
  ...extra,
});
const posSalesFilterInputSx = {
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
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      type={type}
      name={name}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      size="small"
      fullWidth
      sx={{ ml: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    />
  </Stack>
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
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      select
      name={name}
      value={value}
      onChange={onChange}
      size="small"
      fullWidth
      sx={{ ml: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    >
      <MenuItem value="">{placeholder} {label}</MenuItem>
      {options.map((row) => (
        <MenuItem key={row.value} value={row.value}>
          {row.label}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
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
  <Box>
    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <TextField
      inputRef={inputRef}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
    />
  </Box>
);

const posSalesDialogNativeSelectSx = {
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
  <Box>
    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <Box
      component="select"
      ref={inputRef}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      sx={posSalesDialogNativeSelectSx}
    >
      <option value="">{placeholder}</option>
      {options.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </Box>
  </Box>
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
        render: (value) => <Box sx={{ textAlign: "center" }}>{toNum(value || 0)}</Box>,
      },
      {
        key: "amount",
        label: "Amount",
        valueGetter: (row) => toNum(row.amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatMoney(value || 0)}</Box>,
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
          // Was {all:true} (capped 2000, unconditional on every page load). Customer now has real
          // async search (handleAsyncCustomerSearch below) covering the ~1,000,000-row real table,
          // so this only needs to seed a small initial/instant-match cache.
          api.get("/customers", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
          api.get("/pos-sales/stock-products").catch(() => ({ data: { data: [] } })),
          api.get("/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
          cfg("city"),
          cfg("state"),
          cfg("customer_category"),
          cfg("sale_area"),
        ]);

      const customerRows = customersRes.data?.data || [];
      const areaMap = new Map(areas.map((row) => [String(row.value), row.label]));
      setCustomers(customerRows.map((row) => mapCustomerRow(row, areaMap)));
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

  // customers is only ever seeded with a small batch (see loadMasterData above) -- this hits
  // /customers' own ?search= endpoint for anything beyond that, and merges any new matches into
  // the cache so a customer found once stays instantly findable for the rest of the session.
  const handleAsyncCustomerSearch = useCallback(async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/customers", { params: { search: trimmed, limit: 20 } });
      const rows = res.data?.data || [];
      const areaMap = new Map(customerConfigOptions.areas.map((row) => [String(row.value), row.label]));
      const mapped = rows.map((row) => mapCustomerRow(row, areaMap));
      if (mapped.length) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newOnes = mapped.filter((c) => !existingIds.has(c.id));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, [customerConfigOptions.areas]);

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

  const handleCustomerNumberLookup = useCallback(async (rawValue) => {
    const query = String(rawValue || "").trim();
    const digitsQuery = query.replace(/\D/g, "");

    if (!query) {
      setExistingCustomerId("");
      setNewCustomer((prev) => ({ ...prev, mobileNo: "", name: "" }));
      return null;
    }

    const findByNumber = (list) => list.find((row) => {
      const mobileDigits = String(row.mobileNo || "").replace(/\D/g, "");
      return digitsQuery ? mobileDigits === digitsQuery : String(row.mobileNo || "").trim() === query;
    });

    // Fast path: already-cached customer, no network round trip.
    let matched = findByNumber(customers);
    if (!matched) {
      // Not in the local ~300-row seed cache -- the real table has ~1,000,000 rows, so this is
      // expected for most numbers, not an edge case. Ask the server before concluding "new customer".
      const serverResults = await handleAsyncCustomerSearch(query);
      matched = findByNumber(serverResults);
    }

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
  }, [applyCustomerPanelRow, customers, handleAsyncCustomerSearch]);

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

  const runQuickCustomerSearch = useCallback(async (mobileValue = quickCustomer.mobileNo) => {
    const rawQuery = String(mobileValue || "").trim();
    if (!rawQuery) {
      setQuickCustomerSearchResults([]);
      setQuickCustomerSelectedId("");
      return [];
    }

    // Ask the server too -- customers is only a small seed cache (see handleAsyncCustomerSearch),
    // so a local-only filter here would miss most real matches. Built from this render's `customers`
    // snapshot plus the server's response rather than re-reading `customers` state after the await,
    // since the state update from the search wouldn't be visible in this closure yet.
    const serverResults = await handleAsyncCustomerSearch(rawQuery);
    const existingIds = new Set(customers.map((row) => row.id));
    const pool = [...customers, ...serverResults.filter((row) => !existingIds.has(row.id))];

    const digitsQuery = rawQuery.replace(/\D/g, "");
    const matched = pool
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
  }, [customers, quickCustomer.mobileNo, handleAsyncCustomerSearch]);

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

    const digitsQuery = mobileNo.replace(/\D/g, "");
    let exactExisting = customers.find(
      (row) => String(row.mobileNo || "").replace(/\D/g, "") === digitsQuery
    );
    if (!exactExisting) {
      // Local cache is only a ~300-row seed -- check the server before concluding this is a new
      // customer. Skipping this previously meant a customer that existed but wasn't in the local
      // cache would silently get a duplicate record created below.
      const serverResults = await handleAsyncCustomerSearch(mobileNo);
      exactExisting = serverResults.find(
        (row) => String(row.mobileNo || "").replace(/\D/g, "") === digitsQuery
      );
    }
    if (exactExisting) {
      await runQuickCustomerSearch(mobileNo);
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
      fetchReceiptCompanyInfo(authUser?.company_id),
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
    const companyInfo = await fetchReceiptCompanyInfo(authUser?.company_id);
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
      const companyInfo = await fetchReceiptCompanyInfo(authUser?.company_id);
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
    <Box
      sx={{
        display: { xs: "flex", xl: "grid" },
        flexDirection: "column",
        gap: 1,
        flex: { xl: 1 },
        minHeight: { xl: 0 },
        gridTemplateColumns: { xl: "minmax(0,1fr) 300px" },
        alignItems: { xl: "stretch" },
      }}
    >
      <Box sx={{ minWidth: 0, display: { xl: "flex" }, minHeight: { xl: 0 } }}>
        <Box
          sx={{
            width: "100%",
            bgcolor: "background.paper",
            border: 1,
            borderColor: "grey.300",
            borderRadius: "7px",
            boxShadow: 1,
            overflow: "hidden",
            display: { xl: "flex" },
            height: { xl: "100%" },
            minHeight: { xl: 0 },
            flexDirection: { xl: "column" },
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 1.5 }}>
            <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "flex-end", gap: 1 }}>
              <Box sx={{ width: "100%", minWidth: { md: 220 }, flex: 1 }}>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "error.main" }}>Barcode</Typography>
                <TextField
                  inputRef={barcodeInputRef}
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
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                />
              </Box>
              <Box sx={{ width: "100%", minWidth: { md: 280 }, flex: 1.3 }}>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "error.main" }}>Product (In Stock)</Typography>
                <TextField
                  select
                  value={addProductKey}
                  onChange={(e) => setAddProductKey(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                >
                  <MenuItem value="">Select product</MenuItem>
                  {productOptions.map((row) => (
                    <MenuItem key={row.value} value={row.value}>
                      {row.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ width: 112 }}>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "error.main" }}>Qty</Typography>
                <TextField
                  type="number"
                  slotProps={{ htmlInput: { min: 1 } }}
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLine();
                    }
                  }}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                />
              </Box>
              <Box sx={{ width: 40 }}>
                <Button
                  onClick={handleAddLine}
                  disabled={applyingReturn}
                  className="glass-btn glass-btn-primary"
                  aria-label="Add product"
                  sx={{ height: "34px", width: "100%", minWidth: 0, p: 0 }}
                >
                  <PlusCircle size={16} />
                </Button>
              </Box>
            </Stack>
            {selectedStockHint ? <Typography sx={{ mt: 1, fontSize: 10.5, color: "text.secondary" }}>{selectedStockHint}</Typography> : null}
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowX: "auto" }}>
            <Box sx={{ display: "flex", height: { xs: 420, xl: "100%" }, minHeight: { xs: 420, xl: 0 }, flexDirection: "column", minWidth: POS_TABLE_MIN_WIDTH }}>
              <Box sx={{ display: "flex", borderBottom: 1, borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12), fontSize: { xs: 10, md: 14, lg: 16 }, fontWeight: 600, color: "text.secondary" }}>
                <Box sx={posSalesColCellSx("sNo", { textAlign: "center" })}>S.No</Box>
                <Box sx={posSalesColCellSx("barcode")}>Barcode</Box>
                <Box sx={posSalesColCellSx("product")}>Product</Box>
                <Box sx={posSalesColCellSx("qty", { textAlign: "center" })}>Qty</Box>
                <Box sx={posSalesColCellSx("price", { textAlign: "right" })}>Price</Box>
                <Box sx={posSalesColCellSx("tax", { textAlign: "right" })}>Tax%</Box>
                <Box sx={posSalesColCellSx("discount", { textAlign: "right" })}>Discount</Box>
                <Box sx={posSalesColCellSx("total", { textAlign: "right" })}>Total</Box>
                <Box sx={posSalesColCellSx("salesMan")}>Salesman</Box>
                <Box sx={{ px: 0.75, py: 0.75, width: POS_TABLE_COLS.action, flexShrink: 0, textAlign: "center" }}>Action</Box>
              </Box>

              <Box sx={{ display: "flex", borderBottom: 1, borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.12 : 0.06) }}>
                <Box sx={posSalesColCellSx("sNo")} />
                <Box sx={posSalesColCellSx("barcode")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.barcode}
                    onChange={(e) => handleLineFilterDraftChange("barcode", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Search barcode"
                    sx={posSalesFilterInputSx}
                  />
                </Box>
                <Box sx={posSalesColCellSx("product")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.productName}
                    onChange={(e) => handleLineFilterDraftChange("productName", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Search product"
                    sx={posSalesFilterInputSx}
                  />
                </Box>
                <Box sx={posSalesColCellSx("qty")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.qty}
                    onChange={(e) => handleLineFilterDraftChange("qty", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Qty"
                    sx={{ ...posSalesFilterInputSx, textAlign: "center" }}
                  />
                </Box>
                <Box sx={posSalesColCellSx("price")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.price}
                    onChange={(e) => handleLineFilterDraftChange("price", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Price"
                    sx={{ ...posSalesFilterInputSx, textAlign: "right" }}
                  />
                </Box>
                <Box sx={posSalesColCellSx("tax")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.tax}
                    onChange={(e) => handleLineFilterDraftChange("tax", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Tax"
                    sx={{ ...posSalesFilterInputSx, textAlign: "right" }}
                  />
                </Box>
                <Box sx={posSalesColCellSx("discount")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.discount}
                    onChange={(e) => handleLineFilterDraftChange("discount", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Discount"
                    sx={{ ...posSalesFilterInputSx, textAlign: "right" }}
                  />
                </Box>
                <Box sx={posSalesColCellSx("total")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.total}
                    onChange={(e) => handleLineFilterDraftChange("total", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Total"
                    sx={{ ...posSalesFilterInputSx, textAlign: "right" }}
                  />
                </Box>
                <Box sx={posSalesColCellSx("salesMan")}>
                  <Box
                    component="input"
                    type="text"
                    value={lineFilterDraft.salesManName}
                    onChange={(e) => handleLineFilterDraftChange("salesManName", e.target.value)}
                    onKeyDown={handleLineFilterKeyDown}
                    placeholder="Salesman"
                    sx={posSalesFilterInputSx}
                  />
                </Box>
                <Box sx={{ px: 0.75, py: 0.75, width: POS_TABLE_COLS.action, flexShrink: 0 }} />
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }} style={{ scrollbarGutter: "stable" }}>
                {displayCartLines.length === 0 ? (
                  <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", py: 8, textAlign: "center", fontSize: 10.5, color: "text.disabled" }}>
                    No products added yet.
                  </Box>
                ) : filteredCartLines.length === 0 ? (
                  <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", py: 8, textAlign: "center", fontSize: 10.5, color: "text.disabled" }}>
                    No matching products found.
                  </Box>
                ) : (
                  filteredCartLines.map((line, index) => {
                    const isLineEditable = editingLineId === line.lineId;
                    const isReturnDisplayLine = Boolean(line.isReturnDisplayLine);
                    return (
                      <Box key={line.lineId} sx={{ display: "flex", borderBottom: 1, borderColor: "divider", fontSize: { xs: 11, md: 16, lg: 18 }, "&:hover": { bgcolor: "action.hover" } }}>
                        <Box sx={posSalesColCellSx("sNo", { textAlign: "center" })}>
                          {index + 1}
                        </Box>
                        <Box sx={posSalesColCellSx("barcode")}>
                          <Box sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.2 }}>
                            {line.barcode || "-"}
                          </Box>
                        </Box>
                        <Box sx={posSalesColCellSx("product")}>
                          <Box sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{line.productName}</Box>
                          {isReturnDisplayLine ? (
                            <Box sx={{ fontSize: { xs: 10, md: 12.25, lg: 14 }, color: "text.disabled" }}>{line.salesManName}</Box>
                          ) : null}
                        </Box>
                        <Box sx={posSalesColCellSx("qty", { textAlign: "center" })}>
                          {isReturnDisplayLine || !isLineEditable ? (
                            line.qty
                          ) : (
                            <Box
                              component="input"
                              type="number"
                              min="1"
                              step="1"
                              value={line.qty}
                              onChange={(e) => handleLineQtyChange(line.lineId, e.target.value)}
                              sx={{ width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", bgcolor: "background.paper", color: "text.primary", px: 0.75, py: 0.5, textAlign: "center", fontSize: { xs: 11, md: 16, lg: 18 } }}
                            />
                          )}
                        </Box>
                        <Box sx={posSalesColCellSx("price")}>
                          {isReturnDisplayLine || !isLineEditable ? (
                            <Box sx={{ textAlign: "right" }}>{formatMoney(line.price)}</Box>
                          ) : (
                            <Box
                              component="input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.price}
                              onChange={(e) => handleLineValueChange(line.lineId, "price", e.target.value)}
                              sx={{ width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", bgcolor: "background.paper", color: "text.primary", px: 0.75, py: 0.5, textAlign: "right", fontSize: { xs: 11, md: 16, lg: 18 } }}
                            />
                          )}
                        </Box>
                        <Box sx={posSalesColCellSx("tax")}>
                          <Box sx={{ textAlign: "right" }}>{toNum(line.tax, 0).toFixed(2)}</Box>
                        </Box>
                        <Box sx={posSalesColCellSx("discount")}>
                          {isReturnDisplayLine || !isLineEditable ? (
                            <Box sx={{ textAlign: "right" }}>{formatMoney(line.discount)}</Box>
                          ) : (
                            <Box
                              component="input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.discount}
                              onChange={(e) => handleLineValueChange(line.lineId, "discount", e.target.value)}
                              sx={{ width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", bgcolor: "background.paper", color: "text.primary", px: 0.75, py: 0.5, textAlign: "right", fontSize: { xs: 11, md: 16, lg: 18 } }}
                            />
                          )}
                        </Box>
                        <Box sx={posSalesColCellSx("total", { textAlign: "right", fontWeight: 500 })}>{formatMoney(line.total)}</Box>
                        <Box sx={posSalesColCellSx("salesMan", { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                          {isReturnDisplayLine ? "-" : (line.salesManName || "-")}
                        </Box>
                        <Box sx={{ px: 0.5, py: 0.75, width: POS_TABLE_COLS.action, flexShrink: 0 }}>
                          {isReturnDisplayLine ? null : (
                            <Stack direction="row" sx={{ width: "100%", alignItems: "center", justifyContent: "flex-end", gap: 0.5, pr: 1 }}>
                              <IconButton
                                onClick={() => toggleLineEdit(line.lineId)}
                                className={isLineEditable ? "glass-btn glass-btn-warning" : "glass-btn glass-btn-secondary"}
                                sx={{ height: 36, width: 36, flexShrink: 0, borderRadius: "3.5px", p: 0.75 }}
                                aria-label={isLineEditable ? "Lock row editing" : "Edit row"}
                                title={isLineEditable ? "Lock row editing" : "Edit qty, price and discount"}
                              >
                                <Pencil size={20} style={{ color: "#334155" }} />
                              </IconButton>
                              <IconButton
                                onClick={() => openSalesManDialog(line)}
                                className={line.salesManId ? "glass-btn glass-btn-success" : "glass-btn glass-btn-primary"}
                                sx={{ height: 36, width: 36, flexShrink: 0, borderRadius: "3.5px", p: 0.75 }}
                                aria-label="Assign sales man"
                                title={line.salesManId ? `Sales Man ID: ${line.salesManId}` : "Assign sales man"}
                              >
                                <UserRound size={20} style={{ color: "#334155" }} />
                              </IconButton>
                              <IconButton
                                onClick={() => handleRemoveLine(line.lineId)}
                                className="glass-btn glass-btn-danger"
                                sx={{ height: 36, width: 36, flexShrink: 0, borderRadius: "3.5px", p: 0.75 }}
                                aria-label="Remove line"
                              >
                                <Trash2 size={20} style={{ color: "#334155" }} />
                              </IconButton>
                            </Stack>
                          )}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>

              <Box sx={{ display: "flex", borderTop: 1, borderColor: "divider", bgcolor: "action.hover", fontSize: { xs: 11, md: 16, lg: 18 }, fontWeight: 700, color: "text.secondary" }}>
                <Box sx={posSalesColCellSx("sNo", { textAlign: "center" })}>-</Box>
                <Box sx={posSalesColCellSx("barcode")} />
                <Box sx={posSalesColCellSx("product")} />
                <Box sx={posSalesColCellSx("qty", { textAlign: "center", color: "error.main" })}>
                  {displayCartLines.reduce((sum, line) => sum + toNum(line.qty, 0), 0)}
                </Box>
                <Box sx={posSalesColCellSx("price")} />
                <Box sx={posSalesColCellSx("tax")} />
                <Box sx={posSalesColCellSx("discount", { textAlign: "right", color: "error.main" })}>{formatMoney(summary.totalDiscount)}</Box>
                <Box sx={posSalesColCellSx("total", { textAlign: "right", color: "error.main" })}>{formatMoney(summary.amount)}</Box>
                <Box sx={posSalesColCellSx("salesMan")} />
                <Box sx={{ px: 0.75, py: 0.75, width: POS_TABLE_COLS.action, flexShrink: 0 }} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ width: "100%", display: { xl: "flex" }, minHeight: { xl: 0 } }}>
        <Box sx={{ width: "100%", bgcolor: "background.paper", border: 1, borderColor: "grey.300", borderRadius: "7px", boxShadow: 1, p: 1.5, display: { xl: "flex" }, height: { xl: "100%" }, flexDirection: { xl: "column" } }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1.5, fontSize: 10 }}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
                <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Date</Box>
                <Box component="span" sx={{ color: "text.primary" }}>{now.toLocaleDateString()}</Box>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
                <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Time</Box>
                <Box component="span" sx={{ color: "text.primary" }}>{now.toLocaleTimeString()}</Box>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, borderBottom: 1, borderColor: "divider", py: 0.75 }}>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "minmax(0,1fr) 96px" } }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Box>
                  <Typography component="label" sx={{ mb: 0.25, display: "block", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Customer Number</Typography>
                  <TextField
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
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 9, py: 0.5 } }}
                  />
                </Box>
                <Box>
                  <Typography component="label" sx={{ mb: 0.25, display: "block", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Customer Name</Typography>
                  <TextField
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => handleCustomerNamePanelChange(e.target.value)}
                    placeholder="Customer name"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 9, py: 0.5 } }}
                  />
                </Box>
                {creditEnabled ? (
                  <Box>
                    <Typography component="label" sx={{ mb: 0.25, display: "block", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Remarks</Typography>
                    <TextField
                      type="text"
                      value={creditRemarks}
                      onChange={(event) => setCreditRemarks(event.target.value)}
                      placeholder="Remarks"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 9, py: 0.5 } }}
                    />
                  </Box>
                ) : null}
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: { xs: 0, md: 3 } }}>
                <Stack component="label" direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                  <Box component="span">Credit</Box>
                  <Checkbox
                    checked={creditEnabled}
                    disabled={!hasCreditEligibleCustomer}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setCreditEnabled(checked);
                      if (!checked) setCreditRemarks("");
                    }}
                    size="small"
                    sx={{ p: 0 }}
                  />
                </Stack>
                <Stack component="label" direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                  <Box component="span">IGST</Box>
                  <Checkbox
                    checked={igstEnabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setIgstEnabled(checked);
                      if (!checked) setPlaceOfSupplyStateId("");
                    }}
                    size="small"
                    sx={{ p: 0 }}
                  />
                </Stack>
              </Box>
            </Box>

            {igstEnabled ? (
              <Box>
                <Typography component="label" sx={{ mb: 0.25, display: "block", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                  Place Of Supply
                </Typography>
                <TextField
                  select
                  value={placeOfSupplyStateId}
                  onChange={(event) => setPlaceOfSupplyStateId(event.target.value)}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 9, py: 0.5 } }}
                >
                  <MenuItem value="">Select state</MenuItem>
                  {customerConfigOptions.states.map((row) => (
                    <MenuItem key={row.value} value={row.value}>
                      {row.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            ) : null}
          </Box>

          <Box sx={{ borderTop: 1, borderColor: "divider", py: 1.5 }}>
            <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 72px", borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                <Box sx={{ px: 1, py: 1 }}>Last Bill</Box>
                <Box sx={{ borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Amount</Box>
                <Box sx={{ borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "center" }}>Action</Box>
              </Box>
              <Box sx={{ height: 112, overflowY: "auto" }}>
                {latestPosDocument ? (
                  <Box sx={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 72px", alignItems: "center", fontSize: 10.5, color: "text.secondary" }}>
                    <Box sx={{ px: 1, py: 1, fontWeight: 600 }}>
                      {formatLatestPosDocumentNumber(latestPosDocument)}
                    </Box>
                    <Box sx={{ borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right", fontWeight: 600 }}>
                      {formatMoney(latestPosDocument.amount || 0)}
                    </Box>
                    <Box sx={{ borderLeft: 1, borderColor: "divider", px: 0.5, py: 0.75 }}>
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <IconButton
                          type="button"
                          onClick={handlePrintLatestPosDocument}
                          size="small"
                          sx={{ color: "primary.main", "&:hover": { color: "primary.dark" } }}
                          title={latestPosDocument.type === "return" ? "Print last saved return" : "Print last saved bill"}
                        >
                          <Printer size={16} />
                        </IconButton>
                        <IconButton
                          type="button"
                          onClick={handleDeleteLastSavedSale}
                          size="small"
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
                          sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}
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
                          <Trash2 size={16} />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", px: 1, textAlign: "center", fontSize: 10.5, color: "text.disabled" }}>
                    No saved document yet
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          <Stack sx={{ gap: igstEnabled ? 0.75 : 1, borderTop: 1, borderColor: "divider", pt: 1.5, fontSize: igstEnabled ? { xs: 8, md: 9, lg: 10 } : { xs: 10, md: 12.25, lg: 14 } }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", fontSize: { xs: 16, md: 17.5, lg: 21 } }}>
              <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>Amount</Box>
              <Box component="span" sx={{ fontWeight: 800, color: summary.amount < 0 ? "error.main" : "text.primary" }}>
                {formatMoney(summary.amount)}
              </Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Total Qty/Pcs</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                {displayCartLines.reduce((sum, line) => sum + toNum(line.qty, 0), 0).toFixed(2)}/{displayCartLines.length}
              </Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Gross Value</Box>
              <Box component="span" sx={{ fontWeight: 700, color: summary.grossValue < 0 ? "error.main" : "text.primary" }}>
                {formatMoney(summary.grossValue)}
              </Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Addl Discount</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{formatMoney(summary.addlDiscount)}</Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Total Discount</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{formatMoney(summary.totalDiscount)}</Box>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  const renderSearchPage = () => (
    <Box sx={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column", bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
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
        onFetchGroupSummaries={fetchPosSaleGroupSummaries}
        onFetchGroupRows={fetchPosSaleGroupRows}
        paginationMode="server"
        enableVirtualization
        fillHeight
      />
    </Box>
  );

  return (
    <Box className="pos-sale-page" sx={{ minHeight: "100%", bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={() => navigate("/sales")}
            size="small"
            aria-label="Back to sales"
            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
          >
            <ArrowLeft size={16} />
          </IconButton>
          <Typography component="h1" className="pos-sale-page-title" sx={{ fontSize: 12.25, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              component="button"
              type="button"
              onClick={() => navigate("/sales")}
              sx={{ color: "primary.main", "&:hover": { color: "primary.dark", textDecoration: "underline" } }}
            >
              Sales
            </Box>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">POS Sale</Box>
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          {!showSearchPage && (
            <>
              <Button
                onClick={() => void downloadLastPosSalePdf()}
                disabled={downloadingPosPdf}
                className="glass-btn glass-btn-secondary"
                startIcon={<FileText size={16} />}
              >
                PDF
              </Button>
              <Button
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
                className="glass-btn glass-btn-success"
                startIcon={<Save size={16} />}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              {!posCheckoutPrefs.paymentDialogVisible ? (
                <Button
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
                  className="glass-btn glass-btn-primary"
                  startIcon={<Printer size={16} />}
                >
                  {saving ? "Saving..." : "Save & Print"}
                </Button>
              ) : null}
            </>
          )}
          {showSearchPage && (
            <UploadImportButton
              endpoint="/pos-sales/bulk"
              fieldConfig={POS_SALE_IMPORT_CONFIG}
            />
          )}
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary"
            startIcon={<Search size={16} />}
          >
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, p: 2, display: "flex", flexDirection: "column", gap: 2, pb: { xs: 14, xl: 2 } }}>
        {showSearchPage ? renderSearchPage() : renderEntryPage()}

        {loading && <Typography sx={{ fontSize: 10.5, color: "text.secondary", px: 0.5 }}>Loading master data...</Typography>}
      </Box>

      {salesManDialog.open && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closeSalesManDialog}
        >
          <Box
            sx={{ width: "100%", maxWidth: 448, borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Sales Man</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Write or scan the Sales Man ID</Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closeSalesManDialog}
                size="small"
                aria-label="Close sales man dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X size={16} />
              </IconButton>
            </Stack>

            <Box sx={{ px: 2, py: 2 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "error.main" }}>Sales Man ID</Typography>
              <TextField
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
                size="small"
                fullWidth
                autoFocus
              />
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Button
                type="button"
                onClick={closeSalesManDialog}
                className="glass-btn glass-btn-secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveSalesManDialog}
                className="glass-btn glass-btn-primary"
              >
                Save
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {quickCustomerDialogOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closeQuickCustomerDialog}
        >
          <Box
            sx={{ display: "flex", maxHeight: "92vh", width: "100%", maxWidth: 1280, flexDirection: "column", borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Quick Customer</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                  Press Enter to move to next field. On mobile number Enter, existing customers appear below.
                </Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closeQuickCustomerDialog}
                size="small"
                aria-label="Close quick customer dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X size={16} />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, columnGap: 3, rowGap: 2 }}>
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
                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
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
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
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
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
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
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
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
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
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
                </Box>

                <Box sx={{ gridColumn: { xl: "span 2" } }}>
                  <Typography sx={{ mb: 1, fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Search Results</Typography>
                  <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
                    <Box sx={{ maxHeight: 320, overflow: "auto" }}>
                      <Table sx={{ width: "100%", minWidth: 720 }} size="small">
                        <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover" }}>
                          <TableRow>
                            <TableCell sx={{ width: 40 }} />
                            <TableCell>Name</TableCell>
                            <TableCell>GSTNO</TableCell>
                            <TableCell>Area</TableCell>
                            <TableCell>Mobile</TableCell>
                            <TableCell>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {quickCustomerSearchResults.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "text.disabled" }}>
                                No matched customers
                              </TableCell>
                            </TableRow>
                          ) : (
                            quickCustomerSearchResults.map((row) => {
                              const isSelected = row.value === quickCustomerSelectedId;
                              return (
                                <TableRow
                                  key={row.value}
                                  sx={{ bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08) : "background.paper", "&:hover": { bgcolor: isSelected ? undefined : "action.hover" } }}
                                >
                                  <TableCell>
                                    <Radio
                                      checked={isSelected}
                                      onChange={() => setQuickCustomerSelectedId(row.value)}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>{row.name || "-"}</TableCell>
                                  <TableCell>{row.gstNo || "-"}</TableCell>
                                  <TableCell>{row.areaName || "-"}</TableCell>
                                  <TableCell>{row.mobileNo || "-"}</TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      onClick={() => applyQuickCustomerSelection(row)}
                                      className="glass-btn glass-btn-primary"
                                      size="small"
                                    >
                                      Select
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderTop: 1, borderColor: "divider", px: 2.5, py: 2 }}>
              <Button
                type="button"
                onClick={saveQuickCustomer}
                disabled={quickCustomerSaving}
                className="glass-btn glass-btn-success"
              >
                {quickCustomerSaving ? "Saving..." : "Save"}
              </Button>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <Button
                  type="button"
                  onClick={() => applyQuickCustomerSelection(selectedQuickCustomerSearchRow)}
                  disabled={!selectedQuickCustomerSearchRow}
                  className="glass-btn glass-btn-primary"
                >
                  Select
                </Button>
                <Button
                  type="button"
                  onClick={closeQuickCustomerDialog}
                  disabled={quickCustomerSaving}
                  className="glass-btn glass-btn-secondary"
                >
                  Close
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}

      {discountDialogOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closeDiscountDialog}
        >
          <Box
            sx={{ display: "flex", maxHeight: "86vh", width: "100%", maxWidth: 1024, flexDirection: "column", borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Sale Discount</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                  Select sale rows and apply a discount percentage to the current POS bill.
                </Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closeDiscountDialog}
                size="small"
                aria-label="Close discount dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X size={16} />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2 }}>
              <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
                <Box sx={{ maxHeight: "44vh", overflow: "auto" }}>
                  <Table sx={{ width: "100%", minWidth: 860 }} size="small">
                    <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover" }}>
                      <TableRow>
                        <TableCell sx={{ width: 48 }}>
                          <Checkbox
                            checked={cartWithTotals.length > 0 && discountSelectedLineIds.length === cartWithTotals.length}
                            onChange={handleDiscountToggleAll}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Barcode</TableCell>
                        <TableCell>Detail</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell>Discount</TableCell>
                        <TableCell align="right">Addin %</TableCell>
                        <TableCell align="right">D.Value</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {discountDialogRows.map((line, index) => (
                        <TableRow key={line.lineId} hover>
                          <TableCell>
                            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                              <Checkbox
                                checked={discountDialogSelectedSet.has(line.lineId)}
                                onChange={() => handleDiscountRowToggle(line.lineId)}
                                size="small"
                              />
                              <Box component="span" sx={{ color: "text.secondary" }}>{index + 1}</Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace" }}>{line.barcode || "-"}</TableCell>
                          <TableCell>{line.productName || "-"}</TableCell>
                          <TableCell align="right">{formatMoney(line.price)}</TableCell>
                          <TableCell align="right">{toNum(line.qty, 0)}</TableCell>
                          <TableCell sx={{ color: "text.secondary" }}>{`${formatMoney(line.discount)} @ ${line.appliedPercent}%`}</TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              slotProps={{ htmlInput: { min: 0
                              , step: 0.01 } }}
                              value={line.percentInput}
                              onChange={(event) => handleDiscountRowPercentChange(line.lineId, event.target.value)}
                              size="small"
                              sx={{ width: 80, "& .MuiInputBase-input": { fontSize: 12.25, textAlign: "right" } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                              value={line.valueInput}
                              onChange={(event) => handleDiscountRowValueChange(line.lineId, event.target.value)}
                              size="small"
                              sx={{ width: 96, "& .MuiInputBase-input": { fontSize: 12.25, textAlign: "right" } }}
                            />
                          </TableCell>
                          <TableCell align="right">{formatMoney(line.previewNetAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Box>

            <Stack sx={{ flexDirection: { xs: "column", lg: "row" }, gap: 1.5, borderTop: 1, borderColor: "divider", px: 2.5, py: 2, alignItems: { lg: "center" }, justifyContent: { lg: "space-between" } }}>
              <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "flex-end", gap: 1.5 }}>
                <Box>
                  <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Discount %</Typography>
                  <TextField
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                    value={discountPercentInput}
                    onChange={(event) => applyDiscountPercentToSelected(event.target.value)}
                    size="small"
                    autoFocus
                    sx={{ width: 128, "& .MuiInputBase-input": { fontSize: 12.25 } }}
                  />
                </Box>
                <Box>
                  <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>D.Value</Typography>
                  <TextField
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                    value={discountValueInput}
                    onChange={(event) => applyDiscountValueToSelected(event.target.value)}
                    size="small"
                    sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25 } }}
                  />
                </Box>
                <Typography sx={{ pb: 1, fontSize: 12.25, color: "text.secondary" }}>
                  Allowed on selected amount: {formatMoney(discountDialogTotals.selectedAmount)}
                </Typography>
              </Stack>

              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  type="button"
                  onClick={applyDiscountDialog}
                  className="glass-btn glass-btn-primary"
                >
                  Apply ({formatMoney(discountDialogTotals.previewDiscountValue)})
                </Button>
                <Button
                  type="button"
                  onClick={closeDiscountDialog}
                  className="glass-btn glass-btn-secondary"
                >
                  Close
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}

      {paymentDialogOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closePaymentDialog}
        >
          <Box
            sx={{ width: "100%", maxWidth: 768, borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>POS Payment</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Review bill amount and enter received payment</Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closePaymentDialog}
                size="small"
                aria-label="Close payment dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X size={16} />
              </IconButton>
            </Stack>

            <Box sx={{ display: "grid", gap: 2, px: 2, py: 2, gridTemplateColumns: { lg: "1.05fr 1.4fr" } }}>
              <Stack sx={{ gap: 1, fontSize: 12.25 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", borderRadius: "3.5px", border: 1, borderColor: "divider", px: 1.5, py: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>Bill(s) Amount</Box>
                  <Box component="span" sx={{ fontWeight: 600, color: paymentDisplayTotals.billAmount < 0 ? "error.main" : "text.primary" }}>
                    {formatMoney(paymentDisplayTotals.billAmount)}
                  </Box>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between", borderRadius: "3.5px", border: 1, borderColor: "divider", px: 1.5, py: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>Discount Amount</Box>
                  <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(summary.totalDiscount)}</Box>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between", borderRadius: "3.5px", border: 1, borderColor: "divider", px: 1.5, py: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>Net Amount</Box>
                  <Box component="span" sx={{ fontWeight: 600, color: paymentDisplayTotals.netAmount < 0 ? "error.main" : "text.primary" }}>
                    {formatMoney(paymentDisplayTotals.netAmount)}
                  </Box>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between", borderRadius: "3.5px", border: 1, borderColor: "divider", px: 1.5, py: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>Balance</Box>
                  <Box component="span" sx={{ fontWeight: 600, color: paymentDisplayTotals.balanceAmount > 0 ? "error.main" : "success.main" }}>
                    {formatMoney(paymentDisplayTotals.balanceAmount)}
                  </Box>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between", borderRadius: "3.5px", border: 1, borderColor: "divider", px: 1.5, py: 1 }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>Received</Box>
                  <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(paymentDisplayTotals.receivedAmount)}</Box>
                </Stack>
                {paymentDisplayTotals.changeAmount > 0 && (
                  <Stack direction="row" sx={{ justifyContent: "space-between", borderRadius: "3.5px", border: 1, borderColor: (theme) => alpha(theme.palette.warning.main, 0.4), bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1.5, py: 1 }}>
                    <Box component="span" sx={{ color: "text.secondary" }}>Change</Box>
                    <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(paymentDisplayTotals.changeAmount)}</Box>
                  </Stack>
                )}
              </Stack>

              <Stack sx={{ gap: 2 }}>
                {paymentTotals.refundAmount > 0 && (
                  <Box sx={{ borderRadius: "3.5px", border: 1, borderColor: (theme) => alpha(theme.palette.warning.main, 0.4), bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08), p: 1.5 }}>
                    <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Typography sx={{ fontSize: 10.5, color: "warning.dark" }}>
                        Confirm the refund before saving. Any received amount is added to the refund.
                      </Typography>
                      <Button
                        type="button"
                        onClick={() =>
                          paymentForm.refundApproved
                            ? handlePaymentFieldChange("refundApproved", false)
                            : handleConfirmRefund()
                        }
                        className={paymentForm.refundApproved ? "glass-btn glass-btn-success" : "glass-btn glass-btn-primary"}
                      >
                        {paymentForm.refundApproved
                          ? `Refunded ${formatMoney(paymentTotals.refundAmount)}`
                          : `Refund ${formatMoney(paymentTotals.refundAmount)}`}
                      </Button>
                    </Stack>
                  </Box>
                )}

                <Stack sx={{ gap: 1 }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Cash</Typography>
                  <TextField
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                    value={paymentForm.cashAmount}
                    onChange={(event) => handlePaymentFieldChange("cashAmount", event.target.value)}
                    onKeyDown={handlePaymentAmountKeyDown}
                    size="small"
                    fullWidth
                    placeholder="Enter cash received"
                  />
                </Stack>

                <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "1fr 1fr" } }}>
                  <Stack sx={{ gap: 1 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Card Amount</Typography>
                    <TextField
                      type="number"
                      slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                      value={paymentForm.cardAmount}
                      onChange={(event) => handlePaymentFieldChange("cardAmount", event.target.value)}
                      onKeyDown={handleCardAmountKeyDown}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                  <Stack sx={{ gap: 1 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Card Type</Typography>
                    <Box
                      component="select"
                      ref={cardTypeSelectRef}
                      value={paymentForm.cardTypeId}
                      onChange={(event) => {
                        skipCardTypeSaveOnNextEnterRef.current = false;
                        handlePaymentFieldChange("cardTypeId", event.target.value);
                      }}
                      onKeyDown={handleCardTypeKeyDown}
                      sx={posSalesDialogNativeSelectSx}
                    >
                      <option value="">Select card type</option>
                      {cardTypes.map((row) => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </Box>
                  </Stack>
                </Box>

                <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "1fr 1fr" } }}>
                  <Stack sx={{ gap: 1 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>UPI Amount</Typography>
                    <TextField
                      type="number"
                      slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                      value={paymentForm.upiAmount}
                      onChange={(event) => handlePaymentFieldChange("upiAmount", event.target.value)}
                      onKeyDown={handleUpiAmountKeyDown}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                  <Stack sx={{ gap: 1 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>UPI Provider</Typography>
                    <Box
                      component="select"
                      ref={upiProviderSelectRef}
                      value={paymentForm.upiProviderId}
                      onChange={(event) => {
                        skipUpiProviderSaveOnNextEnterRef.current = false;
                        handlePaymentFieldChange("upiProviderId", event.target.value);
                      }}
                      onKeyDown={handleUpiProviderKeyDown}
                      sx={posSalesDialogNativeSelectSx}
                    >
                      <option value="">Select UPI provider</option>
                      {upiProviders.map((row) => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 1, borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Button
                type="button"
                onClick={closePaymentDialog}
                disabled={saving}
                className="glass-btn glass-btn-secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSaveSale({ shouldPrint: false })}
                disabled={saving}
                className="glass-btn glass-btn-success"
                startIcon={<Save size={16} />}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                onClick={() => handleSaveSale({ shouldPrint: true })}
                disabled={saving}
                className="glass-btn glass-btn-primary"
                startIcon={<Printer size={16} />}
              >
                {saving ? "Saving..." : "Save & Print"}
              </Button>
            </Stack>
          </Box>
        </Box>
      )}
      <CounterAssignmentDialog
        open={counterAssignmentOpen}
        onClose={() => setCounterAssignmentOpen(false)}
      />
    </Box>
  );
};

export default POSSales;
