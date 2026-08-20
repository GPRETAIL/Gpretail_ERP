import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Save, Plus, X, ArrowLeft, Search, ChevronDown, Pencil, Trash2, Eye } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";
import PageSkeleton from "../../components/PageSkeleton";
import { buildSizeSelectOptions } from "../../utils/sizeSelectOptions";

// ─── Sub-components (outside to prevent focus loss) ─────────────────────────

const LField = ({ label, children, className = "" }) => (
  <div className={`flex items-center gap-2 mb-2 ${className}`}>
    <label className="w-28 text-xs font-bold text-red-700 dark:text-red-400 flex-shrink-0">{label}</label>
    <div className="flex-1">{children}</div>
  </div>
);

const LInput = ({ label, name, value, onChange, type = "text", placeholder = "", className = "" }) => (
  <LField label={label} className={className}>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
  </LField>
);

const PURCHASE_TYPE_OPTIONS = [
  { value: "textile", label: "Textile" },
  { value: "uan_gln", label: "UAN/GLN" },
  { value: "product", label: "Product" },
  { value: "b2b_textile", label: "B2B Textile" },
];

const WORKFLOW_STATUS_OPTIONS = [
  { value: "invoice_completed", label: "Invoice Completed" },
  { value: "temporary", label: "Temporary" },
  { value: "invoice_progress", label: "Invoice Progress" },
];

const CHARGE_TYPE_GROUPS = [
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

const CHARGE_TYPE_OPTIONS = CHARGE_TYPE_GROUPS.flatMap((group) => group.options);
const CHARGE_TYPE_DIALOG_OPTIONS = CHARGE_TYPE_GROUPS.flatMap((group, index) => [
  { label: group.label, disabled: true },
  { divider: true, value: `divider-${index}` },
  ...group.options,
]);
const CHARGE_TYPE_LABELS = new Map(CHARGE_TYPE_OPTIONS.map((option) => [option.value, option.label]));

const ITEM_TABLE_WIDTH = "min-w-[1016px]";
const ITEM_TABLE_COLS = {
  select: "w-8 shrink-0",
  sNo: "w-12 shrink-0",
  product: "w-32 shrink-0",
  brand: "w-24 shrink-0",
  size: "w-20 shrink-0",
  design: "w-20 shrink-0",
  qty: "w-16 shrink-0",
  cost: "w-20 shrink-0",
  discount: "w-[72px] shrink-0",
  margin: "w-[72px] shrink-0",
  price: "w-[88px] shrink-0",
  amount: "w-[88px] shrink-0",
  action: "w-24 shrink-0",
};

const ATTRIBUTE_QUICK_CREATE_OPTIONS = [
  { value: "product", label: "Product" },
  { value: "brand", label: "Brand" },
  { value: "color", label: "Color" },
  { value: "size", label: "Size" },
  { value: "supplier", label: "Supplier" },
  { value: "transport", label: "Transport" },
];

const createEmptyTaxLine = () => ({
  id: Date.now() + Math.random(),
  taxTypeId: "",
  taxValue: "",
  taxDiscount: "",
  chargeTypeValue: "",
});

const buildTaxRow = (line, taxes) => {
  const tax = taxes.find((row) => row.id === parseInt(line.taxTypeId, 10));
  const taxPerc = parseFloat(tax?.tax_percentage) || 0;
  const taxValue = parseFloat(line.taxValue) || 0;
  const taxDiscount = parseFloat(line.taxDiscount) || 0;
  const taxable = Math.max(0, taxValue - taxDiscount);
  const taxAmount = taxable * (taxPerc / 100);

  return {
    ...line,
    taxPerc,
    taxable,
    taxAmount,
    chargeTypeValue: line.chargeTypeValue || "",
    chargeTypeLabel: CHARGE_TYPE_LABELS.get(line.chargeTypeValue) || "",
  };
};

const formatTaxOption = (tax) => ({
  id: tax.id,
  label: String(tax.name || "").trim(),
});

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getOptionalFiniteNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getProductPurchaseTaxPerc = (productsById, productId) => {
  if (!productId) return 0;
  const product = productsById.get(String(productId));
  return Math.max(0, toFiniteNumber(product?.purchaseTax?.tax_percentage, 0));
};

const getProductSaleDiscountPerc = (productsById, productId) => {
  if (!productId) return 0;
  const product = productsById.get(String(productId));
  return Math.max(0, toFiniteNumber(product?.discountModeValue ?? product?.discount_mode_value, 0));
};

const getProductPurchaseDiscountPerc = () => 0;
const normalizeSellingMode = (value) => String(value || "").trim().toLowerCase();
const isCutSellingMode = (value) => normalizeSellingMode(value) === "cut";
const isUnknownLookupLabel = (value) => {
  const text = String(value || "").trim().toLowerCase();
  return text === "" || text === "-" || text === "unknown";
};

const getMeaningfulLabel = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (!isUnknownLookupLabel(text)) {
      return text;
    }
  }
  return "-";
};

const computeJumpDetailByMargin = ({
  size,
  qty,
  cost,
  purchaseDiscountPerc,
  marginValue,
  baseMrp,
  purchaseTaxPerc,
  saleDiscountPerc,
}) => {
  const safeQty = Math.max(0, parseInt(qty, 10) || 0);
  const safeCost = Math.max(0, toFiniteNumber(cost, 0));
  const safePurchaseDiscountPerc = Math.max(0, toFiniteNumber(purchaseDiscountPerc, 0));
  const safeMarginValue = toFiniteNumber(marginValue, 0);
  const safeBaseMrp = Math.max(0, toFiniteNumber(baseMrp, 0));
  const safePurchaseTaxPerc = Math.max(0, toFiniteNumber(purchaseTaxPerc, 0));
  const safeSaleDiscountPerc = Math.max(0, toFiniteNumber(saleDiscountPerc, 0));
  const netCost = round2(safeCost * (1 - safePurchaseDiscountPerc / 100));
  const mrp = round2(Math.max(0, safeBaseMrp + safeMarginValue));
  const purchaseTaxFactor = 1 + safePurchaseTaxPerc / 100;
  const preTaxMrp = purchaseTaxFactor > 0 ? mrp / purchaseTaxFactor : mrp;
  const marginPerc = netCost > 0 ? round2(((preTaxMrp - netCost) / netCost) * 100) : 0;
  const final = round2(mrp * (1 - safeSaleDiscountPerc / 100));

  return {
    size: String(size || "").trim(),
    qty: safeQty,
    cost: safeCost,
    purchaseDiscountPerc: safePurchaseDiscountPerc,
    marginPerc: Math.max(0, marginPerc),
    marginValue: round2(safeMarginValue),
    baseMrp: round2(safeBaseMrp),
    purchaseTaxPerc: safePurchaseTaxPerc,
    saleDiscountPerc: safeSaleDiscountPerc,
    mrp,
    final,
  };
};

const computeJumpDetailByMrp = ({
  size,
  qty,
  cost,
  purchaseDiscountPerc,
  mrp,
  baseMrp,
  purchaseTaxPerc,
  saleDiscountPerc,
}) => {
  const safeQty = Math.max(0, parseInt(qty, 10) || 0);
  const safeCost = Math.max(0, toFiniteNumber(cost, 0));
  const safePurchaseDiscountPerc = Math.max(0, toFiniteNumber(purchaseDiscountPerc, 0));
  const safeMrp = Math.max(0, toFiniteNumber(mrp, 0));
  const safeBaseMrp = Math.max(0, toFiniteNumber(baseMrp, safeMrp));
  const safePurchaseTaxPerc = Math.max(0, toFiniteNumber(purchaseTaxPerc, 0));
  const safeSaleDiscountPerc = Math.max(0, toFiniteNumber(saleDiscountPerc, 0));
  const netCost = round2(safeCost * (1 - safePurchaseDiscountPerc / 100));
  const purchaseTaxFactor = 1 + safePurchaseTaxPerc / 100;
  const preTaxMrp = purchaseTaxFactor > 0 ? safeMrp / purchaseTaxFactor : safeMrp;
  const marginPerc = netCost > 0 ? round2(((preTaxMrp - netCost) / netCost) * 100) : 0;
  const final = round2(safeMrp * (1 - safeSaleDiscountPerc / 100));

  return {
    size: String(size || "").trim(),
    qty: safeQty,
    cost: safeCost,
    purchaseDiscountPerc: safePurchaseDiscountPerc,
    marginPerc: Math.max(0, marginPerc),
    marginValue: round2(safeMrp - safeBaseMrp),
    baseMrp: round2(safeBaseMrp),
    purchaseTaxPerc: safePurchaseTaxPerc,
    saleDiscountPerc: safeSaleDiscountPerc,
    mrp: round2(safeMrp),
    final,
  };
};

const computeMarginPercFromRate = ({
  cost,
  purchaseDiscountPerc,
  purchaseTaxPerc,
  price,
}) => {
  const safeCost = Math.max(0, toFiniteNumber(cost, 0));
  const safePurchaseDiscountPerc = Math.max(0, toFiniteNumber(purchaseDiscountPerc, 0));
  const safePurchaseTaxPerc = Math.max(0, toFiniteNumber(purchaseTaxPerc, 0));
  const safePrice = Math.max(0, toFiniteNumber(price, 0));
  const netCost = round2(safeCost * (1 - safePurchaseDiscountPerc / 100));
  const purchaseTaxFactor = 1 + safePurchaseTaxPerc / 100;
  const preTaxRate = purchaseTaxFactor > 0 ? safePrice / purchaseTaxFactor : safePrice;
  return netCost > 0 ? round2(((preTaxRate - netCost) / netCost) * 100) : 0;
};

const distributeQtyAcrossSizes = (totalQty, count) => {
  const safeTotalQty = Math.max(0, parseInt(totalQty, 10) || 0);
  const safeCount = Math.max(0, parseInt(count, 10) || 0);
  if (safeCount === 0) return [];
  const baseQty = Math.floor(safeTotalQty / safeCount);
  const remainder = safeTotalQty % safeCount;
  return Array.from({ length: safeCount }, (_, index) => baseQty + (index < remainder ? 1 : 0));
};

const rebalanceJumpDetailQtys = (rows, totalQty) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const qtyDistribution = distributeQtyAcrossSizes(totalQty, normalizedRows.length);
  return normalizedRows.map((row, index) => ({
    ...row,
    qty: qtyDistribution[index] || 0,
  }));
};

const normalizeJumpDetails = (details = [], fallback = {}) =>
  (Array.isArray(details) ? details : [])
    .map((detail) => {
      const normalizedSize = String(detail?.size || "").trim();
      if (!normalizedSize) return null;
      const detailType = String(detail?.detailType ?? detail?.detail_type ?? "").trim().toLowerCase()
        || (normalizedSize.toLowerCase() === "cut" ? "cut" : "");
      const meter = detailType === "cut" ? Math.max(0, toFiniteNumber(detail?.meter, fallback.meter ?? 0)) : 0;
      const base = {
        size: normalizedSize,
        qty: Math.max(0, parseInt(detail?.qty, 10) || 0),
        cost: toFiniteNumber(detail?.cost, fallback.cost ?? 0),
        baseMrp: toFiniteNumber(detail?.baseMrp ?? detail?.base_mrp, fallback.baseMrp ?? 0),
        purchaseDiscountPerc: toFiniteNumber(
          detail?.purchaseDiscountPerc ?? detail?.purchase_discount_perc,
          fallback.purchaseDiscountPerc ?? 0
        ),
        purchaseTaxPerc: toFiniteNumber(
          detail?.purchaseTaxPerc ?? detail?.purchase_tax_perc,
          fallback.purchaseTaxPerc ?? 0
        ),
        saleDiscountPerc: toFiniteNumber(
          detail?.saleDiscountPerc ?? detail?.sale_discount_perc,
          fallback.saleDiscountPerc ?? 0
        ),
      };
      const marginValue = detail?.marginPerc ?? detail?.margin_perc;
      const mrpValue = detail?.mrp ?? detail?.sellingPrice ?? detail?.selling_price;
      const explicitMarginValue = detail?.marginValue ?? detail?.margin_value;
      if (mrpValue !== undefined && mrpValue !== null && mrpValue !== "") {
        return { ...computeJumpDetailByMrp({ ...base, mrp: mrpValue }), detailType, meter };
      }
      return {
        ...computeJumpDetailByMargin({
          ...base,
          marginValue: explicitMarginValue ?? marginValue ?? fallback.marginValue ?? 0,
        }),
        detailType,
        meter,
      };
    })
    .filter(Boolean);

const aggregateJumpDetails = (details = []) => {
  const normalized = normalizeJumpDetails(details);
  const totalQty = normalized.reduce((sum, detail) => sum + detail.qty, 0);
  const totalMrpAmount = normalized.reduce((sum, detail) => sum + detail.mrp * detail.qty, 0);
  const totalFinalAmount = normalized.reduce((sum, detail) => sum + detail.final * detail.qty, 0);
  const totalCostAmount = normalized.reduce((sum, detail) => sum + detail.cost * detail.qty, 0);
  const weightedMargin = normalized.reduce((sum, detail) => sum + detail.marginPerc * detail.qty, 0);
  const weightedPurchaseDiscount = normalized.reduce((sum, detail) => sum + detail.purchaseDiscountPerc * detail.qty, 0);
  const weightedSaleDiscount = normalized.reduce((sum, detail) => sum + detail.saleDiscountPerc * detail.qty, 0);
  const weightedPurchaseTax = normalized.reduce((sum, detail) => sum + detail.purchaseTaxPerc * detail.qty, 0);
  const totalGross = normalized.reduce((sum, detail) => {
    const purchaseTaxFactor = 1 + detail.purchaseTaxPerc / 100;
    const preTaxMrp = purchaseTaxFactor > 0 ? detail.mrp / purchaseTaxFactor : detail.mrp;
    return sum + preTaxMrp * detail.qty;
  }, 0);

  return {
    jumpDetails: normalized,
    qty: totalQty,
    cost: totalQty > 0 ? round2(totalCostAmount / totalQty) : 0,
    purchaseDiscountPerc: totalQty > 0 ? round2(weightedPurchaseDiscount / totalQty) : 0,
    marginPerc: totalQty > 0 ? round2(weightedMargin / totalQty) : 0,
    purchaseTaxPerc: totalQty > 0 ? round2(weightedPurchaseTax / totalQty) : 0,
    saleDiscountPerc: totalQty > 0 ? round2(weightedSaleDiscount / totalQty) : 0,
    price: totalQty > 0 ? round2(totalMrpAmount / totalQty) : 0,
    amount: round2(totalMrpAmount),
    finalAmount: round2(totalFinalAmount),
    gross: round2(totalGross),
    taxAmount: round2(totalMrpAmount - totalGross),
  };
};

const computeDirectPurchaseItem = (item, productsById) => {
  const jumpDetails = normalizeJumpDetails(item?.jumpDetails ?? item?.jumpSizes, {
    cost: item?.cost,
    marginPerc: item?.marginPerc,
    purchaseTaxPerc: item?.purchaseTaxPerc ?? getProductPurchaseTaxPerc(productsById, item?.productId),
    saleDiscountPerc: item?.saleDiscountPerc ?? getProductSaleDiscountPerc(productsById, item?.productId),
    purchaseDiscountPerc: item?.purchaseDiscountPerc ?? getProductPurchaseDiscountPerc(productsById, item?.productId),
  });
  if (jumpDetails.length > 0) {
    const aggregate = aggregateJumpDetails(jumpDetails);
    return {
      qty: aggregate.qty,
      cost: aggregate.cost,
      discount: 0,
      marginPerc: aggregate.marginPerc,
      purchaseTaxPerc: aggregate.purchaseTaxPerc,
      baseRate: aggregate.gross,
      baseAmount: aggregate.gross,
      taxableAmount: aggregate.gross,
      price: aggregate.price,
      amount: aggregate.amount,
      taxAmount: aggregate.taxAmount,
      gross: aggregate.gross,
      jumpDetails: aggregate.jumpDetails,
      finalAmount: aggregate.finalAmount,
      saleDiscountPerc: aggregate.saleDiscountPerc,
      purchaseDiscountPerc: aggregate.purchaseDiscountPerc,
    };
  }

  const qty = Math.max(0, parseInt(item?.qty, 10) || 0);
  const cost = Math.max(0, toFiniteNumber(item?.cost, 0));
  const discount = Math.max(0, toFiniteNumber(item?.discount, 0));
  const marginPerc = toFiniteNumber(item?.marginPerc, 0);
  const purchaseTaxPerc = Math.max(
    0,
    toFiniteNumber(item?.purchaseTaxPerc, getProductPurchaseTaxPerc(productsById, item?.productId))
  );
  const baseRate = round2(cost + (cost * marginPerc) / 100);
  const baseAmount = round2(baseRate * qty);
  const taxableAmount = round2(Math.max(0, baseAmount - discount));
  const computedPrice = round2(baseRate + (baseRate * purchaseTaxPerc) / 100);
  const explicitPrice = getOptionalFiniteNumber(item?.price);
  const explicitAmount = getOptionalFiniteNumber(item?.amount);
  const amount = explicitAmount ?? round2(taxableAmount + (taxableAmount * purchaseTaxPerc) / 100);
  const price = explicitPrice ?? computedPrice;
  const taxAmount = round2(Math.max(0, amount - taxableAmount));
  const gross = baseAmount;

  return {
    qty,
    cost,
    discount,
    marginPerc,
    purchaseTaxPerc,
    baseRate,
    baseAmount,
    taxableAmount,
    price,
    amount,
    taxAmount,
    gross,
  };
};

const createDefaultForm = (authUser = null) => ({
  purchaseType: "textile",
  poNo: "",
  lrNo: "",
  lrDate: "",
  bundles: "",
  companyId: localStorage.getItem("activeStoreId") || "",
  retailLocation: String(authUser?.role || "").toLowerCase() === "admin" ? String(authUser?.company_name || "") : "",
  transportId: "",
  invoiceNo: "",
  invoiceDate: "",
  supplierId: "",
  igst: false,
  iDiscount: false,
  billValue: "",
  otherCharges: "",
  billTax: "",
  purDiscountPerc: "",
  purDiscount: "",
  total: "",
  invoiceWorkflowStatus: "invoice_completed",
});

const createDefaultItem = (sNo = 1) => ({
  sNo,
  productId: "",
  brandId: "",
  size: "Jump",
  jumpSizes: [],
  jumpChangePrice: false,
  colorId: "",
  designNo: "",
  hsnCode: "",
  qty: "",
  cost: "",
  marginPerc: "",
  price: "",
});

const createCutDetail = ({
  qty,
  meter,
  cost,
  price,
  purchaseTaxPerc,
  saleDiscountPerc,
  purchaseDiscountPerc,
}) => ({
  detailType: "cut",
  size: "Cut",
  qty: Math.max(0, parseInt(qty, 10) || 0),
  meter: Math.max(0, toFiniteNumber(meter, 0)),
  cost: Math.max(0, toFiniteNumber(cost, 0)),
  mrp: Math.max(0, toFiniteNumber(price, 0)),
  purchaseTaxPerc: Math.max(0, toFiniteNumber(purchaseTaxPerc, 0)),
  saleDiscountPerc: Math.max(0, toFiniteNumber(saleDiscountPerc, 0)),
  purchaseDiscountPerc: Math.max(0, toFiniteNumber(purchaseDiscountPerc, 0)),
});

const createDefaultItemFilters = () => ({
  productName: "",
  brandName: "",
  size: "",
  designNo: "",
  qty: "",
  cost: "",
  discount: "",
  marginPerc: "",
  price: "",
  amount: "",
});

const createDefaultQuickAttributeForm = () => ({
  type: "product",
  code: "",
  name: "",
});

const unwrapApiRecord = (response) => response?.data?.data || response?.data || null;

const toInputValue = (value, fixed = false) => {
  if (value === null || value === undefined || value === "") return "";
  return fixed ? Number(value).toFixed(2) : String(value);
};

const renumberItems = (rows) => rows.map((item, index) => ({ ...item, sNo: index + 1 }));

const createEditableDraftFromItem = (item) => ({
  sNo: item?.sNo || 1,
  productId: item?.productId ? String(item.productId) : "",
  brandId: item?.brandId ? String(item.brandId) : "",
  size: item?.size || "Jump",
  jumpSizes: normalizeJumpDetails(item?.jumpDetails ?? item?.jumpSizes, {
    cost: item?.cost,
    marginPerc: item?.marginPerc,
    purchaseTaxPerc: item?.purchaseTaxPerc,
    saleDiscountPerc: item?.saleDiscountPerc,
    purchaseDiscountPerc: item?.purchaseDiscountPerc,
  }),
  jumpChangePrice: Boolean(item?.jumpChangePrice),
  colorId: item?.colorId ? String(item.colorId) : "",
  designNo: item?.designNo || "",
  hsnCode: item?.hsnCode || "",
  qty: toInputValue(item?.qty),
  cost: toInputValue(item?.cost),
  marginPerc: toInputValue(item?.marginPerc),
  price: toInputValue(item?.price),
});

const getNegativeItemFieldMessage = (item) => {
  const costValue = getOptionalFiniteNumber(item?.cost);
  if (costValue !== null && costValue < 0) return "Cost cannot be negative";

  const marginValue = getOptionalFiniteNumber(item?.marginPerc);
  if (marginValue !== null && marginValue < 0) return "Margin cannot be negative";

  return "";
};

// ─── Searchable Select (used for labeled form fields) ────────────────────────

const LSearchSelect = ({ label, name, value, onChange, options, onAsyncSearch, placeholder = "Select...", searchPlaceholder = "Search..." }) => {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const keyboardSelectionArmedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [asyncResults, setAsyncResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const safeOptions = useMemo(() => (Array.isArray(options) ? options : []), [options]);

  const combinedOptions = useMemo(() => {
    if (!asyncResults.length) return safeOptions;
    const existingIds = new Set(safeOptions.map((o) => String(o?.id || o?.value || "")));
    const uniqueAsync = asyncResults.filter((o) => !existingIds.has(String(o?.id || o?.value || "")));
    return [...uniqueAsync, ...safeOptions];
  }, [safeOptions, asyncResults]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedSearch) return safeOptions;
    return combinedOptions.filter((opt) => `${opt?.name || opt?.label || ""} ${opt?.code || ""}`.toLowerCase().includes(normalizedSearch));
  }, [safeOptions, combinedOptions, normalizedSearch]);

  const finalOptions = useMemo(() => filtered.slice(0, 100), [filtered]);
  const totalItems = finalOptions.length + 1;

  const getLabel = (opt) => opt?.name || opt?.label || "";
  const getId = (opt) => String(opt?.id || opt?.value || "");
  const selectedLabel = useMemo(() => {
    const sel = combinedOptions.find((o) => String(o?.id || o?.value) === String(value));
    return sel ? getLabel(sel) : "";
  }, [combinedOptions, value]);

  useEffect(() => {
    if (!onAsyncSearch || !open || normalizedSearch.length < 1) {
      setAsyncResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await onAsyncSearch(normalizedSearch);
        if (Array.isArray(results)) {
          setAsyncResults(results);
        }
      } catch (err) {
        console.error("Async search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [onAsyncSearch, open, normalizedSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setSearchTerm(""); setHighlightedIndex(-1); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  }, [searchTerm]);
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("li");
    if (items[highlightedIndex]) items[highlightedIndex].scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const focusNextField = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const scope = trigger.closest("[data-enter-scope='true']");
    if (!scope) return;
    const focusables = Array.from(scope.querySelectorAll(
      "input:not([type='hidden']):not([disabled]):not([readonly]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']),textarea:not([disabled]):not([readonly]):not([tabindex='-1']),button:not([disabled]):not([tabindex='-1']),[tabindex]:not([tabindex='-1'])"
    )).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const idx = focusables.indexOf(trigger);
    if (idx >= 0 && idx < focusables.length - 1) {
      const next = focusables[idx + 1];
      next.focus();
      if (next instanceof HTMLElement && next.dataset.searchableSelectTrigger === "true") next.click();
      if (next instanceof HTMLInputElement) {
        if (["date", "datetime-local", "month", "time", "week"].includes(next.type)) {
          try {
            if (typeof next.showPicker === "function") next.showPicker();
            else next.click();
          } catch {
            // ignore browser-level picker restrictions
          }
          return;
        }
        if (!["checkbox", "radio", "button", "submit"].includes(next.type)) next.select();
      }
    }
  };

  const selectVal = (v) => {
    onChange({ target: { name, value: String(v) } });
    setOpen(false); setSearchTerm(""); setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
    setTimeout(() => focusNextField(), 50);
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  };

  const moveToNextField = () => {
    closeDropdown();
    setTimeout(() => focusNextField(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { closeDropdown(); setTimeout(() => triggerRef.current?.focus(), 0); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p < totalItems - 1 ? p + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p > 0 ? p - 1 : totalItems - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault(); e.stopPropagation();
      if (keyboardSelectionArmedRef.current) {
        if (highlightedIndex === 0) { selectVal(""); return; }
        if (highlightedIndex > 0 && highlightedIndex <= finalOptions.length) { selectVal(getId(finalOptions[highlightedIndex - 1])); return; }
      }
      moveToNextField();
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (open) {
        if (keyboardSelectionArmedRef.current) {
          if (highlightedIndex === 0) { selectVal(""); return; }
          if (highlightedIndex > 0 && highlightedIndex <= finalOptions.length) { selectVal(getId(finalOptions[highlightedIndex - 1])); return; }
        }
        moveToNextField();
        return;
      }
      focusNextField();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : Math.max(totalItems - 1, 0)));
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = false;
      setOpen(true);
      setHighlightedIndex(-1);
    }
  };

  return (
    <LField label={label}>
      <div ref={containerRef} data-enter-ignore="true" className="relative w-full">
        <button ref={triggerRef} type="button" data-searchable-select-trigger="true"
          onClick={() => { keyboardSelectionArmedRef.current = false; setOpen((p) => !p); setHighlightedIndex(-1); }}
          onKeyDown={handleTriggerKeyDown}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
        >
          <span className={selectedLabel ? "text-gray-800 dark:text-gray-100 truncate" : "text-gray-400 dark:text-gray-500 truncate"}>{selectedLabel || placeholder}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute z-50 left-0 top-full mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
            <div className="p-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
              <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
              <input autoFocus type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder} className="w-full text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500" />
              {isSearching && (
                <span className="text-[10px] text-blue-500 font-medium shrink-0 animate-pulse px-1">Searching...</span>
              )}
            </div>
            <ul ref={listRef} className="max-h-52 overflow-y-auto">
              <li onClick={() => selectVal("")} className={`px-2 py-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ${highlightedIndex === 0 ?"bg-blue-100 dark:bg-blue-900/30" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}>{placeholder}</li>
              {finalOptions.map((opt, idx) => (
                <li key={getId(opt)} onClick={() => selectVal(getId(opt))}
                  className={`px-2 py-1 text-xs cursor-pointer ${highlightedIndex === idx + 1 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium" : getId(opt) === String(value) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}
                >{getLabel(opt)}</li>
              ))}
            </ul>
            {filtered.length > 100 && (
              <div className="px-2 py-0.5 text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 text-center border-t border-gray-100 dark:border-gray-700">
                Showing top 100 of {filtered.length} (type to narrow)
              </div>
            )}
          </div>
        )}
      </div>
    </LField>
  );
};

// ─── Inline Searchable Select (used for item entry row, no label) ────────────

const InlineSearchSelect = ({ name, value, onChange, options, onAsyncSearch, placeholder = "Select...", searchPlaceholder = "Search..." }) => {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const keyboardSelectionArmedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [asyncResults, setAsyncResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const safeOptions = useMemo(() => (Array.isArray(options) ? options : []), [options]);

  const combinedOptions = useMemo(() => {
    if (!asyncResults.length) return safeOptions;
    const existingIds = new Set(safeOptions.map((o) => String(o?.id || o?.value || "")));
    const uniqueAsync = asyncResults.filter((o) => !existingIds.has(String(o?.id || o?.value || "")));
    return [...uniqueAsync, ...safeOptions];
  }, [safeOptions, asyncResults]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedSearch) return safeOptions;
    return combinedOptions.filter((opt) => `${opt?.name || opt?.label || ""} ${opt?.code || ""}`.toLowerCase().includes(normalizedSearch));
  }, [safeOptions, combinedOptions, normalizedSearch]);

  const finalOptions = useMemo(() => filtered.slice(0, 100), [filtered]);
  const totalItems = finalOptions.length + 1;

  const getLabel = (opt) => opt?.name || opt?.label || "";
  const getId = (opt) => String(opt?.id || opt?.value || "");
  const selectedLabel = useMemo(() => {
    const sel = combinedOptions.find((o) => String(o?.id || o?.value) === String(value));
    return sel ? getLabel(sel) : "";
  }, [combinedOptions, value]);

  useEffect(() => {
    if (!onAsyncSearch || !open || normalizedSearch.length < 1) {
      setAsyncResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await onAsyncSearch(normalizedSearch);
        if (Array.isArray(results)) {
          setAsyncResults(results);
        }
      } catch (err) {
        console.error("Async search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [onAsyncSearch, open, normalizedSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setSearchTerm(""); setHighlightedIndex(-1); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  }, [searchTerm]);
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("li");
    if (items[highlightedIndex]) items[highlightedIndex].scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const focusNextField = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const scope = trigger.closest("[data-enter-scope='true']");
    if (!scope) return;
    const focusables = Array.from(scope.querySelectorAll(
      "input:not([type='hidden']):not([disabled]):not([readonly]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']),textarea:not([disabled]):not([readonly]):not([tabindex='-1']),button:not([disabled]):not([tabindex='-1']),[tabindex]:not([tabindex='-1'])"
    )).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const idx = focusables.indexOf(trigger);
    if (idx >= 0 && idx < focusables.length - 1) {
      const next = focusables[idx + 1];
      next.focus();
      if (next instanceof HTMLElement && next.dataset.searchableSelectTrigger === "true") next.click();
      if (next instanceof HTMLInputElement) {
        if (["date", "datetime-local", "month", "time", "week"].includes(next.type)) {
          try {
            if (typeof next.showPicker === "function") next.showPicker();
            else next.click();
          } catch {
            // ignore browser-level picker restrictions
          }
          return;
        }
        if (!["checkbox", "radio", "button", "submit"].includes(next.type)) next.select();
      }
    }
  };

  const selectVal = (v) => {
    onChange({ target: { name, value: String(v) } });
    setOpen(false); setSearchTerm(""); setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
    setTimeout(() => focusNextField(), 50);
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  };

  const moveToNextField = () => {
    closeDropdown();
    setTimeout(() => focusNextField(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { closeDropdown(); setTimeout(() => triggerRef.current?.focus(), 0); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p < totalItems - 1 ? p + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p > 0 ? p - 1 : totalItems - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault(); e.stopPropagation();
      if (keyboardSelectionArmedRef.current) {
        if (highlightedIndex === 0) { selectVal(""); return; }
        if (highlightedIndex > 0 && highlightedIndex <= finalOptions.length) { selectVal(getId(finalOptions[highlightedIndex - 1])); return; }
      }
      moveToNextField();
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (open) {
        if (keyboardSelectionArmedRef.current) {
          if (highlightedIndex === 0) { selectVal(""); return; }
          if (highlightedIndex > 0 && highlightedIndex <= finalOptions.length) { selectVal(getId(finalOptions[highlightedIndex - 1])); return; }
        }
        moveToNextField();
        return;
      }
      focusNextField();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : Math.max(totalItems - 1, 0)));
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = false;
      setOpen(true);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} data-enter-ignore="true" className="relative w-full">
      <button ref={triggerRef} type="button" data-searchable-select-trigger="true"
        onClick={() => { keyboardSelectionArmedRef.current = false; setOpen((p) => !p); setHighlightedIndex(-1); }}
        onKeyDown={handleTriggerKeyDown}
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-sm bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
      >
        <span className={selectedLabel ? "text-gray-800 dark:text-gray-100 truncate text-xs" : "text-gray-400 dark:text-gray-500 truncate text-xs"}>{selectedLabel || placeholder}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[160px]">
          <div className="p-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
            <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
            <input autoFocus type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder} className="w-full text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500" />
            {isSearching && (
              <span className="text-[10px] text-blue-500 font-medium shrink-0 animate-pulse px-1">Searching...</span>
            )}
          </div>
          <ul ref={listRef} className="max-h-52 overflow-y-auto">
            <li onClick={() => selectVal("")} className={`px-2 py-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ${highlightedIndex === 0 ?"bg-blue-100 dark:bg-blue-900/30" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}>{placeholder}</li>
            {finalOptions.map((opt, idx) => (
              <li key={getId(opt)} onClick={() => selectVal(getId(opt))}
                className={`px-2 py-1 text-xs cursor-pointer ${highlightedIndex === idx + 1 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium" : getId(opt) === String(value) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}
              >{getLabel(opt)}</li>
            ))}
          </ul>
          {filtered.length > 100 && (
            <div className="px-2 py-0.5 text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 text-center border-t border-gray-100 dark:border-gray-700">
              Showing top 100 of {filtered.length} (type to narrow)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Searchable Size Select (with groups + Jump) ─────────────────────────────

const SizeSearchSelect = ({ value, onChange, sizes, sizeGroups, sellingMode }) => {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const keyboardSelectionArmedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const allOptions = useMemo(() => {
    return buildSizeSelectOptions({
      sizes,
      sizeGroups,
      includeCut: isCutSellingMode(sellingMode),
      includeJump: !isCutSellingMode(sellingMode),
    });
  }, [sizes, sizeGroups, sellingMode]);

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return allOptions.slice(0, 100);
    return allOptions.filter((opt) => opt.value !== "__jump__" && opt.searchText.includes(normalizedSearch)).slice(0, 100);
  }, [allOptions, normalizedSearch]);

  const totalItems = filteredOptions.length + 1;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setSearchTerm(""); setHighlightedIndex(-1); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  useEffect(() => {
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  }, [searchTerm]);
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("li");
    if (items[highlightedIndex]) items[highlightedIndex].scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const focusNextField = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const scope = trigger.closest("[data-enter-scope='true']");
    if (!scope) return;
    const focusables = Array.from(scope.querySelectorAll(
      "input:not([type='hidden']):not([disabled]):not([readonly]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']),textarea:not([disabled]):not([readonly]):not([tabindex='-1']),button:not([disabled]):not([tabindex='-1']),[tabindex]:not([tabindex='-1'])"
    )).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const idx = focusables.indexOf(trigger);
    if (idx >= 0 && idx < focusables.length - 1) {
      const next = focusables[idx + 1];
      next.focus();
      if (next instanceof HTMLElement && next.dataset.searchableSelectTrigger === "true") next.click();
      if (next instanceof HTMLInputElement) {
        if (["date", "datetime-local", "month", "time", "week"].includes(next.type)) {
          try {
            if (typeof next.showPicker === "function") next.showPicker();
            else next.click();
          } catch {
            // ignore browser-level picker restrictions
          }
          return;
        }
        if (!["checkbox", "radio", "button", "submit"].includes(next.type)) next.select();
      }
    }
  };

  const selectOption = (val) => {
    if (val === "__jump__") {
      onChange({ target: { value: "Jump" } });
      setOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      keyboardSelectionArmedRef.current = false;
      setTimeout(() => focusNextField(), 50);
      return;
    }
    onChange({ target: { value: val } });
    setOpen(false); setSearchTerm(""); setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
    setTimeout(() => focusNextField(), 50);
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  };

  const moveToNextField = () => {
    closeDropdown();
    setTimeout(() => focusNextField(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { closeDropdown(); setTimeout(() => triggerRef.current?.focus(), 0); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p < totalItems - 1 ? p + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p > 0 ? p - 1 : totalItems - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault(); e.stopPropagation();
      if (keyboardSelectionArmedRef.current) {
        if (highlightedIndex === 0) { selectOption(""); return; }
        if (highlightedIndex > 0 && highlightedIndex <= filteredOptions.length) { selectOption(filteredOptions[highlightedIndex - 1].value); return; }
      }
      moveToNextField();
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (open) {
        if (keyboardSelectionArmedRef.current) {
          if (highlightedIndex === 0) { selectOption(""); return; }
          if (highlightedIndex > 0 && highlightedIndex <= filteredOptions.length) { selectOption(filteredOptions[highlightedIndex - 1].value); return; }
        }
        moveToNextField();
        return;
      }
      focusNextField();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : Math.max(totalItems - 1, 0)));
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = false;
      setOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const groupedDisplay = (() => {
    const groups = []; let cur = null;
    filteredOptions.forEach((opt) => { if (opt.group !== cur) { cur = opt.group; groups.push({ type: "header", label: opt.group }); } groups.push({ type: "option", ...opt }); });
    return groups;
  })();
  let optionIndex = 0;

  return (
    <div ref={containerRef} data-enter-ignore="true" className="relative w-full">
      <button ref={triggerRef} type="button" data-searchable-select-trigger="true"
        onClick={() => { keyboardSelectionArmedRef.current = false; setOpen((p) => !p); setHighlightedIndex(-1); }}
        onKeyDown={handleTriggerKeyDown}
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-sm bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
      >
        <span className={value ? "text-gray-800 dark:text-gray-100 truncate text-xs" : "text-gray-400 dark:text-gray-500 truncate text-xs"}>{value || "Size..."}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[160px]">
          <div className="p-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
            <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
            <input autoFocus type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Search size..." className="w-full text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500" />
          </div>
          <ul ref={listRef} className="max-h-52 overflow-y-auto">
            <li onClick={() => selectOption("")} className={`px-2 py-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ${highlightedIndex === 0 ?"bg-blue-100 dark:bg-blue-900/30" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}>Size...</li>
            {groupedDisplay.map((item) => {
              if (item.type === "header") return <li key={`hdr-${item.label}`} className="px-2 py-0.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase bg-gray-50 dark:bg-gray-700 select-none">{item.label}</li>;
              const thisIdx = ++optionIndex;
              return (
                <li key={item.key} onClick={() => selectOption(item.value)}
                  className={`px-2 py-1 text-xs cursor-pointer ${highlightedIndex === thisIdx ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium" : item.value === value ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" : item.value === "__jump__" ? "text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20" : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}
                >{item.label}</li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── Jump Size Dialog ───────────────────────────────────────────────────────

const JumpSizeDialog = ({
  open,
  onClose,
  onApply,
  totalQty,
  defaultRows,
  defaultChangePrice,
  baseCost,
  baseMrp,
  purchaseTaxPerc,
  saleDiscountPerc,
  purchaseDiscountPerc,
}) => {
  const [start, setStart] = useState("");
  const [increment, setIncrement] = useState("");
  const [end, setEnd] = useState("");
  const [changePrice, setChangePrice] = useState(false);
  const [generatedSizes, setGeneratedSizes] = useState([]);

  useEffect(() => {
    if (!open) return;
    const normalizedDefaults = normalizeJumpDetails(defaultRows, {
      cost: baseCost,
      purchaseDiscountPerc,
      purchaseTaxPerc,
      saleDiscountPerc,
      marginPerc: 0,
    });
    setGeneratedSizes(normalizedDefaults);
    setChangePrice(Boolean(defaultChangePrice));
  }, [
    open,
    defaultRows,
    defaultChangePrice,
    baseCost,
    purchaseDiscountPerc,
    purchaseTaxPerc,
    saleDiscountPerc,
  ]);

  const handleGenerate = () => {
    const s = parseFloat(start);
    const inc = parseFloat(increment);
    const e = parseFloat(end);
    if (isNaN(s) || isNaN(inc) || isNaN(e) || inc <= 0 || s > e) return;
    const parsedQty = Math.max(0, parseInt(totalQty, 10) || 0);
    if (parsedQty <= 0) return;
    const sizes = [];
    for (let v = s; v <= e; v = parseFloat((v + inc).toFixed(4))) {
      sizes.push(String(v % 1 === 0 ? Math.round(v) : v));
    }
    const qtyDistribution = distributeQtyAcrossSizes(parsedQty, sizes.length);
    setGeneratedSizes(
      sizes.map((size, index) =>
        computeJumpDetailByMrp({
          size,
          qty: qtyDistribution[index],
          cost: baseCost,
          purchaseDiscountPerc,
          mrp: baseMrp,
          baseMrp,
          purchaseTaxPerc,
          saleDiscountPerc,
        })
      )
    );
  };

  const handleQtyChange = (index, newQty) => {
    setGeneratedSizes((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: Math.max(0, parseInt(newQty, 10) || 0) } : item
      )
    );
  };

  const handleMarginChange = (index, newMargin) => {
    setGeneratedSizes((prev) =>
      prev.map((item, i) =>
        i === index
          ? computeJumpDetailByMargin({
              ...item,
              marginValue: newMargin,
            })
          : item
      )
    );
  };

  const handleMrpChange = (index, newMrp) => {
    setGeneratedSizes((prev) =>
      prev.map((item, i) =>
        i === index
          ? computeJumpDetailByMrp({
              ...item,
              mrp: newMrp,
            })
          : item
      )
    );
  };

  const handleRemove = (index) => {
    setGeneratedSizes((prev) => {
      const remaining = prev.filter((_, i) => i !== index);
      return rebalanceJumpDetailQtys(remaining, totalQty);
    });
  };

  const handleApply = () => {
    if (generatedSizes.length === 0) return;
    onApply(generatedSizes, changePrice);
    setStart(""); setIncrement(""); setEnd(""); setGeneratedSizes([]); setChangePrice(false);
  };

  const handleClose = () => {
    setStart(""); setIncrement(""); setEnd(""); setGeneratedSizes([]); setChangePrice(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Size Detail (Jump)</h2>
          <button onClick={handleClose} className="glass-btn glass-btn-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Start</label>
              <input type="number" value={start} onChange={(e) => setStart(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1.5 text-sm" placeholder="10" />
            </div>
            <div className="flex items-end pb-1 text-gray-400 dark:text-gray-500 font-bold">-</div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Increment</label>
              <input type="number" value={increment} onChange={(e) => setIncrement(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1.5 text-sm" placeholder="2" />
            </div>
            <div className="flex items-end pb-1 text-gray-400 dark:text-gray-500 font-bold">-</div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">End</label>
              <input type="number" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1.5 text-sm" placeholder="26" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300">Total Qty: <span className="font-semibold text-gray-800 dark:text-gray-100">{Math.max(0, parseInt(totalQty, 10) || 0)}</span></div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={changePrice}
                onChange={(event) => setChangePrice(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Change Price
            </label>
          </div>
          <div className="flex gap-2 items-end">
            <button onClick={handleGenerate} className="glass-btn glass-btn-primary">Generate</button>
          </div>
          {generatedSizes.length > 0 && (
            <div className="border border-gray-300 dark:border-gray-600 rounded max-h-52 overflow-auto">
              {changePrice ? (
                <div className="min-w-[820px]">
                  <div className="grid grid-cols-[1fr_72px_88px_78px_88px_92px_78px_92px_60px] bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 sticky top-0">
                    <div className="p-2 border-r dark:border-gray-700">Size</div>
                    <div className="p-2 border-r dark:border-gray-700 text-center">Qty</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">Cost</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">P.Dsnt</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">Margin</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">MRP</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">S.Dsnt</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">Final</div>
                    <div className="p-2 text-center">Action</div>
                  </div>
                  {generatedSizes.map((item, idx) => (
                    <div key={`${item.size}-${idx}`} className="grid grid-cols-[1fr_72px_88px_78px_88px_92px_78px_92px_60px] items-center text-sm border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="p-2 border-r dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">{item.size}</div>
                      <div className="p-2 border-r dark:border-gray-700">
                        <input type="number" value={item.qty} onChange={(e) => handleQtyChange(idx, e.target.value)} className="w-full text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" />
                      </div>
                      <div className="p-2 border-r dark:border-gray-700 text-right text-gray-800 dark:text-gray-100">{item.cost.toFixed(2)}</div>
                      <div className="p-2 border-r dark:border-gray-700 text-right text-gray-800 dark:text-gray-100">{item.purchaseDiscountPerc.toFixed(2)}%</div>
                      <div className="p-2 border-r dark:border-gray-700">
                        <input type="number" value={item.marginValue} onChange={(e) => handleMarginChange(idx, e.target.value)} className="w-full text-right border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" />
                      </div>
                      <div className="p-2 border-r dark:border-gray-700">
                        <input type="number" value={item.mrp} onChange={(e) => handleMrpChange(idx, e.target.value)} className="w-full text-right border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" />
                      </div>
                      <div className="p-2 border-r dark:border-gray-700 text-right text-gray-800 dark:text-gray-100">{item.saleDiscountPerc.toFixed(2)}%</div>
                      <div className="p-2 border-r dark:border-gray-700 text-right font-medium text-gray-800 dark:text-gray-100">{item.final.toFixed(2)}</div>
                      <div className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="glass-btn glass-btn-danger rounded p-1.5 inline-flex items-center justify-center"
                          title="Remove row"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 sticky top-0">
                    <div className="p-2 w-12 border-r dark:border-gray-700 text-center">S.No</div>
                    <div className="p-2 flex-1 border-r dark:border-gray-700">Size</div>
                    <div className="p-2 w-20 border-r dark:border-gray-700 text-center">Qty</div>
                    <div className="p-2 w-14 text-center">Del</div>
                  </div>
                  {generatedSizes.map((item, idx) => (
                    <div key={`${item.size}-${idx}`} className="flex text-sm border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="p-2 w-12 border-r dark:border-gray-700 text-center text-xs text-gray-800 dark:text-gray-100">{idx + 1}</div>
                      <div className="p-2 flex-1 border-r dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">{item.size}</div>
                      <div className="p-2 w-20 border-r dark:border-gray-700 text-center">
                        <input type="number" value={item.qty} onChange={(e) => handleQtyChange(idx, e.target.value)} className="w-full text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" />
                      </div>
                      <div className="p-2 w-14 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="glass-btn glass-btn-danger rounded p-1.5 inline-flex items-center justify-center"
                          title="Remove row"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <button onClick={handleClose} className="glass-btn glass-btn-secondary">Cancel</button>
          <button onClick={handleApply} disabled={generatedSizes.length === 0} className="glass-btn glass-btn-primary disabled:opacity-50">Apply Sizes</button>
        </div>
      </div>
    </div>
  );
};

const CutDetailDialog = ({
  open,
  onClose,
  onApply,
  defaultRow,
  baseCost,
  basePrice,
  purchaseTaxPerc,
  saleDiscountPerc,
  purchaseDiscountPerc,
}) => {
  const [qty, setQty] = useState("");
  const [meter, setMeter] = useState("");

  useEffect(() => {
    if (!open) return;
    setQty(defaultRow?.qty ? String(defaultRow.qty) : "");
    setMeter(defaultRow?.meter ? String(defaultRow.meter) : "");
  }, [open, defaultRow]);

  const handleApply = () => {
    const nextQty = Math.max(0, parseInt(qty, 10) || 0);
    const nextMeter = Math.max(0, toFiniteNumber(meter, 0));
    if (nextQty <= 0) return;
    if (nextMeter <= 0) return;

    onApply(
      createCutDetail({
        qty: nextQty,
        meter: nextMeter,
        cost: baseCost,
        price: basePrice,
        purchaseTaxPerc,
        saleDiscountPerc,
        purchaseDiscountPerc,
      })
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b dark:border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Cut Detail</h2>
          <button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              placeholder="100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Meter</label>
            <input
              type="number"
              value={meter}
              onChange={(event) => setMeter(event.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              placeholder="100"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-3">
          <button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Cancel</button>
          <button type="button" onClick={handleApply} className="glass-btn glass-btn-primary">Apply</button>
        </div>
      </div>
    </div>
  );
};

const JumpSizeViewDialog = ({ open, onClose, rows }) => {
  if (!open) return null;
  const normalizedRows = normalizeJumpDetails(rows);
  const hasCutDetails = normalizedRows.some((item) => item.detailType === "cut" || item.meter > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{hasCutDetails ? "Cut Details" : "Jump Size Details"}</h2>
          <button onClick={onClose} className="glass-btn glass-btn-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-4">
          <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
            {hasCutDetails ? (
              <div className="grid grid-cols-[1fr_88px_88px_88px_92px] bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
                <div className="p-2 border-r dark:border-gray-700">Size</div>
                <div className="p-2 border-r dark:border-gray-700 text-center">Qty</div>
                <div className="p-2 border-r dark:border-gray-700 text-right">Meter</div>
                <div className="p-2 border-r dark:border-gray-700 text-right">Cost</div>
                <div className="p-2 text-right">MRP</div>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_72px_88px_78px_88px_92px_78px_92px] bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
                <div className="p-2 border-r dark:border-gray-700">Size</div>
                <div className="p-2 border-r dark:border-gray-700 text-center">Qty</div>
                <div className="p-2 border-r dark:border-gray-700 text-right">Cost</div>
                <div className="p-2 border-r dark:border-gray-700 text-right">P.Dsnt</div>
                <div className="p-2 border-r dark:border-gray-700 text-right">Margin</div>
                <div className="p-2 border-r dark:border-gray-700 text-right">MRP</div>
                <div className="p-2 border-r dark:border-gray-700 text-right">S.Dsnt</div>
                <div className="p-2 text-right">Final</div>
              </div>
            )}
            <div className="max-h-[55vh] overflow-y-auto">
              {normalizedRows.length ? normalizedRows.map((item, index) => (
                hasCutDetails ? (
                  <div key={`${item.size}-${index}`} className="grid grid-cols-[1fr_88px_88px_88px_92px] text-sm border-b dark:border-gray-700 last:border-b-0 text-gray-800 dark:text-gray-100">
                    <div className="p-2 border-r dark:border-gray-700 font-medium">{item.size}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-center">{item.qty}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">{item.meter.toFixed(2)}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">{item.cost.toFixed(2)}</div>
                    <div className="p-2 text-right font-medium">{item.mrp.toFixed(2)}</div>
                  </div>
                ) : (
                  <div key={`${item.size}-${index}`} className="grid grid-cols-[1fr_72px_88px_78px_88px_92px_78px_92px] text-sm border-b dark:border-gray-700 last:border-b-0 text-gray-800 dark:text-gray-100">
                    <div className="p-2 border-r dark:border-gray-700 font-medium">{item.size}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-center">{item.qty}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">{item.cost.toFixed(2)}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">{item.purchaseDiscountPerc.toFixed(2)}%</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">{item.marginValue.toFixed(2)}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">{item.mrp.toFixed(2)}</div>
                    <div className="p-2 border-r dark:border-gray-700 text-right">{item.saleDiscountPerc.toFixed(2)}%</div>
                    <div className="p-2 text-right font-medium">{item.final.toFixed(2)}</div>
                  </div>
                )
              )) : (
                <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">{hasCutDetails ? "No cut details found." : "No jump size details found."}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickAttributeDialog = ({ open, form, saving, onClose, onChange, onSave }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b dark:border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Add Attribute</h2>
          <button type="button" onClick={onClose} className="glass-btn glass-btn-secondary p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Attribute</label>
            <select
              name="type"
              value={form.type}
              onChange={onChange}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              {ATTRIBUTE_QUICK_CREATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Code</label>
            <input
              type="text"
              name="code"
              value={form.code}
              onChange={onChange}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-3">
          <button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Close</button>
          <button type="button" onClick={onSave} disabled={saving} className="glass-btn glass-btn-success disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const LastSavedDialog = ({ open, loading, entry, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b dark:border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Last Saved Direct Purchase</h2>
          <button type="button" onClick={onClose} className="glass-btn glass-btn-secondary p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading last saved direct purchase...</div>
          ) : !entry ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No direct purchase found for the selected store.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice No</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{entry.invoice_no || "-"}</div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Company</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{getMeaningfulLabel(entry.company?.name, entry.company_name)}</div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Supplier</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{getMeaningfulLabel(entry.supplier?.name, entry.supplier_name)}</div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{entry.invoice_workflow_status || "-"}</div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice Date</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{entry.invoice_date || "-"}</div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Retail Location</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{entry.retail_location || "-"}</div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tax</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{Number(entry.tax_amount || 0).toFixed(2)}</div>
                </div>
                <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</div>
                  <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{Number(entry.total || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[60px_1.4fr_1fr_90px_100px_110px] gap-0 border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <div className="px-3 py-2">S.No</div>
                  <div className="px-3 py-2">Product</div>
                  <div className="px-3 py-2">Brand</div>
                  <div className="px-3 py-2 text-right">Qty</div>
                  <div className="px-3 py-2 text-right">Cost</div>
                  <div className="px-3 py-2 text-right">Amount</div>
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                  {(entry.items || []).length ? (
                    entry.items.map((item, index) => (
                      <div key={item.id || index} className="grid grid-cols-[60px_1.4fr_1fr_90px_100px_110px] gap-0 border-b dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 last:border-b-0">
                        <div className="px-3 py-2">{item.s_no || index + 1}</div>
                        <div className="px-3 py-2">{getMeaningfulLabel(item.product?.name, item.product_name)}</div>
                        <div className="px-3 py-2">{getMeaningfulLabel(item.brand?.name, item.brand_name)}</div>
                        <div className="px-3 py-2 text-right">{Number(item.qty || 0)}</div>
                        <div className="px-3 py-2 text-right">{Number(item.cost || 0).toFixed(2)}</div>
                        <div className="px-3 py-2 text-right">{Number(item.amount || 0).toFixed(2)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No items found on the last saved direct purchase.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditItemConfirmDialog = ({ open, onClose, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b dark:border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit Row</h2>
        </div>
        <div className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
          This action will remove this row. Its values will be loaded into the entry fields.
        </div>
        <div className="flex justify-end gap-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-3">
          <button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} className="glass-btn glass-btn-primary">Confirm</button>
        </div>
      </div>
    </div>
  );
};

const TaxChargeTypeDialog = ({ open, value, onClose, onConfirm }) => {
  const [selectedValue, setSelectedValue] = useState(value || "");

  useEffect(() => {
    if (!open) return;
    setSelectedValue(value || "");
  }, [open, value]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b dark:border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Charge Type</h2>
        </div>
        <div className="px-4 py-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Type</label>
          <SearchableSelect
            name="chargeType"
            options={CHARGE_TYPE_DIALOG_OPTIONS}
            value={selectedValue}
            onChange={(event) => setSelectedValue(event.target.value)}
            placeholder="Select Type"
          />
        </div>
        <div className="flex justify-end gap-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-3">
          <button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(selectedValue)}
            className="glass-btn glass-btn-primary"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const DirectPurchase = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useSelector((state) => state.auth.user);
  const editId = useMemo(() => new URLSearchParams(location.search).get("edit"), [location.search]);
  const userRole = String(authUser?.role || "").toLowerCase();
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin";
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const showToast = (type, message) => setToast({ open: true, type, message });

  // Dropdown data
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [transports, setTransports] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [sizeGroups, setSizeGroups] = useState([]);

  // Jump dialog
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpAutoAddPending, setJumpAutoAddPending] = useState(false);
  const [cutOpen, setCutOpen] = useState(false);
  const [cutAutoAddPending, setCutAutoAddPending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [quickAttributeOpen, setQuickAttributeOpen] = useState(false);
  const [quickAttributeForm, setQuickAttributeForm] = useState(createDefaultQuickAttributeForm);
  const [quickAttributeSaving, setQuickAttributeSaving] = useState(false);
  const [lastSavedOpen, setLastSavedOpen] = useState(false);
  const [lastSavedLoading, setLastSavedLoading] = useState(false);
  const [lastSavedEntry, setLastSavedEntry] = useState(null);
  const [editItemDialog, setEditItemDialog] = useState({ open: false, index: null, item: null });
  const [taxChargeTypeDialog, setTaxChargeTypeDialog] = useState({ open: false, lineId: null, value: "" });
  const [invoiceMismatchConfirm, setInvoiceMismatchConfirm] = useState({ open: false, difference: 0 });
  const [editInsertIndex, setEditInsertIndex] = useState(null);
  const [jumpSizeViewDialog, setJumpSizeViewDialog] = useState({ open: false, rows: [] });

  // Left panel form
  const [form, setForm] = useState(() => createDefaultForm(authUser));
  const [taxDraft, setTaxDraft] = useState(createEmptyTaxLine);
  const [taxLines, setTaxLines] = useState([]);

  // Current item entry row
  const [currentItem, setCurrentItem] = useState(createDefaultItem(1));
  const [itemFilterDraft, setItemFilterDraft] = useState(createDefaultItemFilters);
  const [itemFilters, setItemFilters] = useState(createDefaultItemFilters);

  // Added items
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleAsyncProductSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/products", { params: { search: query, mode: "dropdown", limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setProducts((prev) => {
          const existingIds = new Set((prev || []).map((p) => String(p.id)));
          const newItems = results.filter((p) => !existingIds.has(String(p.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch (err) {
      console.error("Async product search failed:", err);
      return [];
    }
  }, []);

  const handleAsyncBrandSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/brands", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setBrands((prev) => {
          const existingIds = new Set((prev || []).map((b) => String(b.id)));
          const newItems = results.filter((b) => !existingIds.has(String(b.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch (err) {
      return [];
    }
  }, []);

  const handleAsyncSupplierSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/suppliers", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setSuppliers((prev) => {
          const existingIds = new Set((prev || []).map((s) => String(s.id)));
          const newItems = results.filter((s) => !existingIds.has(String(s.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch (err) {
      return [];
    }
  }, []);

  const handleAsyncTransportSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/transports", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setTransports((prev) => {
          const existingIds = new Set((prev || []).map((t) => String(t.id)));
          const newItems = results.filter((t) => !existingIds.has(String(t.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch (err) {
      return [];
    }
  }, []);

  const loadDropdownData = async () => {
    try {
      const requests = await Promise.allSettled([
        api.get("/companies"),
        api.get("/suppliers?limit=100"),
        api.get("/transports?limit=100"),
        api.get("/taxes"),
        api.get("/products?dropdown=true&limit=100"),
        api.get("/brands?limit=100"),
        api.get("/attributes/colour"),
        api.get("/sizes"),
        api.get("/size-groups"),
      ]);
      const responseAt = (index) => {
        const result = requests[index];
        if (result.status === "fulfilled") return result.value;
        console.error("Failed to load dropdown:", result.reason);
        return { data: { data: [] } };
      };

      const compRes = responseAt(0);
      const supRes = responseAt(1);
      const trRes = responseAt(2);
      const taxRes = responseAt(3);
      const prodRes = responseAt(4);
      const brandRes = responseAt(5);
      const colorRes = responseAt(6);
      const sizeRes = responseAt(7);
      const sgRes = responseAt(8);

      const extractData = (res) => {
        const d = res?.data?.data ?? res?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        return [];
      };

      setCompanies(extractData(compRes));
      setSuppliers(extractData(supRes));
      setTransports(extractData(trRes));
      setTaxes(extractData(taxRes));
      setProducts(extractData(prodRes));
      setBrands(extractData(brandRes));
      setColors(extractData(colorRes));
      setSizes(extractData(sizeRes));
      setSizeGroups(extractData(sgRes));
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadDropdownData();
  }, []);

  useEffect(() => {
    if (!isAdmin || editId) return;
    setForm((prev) => {
      const retailLocation =
        String(
          companies.find((company) => String(company.id) === String(authUser?.company_id))?.name ||
          authUser?.company_name ||
          ""
        );
      if (prev.retailLocation === retailLocation) return prev;
      return { ...prev, retailLocation };
    });
  }, [authUser, companies, editId, isAdmin]);

  useEffect(() => {
    if (!editId) return;

    const loadEntry = async () => {
      setLoadingEntry(true);
      try {
        const res = await api.get(`/direct-purchases/${editId}`);
        const entry = res.data?.data;
        if (!entry) return;

        setForm({
          purchaseType: entry.purchase_type || "textile",
          poNo: entry.po_no || "",
          lrNo: entry.lr_no || "",
          lrDate: entry.lr_date || "",
          bundles: entry.bundles ? String(entry.bundles) : "",
          companyId: entry.company_id ? String(entry.company_id) : "",
          retailLocation: entry.retail_location || "",
          transportId: entry.transport_id ? String(entry.transport_id) : "",
          invoiceNo: entry.invoice_no || "",
          invoiceDate: entry.invoice_date || "",
          supplierId: entry.supplier_id ? String(entry.supplier_id) : "",
          igst: !!entry.igst,
          iDiscount: !!entry.i_discount,
          billValue: entry.bill_value || "",
          otherCharges: entry.other_charges || "",
          billTax: entry.bill_tax || "",
          purDiscountPerc: entry.pur_discount_perc || "",
          purDiscount: entry.pur_discount || "",
          total: entry.total || "",
          invoiceWorkflowStatus: entry.invoice_workflow_status || "invoice_completed",
        });

        const entryTaxLines = Array.isArray(entry.tax_lines) && entry.tax_lines.length
          ? entry.tax_lines.map((line, index) => ({
              id: Date.now() + index,
              taxTypeId: line.taxTypeId ? String(line.taxTypeId) : line.tax_type_id ? String(line.tax_type_id) : "",
              taxValue: String(line.taxValue ?? line.tax_value ?? ""),
              taxDiscount: String(line.taxDiscount ?? line.tax_discount ?? ""),
              chargeTypeValue: String(line.chargeTypeValue ?? line.charge_type_value ?? line.chargeType ?? ""),
            }))
          : entry.tax_type_id || entry.tax_value || entry.tax_discount
            ? [
                {
                  id: Date.now(),
                  taxTypeId: entry.tax_type_id ? String(entry.tax_type_id) : "",
                  taxValue: String(entry.tax_value ?? ""),
                  taxDiscount: String(entry.tax_discount ?? ""),
                  chargeTypeValue: String(entry.charge_type_value ?? entry.chargeType ?? ""),
                },
              ]
            : [];
        setTaxDraft(createEmptyTaxLine());
        setTaxLines(entryTaxLines);

        // Merge master entities from entry into dropdown options
        if (entry.company_id || entry.company) {
          const compObj = entry.company || { id: entry.company_id, name: entry.company_name || `Company #${entry.company_id}` };
          setCompanies((prev) => {
            const exists = (prev || []).some((c) => String(c.id) === String(compObj.id));
            return exists ? prev : [compObj, ...(prev || [])];
          });
        }

        if (entry.supplier_id || entry.supplier) {
          const supObj = entry.supplier || { id: entry.supplier_id, name: entry.supplier_name || `Supplier #${entry.supplier_id}` };
          setSuppliers((prev) => {
            const exists = (prev || []).some((s) => String(s.id) === String(supObj.id));
            return exists ? prev : [supObj, ...(prev || [])];
          });
        }

        if (entry.transport_id || entry.transport) {
          const trObj = entry.transport || { id: entry.transport_id, name: entry.transport_name || `Transport #${entry.transport_id}` };
          setTransports((prev) => {
            const exists = (prev || []).some((t) => String(t.id) === String(trObj.id));
            return exists ? prev : [trObj, ...(prev || [])];
          });
        }

        if (Array.isArray(entry.items) && entry.items.length) {
          const extraProducts = [];
          const extraBrands = [];
          const extraColors = [];

          entry.items.forEach((item) => {
            const prodId = item.product_id ?? item.productId;
            const prodName = item.product?.name || item.product_name;
            if (prodId) {
              extraProducts.push(item.product || { id: prodId, name: prodName || `Product #${prodId}`, hsn_code: item.hsn_code });
            }

            const bId = item.brand_id ?? item.brandId;
            const bName = item.brand?.name || item.brand_name;
            if (bId) {
              extraBrands.push(item.brand || { id: bId, name: bName || `Brand #${bId}` });
            }

            const cId = item.color_id ?? item.colorId;
            const cName = item.color?.name || item.color_name;
            if (cId) {
              extraColors.push(item.color || { id: cId, name: cName || `Color #${cId}` });
            }
          });

          if (extraProducts.length) {
            setProducts((prev) => {
              const existingIds = new Set((prev || []).map((p) => String(p.id)));
              const toAdd = extraProducts.filter((p) => !existingIds.has(String(p.id)));
              return toAdd.length ? [...(prev || []), ...toAdd] : prev;
            });
          }

          if (extraBrands.length) {
            setBrands((prev) => {
              const existingIds = new Set((prev || []).map((b) => String(b.id)));
              const toAdd = extraBrands.filter((b) => !existingIds.has(String(b.id)));
              return toAdd.length ? [...(prev || []), ...toAdd] : prev;
            });
          }

          if (extraColors.length) {
            setColors((prev) => {
              const existingIds = new Set((prev || []).map((c) => String(c.id)));
              const toAdd = extraColors.filter((c) => !existingIds.has(String(c.id)));
              return toAdd.length ? [...(prev || []), ...toAdd] : prev;
            });
          }
        }

        const mappedItems = Array.isArray(entry.items)
          ? entry.items.map((item, index) => ({
              id: item.id || Date.now() + index,
              sNo: Number(item.s_no || index + 1),
              productId: item.product_id ? String(item.product_id) : "",
              productName: getMeaningfulLabel(item.product?.name, item.product_name) || `Product #${item.product_id}`,
              brandId: item.brand_id ? String(item.brand_id) : "",
              brandName: getMeaningfulLabel(item.brand?.name, item.brand_name) || (item.brand_id ? `Brand #${item.brand_id}` : "-"),
              size: item.size || "",
              colorId: item.color_id ? String(item.color_id) : "",
              colorName: getMeaningfulLabel(
                item.color?.name,
                item.color_name,
                colors.find((row) => String(row.id) === String(item.color_id))?.name
              ) || (item.color_id ? `Color #${item.color_id}` : "-"),
              designNo: item.design_no || "",
              hsnCode: item.hsn_code || "",
              qty: parseInt(item.qty, 10) || 0,
              cost: parseFloat(item.cost) || 0,
              discount: parseFloat(item.discount) || 0,
              marginPerc: parseFloat(item.margin_perc) || 0,
              price: parseFloat(item.price) || 0,
              amount: parseFloat(item.amount) || 0,
              jumpChangePrice: Boolean(item.jump_change_price),
              jumpDetails: normalizeJumpDetails(item.jump_details, {
                cost: parseFloat(item.cost) || 0,
              }),
            }))
          : [];
        setItems(mappedItems);
        setCurrentItem(createDefaultItem(mappedItems.length + 1));
        setJumpAutoAddPending(false);
        setCutAutoAddPending(false);
        setEditInsertIndex(null);
        setEditItemDialog({ open: false, index: null, item: null });
      } catch (err) {
        console.error("Failed to load direct purchase:", err);
        showToast("error", err.response?.data?.message || "Failed to load direct purchase");
      } finally {
        setLoadingEntry(false);
      }
    };

    loadEntry();
  }, [editId, colors]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleTaxDraftChange = (key, value) => {
    setTaxDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddTaxLine = () => {
    if (!taxDraft.taxTypeId) {
      showToast("warning", "Tax type is required");
      return;
    }

    if ((parseFloat(taxDraft.taxValue) || 0) <= 0) {
      showToast("warning", "Tax value must be greater than 0");
      return;
    }

    setTaxLines((prev) => [...prev, { ...taxDraft, id: Date.now() + Math.random() }]);
    setTaxDraft(createEmptyTaxLine());
  };

  const handleRemoveTaxLine = (lineId) => {
    setTaxLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const handleOpenTaxChargeTypeDialog = (line) => {
    setTaxChargeTypeDialog({
      open: true,
      lineId: line.id,
      value: line.chargeTypeValue || "",
    });
  };

  const handleSaveTaxChargeType = (chargeTypeValue) => {
    setTaxLines((prev) =>
      prev.map((line) =>
        line.id === taxChargeTypeDialog.lineId
          ? { ...line, chargeTypeValue: chargeTypeValue || "" }
          : line
      )
    );
    setTaxChargeTypeDialog({ open: false, lineId: null, value: "" });
  };

  const productsById = useMemo(
    () => new Map((Array.isArray(products) ? products : []).map((product) => [String(product.id), product])),
    [products]
  );
  const currentItemFinancials = useMemo(
    () => computeDirectPurchaseItem(currentItem, productsById),
    [currentItem, productsById]
  );
  const taxOptions = useMemo(() => (Array.isArray(taxes) ? taxes : []).map((tax) => formatTaxOption(tax)), [taxes]);
  const taxDraftRow = useMemo(() => buildTaxRow(taxDraft, taxes), [taxDraft, taxes]);
  const taxRows = useMemo(() => (Array.isArray(taxLines) ? taxLines : []).map((line) => buildTaxRow(line, taxes)), [taxLines, taxes]);
  const calculatedItems = useMemo(
    () => (Array.isArray(items) ? items : []).map((item) => ({ ...item, ...computeDirectPurchaseItem(item, productsById) })),
    [items, productsById]
  );

  const handleItemFieldChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "qty" && prev.jumpSizes?.length) {
        updated.jumpSizes = [];
        updated.jumpChangePrice = false;
        updated.size = "";
      }
      if (name === "productId") {
        const selectedProduct = products.find((product) => String(product.id) === String(value));
        if (selectedProduct?.hsn_code || selectedProduct?.hsn) {
          updated.hsnCode = selectedProduct.hsn_code || selectedProduct.hsn;
        }
        if (isCutSellingMode(selectedProduct?.selling_mode)) {
          updated.size = "Cut";
          updated.jumpSizes = [];
          updated.jumpChangePrice = false;
          updated.qty = "";
        } else if (prev.size === "Cut") {
          updated.size = "Jump";
          updated.jumpSizes = [];
          updated.jumpChangePrice = false;
          updated.qty = "";
        }
      }
      if (name === "price") {
        if (value === "") return updated;
        updated.marginPerc = toInputValue(
          computeMarginPercFromRate({
            cost: updated.cost,
            purchaseDiscountPerc: getProductPurchaseDiscountPerc(productsById, updated.productId),
            purchaseTaxPerc: getProductPurchaseTaxPerc(productsById, updated.productId),
            price: value,
          })
        );
        return updated;
      }
      if (name === "marginPerc") {
        updated.price = "";
        return updated;
      }
      if ((name === "cost" || name === "productId") && updated.price !== "") {
        updated.marginPerc = toInputValue(
          computeMarginPercFromRate({
            cost: updated.cost,
            purchaseDiscountPerc: getProductPurchaseDiscountPerc(productsById, updated.productId),
            purchaseTaxPerc: getProductPurchaseTaxPerc(productsById, updated.productId),
            price: updated.price,
          })
        );
      }
      return updated;
    });
  };

  const handleSizeChange = (e) => {
    const val = e.target.value;
    if (val === "Cut") {
      setCurrentItem((prev) => ({ ...prev, size: "Cut", jumpSizes: [] }));
      return;
    }
    if (val === "__jump__" || val === "Jump") {
      setCurrentItem((prev) => ({ ...prev, size: "Jump", jumpSizes: [] }));
      return;
    }
    setCurrentItem((prev) => ({ ...prev, size: val, jumpSizes: [] }));
  };

  const commitItemRows = (rowsToAdd) => {
    const normalizedRows = Array.isArray(rowsToAdd) ? rowsToAdd : [rowsToAdd];

    setItems((prev) => {
      const next = [...prev];
      if (editInsertIndex !== null && editInsertIndex >= 0 && editInsertIndex <= next.length) {
        next.splice(editInsertIndex, 0, ...normalizedRows);
      } else {
        next.push(...normalizedRows);
      }
      return renumberItems(next);
    });

    setCurrentItem(createDefaultItem(items.length + normalizedRows.length + 1));
    setEditInsertIndex(null);
  };

  const handleAddItem = () => {
    if (!currentItem.productId) { showToast("warning", "Product is required"); return; }
    const negativeItemFieldMessage = getNegativeItemFieldMessage(currentItem);
    if (negativeItemFieldMessage) { showToast("warning", negativeItemFieldMessage); return; }

    const cost = currentItemFinancials.cost;
    const marginPerc = currentItemFinancials.marginPerc;

    const productName = products.find((p) => p.id === parseInt(currentItem.productId))?.name || "-";
    const brandName = brands.find((b) => b.id === parseInt(currentItem.brandId))?.name || "-";
    const colorName = colors.find((c) => c.id === parseInt(currentItem.colorId))?.name || "-";

    const jumpRows = normalizeJumpDetails(currentItem.jumpSizes, {
      cost,
      purchaseTaxPerc: currentItemFinancials.purchaseTaxPerc,
      saleDiscountPerc: getProductSaleDiscountPerc(productsById, currentItem.productId),
      purchaseDiscountPerc: getProductPurchaseDiscountPerc(productsById, currentItem.productId),
    }).filter((row) => row.size && row.qty > 0);

    if (currentItem.size === "Cut" && jumpRows.length === 0) {
      setCutAutoAddPending(true);
      setCutOpen(true);
      return;
    }

    if (currentItem.size === "Jump" && jumpRows.length === 0) {
      setJumpAutoAddPending(true);
      setJumpOpen(true);
      return;
    }

    if (jumpRows.length > 0) {
      const aggregate = aggregateJumpDetails(jumpRows);
      const isCutDetailRow = jumpRows.some((row) => row.detailType === "cut" || row.meter > 0);
      const newItem = {
        id: Date.now(),
        sNo: editInsertIndex !== null ? editInsertIndex + 1 : items.length + 1,
        productId: currentItem.productId,
        productName,
        brandId: currentItem.brandId,
        brandName,
        size: isCutDetailRow ? "Cut" : "Jump",
        colorId: currentItem.colorId,
        colorName,
        designNo: currentItem.designNo,
        hsnCode: currentItem.hsnCode,
        qty: aggregate.qty,
        cost: aggregate.cost,
        discount: 0,
        marginPerc: aggregate.marginPerc,
        purchaseTaxPerc: aggregate.purchaseTaxPerc,
        taxAmount: aggregate.taxAmount,
        price: aggregate.price,
        amount: aggregate.amount,
        jumpChangePrice: Boolean(currentItem.jumpChangePrice),
        jumpDetails: jumpRows,
        finalAmount: aggregate.finalAmount,
        saleDiscountPerc: aggregate.saleDiscountPerc,
        purchaseDiscountPerc: aggregate.purchaseDiscountPerc,
      };

      commitItemRows(newItem);
      return;
    }

    const qty = parseInt(currentItem.qty, 10) || 0;
    if (qty <= 0) { showToast("warning", "Qty must be greater than 0"); return; }

    const newItem = {
      id: Date.now(),
      sNo: editInsertIndex !== null ? editInsertIndex + 1 : items.length + 1,
      productId: currentItem.productId,
      productName,
      brandId: currentItem.brandId,
      brandName,
      size: currentItem.size,
      colorId: currentItem.colorId,
      colorName,
      designNo: currentItem.designNo,
      hsnCode: currentItem.hsnCode,
      qty,
      cost,
      discount: 0,
      marginPerc,
      purchaseTaxPerc: currentItemFinancials.purchaseTaxPerc,
      taxAmount: currentItemFinancials.taxAmount,
      price: currentItemFinancials.price,
      amount: currentItemFinancials.amount,
    };

    commitItemRows(newItem);
  };

  // Jump apply — prepare the current row, actual add happens on +
  const handleJumpApply = (jumpSizes, changePrice = false) => {
    if (!currentItem.productId) { showToast("warning", "Select a product first"); return; }

    const normalizedJumpSizes = normalizeJumpDetails(jumpSizes, {
      cost: currentItemFinancials.cost,
      purchaseTaxPerc: currentItemFinancials.purchaseTaxPerc,
      saleDiscountPerc: getProductSaleDiscountPerc(productsById, currentItem.productId),
      purchaseDiscountPerc: getProductPurchaseDiscountPerc(productsById, currentItem.productId),
    }).filter((row) => row.size && row.qty > 0);

    if (normalizedJumpSizes.length === 0) {
      showToast("warning", "Add at least one jump size");
      return;
    }

    const totalQty = normalizedJumpSizes.reduce((sum, row) => sum + row.qty, 0);
    if (jumpAutoAddPending) {
      const productName = products.find((p) => p.id === parseInt(currentItem.productId))?.name || "-";
      const brandName = brands.find((b) => b.id === parseInt(currentItem.brandId))?.name || "-";
      const colorName = colors.find((c) => c.id === parseInt(currentItem.colorId))?.name || "-";
      const aggregate = aggregateJumpDetails(normalizedJumpSizes);
      commitItemRows({
        id: Date.now(),
        sNo: editInsertIndex !== null ? editInsertIndex + 1 : items.length + 1,
        productId: currentItem.productId,
        productName,
        brandId: currentItem.brandId,
        brandName,
        size: "Jump",
        colorId: currentItem.colorId,
        colorName,
        designNo: currentItem.designNo,
        hsnCode: currentItem.hsnCode,
        qty: aggregate.qty,
        cost: aggregate.cost,
        discount: 0,
        marginPerc: aggregate.marginPerc,
        purchaseTaxPerc: aggregate.purchaseTaxPerc,
        taxAmount: aggregate.taxAmount,
        price: aggregate.price,
        amount: aggregate.amount,
        jumpChangePrice: Boolean(changePrice),
        jumpDetails: normalizedJumpSizes,
        finalAmount: aggregate.finalAmount,
        saleDiscountPerc: aggregate.saleDiscountPerc,
        purchaseDiscountPerc: aggregate.purchaseDiscountPerc,
      });
      setJumpAutoAddPending(false);
      setJumpOpen(false);
      return;
    }

    setCurrentItem((prev) => ({
      ...prev,
      size: "Jump",
      qty: String(totalQty),
      jumpSizes: normalizedJumpSizes,
      jumpChangePrice: Boolean(changePrice),
    }));
    setJumpAutoAddPending(false);
    setJumpOpen(false);
  };

  const handleCutApply = (cutDetail) => {
    if (!currentItem.productId) { showToast("warning", "Select a product first"); return; }

    const normalizedCutRows = normalizeJumpDetails([cutDetail], {
      cost: currentItemFinancials.cost,
      purchaseTaxPerc: currentItemFinancials.purchaseTaxPerc,
      saleDiscountPerc: getProductSaleDiscountPerc(productsById, currentItem.productId),
      purchaseDiscountPerc: getProductPurchaseDiscountPerc(productsById, currentItem.productId),
    }).filter((row) => row.size && row.qty > 0 && row.meter > 0);

    if (normalizedCutRows.length === 0) {
      showToast("warning", "Enter valid cut quantity and meter");
      return;
    }

    const totalQty = normalizedCutRows.reduce((sum, row) => sum + row.qty, 0);

    if (cutAutoAddPending) {
      const productName = products.find((p) => p.id === parseInt(currentItem.productId, 10))?.name || "-";
      const brandName = brands.find((b) => b.id === parseInt(currentItem.brandId, 10))?.name || "-";
      const colorName = colors.find((c) => c.id === parseInt(currentItem.colorId, 10))?.name || "-";
      const aggregate = aggregateJumpDetails(normalizedCutRows);

      commitItemRows({
        id: Date.now(),
        sNo: editInsertIndex !== null ? editInsertIndex + 1 : items.length + 1,
        productId: currentItem.productId,
        productName,
        brandId: currentItem.brandId,
        brandName,
        size: "Cut",
        colorId: currentItem.colorId,
        colorName,
        designNo: currentItem.designNo,
        hsnCode: currentItem.hsnCode,
        qty: aggregate.qty,
        cost: aggregate.cost,
        discount: 0,
        marginPerc: aggregate.marginPerc,
        purchaseTaxPerc: aggregate.purchaseTaxPerc,
        taxAmount: aggregate.taxAmount,
        price: aggregate.price,
        amount: aggregate.amount,
        jumpChangePrice: false,
        jumpDetails: normalizedCutRows,
        finalAmount: aggregate.finalAmount,
        saleDiscountPerc: aggregate.saleDiscountPerc,
        purchaseDiscountPerc: aggregate.purchaseDiscountPerc,
      });
      setCutAutoAddPending(false);
      setCutOpen(false);
      return;
    }

    setCurrentItem((prev) => ({
      ...prev,
      size: "Cut",
      qty: String(totalQty),
      jumpSizes: normalizedCutRows,
      jumpChangePrice: false,
    }));
    setCutAutoAddPending(false);
    setCutOpen(false);
  };

  const handleOpenEditItem = (item, index) => {
    if (index < 0) return;
    setEditItemDialog({ open: true, index, item });
  };

  const handleConfirmEditItem = () => {
    if (editItemDialog.index === null || !editItemDialog.item) {
      setEditItemDialog({ open: false, index: null, item: null });
      return;
    }

    setItems((prev) => renumberItems(prev.filter((_, i) => i !== editItemDialog.index)));
    setCurrentItem(createEditableDraftFromItem(editItemDialog.item));
    setEditInsertIndex(editItemDialog.index);
    setEditItemDialog({ open: false, index: null, item: null });
    showToast("info", "Row loaded into the entry fields");
  };

  const handleDeleteItem = (index) => {
    setItems((prev) => renumberItems(prev.filter((_, i) => i !== index)));
  };

  const handleItemFilterDraftChange = (key, value) => {
    setItemFilterDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleItemFilterKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setItemFilters({ ...itemFilterDraft });
  };

  // Totals
  const taxSummary = taxRows.reduce(
    (acc, row) => ({
      value: acc.value + (parseFloat(row.taxValue) || 0),
      taxable: acc.taxable + row.taxable,
      discount: acc.discount + (parseFloat(row.taxDiscount) || 0),
      tax: acc.tax + row.taxAmount,
    }),
    { value: 0, taxable: 0, discount: 0, tax: 0 }
  );
  const itemTotals = useMemo(
    () =>
      calculatedItems.reduce(
        (acc, item) => ({
          qty: acc.qty + item.qty,
          gross: acc.gross + item.gross,
          discount: acc.discount + item.discount,
          tax: acc.tax + item.taxAmount,
          net: acc.net + item.amount,
        }),
        { qty: 0, gross: 0, discount: 0, tax: 0, net: 0 }
      ),
    [calculatedItems]
  );
  const invoiceSummary = useMemo(() => {
    const charges = Math.max(0, toFiniteNumber(form.otherCharges, 0));
    const billValue = round2(taxSummary.value);
    const purDiscount = round2(taxSummary.discount);
    const tax = round2(taxSummary.tax);
    const purDiscountPerc = billValue > 0 ? round2((purDiscount / billValue) * 100) : 0;
    const total = round2(billValue + charges + tax - purDiscount);

    return {
      billValue,
      charges,
      tax,
      purDiscount,
      purDiscountPerc,
      total,
    };
  }, [form.otherCharges, taxSummary]);

  const filteredItems = useMemo(() => {
    const activeFilters = Object.entries(itemFilters).filter(([, value]) => String(value || "").trim() !== "");
    if (activeFilters.length === 0) return calculatedItems;

    return calculatedItems.filter((item) =>
      activeFilters.every(([key, value]) => String(item[key] ?? "").toLowerCase().includes(String(value).trim().toLowerCase()))
    );
  }, [calculatedItems, itemFilters]);

  const itemColumnTotals = useMemo(
    () =>
      calculatedItems.reduce(
        (acc, item) => ({
          qty: acc.qty + (Number(item.qty) || 0),
          cost: acc.cost + (Number(item.cost) || 0),
          margin: acc.margin + (Number(item.marginPerc) || 0),
          price: acc.price + (Number(item.price) || 0),
          amount: acc.amount + (Number(item.amount) || 0),
        }),
        { qty: 0, cost: 0, margin: 0, price: 0, amount: 0 }
      ),
    [calculatedItems]
  );

  const retailLocationOptions = useMemo(() => {
    const options = companies
      .filter((company) => String(company?.name || "").trim() !== "")
      .map((company) => ({
        value: String(company.name).trim(),
        label: String(company.name).trim(),
      }));

    if (form.retailLocation && !options.some((option) => option.value === form.retailLocation)) {
      return [{ value: form.retailLocation, label: form.retailLocation }, ...options];
    }

    return options;
  }, [companies, form.retailLocation]);

  const handleQuickAttributeFormChange = (event) => {
    const { name, value } = event.target;
    setQuickAttributeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenQuickAttribute = () => {
    setQuickAttributeForm(createDefaultQuickAttributeForm());
    setQuickAttributeOpen(true);
  };

  const handleSaveQuickAttribute = async () => {
    const type = String(quickAttributeForm.type || "").trim().toLowerCase();
    const code = String(quickAttributeForm.code || "").trim();
    const name = String(quickAttributeForm.name || "").trim();

    if (!code) {
      showToast("warning", "Code is required");
      return;
    }
    if (!name) {
      showToast("warning", "Name is required");
      return;
    }

    if (isSuperAdmin && !form.companyId && ["product", "brand", "supplier"].includes(type)) {
      showToast("warning", "Select company first");
      return;
    }

    setQuickAttributeSaving(true);
    try {
      let response;
      if (type === "product") {
        response = await api.post("/products", { code, name, ...(form.companyId ? { company_id: Number(form.companyId) } : {}) });
      } else if (type === "brand") {
        response = await api.post("/brands", {
          code,
          name,
          is_active: true,
          product_ids: [],
          product_margins: [],
          ...(form.companyId ? { company_id: Number(form.companyId) } : {}),
        });
      } else if (type === "color") {
        response = await api.post("/attributes/colour", { code, name, is_active: true });
      } else if (type === "size") {
        response = await api.post("/sizes", { code, size_name: name, measurement: name, is_active: true });
      } else if (type === "supplier") {
        response = await api.post("/suppliers", {
          codeType: "Supplier",
          code,
          name,
          active: true,
          ...(form.companyId ? { company: Number(form.companyId) } : {}),
        });
      } else if (type === "transport") {
        response = await api.post("/transports", {
          businessMode: "Other",
          name,
          isActive: true,
          rates: [],
        });
      } else {
        throw new Error("Unsupported attribute type");
      }

      const created = unwrapApiRecord(response);
      await loadDropdownData();

      if (type === "product" && created?.id) {
        setCurrentItem((prev) => ({ ...prev, productId: String(created.id) }));
      } else if (type === "brand" && created?.id) {
        setCurrentItem((prev) => ({ ...prev, brandId: String(created.id) }));
      } else if (type === "color" && created?.id) {
        setCurrentItem((prev) => ({ ...prev, colorId: String(created.id) }));
      } else if (type === "size") {
        setCurrentItem((prev) => ({ ...prev, size: created?.measurement || created?.size_name || name, jumpSizes: [] }));
      } else if (type === "supplier" && created?.id) {
        setForm((prev) => ({ ...prev, supplierId: String(created.id) }));
      } else if (type === "transport" && created?.id) {
        setForm((prev) => ({ ...prev, transportId: String(created.id) }));
      }

      setQuickAttributeOpen(false);
      setQuickAttributeForm(createDefaultQuickAttributeForm());
      showToast("success", `${ATTRIBUTE_QUICK_CREATE_OPTIONS.find((option) => option.value === type)?.label || "Attribute"} created`);
    } catch (err) {
      console.error("Quick attribute create failed:", err);
      showToast("error", err.response?.data?.message || "Failed to create attribute");
    } finally {
      setQuickAttributeSaving(false);
    }
  };

  const handleOpenLastSaved = async () => {
    setLastSavedOpen(true);
    setLastSavedLoading(true);
    setLastSavedEntry(null);

    try {
      const res = await api.get("/direct-purchases", { params: { all: "true" } });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const targetCompanyId = String(form.companyId || authUser?.company_id || "").trim();
      const latest = targetCompanyId
        ? rows.find((row) => String(row.company_id || row.company?.id || "") === targetCompanyId) || null
        : rows[0] || null;
      setLastSavedEntry(latest);
    } catch (err) {
      console.error("Failed to load last saved direct purchase:", err);
      showToast("error", "Failed to load last saved direct purchase");
    } finally {
      setLastSavedLoading(false);
    }
  };

  // Save
  const handleSave = async (forceMismatch = false) => {
    if (!form.companyId) { showToast("error", "Company is required"); return; }
    if (!form.supplierId) { showToast("error", "Supplier is required"); return; }
    if (items.length === 0) { showToast("error", "Add at least one item"); return; }
    const mismatchAmount = round2(Math.abs(invoiceSummary.total - itemTotals.net));
    if (forceMismatch !== true && mismatchAmount > 0.009) {
      setInvoiceMismatchConfirm({ open: true, difference: mismatchAmount });
      return;
    }

    setSaving(true);
    try {
      const selectedCompany = companies.find((company) => String(company.id) === String(form.companyId));
      const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === String(form.supplierId));
      const selectedTransport = transports.find((transport) => String(transport.id) === String(form.transportId));
      const payload = {
        companyId: form.companyId,
        companyName: selectedCompany?.name || "",
        supplierId: form.supplierId,
        supplierName: selectedSupplier?.name || "",
        purchaseType: form.purchaseType,
        poNo: form.poNo,
        transportId: form.transportId || null,
        transportName: selectedTransport?.name || "",
        lrNo: form.lrNo,
        lrDate: form.lrDate || null,
        bundles: form.bundles || 0,
        retailLocation: form.retailLocation,
        invoiceNo: form.invoiceNo,
        invoiceDate: form.invoiceDate || null,
        igst: form.igst,
        iDiscount: form.iDiscount,
        taxTypeId: taxRows[0]?.taxTypeId || null,
        taxTypeName: taxes.find((tax) => String(tax.id) === String(taxRows[0]?.taxTypeId || ""))?.name || "",
        taxValue: taxRows.reduce((sum, row) => sum + (parseFloat(row.taxValue) || 0), 0),
        taxDiscount: taxRows.reduce((sum, row) => sum + (parseFloat(row.taxDiscount) || 0), 0),
        taxAmount: invoiceSummary.tax,
        taxLines: taxRows.map((row) => ({
          taxTypeId: row.taxTypeId || null,
          taxTypeName: taxes.find((tax) => String(tax.id) === String(row.taxTypeId))?.name || "",
          taxValue: parseFloat(row.taxValue) || 0,
          taxDiscount: parseFloat(row.taxDiscount) || 0,
          taxAmount: row.taxAmount,
          taxPerc: row.taxPerc,
          chargeTypeValue: row.chargeTypeValue || "",
        })),
        billValue: invoiceSummary.billValue,
        otherCharges: invoiceSummary.charges,
        billTax: invoiceSummary.tax,
        purDiscountPerc: invoiceSummary.purDiscountPerc,
        purDiscount: invoiceSummary.purDiscount,
        total: invoiceSummary.total,
        invoiceWorkflowStatus: form.invoiceWorkflowStatus,
        items: calculatedItems.map((item) => ({
          sNo: item.sNo,
          productId: item.productId,
          productName: item.productName || "",
          brandId: item.brandId || null,
          brandName: item.brandName || "",
          size: item.size || null,
          colorId: item.colorId || null,
          colorName: item.colorName || "",
          designNo: item.designNo || null,
          hsnCode: item.hsnCode || null,
          qty: item.qty,
          cost: item.cost,
          discount: item.discount,
          marginPerc: item.marginPerc,
          price: item.price,
          amount: item.amount,
          jumpChangePrice: Boolean(item.jumpChangePrice),
          jumpDetails: Array.isArray(item.jumpDetails) ? item.jumpDetails : [],
        })),
      };

      if (editId) {
        await api.put(`/direct-purchases/${editId}`, payload);
      } else {
        await api.post("/direct-purchases", payload);
      }
      showToast("success", "Direct purchase saved without stock update");
      // Reset
      setForm(createDefaultForm(authUser));
      setTaxDraft(createEmptyTaxLine());
      setTaxLines([]);
      setItems([]);
      setCurrentItem(createDefaultItem(1));
      setJumpAutoAddPending(false);
      setCutAutoAddPending(false);
      setInvoiceMismatchConfirm({ open: false, difference: 0 });
      setEditInsertIndex(null);
      setEditItemDialog({ open: false, index: null, item: null });
      setJumpSizeViewDialog({ open: false, rows: [] });
      setItemFilterDraft(createDefaultItemFilters());
      setItemFilters(createDefaultItemFilters());
      if (editId) navigate("/warehouse/direct-purchase", { replace: true });
    } catch (err) {
      console.error("Save failed:", err);
      showToast("error", err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    setForm(createDefaultForm(authUser));
    setTaxDraft(createEmptyTaxLine());
    setTaxLines([]);
    setItems([]);
    setCurrentItem(createDefaultItem(1));
    setJumpAutoAddPending(false);
    setCutAutoAddPending(false);
    setInvoiceMismatchConfirm({ open: false, difference: 0 });
    setEditInsertIndex(null);
    setEditItemDialog({ open: false, index: null, item: null });
    setJumpSizeViewDialog({ open: false, rows: [] });
    setItemFilterDraft(createDefaultItemFilters());
    setItemFilters(createDefaultItemFilters());
    if (editId) navigate("/warehouse/direct-purchase", { replace: true });
  };

  if (pageLoading || loadingEntry) {
    return <PageSkeleton variant="form" rows={10} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/warehouse")} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-800 dark:text-gray-100">Direct Purchase</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={handleNew} className="glass-btn glass-btn-secondary">New</button>
          <button onClick={handleOpenQuickAttribute} className="glass-btn glass-btn-secondary flex items-center">
            <Plus className="w-4 h-4 mr-1" /> Attribute
          </button>
          <button onClick={handleSave} disabled={saving || loadingEntry} className="glass-btn glass-btn-success flex items-center disabled:opacity-50">
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : editId ? "Update" : "Save"}
          </button>
          <button onClick={handleOpenLastSaved} className="glass-btn glass-btn-secondary">Last Saved</button>
          <button onClick={() => navigate("/warehouse/direct-purchase/search")} className="glass-btn glass-btn-primary flex items-center">
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[380px] flex-shrink-0 p-4 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Type</label>
              <select
                name="purchaseType"
                value={form.purchaseType}
                onChange={handleFormChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {PURCHASE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">PO Number</label>
              <input type="text" name="poNo" value={form.poNo} onChange={handleFormChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm" />
            </div>
          </div>

          {/* Invoice Details Header */}
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 pb-1 mb-3">Invoice Details</h3>

          {/* LR No / LR Date / Bundles */}
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">LR No</label>
              <input type="text" name="lrNo" value={form.lrNo} onChange={handleFormChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">LR Date</label>
              <input type="date" name="lrDate" value={form.lrDate} onChange={handleFormChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm" />
            </div>
            <div className="w-20">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Bundles</label>
              <input type="text" name="bundles" value={form.bundles} onChange={handleFormChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Company</label>
              <InlineSearchSelect name="companyId" value={form.companyId} onChange={handleFormChange} options={companies} placeholder="Select..." searchPlaceholder="Search company..." />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Retail Location</label>
              {isSuperAdmin ? (
                <InlineSearchSelect
                  name="retailLocation"
                  value={form.retailLocation}
                  onChange={handleFormChange}
                  options={retailLocationOptions}
                  placeholder="Select..."
                  searchPlaceholder="Search company..."
                />
              ) : (
                <input
                  type="text"
                  name="retailLocation"
                  value={form.retailLocation}
                  readOnly
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Transport</label>
              <InlineSearchSelect name="transportId" value={form.transportId} onChange={handleFormChange} options={transports} onAsyncSearch={handleAsyncTransportSearch} placeholder="Select..." searchPlaceholder="Search transport..." />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Supplier</label>
              <InlineSearchSelect name="supplierId" value={form.supplierId} onChange={handleFormChange} options={suppliers} onAsyncSearch={handleAsyncSupplierSearch} placeholder="Select..." searchPlaceholder="Search supplier..." />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 mb-2 items-end">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Invoice No</label>
              <input type="text" name="invoiceNo" value={form.invoiceNo} onChange={handleFormChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm" />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Invoice Date</label>
              <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleFormChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm" />
            </div>
            <label className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400 pb-2 whitespace-nowrap">
              <input type="checkbox" name="igst" checked={form.igst} onChange={handleFormChange} className="rounded border-gray-300 dark:border-gray-600 text-blue-600" /> IGST
            </label>
            <label className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400 pb-2 whitespace-nowrap">
              <input type="checkbox" name="iDiscount" checked={form.iDiscount} onChange={handleFormChange} className="rounded border-gray-300 dark:border-gray-600 text-blue-600" /> I.Disnt
            </label>
          </div>

          <hr className="my-3 border-gray-200 dark:border-gray-700" />

          <div className="mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-900 dark:text-gray-100">Tax Details</h4>
          </div>

          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
            <div>Tax Type</div>
            <div>Value</div>
            <div>Discount</div>
            <div>Tax</div>
            <div></div>
          </div>

          <div className="mt-1 mb-3 grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-2">
            <InlineSearchSelect
              name="taxTypeId"
              value={taxDraft.taxTypeId}
              onChange={(event) => handleTaxDraftChange("taxTypeId", event.target.value)}
              options={taxOptions}
              placeholder="Select tax..."
              searchPlaceholder="Search tax..."
            />
            <input
              type="number"
              value={taxDraft.taxValue}
              onChange={(event) => handleTaxDraftChange("taxValue", event.target.value)}
              placeholder="taxable"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm"
            />
            <input
              type="number"
              value={taxDraft.taxDiscount}
              onChange={(event) => handleTaxDraftChange("taxDiscount", event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                handleAddTaxLine();
              }}
              placeholder="discnt"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm"
            />
            <input
              type="text"
              value={taxDraftRow.taxAmount ? taxDraftRow.taxAmount.toFixed(2) : ""}
              readOnly
              placeholder="tax"
              className="w-full border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 text-sm"
            />
            <button type="button" onClick={handleAddTaxLine} className="glass-btn glass-btn-primary p-1.5" title="Add tax row">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_108px] gap-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <div>Tax %</div>
              <div>Taxable</div>
              <div>Discount</div>
              <div>Tax</div>
              <div></div>
            </div>
            <div className="h-36 overflow-y-auto">
              {taxRows.length ? (
                taxRows.map((line) => (
                  <div key={line.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_108px] items-center gap-2 border-b dark:border-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 last:border-b-0">
                    <div>{line.chargeTypeLabel || line.taxPerc.toFixed(2)}</div>
                    <div>{line.taxable.toFixed(2)}</div>
                    <div>{(parseFloat(line.taxDiscount) || 0).toFixed(2)}</div>
                    <div>{line.taxAmount.toFixed(2)}</div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenTaxChargeTypeDialog(line)}
                        className="glass-btn glass-btn-primary p-1.5"
                        title="Edit charge type"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleRemoveTaxLine(line.id)} className="glass-btn glass-btn-danger p-1.5" title="Remove tax row">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-sm text-gray-400 dark:text-gray-500">No tax rows added</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-100">
              <div>{taxRows.reduce((sum, row) => sum + row.taxPerc, 0).toFixed(2)}</div>
              <div>{taxSummary.taxable.toFixed(2)}</div>
              <div>{taxSummary.discount.toFixed(2)}</div>
              <div>{taxSummary.tax.toFixed(2)}</div>
            </div>
          </div>

          <hr className="my-3 border-gray-200 dark:border-gray-700" />

          {/* Bill Value / Charges / Tax */}
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Bill Value</label>
              <input type="text" value={invoiceSummary.billValue.toFixed(2)} readOnly className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Charges</label>
              <input type="text" name="otherCharges" value={form.otherCharges} onChange={handleFormChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Tax</label>
              <input type="text" value={invoiceSummary.tax.toFixed(2)} readOnly className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
            </div>
          </div>

          {/* Pur. Discnt % / Pur. Discnt / Total */}
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Pur. Discnt %</label>
              <input type="text" value={invoiceSummary.purDiscountPerc.toFixed(2)} readOnly className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Pur. Discnt</label>
              <input type="text" value={invoiceSummary.purDiscount.toFixed(2)} readOnly className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-red-700 dark:text-red-400">Total</label>
              <input type="text" value={invoiceSummary.total.toFixed(2)} readOnly className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 font-bold text-blue-700 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            {loadingEntry ? (
              <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 text-sm text-blue-700 dark:text-blue-400">Loading direct purchase...</div>
            ) : null}

            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-3">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-2">
                  <div className="w-12">S.No</div>
                  <div className="w-32">Product</div>
                  <div className="w-24">Brand</div>
                  <div className="w-24">Size</div>
                  <div className="w-24">Colour</div>
                  <div className="w-20">Design</div>
                  <div className="w-16">HSN</div>
                  <div className="w-16 text-right">Qty</div>
                  <div className="w-20 text-right">Cost</div>
                  <div className="w-[72px] text-right">Margin</div>
                  <div className="w-[88px] text-right">Rate</div>
                  <div className="w-9"></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-12">
                    <input type="text" value={currentItem.sNo} readOnly className="w-full text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div className="w-32">
                    <InlineSearchSelect name="productId" value={currentItem.productId} onChange={handleItemFieldChange} options={products} onAsyncSearch={handleAsyncProductSearch} placeholder="Product..." searchPlaceholder="Search product..." />
                  </div>
                  <div className="w-24">
                    <InlineSearchSelect name="brandId" value={currentItem.brandId} onChange={handleItemFieldChange} options={brands} onAsyncSearch={handleAsyncBrandSearch} placeholder="Brand..." searchPlaceholder="Search brand..." />
                  </div>
                  <div className="w-24">
                    <SizeSearchSelect
                      value={currentItem.size}
                      onChange={handleSizeChange}
                      sizes={sizes}
                      sizeGroups={sizeGroups}
                      sellingMode={productsById.get(String(currentItem.productId))?.selling_mode}
                    />
                  </div>
                  <div className="w-24">
                    <InlineSearchSelect name="colorId" value={currentItem.colorId} onChange={handleItemFieldChange} options={colors} placeholder="Color..." searchPlaceholder="Search color..." />
                  </div>
                  <div className="w-20">
                    <input type="text" name="designNo" value={currentItem.designNo} onChange={handleItemFieldChange} placeholder="Design" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-sm" />
                  </div>
                  <div className="w-16">
                    <input type="text" name="hsnCode" value={currentItem.hsnCode} onChange={handleItemFieldChange} placeholder="HSN" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-sm" />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      name="qty"
                      value={currentItem.qty}
                      onChange={handleItemFieldChange}
                      placeholder="0"
                      readOnly={Boolean(currentItem.jumpSizes?.length)}
                      className={`w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-sm ${currentItem.jumpSizes?.length ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                    />
                  </div>
                  <div className="w-20">
                    <input type="number" name="cost" value={currentItem.cost} onChange={handleItemFieldChange} placeholder="0.00" className="w-full text-right border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-sm" />
                  </div>
                  <div className="w-[72px]">
                    <input type="number" name="marginPerc" value={currentItem.marginPerc} onChange={handleItemFieldChange} placeholder="0" className="w-full text-right border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-sm" />
                  </div>
                  <div className="w-[88px]">
                    <input
                      type="number"
                      name="price"
                      value={
                        currentItem.price !== ""
                          ? currentItem.price
                          : currentItem.productId || currentItem.cost || currentItem.marginPerc
                            ? currentItemFinancials.price.toFixed(2)
                            : ""
                      }
                      onChange={handleItemFieldChange}
                      placeholder="0.00"
                      readOnly={Boolean(currentItem.jumpSizes?.length)}
                      className={`w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-sm ${currentItem.jumpSizes?.length ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                    />
                  </div>
                  <div className="w-9">
                    <button onClick={handleAddItem} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleAddItem(); } }} className="glass-btn glass-btn-primary w-8 h-8 flex items-center justify-center" title="Add Item">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-x-auto">
                <div className={`flex min-h-full flex-col ${ITEM_TABLE_WIDTH}`}>
              <div className="flex bg-blue-100 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
                <div className={`p-2 ${ITEM_TABLE_COLS.select} border-r dark:border-gray-700 text-center`}>
                  <input type="checkbox" checked disabled className="rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.sNo} border-r dark:border-gray-700 text-center`}>S.No</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.product} border-r dark:border-gray-700`}>Product</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.brand} border-r dark:border-gray-700`}>Brand</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.size} border-r dark:border-gray-700 text-center`}>Size</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.design} border-r dark:border-gray-700`}>Design</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.qty} border-r dark:border-gray-700 text-right`}>Qty</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.cost} border-r dark:border-gray-700 text-right`}>Cost</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.discount} border-r dark:border-gray-700 text-right`}>Discount</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.margin} border-r dark:border-gray-700 text-right`}>Margin%</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.price} border-r dark:border-gray-700 text-right`}>Price</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.amount} border-r dark:border-gray-700 text-right`}>Amount</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.action} text-center`}>Action</div>
              </div>

              <div className="flex bg-sky-50 dark:bg-sky-900/20 border-b dark:border-gray-700">
                <div className={`p-2 ${ITEM_TABLE_COLS.select} border-r dark:border-gray-700`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.sNo} border-r dark:border-gray-700`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.product} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.productName}
                    onChange={(event) => handleItemFilterDraftChange("productName", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search product"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.brand} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.brandName}
                    onChange={(event) => handleItemFilterDraftChange("brandName", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search brand"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.size} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.size}
                    onChange={(event) => handleItemFilterDraftChange("size", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search size"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.design} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.designNo}
                    onChange={(event) => handleItemFilterDraftChange("designNo", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search design"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.qty} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.qty}
                    onChange={(event) => handleItemFilterDraftChange("qty", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Qty"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs text-right"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.cost} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.cost}
                    onChange={(event) => handleItemFilterDraftChange("cost", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Cost"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs text-right"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.discount} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.discount}
                    onChange={(event) => handleItemFilterDraftChange("discount", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Disc"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs text-right"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.margin} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.marginPerc}
                    onChange={(event) => handleItemFilterDraftChange("marginPerc", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Margin"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs text-right"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.price} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.price}
                    onChange={(event) => handleItemFilterDraftChange("price", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Rate"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs text-right"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.amount} border-r dark:border-gray-700`}>
                  <input
                    type="text"
                    value={itemFilterDraft.amount}
                    onChange={(event) => handleItemFilterDraftChange("amount", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Amount"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-1 text-xs text-right"
                  />
                </div>
                <div className={`p-2 ${ITEM_TABLE_COLS.action} text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center`}>
                  Enter
                </div>
              </div>

              {/* Item Rows */}
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                {filteredItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-16 text-center text-gray-400 dark:text-gray-500 text-sm">No items added yet.</div>
                ) : (
                  filteredItems.map((item) => (
                    <div key={item.id} className="flex text-xs border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-100">
                      <div className={`p-2 ${ITEM_TABLE_COLS.select} border-r dark:border-gray-700 text-center`}>
                        <input type="checkbox" checked disabled className="rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                      </div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.sNo} border-r dark:border-gray-700 text-center`}>{item.sNo}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.product} border-r dark:border-gray-700 truncate`}>{item.productName}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.brand} border-r dark:border-gray-700 truncate`}>{item.brandName}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.size} border-r dark:border-gray-700 text-center`}>{item.size || "-"}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.design} border-r dark:border-gray-700 truncate`}>{item.designNo || "-"}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.qty} border-r dark:border-gray-700 text-right`}>{item.qty}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.cost} border-r dark:border-gray-700 text-right`}>{item.cost.toFixed(2)}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.discount} border-r dark:border-gray-700 text-right`}>{item.discount.toFixed(2)}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.margin} border-r dark:border-gray-700 text-right`}>{item.marginPerc}%</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.price} border-r dark:border-gray-700 text-right`}>{item.price.toFixed(2)}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.amount} border-r dark:border-gray-700 text-right font-medium`}>{item.amount.toFixed(2)}</div>
                      <div className={`p-2 ${ITEM_TABLE_COLS.action} flex items-center justify-center gap-3`}>
                        {Array.isArray(item.jumpDetails) && item.jumpDetails.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setJumpSizeViewDialog({ open: true, rows: item.jumpDetails })}
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
                            title={item.size === "Cut" ? "View cut details" : "View jump size details"}
                          >
                            <Eye className="h-5 w-5" strokeWidth={2.25} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item, items.findIndex((row) => row.id === item.id))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 dark:text-slate-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                          title="Edit item"
                        >
                          <Pencil className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(items.findIndex((row) => row.id === item.id))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-500 dark:text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
                          title="Delete item"
                        >
                          <Trash2 className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 border-t dark:border-gray-700">
                <div className={`p-2 ${ITEM_TABLE_COLS.select} border-r dark:border-gray-700`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.sNo} border-r dark:border-gray-700 text-center`}>-</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.product} border-r dark:border-gray-700`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.brand} border-r dark:border-gray-700`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.size} border-r dark:border-gray-700`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.design} border-r dark:border-gray-700`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.qty} border-r dark:border-gray-700 text-right text-red-600 dark:text-red-400`}>{itemColumnTotals.qty}</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.cost} border-r dark:border-gray-700 text-right text-red-600 dark:text-red-400`}>{itemColumnTotals.cost.toFixed(2)}</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.discount} border-r dark:border-gray-700 text-right`}></div>
                <div className={`p-2 ${ITEM_TABLE_COLS.margin} border-r dark:border-gray-700 text-right text-red-600 dark:text-red-400`}>{itemColumnTotals.margin.toFixed(2)}</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.price} border-r dark:border-gray-700 text-right text-red-600 dark:text-red-400`}>{itemColumnTotals.price.toFixed(2)}</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.amount} border-r dark:border-gray-700 text-right text-red-600 dark:text-red-400`}>{itemColumnTotals.amount.toFixed(2)}</div>
                <div className={`p-2 ${ITEM_TABLE_COLS.action}`}></div>
              </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Totals Bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 text-sm font-bold">
            <span className="text-gray-800 dark:text-gray-100 text-base">TOTAL</span>
            <div className="flex items-center gap-6">
              <span className="text-gray-800 dark:text-gray-100">Qty <span className="text-red-600 dark:text-red-400 ml-1">{itemTotals.qty}</span></span>
              <span className="text-gray-800 dark:text-gray-100">Gross <span className="text-red-600 dark:text-red-400 ml-1">{itemTotals.gross.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span></span>
              <span className="text-gray-800 dark:text-gray-100">Discount <span className="text-red-600 dark:text-red-400 ml-1">{itemTotals.discount.toFixed(2)}</span></span>
              <span className="text-gray-800 dark:text-gray-100">Tax <span className="text-red-600 dark:text-red-400 ml-1">{itemTotals.tax.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span></span>
              <span className="text-gray-800 dark:text-gray-100">Net <span className="text-blue-700 dark:text-blue-400 text-base ml-1">{itemTotals.net.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <select
                name="invoiceWorkflowStatus"
                value={form.invoiceWorkflowStatus}
                onChange={handleFormChange}
                className="min-w-[220px] border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {WORKFLOW_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button onClick={handleSave} disabled={saving || loadingEntry} className="glass-btn glass-btn-success flex items-center disabled:opacity-50">
                <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Jump Size Dialog */}
      <JumpSizeDialog
        open={jumpOpen}
        onClose={() => {
          setJumpOpen(false);
          setJumpAutoAddPending(false);
        }}
        onApply={handleJumpApply}
        totalQty={currentItem.qty || "0"}
        defaultRows={currentItem.jumpSizes}
        defaultChangePrice={currentItem.jumpChangePrice}
        baseCost={currentItemFinancials.cost}
        baseMrp={currentItemFinancials.price}
        purchaseTaxPerc={currentItemFinancials.purchaseTaxPerc}
        saleDiscountPerc={getProductSaleDiscountPerc(productsById, currentItem.productId)}
        purchaseDiscountPerc={getProductPurchaseDiscountPerc(productsById, currentItem.productId)}
      />
      <CutDetailDialog
        open={cutOpen}
        onClose={() => {
          setCutOpen(false);
          setCutAutoAddPending(false);
        }}
        onApply={handleCutApply}
        defaultRow={normalizeJumpDetails(currentItem.jumpSizes).find((row) => row.detailType === "cut" || row.meter > 0)}
        baseCost={currentItemFinancials.cost}
        basePrice={currentItemFinancials.price}
        purchaseTaxPerc={currentItemFinancials.purchaseTaxPerc}
        saleDiscountPerc={getProductSaleDiscountPerc(productsById, currentItem.productId)}
        purchaseDiscountPerc={getProductPurchaseDiscountPerc(productsById, currentItem.productId)}
      />
      <JumpSizeViewDialog
        open={jumpSizeViewDialog.open}
        rows={jumpSizeViewDialog.rows}
        onClose={() => setJumpSizeViewDialog({ open: false, rows: [] })}
      />
      <QuickAttributeDialog
        open={quickAttributeOpen}
        form={quickAttributeForm}
        saving={quickAttributeSaving}
        onClose={() => setQuickAttributeOpen(false)}
        onChange={handleQuickAttributeFormChange}
        onSave={handleSaveQuickAttribute}
      />
      <EditItemConfirmDialog
        open={editItemDialog.open}
        onClose={() => setEditItemDialog({ open: false, index: null, item: null })}
        onConfirm={handleConfirmEditItem}
      />
      <LastSavedDialog
        open={lastSavedOpen}
        loading={lastSavedLoading}
        entry={lastSavedEntry}
        onClose={() => setLastSavedOpen(false)}
      />
      <TaxChargeTypeDialog
        open={taxChargeTypeDialog.open}
        value={taxChargeTypeDialog.value}
        onClose={() => setTaxChargeTypeDialog({ open: false, lineId: null, value: "" })}
        onConfirm={handleSaveTaxChargeType}
      />
      <ConfirmDialog
        open={invoiceMismatchConfirm.open}
        title="Invoice Value Mismatch"
        message={`${invoiceMismatchConfirm.difference.toFixed(2)} amount different in invoice amount do you want to continue`}
        confirmLabel="OK"
        danger={false}
        onConfirm={() => {
          setInvoiceMismatchConfirm({ open: false, difference: 0 });
          handleSave(true);
        }}
        onCancel={() => setInvoiceMismatchConfirm({ open: false, difference: 0 })}
      />

      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />
    </div>
  );
};

export default DirectPurchase;
