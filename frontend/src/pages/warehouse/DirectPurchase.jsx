import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Save, Plus, X, ArrowLeft, Search, ChevronDown, Pencil, Trash2, Eye } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import PageSkeleton from "../../components/PageSkeleton";
import { buildSizeSelectOptions } from "../../utils/sizeSelectOptions";
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  alpha,
} from "@mui/material";

// ─── Sub-components (outside to prevent focus loss) ─────────────────────────

const LField = ({ label, children, className = "" }) => (
  <Stack direction="row" spacing={1} className={className} sx={{ alignItems: "center", mb: 1 }}>
    <Typography component="label" sx={{ width: 112, fontSize: 12.25, fontWeight: 700, color: "error.dark", flexShrink: 0 }}>{label}</Typography>
    <Box sx={{ flex: 1 }}>{children}</Box>
  </Stack>
);

const LInput = ({ label, name, value, onChange, type = "text", placeholder = "", className = "" }) => (
  <LField label={label} className={className}>
    <TextField
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
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
    <Box ref={containerRef} data-enter-ignore="true" sx={{ position: "relative", width: "100%" }}>
      <Box component="button" ref={triggerRef} type="button" data-searchable-select-trigger="true"
        onClick={() => { keyboardSelectionArmedRef.current = false; setOpen((p) => !p); setHighlightedIndex(-1); }}
        onKeyDown={handleTriggerKeyDown}
        sx={{ width: "100%", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 0.5, py: 0.5, fontSize: 12.25, bgcolor: "background.paper", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <Box component="span" sx={{ color: value ? "text.primary" : "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5 }}>{value || "Size..."}</Box>
        <ChevronDown size={12} style={{ flexShrink: 0, color: "#9ca3af", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : undefined }} />
      </Box>
      {open && (
        <Box sx={{ position: "absolute", zIndex: 50, left: 0, top: "100%", mt: 0.25, width: "100%", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", boxShadow: 4, minWidth: 160 }}>
          <Stack direction="row" spacing={0.5} sx={{ p: 0.5, borderBottom: 1, borderColor: "divider", alignItems: "center" }}>
            <Search size={12} style={{ flexShrink: 0, color: "#9ca3af" }} />
            <Box component="input" autoFocus type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Search size..." sx={{ width: "100%", fontSize: 12.25, outline: "none", bgcolor: "transparent", color: "text.secondary", border: 0 }} />
          </Stack>
          <Box component="ul" ref={listRef} sx={{ maxHeight: 208, overflowY: "auto", m: 0, p: 0, listStyle: "none" }}>
            <Box component="li" onClick={() => selectOption("")} sx={{ px: 1, py: 0.5, fontSize: 12.25, color: "text.secondary", cursor: "pointer", bgcolor: highlightedIndex === 0 ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "transparent", "&:hover": { bgcolor: highlightedIndex === 0 ? undefined : "action.hover" } }}>Size...</Box>
            {groupedDisplay.map((item) => {
              if (item.type === "header") return <Box component="li" key={`hdr-${item.label}`} sx={{ px: 1, py: 0.25, fontSize: 9, fontWeight: 600, color: "text.disabled", textTransform: "uppercase", bgcolor: "action.hover", userSelect: "none" }}>{item.label}</Box>;
              const thisIdx = ++optionIndex;
              return (
                <Box component="li" key={item.key} onClick={() => selectOption(item.value)}
                  sx={(theme) => ({
                    px: 1,
                    py: 0.5,
                    fontSize: 12.25,
                    cursor: "pointer",
                    ...(highlightedIndex === thisIdx
                      ? { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "primary.main", fontWeight: 500 }
                      : item.value === value
                      ? { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06), color: "primary.main", fontWeight: 500 }
                      : item.value === "__jump__"
                      ? { color: "primary.main", fontWeight: 500, "&:hover": { bgcolor: "action.hover" } }
                      : { color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }),
                  })}
                >{item.label}</Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
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
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={handleClose}>
      <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", boxShadow: 8, border: "1px solid", borderColor: "divider", width: "100%", maxWidth: 896, mx: 2, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Size Detail (Jump)</Typography>
          <Button onClick={handleClose} className="glass-btn glass-btn-secondary"><X size={16} /></Button>
        </Stack>
        <Stack spacing={1.5} sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Start</Typography>
              <TextField type="number" value={start} onChange={(e) => setStart(e.target.value)} size="small" fullWidth placeholder="10" sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-end", pb: 0.5, color: "text.disabled", fontWeight: 700 }}>-</Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Increment</Typography>
              <TextField type="number" value={increment} onChange={(e) => setIncrement(e.target.value)} size="small" fullWidth placeholder="2" sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-end", pb: 0.5, color: "text.disabled", fontWeight: 700 }}>-</Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>End</Typography>
              <TextField type="number" value={end} onChange={(e) => setEnd(e.target.value)} size="small" fullWidth placeholder="26" sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
          </Stack>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Total Qty: <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{Math.max(0, parseInt(totalQty, 10) || 0)}</Box></Typography>
            <Stack component="label" direction="row" spacing={1} sx={{ alignItems: "center", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
              <Checkbox
                checked={changePrice}
                onChange={(event) => setChangePrice(event.target.checked)}
                size="small"
                sx={{ p: 0 }}
              />
              Change Price
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
            <Button onClick={handleGenerate} className="glass-btn glass-btn-primary">Generate</Button>
          </Stack>
          {generatedSizes.length > 0 && (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "3.5px", maxHeight: 208, overflow: "auto" }}>
              {changePrice ? (
                <Box sx={{ minWidth: 820 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 72px 88px 78px 88px 92px 78px 92px 60px", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 10.5, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider", position: "sticky", top: 0 }}>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider" }}>Size</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "center" }}>Qty</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Cost</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>P.Dsnt</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Margin</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>MRP</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>S.Dsnt</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Final</Box>
                    <Box sx={{ p: 1, textAlign: "center" }}>Action</Box>
                  </Box>
                  {generatedSizes.map((item, idx) => (
                    <Box key={`${item.size}-${idx}`} sx={{ display: "grid", gridTemplateColumns: "1fr 72px 88px 78px 88px 92px 78px 92px 60px", alignItems: "center", fontSize: 12.25, borderBottom: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", fontWeight: 500, color: "text.primary" }}>{item.size}</Box>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider" }}>
                        <TextField type="number" value={item.qty} onChange={(e) => handleQtyChange(idx, e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { textAlign: "center", fontSize: 10.5, py: 0.25 } }} />
                      </Box>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right", color: "text.primary" }}>{item.cost.toFixed(2)}</Box>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right", color: "text.primary" }}>{item.purchaseDiscountPerc.toFixed(2)}%</Box>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider" }}>
                        <TextField type="number" value={item.marginValue} onChange={(e) => handleMarginChange(idx, e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.25 } }} />
                      </Box>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider" }}>
                        <TextField type="number" value={item.mrp} onChange={(e) => handleMrpChange(idx, e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.25 } }} />
                      </Box>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right", color: "text.primary" }}>{item.saleDiscountPerc.toFixed(2)}%</Box>
                      <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right", fontWeight: 500, color: "text.primary" }}>{item.final.toFixed(2)}</Box>
                      <Box sx={{ p: 1, textAlign: "center" }}>
                        <Button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="glass-btn glass-btn-danger"
                          sx={{ borderRadius: "3.5px", p: 0.75, minWidth: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          title="Remove row"
                        >
                          <X size={14} />
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <>
                  <Stack direction="row" sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 10.5, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider", position: "sticky", top: 0 }}>
                    <Box sx={{ p: 1, width: 48, borderRight: 1, borderColor: "divider", textAlign: "center" }}>S.No</Box>
                    <Box sx={{ p: 1, flex: 1, borderRight: 1, borderColor: "divider" }}>Size</Box>
                    <Box sx={{ p: 1, width: 80, borderRight: 1, borderColor: "divider", textAlign: "center" }}>Qty</Box>
                    <Box sx={{ p: 1, width: 56, textAlign: "center" }}>Del</Box>
                  </Stack>
                  {generatedSizes.map((item, idx) => (
                    <Stack key={`${item.size}-${idx}`} direction="row" sx={{ fontSize: 12.25, borderBottom: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}>
                      <Box sx={{ p: 1, width: 48, borderRight: 1, borderColor: "divider", textAlign: "center", fontSize: 10.5, color: "text.primary" }}>{idx + 1}</Box>
                      <Box sx={{ p: 1, flex: 1, borderRight: 1, borderColor: "divider", fontWeight: 500, color: "text.primary" }}>{item.size}</Box>
                      <Box sx={{ p: 1, width: 80, borderRight: 1, borderColor: "divider", textAlign: "center" }}>
                        <TextField type="number" value={item.qty} onChange={(e) => handleQtyChange(idx, e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { textAlign: "center", fontSize: 10.5, py: 0.25 } }} />
                      </Box>
                      <Box sx={{ p: 1, width: 56, textAlign: "center" }}>
                        <Button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="glass-btn glass-btn-danger"
                          sx={{ borderRadius: "3.5px", p: 0.75, minWidth: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          title="Remove row"
                        >
                          <X size={14} />
                        </Button>
                      </Box>
                    </Stack>
                  ))}
                </>
              )}
            </Box>
          )}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", px: 2, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "action.hover", borderBottomLeftRadius: "7px", borderBottomRightRadius: "7px" }}>
          <Button onClick={handleClose} className="glass-btn glass-btn-secondary">Cancel</Button>
          <Button onClick={handleApply} disabled={generatedSizes.length === 0} className="glass-btn glass-btn-primary disabled:opacity-50">Apply Sizes</Button>
        </Stack>
      </Box>
    </Box>
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
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <Box sx={{ width: "100%", maxWidth: 448, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 8 }} onClick={(event) => event.stopPropagation()}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Cut Detail</Typography>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">
            <X size={16} />
          </Button>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, px: 2, py: 2 }}>
          <Box>
            <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Quantity</Typography>
            <TextField
              type="number"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              size="small"
              fullWidth
              placeholder="100"
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
            />
          </Box>
          <Box>
            <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Meter</Typography>
            <TextField
              type="number"
              value={meter}
              onChange={(event) => setMeter(event.target.value)}
              size="small"
              fullWidth
              placeholder="100"
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
            />
          </Box>
        </Box>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Cancel</Button>
          <Button type="button" onClick={handleApply} className="glass-btn glass-btn-primary">Apply</Button>
        </Stack>
      </Box>
    </Box>
  );
};

const JumpSizeViewDialog = ({ open, onClose, rows }) => {
  if (!open) return null;
  const normalizedRows = normalizeJumpDetails(rows);
  const hasCutDetails = normalizedRows.some((item) => item.detailType === "cut" || item.meter > 0);

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", boxShadow: 8, border: "1px solid", borderColor: "divider", width: "100%", maxWidth: 896, mx: 2 }} onClick={(e) => e.stopPropagation()}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>{hasCutDetails ? "Cut Details" : "Jump Size Details"}</Typography>
          <Button onClick={onClose} className="glass-btn glass-btn-secondary"><X size={16} /></Button>
        </Stack>
        <Box sx={{ px: 2, py: 2 }}>
          <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: "1px solid", borderColor: "divider" }}>
            {hasCutDetails ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 88px 88px 88px 92px", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 10.5, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider" }}>Size</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "center" }}>Qty</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Meter</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Cost</Box>
                <Box sx={{ p: 1, textAlign: "right" }}>MRP</Box>
              </Box>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 72px 88px 78px 88px 92px 78px 92px", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 10.5, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider" }}>Size</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "center" }}>Qty</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Cost</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>P.Dsnt</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Margin</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>MRP</Box>
                <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>S.Dsnt</Box>
                <Box sx={{ p: 1, textAlign: "right" }}>Final</Box>
              </Box>
            )}
            <Box sx={{ maxHeight: "55vh", overflowY: "auto" }}>
              {normalizedRows.length ? normalizedRows.map((item, index) => (
                hasCutDetails ? (
                  <Box key={`${item.size}-${index}`} sx={{ display: "grid", gridTemplateColumns: "1fr 88px 88px 88px 92px", fontSize: 12.25, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 }, color: "text.primary" }}>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", fontWeight: 500 }}>{item.size}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "center" }}>{item.qty}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.meter.toFixed(2)}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.cost.toFixed(2)}</Box>
                    <Box sx={{ p: 1, textAlign: "right", fontWeight: 500 }}>{item.mrp.toFixed(2)}</Box>
                  </Box>
                ) : (
                  <Box key={`${item.size}-${index}`} sx={{ display: "grid", gridTemplateColumns: "1fr 72px 88px 78px 88px 92px 78px 92px", fontSize: 12.25, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 }, color: "text.primary" }}>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", fontWeight: 500 }}>{item.size}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "center" }}>{item.qty}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.cost.toFixed(2)}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.purchaseDiscountPerc.toFixed(2)}%</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.marginValue.toFixed(2)}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.mrp.toFixed(2)}</Box>
                    <Box sx={{ p: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.saleDiscountPerc.toFixed(2)}%</Box>
                    <Box sx={{ p: 1, textAlign: "right", fontWeight: 500 }}>{item.final.toFixed(2)}</Box>
                  </Box>
                )
              )) : (
                <Box sx={{ px: 2, py: 5, textAlign: "center", fontSize: 12.25, color: "text.disabled" }}>{hasCutDetails ? "No cut details found." : "No jump size details found."}</Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const QuickAttributeDialog = ({ open, form, saving, onClose, onChange, onSave }) => {
  if (!open) return null;

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <Box sx={{ width: "100%", maxWidth: 448, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 8 }} onClick={(event) => event.stopPropagation()}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Add Attribute</Typography>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary" sx={{ p: 0.75 }}>
            <X size={16} />
          </Button>
        </Stack>
        <Stack spacing={1.5} sx={{ px: 2, py: 2 }}>
          <Box>
            <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Attribute</Typography>
            <TextField
              select
              name="type"
              value={form.type}
              onChange={onChange}
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
            >
              {ATTRIBUTE_QUICK_CREATE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Code</Typography>
            <TextField
              type="text"
              name="code"
              value={form.code}
              onChange={onChange}
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
            />
          </Box>
          <Box>
            <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Name</Typography>
            <TextField
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
            />
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Close</Button>
          <Button type="button" onClick={onSave} disabled={saving} className="glass-btn glass-btn-success disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

const LastSavedDialog = ({ open, loading, entry, onClose }) => {
  if (!open) return null;

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <Stack sx={{ maxHeight: "85vh", width: "100%", maxWidth: 896, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 8 }} onClick={(event) => event.stopPropagation()}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Last Saved Direct Purchase</Typography>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary" sx={{ p: 0.75 }}>
            <X size={16} />
          </Button>
        </Stack>
        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
          {loading ? (
            <Box sx={{ py: 6, textAlign: "center", fontSize: 12.25, color: "text.secondary" }}>Loading last saved direct purchase...</Box>
          ) : !entry ? (
            <Box sx={{ py: 6, textAlign: "center", fontSize: 12.25, color: "text.secondary" }}>No direct purchase found for the selected store.</Box>
          ) : (
            <Stack spacing={2}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5, fontSize: 12.25 }}>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Invoice No</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{entry.invoice_no || "-"}</Typography>
                </Box>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Company</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{getMeaningfulLabel(entry.company?.name, entry.company_name)}</Typography>
                </Box>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Supplier</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{getMeaningfulLabel(entry.supplier?.name, entry.supplier_name)}</Typography>
                </Box>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Status</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{entry.invoice_workflow_status || "-"}</Typography>
                </Box>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Invoice Date</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{entry.invoice_date || "-"}</Typography>
                </Box>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Retail Location</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{entry.retail_location || "-"}</Typography>
                </Box>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Tax</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{Number(entry.tax_amount || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Total</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 500, color: "text.primary" }}>{Number(entry.total || 0).toFixed(2)}</Typography>
                </Box>
              </Box>

              <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "60px 1.4fr 1fr 90px 100px 110px", gap: 0, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>
                  <Box sx={{ px: 1.5, py: 1 }}>S.No</Box>
                  <Box sx={{ px: 1.5, py: 1 }}>Product</Box>
                  <Box sx={{ px: 1.5, py: 1 }}>Brand</Box>
                  <Box sx={{ px: 1.5, py: 1, textAlign: "right" }}>Qty</Box>
                  <Box sx={{ px: 1.5, py: 1, textAlign: "right" }}>Cost</Box>
                  <Box sx={{ px: 1.5, py: 1, textAlign: "right" }}>Amount</Box>
                </Box>
                <Box sx={{ maxHeight: "40vh", overflowY: "auto" }}>
                  {(entry.items || []).length ? (
                    entry.items.map((item, index) => (
                      <Box key={item.id || index} sx={{ display: "grid", gridTemplateColumns: "60px 1.4fr 1fr 90px 100px 110px", gap: 0, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 }, fontSize: 12.25, color: "text.primary" }}>
                        <Box sx={{ px: 1.5, py: 1 }}>{item.s_no || index + 1}</Box>
                        <Box sx={{ px: 1.5, py: 1 }}>{getMeaningfulLabel(item.product?.name, item.product_name)}</Box>
                        <Box sx={{ px: 1.5, py: 1 }}>{getMeaningfulLabel(item.brand?.name, item.brand_name)}</Box>
                        <Box sx={{ px: 1.5, py: 1, textAlign: "right" }}>{Number(item.qty || 0)}</Box>
                        <Box sx={{ px: 1.5, py: 1, textAlign: "right" }}>{Number(item.cost || 0).toFixed(2)}</Box>
                        <Box sx={{ px: 1.5, py: 1, textAlign: "right" }}>{Number(item.amount || 0).toFixed(2)}</Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ py: 3, textAlign: "center", fontSize: 12.25, color: "text.secondary" }}>No items found on the last saved direct purchase.</Box>
                  )}
                </Box>
              </Box>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

const EditItemConfirmDialog = ({ open, onClose, onConfirm }) => {
  if (!open) return null;

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <Box sx={{ width: "100%", maxWidth: 384, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 8 }} onClick={(event) => event.stopPropagation()}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Edit Row</Typography>
        </Box>
        <Box sx={{ px: 2, py: 2, fontSize: 12.25, color: "text.secondary" }}>
          This action will remove this row. Its values will be loaded into the entry fields.
        </Box>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Cancel</Button>
          <Button type="button" onClick={onConfirm} className="glass-btn glass-btn-primary">Confirm</Button>
        </Stack>
      </Box>
    </Box>
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
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <Box sx={{ width: "100%", maxWidth: 448, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 8 }} onClick={(event) => event.stopPropagation()}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Charge Type</Typography>
        </Box>
        <Box sx={{ px: 2, py: 2 }}>
          <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Type</Typography>
          <SearchableSelect
            name="chargeType"
            options={CHARGE_TYPE_DIALOG_OPTIONS}
            value={selectedValue}
            onChange={(event) => setSelectedValue(event.target.value)}
            placeholder="Select Type"
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Cancel</Button>
          <Button
            type="button"
            onClick={() => onConfirm(selectedValue)}
            className="glass-btn glass-btn-primary"
          >
            Save
          </Button>
        </Stack>
      </Box>
    </Box>
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

  // The Tax field below (taxOptions) used AsyncSearchSelect but never had onAsyncSearch wired --
  // it silently fell back to pure client-side filtering of whatever the initial ~50-row /taxes
  // fetch returned, the same class of bug already fixed for supplier/transport/product/brand above.
  // Kept as raw tax objects (not pre-formatted with formatTaxOption) since `taxes` state elsewhere
  // holds raw objects and taxOptions derives {id, label} from them itself (double-formatting a
  // pre-mapped object here would lose .name and blank out the label).
  const handleAsyncTaxSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/taxes", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setTaxes((prev) => {
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate("/warehouse")} sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              type="button"
              onClick={() => navigate("/warehouse")}
              sx={{ color: "primary.main", textTransform: "none", minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}
            >
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.disabled" }}>/</Box>
            <Box component="span" sx={{ color: "text.primary" }}>Direct Purchase</Box>
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontSize: 12.25 }}>
          <Button onClick={handleNew} className="glass-btn glass-btn-secondary">New</Button>
          <Button onClick={handleOpenQuickAttribute} className="glass-btn glass-btn-secondary" sx={{ display: "flex", alignItems: "center" }}>
            <Plus size={16} style={{marginRight: 4}} /> Attribute
          </Button>
          <Button onClick={handleSave} disabled={saving || loadingEntry} className="glass-btn glass-btn-success disabled:opacity-50" sx={{ display: "flex", alignItems: "center" }}>
            <Save size={16} style={{marginRight: 4}} /> {saving ? "Saving..." : editId ? "Update" : "Save"}
          </Button>
          <Button onClick={handleOpenLastSaved} className="glass-btn glass-btn-secondary">Last Saved</Button>
          <Button onClick={() => navigate("/warehouse/direct-purchase/search")} className="glass-btn glass-btn-primary" sx={{ display: "flex", alignItems: "center" }}>
            <Search size={16} style={{marginRight: 4}} /> Search
          </Button>
        </Stack>
      </Stack>

      {/* Main Content */}
      <Stack direction="row" sx={{ flex: 1, overflow: "hidden" }}>
        {/* LEFT PANEL */}
        <Box sx={{ width: 380, flexShrink: 0, p: 2, borderRight: 1, borderColor: "divider", bgcolor: "background.paper", overflowY: "auto" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Type</Typography>
              <TextField
                select
                name="purchaseType"
                value={form.purchaseType}
                onChange={handleFormChange}
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              >
                {PURCHASE_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>PO Number</Typography>
              <TextField type="text" name="poNo" value={form.poNo} onChange={handleFormChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
          </Stack>

          {/* Invoice Details Header */}
          <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 700, color: "text.primary", borderBottom: 1, borderColor: "divider", pb: 0.5, mb: 1.5 }}>Invoice Details</Typography>

          {/* LR No / LR Date / Bundles */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>LR No</Typography>
              <TextField type="text" name="lrNo" value={form.lrNo} onChange={handleFormChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>LR Date</Typography>
              <TextField type="date" name="lrDate" value={form.lrDate} onChange={handleFormChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
            <Box sx={{ width: 80 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Bundles</Typography>
              <TextField type="text" name="bundles" value={form.bundles} onChange={handleFormChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Company</Typography>
              <AsyncSearchSelect name="companyId" value={form.companyId} onChange={handleFormChange} options={companies} placeholder="Select..." searchPlaceholder="Search company..." />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Retail Location</Typography>
              {isSuperAdmin ? (
                <AsyncSearchSelect
                  name="retailLocation"
                  value={form.retailLocation}
                  onChange={handleFormChange}
                  options={retailLocationOptions}
                  placeholder="Select..."
                  searchPlaceholder="Search company..."
                />
              ) : (
                <TextField
                  type="text"
                  name="retailLocation"
                  value={form.retailLocation}
                  slotProps={{ input: { readOnly: true } }}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Transport</Typography>
              <AsyncSearchSelect name="transportId" value={form.transportId} onChange={handleFormChange} options={transports} onAsyncSearch={handleAsyncTransportSearch} placeholder="Select..." searchPlaceholder="Search transport..." />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Supplier</Typography>
              <AsyncSearchSelect name="supplierId" value={form.supplierId} onChange={handleFormChange} options={suppliers} onAsyncSearch={handleAsyncSupplierSearch} placeholder="Select..." searchPlaceholder="Search supplier..." />
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 1, mb: 1, alignItems: "end" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Invoice No</Typography>
              <TextField type="text" name="invoiceNo" value={form.invoiceNo} onChange={handleFormChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Invoice Date</Typography>
              <TextField type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleFormChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
            <Stack component="label" direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 700, color: "error.dark", pb: 0.5, whiteSpace: "nowrap" }}>
              <Checkbox size="small" name="igst" checked={form.igst} onChange={handleFormChange} sx={{ p: 0 }} /> IGST
            </Stack>
            <Stack component="label" direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 700, color: "error.dark", pb: 0.5, whiteSpace: "nowrap" }}>
              <Checkbox size="small" name="iDiscount" checked={form.iDiscount} onChange={handleFormChange} sx={{ p: 0 }} /> I.Disnt
            </Stack>
          </Box>

          <Box component="hr" sx={{ my: 1.5, border: 0, borderTop: 1, borderColor: "divider" }} />

          <Box sx={{ mb: 1 }}>
            <Typography component="h4" sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.primary" }}>Tax Details</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto", alignItems: "center", gap: 1, px: 0.5, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "error.dark" }}>
            <Box>Tax Type</Box>
            <Box>Value</Box>
            <Box>Discount</Box>
            <Box>Tax</Box>
            <Box></Box>
          </Box>

          <Box sx={{ mt: 0.5, mb: 1.5, display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto", alignItems: "center", gap: 1 }}>
            <AsyncSearchSelect
              name="taxTypeId"
              value={taxDraft.taxTypeId}
              onChange={(event) => handleTaxDraftChange("taxTypeId", event.target.value)}
              options={taxOptions}
              onAsyncSearch={handleAsyncTaxSearch}
              placeholder="Select tax..."
              searchPlaceholder="Search tax..."
            />
            <TextField
              type="number"
              value={taxDraft.taxValue}
              onChange={(event) => handleTaxDraftChange("taxValue", event.target.value)}
              placeholder="taxable"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            />
            <TextField
              type="number"
              value={taxDraft.taxDiscount}
              onChange={(event) => handleTaxDraftChange("taxDiscount", event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                handleAddTaxLine();
              }}
              placeholder="discnt"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            />
            <TextField
              type="text"
              value={taxDraftRow.taxAmount ? taxDraftRow.taxAmount.toFixed(2) : ""}
              slotProps={{ input: { readOnly: true } }}
              placeholder="tax"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }}
            />
            <Button type="button" onClick={handleAddTaxLine} className="glass-btn glass-btn-primary" sx={{ p: 0.75 }} title="Add tax row">
              <Plus size={14} />
            </Button>
          </Box>

          <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 108px", gap: 1, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1.5, fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>
              <Box>Tax %</Box>
              <Box>Taxable</Box>
              <Box>Discount</Box>
              <Box>Tax</Box>
              <Box></Box>
            </Box>
            <Box sx={{ height: 144, overflowY: "auto" }}>
              {taxRows.length ? (
                taxRows.map((line) => (
                  <Box key={line.id} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 108px", alignItems: "center", gap: 1, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 }, px: 2, py: 1.5, fontSize: 12.25, color: "text.primary" }}>
                    <Box>{line.chargeTypeLabel || line.taxPerc.toFixed(2)}</Box>
                    <Box>{line.taxable.toFixed(2)}</Box>
                    <Box>{(parseFloat(line.taxDiscount) || 0).toFixed(2)}</Box>
                    <Box>{line.taxAmount.toFixed(2)}</Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                      <Button
                        type="button"
                        onClick={() => handleOpenTaxChargeTypeDialog(line)}
                        className="glass-btn glass-btn-primary"
                        sx={{ p: 0.75, minWidth: 0 }}
                        title="Edit charge type"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button type="button" onClick={() => handleRemoveTaxLine(line.id)} className="glass-btn glass-btn-danger" sx={{ p: 0.75, minWidth: 0 }} title="Remove tax row">
                        <X size={14} />
                      </Button>
                    </Stack>
                  </Box>
                ))
              ) : (
                <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", px: 2, fontSize: 12.25, color: "text.disabled" }}>No tax rows added</Box>
              )}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5, fontSize: 12.25, fontWeight: 700, color: "text.primary" }}>
              <Box>{taxRows.reduce((sum, row) => sum + row.taxPerc, 0).toFixed(2)}</Box>
              <Box>{taxSummary.taxable.toFixed(2)}</Box>
              <Box>{taxSummary.discount.toFixed(2)}</Box>
              <Box>{taxSummary.tax.toFixed(2)}</Box>
            </Box>
          </Box>

          <Box component="hr" sx={{ my: 1.5, border: 0, borderTop: 1, borderColor: "divider" }} />

          {/* Bill Value / Charges / Tax */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Bill Value</Typography>
              <TextField type="text" value={invoiceSummary.billValue.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Charges</Typography>
              <TextField type="text" name="otherCharges" value={form.otherCharges} onChange={handleFormChange} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Tax</Typography>
              <TextField type="text" value={invoiceSummary.tax.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }} />
            </Box>
          </Stack>

          {/* Pur. Discnt % / Pur. Discnt / Total */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Pur. Discnt %</Typography>
              <TextField type="text" value={invoiceSummary.purDiscountPerc.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Pur. Discnt</Typography>
              <TextField type="text" value={invoiceSummary.purDiscount.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ fontSize: 12.25, fontWeight: 700, color: "error.dark" }}>Total</Typography>
              <TextField type="text" value={invoiceSummary.total.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, fontWeight: 700, color: "primary.main" } }} />
            </Box>
          </Stack>
        </Box>

        {/* RIGHT PANEL */}
        <Stack sx={{ flex: 1, minWidth: 0, bgcolor: "background.default" }}>
          <Stack sx={{ p: 2, flex: 1, minHeight: 0, overflow: "hidden" }}>
            {loadingEntry ? (
              <Box sx={{ mb: 2, borderRadius: "7px", border: "1px solid", borderColor: (theme) => alpha(theme.palette.info.main, 0.4), bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1.5, py: 1, fontSize: 12.25, color: "info.main" }}>Loading direct purchase...</Box>
            ) : null}

            <Stack sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden", flex: 1, minHeight: 0 }}>
              <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 1.5 }}>
                <Stack direction="row" spacing={0.75} sx={{ fontSize: 12.25, fontWeight: 600, color: "error.dark", alignItems: "center", mb: 1 }}>
                  <Box sx={{ width: 48 }}>S.No</Box>
                  <Box sx={{ width: 128 }}>Product</Box>
                  <Box sx={{ width: 96 }}>Brand</Box>
                  <Box sx={{ width: 96 }}>Size</Box>
                  <Box sx={{ width: 96 }}>Colour</Box>
                  <Box sx={{ width: 80 }}>Design</Box>
                  <Box sx={{ width: 64 }}>HSN</Box>
                  <Box sx={{ width: 64, textAlign: "right" }}>Qty</Box>
                  <Box sx={{ width: 80, textAlign: "right" }}>Cost</Box>
                  <Box sx={{ width: 72, textAlign: "right" }}>Margin</Box>
                  <Box sx={{ width: 88, textAlign: "right" }}>Rate</Box>
                  <Box sx={{ width: 36 }}></Box>
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <Box sx={{ width: 48 }}>
                    <TextField type="text" value={currentItem.sNo} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-input": { textAlign: "center", fontSize: 12.25, py: 1 } }} />
                  </Box>
                  <Box sx={{ width: 128 }}>
                    <AsyncSearchSelect name="productId" value={currentItem.productId} onChange={handleItemFieldChange} options={products} onAsyncSearch={handleAsyncProductSearch} placeholder="Product..." searchPlaceholder="Search product..." />
                  </Box>
                  <Box sx={{ width: 96 }}>
                    <AsyncSearchSelect name="brandId" value={currentItem.brandId} onChange={handleItemFieldChange} options={brands} onAsyncSearch={handleAsyncBrandSearch} placeholder="Brand..." searchPlaceholder="Search brand..." />
                  </Box>
                  <Box sx={{ width: 96 }}>
                    <SizeSearchSelect
                      value={currentItem.size}
                      onChange={handleSizeChange}
                      sizes={sizes}
                      sizeGroups={sizeGroups}
                      sellingMode={productsById.get(String(currentItem.productId))?.selling_mode}
                    />
                  </Box>
                  <Box sx={{ width: 96 }}>
                    <AsyncSearchSelect name="colorId" value={currentItem.colorId} onChange={handleItemFieldChange} options={colors} placeholder="Color..." searchPlaceholder="Search color..." />
                  </Box>
                  <Box sx={{ width: 80 }}>
                    <TextField type="text" name="designNo" value={currentItem.designNo} onChange={handleItemFieldChange} placeholder="Design" size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }} />
                  </Box>
                  <Box sx={{ width: 64 }}>
                    <TextField type="text" name="hsnCode" value={currentItem.hsnCode} onChange={handleItemFieldChange} placeholder="HSN" size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }} />
                  </Box>
                  <Box sx={{ width: 64 }}>
                    <TextField
                      type="number"
                      name="qty"
                      value={currentItem.qty}
                      onChange={handleItemFieldChange}
                      placeholder="0"
                      slotProps={{ input: { readOnly: Boolean(currentItem.jumpSizes?.length) } }}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 12.25, py: 1 }, ...(currentItem.jumpSizes?.length ? { "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { textAlign: "right", fontSize: 12.25, py: 1, color: "text.disabled" } } : {}) }}
                    />
                  </Box>
                  <Box sx={{ width: 80 }}>
                    <TextField type="number" name="cost" value={currentItem.cost} onChange={handleItemFieldChange} placeholder="0.00" size="small" fullWidth sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 12.25, py: 1 } }} />
                  </Box>
                  <Box sx={{ width: 72 }}>
                    <TextField type="number" name="marginPerc" value={currentItem.marginPerc} onChange={handleItemFieldChange} placeholder="0" size="small" fullWidth sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 12.25, py: 1 } }} />
                  </Box>
                  <Box sx={{ width: 88 }}>
                    <TextField
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
                      slotProps={{ input: { readOnly: Boolean(currentItem.jumpSizes?.length) } }}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 12.25, py: 1 }, ...(currentItem.jumpSizes?.length ? { "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { textAlign: "right", fontSize: 12.25, py: 1, color: "text.disabled" } } : {}) }}
                    />
                  </Box>
                  <Box sx={{ width: 36 }}>
                    <Button onClick={handleAddItem} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleAddItem(); } }} className="glass-btn glass-btn-primary" sx={{ width: 32, height: 32, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }} title="Add Item">
                      <Plus size={16} />
                    </Button>
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflowX: "auto" }}>
                <Stack sx={{ minHeight: "100%", minWidth: 1016 }}>
              <Stack direction="row" sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 12.25, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ p: 1, width: 32, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "center" }}>
                  <Checkbox size="small" checked disabled sx={{ p: 0 }} />
                </Box>
                <Box sx={{ p: 1, width: 48, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "center" }}>S.No</Box>
                <Box sx={{ p: 1, width: 128, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>Product</Box>
                <Box sx={{ p: 1, width: 96, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>Brand</Box>
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "center" }}>Size</Box>
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>Design</Box>
                <Box sx={{ p: 1, width: 64, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Qty</Box>
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Cost</Box>
                <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Discount</Box>
                <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Margin%</Box>
                <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Price</Box>
                <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Amount</Box>
                <Box sx={{ p: 1, width: 96, flexShrink: 0, textAlign: "center" }}>Action</Box>
              </Stack>

              <Stack direction="row" sx={{ bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.12 : 0.06), borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ p: 1, width: 32, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
                <Box sx={{ p: 1, width: 48, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
                <Box sx={{ p: 1, width: 128, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.productName}
                    onChange={(event) => handleItemFilterDraftChange("productName", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search product"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 96, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.brandName}
                    onChange={(event) => handleItemFilterDraftChange("brandName", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search brand"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.size}
                    onChange={(event) => handleItemFilterDraftChange("size", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search size"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.designNo}
                    onChange={(event) => handleItemFilterDraftChange("designNo", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Search design"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 64, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.qty}
                    onChange={(event) => handleItemFilterDraftChange("qty", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Qty"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.cost}
                    onChange={(event) => handleItemFilterDraftChange("cost", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Cost"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.discount}
                    onChange={(event) => handleItemFilterDraftChange("discount", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Disc"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.marginPerc}
                    onChange={(event) => handleItemFilterDraftChange("marginPerc", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Margin"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.price}
                    onChange={(event) => handleItemFilterDraftChange("price", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Rate"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                  <TextField
                    type="text"
                    value={itemFilterDraft.amount}
                    onChange={(event) => handleItemFilterDraftChange("amount", event.target.value)}
                    onKeyDown={handleItemFilterKeyDown}
                    placeholder="Amount"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.5 } }}
                  />
                </Box>
                <Box sx={{ p: 1, width: 96, flexShrink: 0, fontSize: 11, color: "text.secondary", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Enter
                </Box>
              </Stack>

              {/* Item Rows */}
              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarGutter: "stable" }}>
                {filteredItems.length === 0 ? (
                  <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", py: 8, textAlign: "center", color: "text.disabled", fontSize: 12.25 }}>No items added yet.</Box>
                ) : (
                  filteredItems.map((item) => (
                    <Stack key={item.id} direction="row" sx={{ fontSize: 11, borderBottom: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, color: "text.primary" }}>
                      <Box sx={{ p: 1, width: 32, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "center" }}>
                        <Checkbox size="small" checked disabled sx={{ p: 0 }} />
                      </Box>
                      <Box sx={{ p: 1, width: 48, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "center" }}>{item.sNo}</Box>
                      <Box sx={{ p: 1, width: 128, flexShrink: 0, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.productName}</Box>
                      <Box sx={{ p: 1, width: 96, flexShrink: 0, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.brandName}</Box>
                      <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "center" }}>{item.size || "-"}</Box>
                      <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.designNo || "-"}</Box>
                      <Box sx={{ p: 1, width: 64, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.qty}</Box>
                      <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.cost.toFixed(2)}</Box>
                      <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.discount.toFixed(2)}</Box>
                      <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.marginPerc}%</Box>
                      <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.price.toFixed(2)}</Box>
                      <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right", fontWeight: 500 }}>{item.amount.toFixed(2)}</Box>
                      <Stack direction="row" spacing={1.5} sx={{ p: 1, width: 96, flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
                        {Array.isArray(item.jumpDetails) && item.jumpDetails.length > 0 ? (
                          <IconButton
                            type="button"
                            onClick={() => setJumpSizeViewDialog({ open: true, rows: item.jumpDetails })}
                            size="small"
                            sx={{ color: "text.secondary", "&:hover": { color: "info.main" } }}
                            title={item.size === "Cut" ? "View cut details" : "View jump size details"}
                          >
                            <Eye size={20} strokeWidth={2.25} />
                          </IconButton>
                        ) : null}
                        <IconButton
                          type="button"
                          onClick={() => handleOpenEditItem(item, items.findIndex((row) => row.id === item.id))}
                          size="small"
                          sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                          title="Edit item"
                        >
                          <Pencil size={20} strokeWidth={2.25} />
                        </IconButton>
                        <IconButton
                          type="button"
                          onClick={() => handleDeleteItem(items.findIndex((row) => row.id === item.id))}
                          size="small"
                          sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                          title="Delete item"
                        >
                          <Trash2 size={20} strokeWidth={2.25} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ))
                )}
              </Box>

              <Stack direction="row" sx={{ bgcolor: "action.hover", fontSize: 12.25, fontWeight: 700, color: "text.secondary", borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ p: 1, width: 32, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
                <Box sx={{ p: 1, width: 48, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "center" }}>-</Box>
                <Box sx={{ p: 1, width: 128, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
                <Box sx={{ p: 1, width: 96, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider" }} />
                <Box sx={{ p: 1, width: 64, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right", color: "error.main" }}>{itemColumnTotals.qty}</Box>
                <Box sx={{ p: 1, width: 80, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right", color: "error.main" }}>{itemColumnTotals.cost.toFixed(2)}</Box>
                <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right" }} />
                <Box sx={{ p: 1, width: 72, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right", color: "error.main" }}>{itemColumnTotals.margin.toFixed(2)}</Box>
                <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right", color: "error.main" }}>{itemColumnTotals.price.toFixed(2)}</Box>
                <Box sx={{ p: 1, width: 88, flexShrink: 0, borderRight: 1, borderColor: "divider", textAlign: "right", color: "error.main" }}>{itemColumnTotals.amount.toFixed(2)}</Box>
                <Box sx={{ p: 1, width: 96, flexShrink: 0 }} />
              </Stack>
                </Stack>
              </Box>
            </Stack>
          </Stack>

          {/* Bottom Totals Bar */}
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 1.5, bgcolor: "background.paper", borderTop: 1, borderColor: "divider", fontSize: 12.25, fontWeight: 700 }}>
            <Typography sx={{ color: "text.primary", fontSize: 14 }}>TOTAL</Typography>
            <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
              <Box component="span" sx={{ color: "text.primary" }}>Qty <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>{itemTotals.qty}</Box></Box>
              <Box component="span" sx={{ color: "text.primary" }}>Gross <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>{itemTotals.gross.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Box></Box>
              <Box component="span" sx={{ color: "text.primary" }}>Discount <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>{itemTotals.discount.toFixed(2)}</Box></Box>
              <Box component="span" sx={{ color: "text.primary" }}>Tax <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>{itemTotals.tax.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Box></Box>
              <Box component="span" sx={{ color: "text.primary" }}>Net <Box component="span" sx={{ color: "primary.main", fontSize: 14, ml: 0.5 }}>{itemTotals.net.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Box></Box>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <TextField
                select
                name="invoiceWorkflowStatus"
                value={form.invoiceWorkflowStatus}
                onChange={handleFormChange}
                size="small"
                sx={{ minWidth: 220, "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
              >
                {WORKFLOW_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button onClick={handleSave} disabled={saving || loadingEntry} className="glass-btn glass-btn-success disabled:opacity-50" sx={{ display: "flex", alignItems: "center" }}>
                <Save size={16} style={{marginRight: 4}} /> {saving ? "Saving..." : editId ? "Update" : "Save"}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Stack>

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
    </Box>
  );
};

export default DirectPurchase;
