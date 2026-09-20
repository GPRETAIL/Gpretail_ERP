import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronsLeft, Minus, Plus, Printer, X, Search, RotateCcw, Repeat, CreditCard, ScanLine, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import { fetchReceiptCompanyInfo } from "../../utils/receiptCompanyInfo";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import SearchableSelect from "../../components/SearchableSelect";
import UploadImportButton from "../../components/UploadImportButton";
import CounterAssignmentDialog from "../../components/CounterAssignmentDialog";
import { usePrintContext } from "../../context/PrintContext";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const POS_OLD_SALE_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    saleat: "saleAt", saledate: "saleAt", date: "saleAt",
    amount: "amount", billamount: "amount",
    customerid: "customerId",
    customername: "customerName", customer: "customerName",
    customermobile: "customerMobile", mobile: "customerMobile",
  },
  required: ["amount"],
  sampleFileName: "pos_old_sale_sample.xlsx",
  sampleHeaders: ["company", "saleAt", "amount", "customerName", "customerMobile"],
};
import {
  DEFAULT_SALES_RECEIPT_MESSAGE,
  getPosBillBarcodeValue,
  getPosReturnBarcodeValue,
  loadSalesReceiptCustomization,
  fetchSalesReceiptCustomization,
  buildPaymentQrMarkup,
  buildReceiptCodeMarkupAsync,
} from "../../utils/salesReceiptCustomization";

// Matches config('pagination.resources.pos_old_sales.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchPosOldSaleGroupSummaries, onFetchGroupRows: fetchPosOldSaleGroupRows } =
  createGroupFetchers("/pos-old-sales", { customer_name: "customer_id", user_name: "user_id" });
import { buildPosReturnReceiptHtml, buildPosSaleReceiptHtml } from "../../utils/posReceiptHtml";

// mobileNo previously read r.mobile_no, a field the /customers API never actually returns (the
// real column/response key is `phone`) -- phone lookup on this page never matched anything at all,
// independent of the cache-size bug fixed alongside it below.
const mapCustomerRow = (r) => ({
  value: String(r.id),
  label: `${r.name || "Unnamed"}${r.phone ? ` (${r.phone})` : ""}`,
  id: String(r.id),
  name: r.name || "",
  mobileNo: r.phone || "",
});

const normalize = (v) => String(v || "").trim().toLowerCase();
const compactBarcode = (v) => String(v || "").replace(/[^0-9a-z]/gi, "").toLowerCase();
const toNum = (v, f = 0) => { const n = Number(v); return Number.isFinite(n) ? n : f; };
const toInt = (v, f = 0) => { const n = parseInt(v, 10); return Number.isInteger(n) ? n : f; };
const round2 = (v) => Math.round((toNum(v, 0) + Number.EPSILON) * 100) / 100;
const formatMoney = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatEditableDecimal = (value) => {
  const numeric = round2(toNum(value, 0));
  return numeric > 0 ? String(numeric) : "";
};
const formatQty = (v) => {
  const n = toNum(v, 0);
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
};
const formatReturnDocNo = (value, prefix = "RR") => `${String(prefix || "RR").toUpperCase()}/${toInt(value, 0)}`;
const formatPosSaleBillNo = (value) => `SB/${toInt(value, 0)}`;
const parseBillNoFromInput = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return null;
  const n = parseInt(s.replace(/^sb\//i, ""), 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
};
/** Same as POS Return: only numeric bill shapes go direct to source-bill; anything else is treated as barcode. */
const isLikelySaleBillInput = (value) => /^(?:sb\/)?\d+$/i.test(String(value || "").trim());
const stripLeadingBarcodeZeros = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return raw;
  return raw.replace(/^0+/, "") || "0";
};
const barcodeMatchesReturnScan = (lineBarcode, scannedRaw) => {
  const scanned = String(scannedRaw || "").trim().toLowerCase();
  if (!scanned) return false;
  const lineBc = String(lineBarcode || "").trim().toLowerCase();
  if (lineBc && lineBc === scanned) return true;
  if (/^\d+$/.test(scanned) && lineBc && /^\d+$/.test(lineBc)) {
    if (stripLeadingBarcodeZeros(scanned) === stripLeadingBarcodeZeros(lineBc)) return true;
  }
  return compactBarcode(lineBarcode) === compactBarcode(scannedRaw);
};

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
/** Matches POS Return: barcode-only lines are not capped by a source bill. */
const STANDALONE_MAX_QTY = 999999;
const WALKING_CUSTOMER_NAME = "Walking customer";
const isExchangeReturnLine = (line) => Boolean(line?.isExchangeReturn);

const buildPosOldSaleReceiptPayload = ({
  sale,
  authUser,
  receiptCustomization,
  companyInfo,
  stockRows = [],
  returnItems = [],
  appliedReturnNo = "",
  paymentMethod = "Cash",
  customerNameOverride = "",
}) => {
  const receiptCompanyId = sale?.company_id || authUser?.company_id || null;
  const savedBillNo = sale?.bill_no ?? sale?.billNo;
  const displayBillNo = getPosBillBarcodeValue(savedBillNo);
  // A re-fetched historical sale (last-receipt/lookup-sale) returns the
  // real PosSale columns (grand_total/discount_amount/paid_amount), not
  // the cart-draft field names (amount/totalDiscount/paidCash) - both are
  // handled so reprinting doesn't zero out the whole bill summary.
  const totalAmount = round2(toNum(sale?.grand_total ?? sale?.amount, 0));
  const receiptDiscountAmount = round2(Math.max(0, toNum(sale?.discount_amount ?? sale?.total_discount ?? sale?.totalDiscount, 0)));
  const saleAmount = round2(
    (sale?.items || []).reduce((sum, item) => sum + Math.max(0, toNum(item.subtotal ?? item.total, 0)), 0)
  );
  const paidCash = round2(Math.max(0, toNum(sale?.paid_amount ?? sale?.paid_cash ?? sale?.paidCash, 0)));
  const balanceAmount = round2(Math.max(0, totalAmount - paidCash));
  const receiptItems = (sale?.items || []).map((item) => {
    // A freshly-saved sale (still in memory) uses the cart-line shape
    // (qty/price/discountAmt/barcode); a re-fetched historical sale (via
    // last-receipt/lookup-sale) returns the real PosSaleItem columns
    // instead (quantity/selling_price/discount/tax_rate, product name only
    // under the nested product relation) - both are handled here so
    // reprinting an old bill doesn't silently blank out every line.
    const barcodeId = item.barcode_id ?? item.barcodeId;
    const stockLine = stockRows.find((row) => String(row.id) === String(barcodeId));
    const qty = Math.max(0, toNum(item.quantity ?? item.qty, 0));
    const rate = Math.max(0, toNum(item.selling_price ?? item.price, 0));
    const discountAmount = Math.max(0, toNum(item.discount ?? item.discount_amt ?? item.discountAmt, 0));
    const taxPerc = Math.max(0, toNum(item.tax_rate ?? item.taxPerc ?? stockLine?.tax, 0));
    const grossLineAmount = round2(Math.max(qty * rate - discountAmount, 0));
    const divisor = 1 + (taxPerc / 100);
    const baseAmount = taxPerc > 0 ? round2(grossLineAmount / divisor) : grossLineAmount;
    const taxAmount = round2(grossLineAmount - baseAmount);
    const productName = String(
      item.product?.name
      ?? item.product_name
      ?? item.productName
      ?? item.barcodeRef?.product_name
      ?? item.barcode
      ?? stockLine?.productName
      ?? ""
    ).trim();

    return {
      name: productName || "-",
      qty,
      rate,
      taxPerc,
      taxName: item.tax_name || (taxPerc > 0 ? "GST" : ""),
      taxType: item.tax_type || (taxPerc > 0 ? "GST" : ""),
      baseAmount,
      taxAmount,
      discountAmount,
      amount: grossLineAmount,
      code: item.barcode || item.barcodeRef?.barcode || "",
    };
  });
  const receiptTaxAmount = round2(receiptItems.reduce((sum, item) => sum + toNum(item.taxAmount, 0), 0));
  const receiptCustomerName =
    String(customerNameOverride || sale?.customer_name || sale?.customerName || sale?.customer?.name || "").trim()
    || WALKING_CUSTOMER_NAME;

  return {
    companyId: receiptCompanyId,
    receiptCustomization,
    storeName:
      String(authUser?.company_name || "").trim()
      || String(authUser?.name || "").trim()
      || "Store",
    storeAddress: companyInfo?.storeAddress || "",
    storePhone: companyInfo?.storePhone || "",
    storeGstNo: companyInfo?.storeGstNo || "",
    billNo: displayBillNo,
    billBarcode: displayBillNo,
    dateTime: sale?.sale_at || sale?.saleAt || new Date().toISOString(),
    cashierName: String(authUser?.name || authUser?.email || "POS").trim(),
    counterName: String(authUser?.counter_name || sale?.counter_name || "").trim(),
    customerName: receiptCustomerName,
    items: receiptItems,
    billAmount: round2(totalAmount < 0 ? totalAmount : saleAmount + receiptDiscountAmount),
    discountAmount: receiptDiscountAmount,
    taxAmount: receiptTaxAmount,
    total: totalAmount,
    paidAmount: paidCash,
    receivedAmount: paidCash,
    balanceAmount,
    changeAmount: 0,
    refundAmount: balanceAmount,
    appliedReturnNo: String(appliedReturnNo || "").trim(),
    returnItems,
    paymentMethod,
    generalTaxVisible: Boolean(receiptCustomization.generalFields?.tax?.visible),
    generalPaidVisible: Boolean(receiptCustomization.generalFields?.paid?.visible),
    generalReceivedVisible: Boolean(receiptCustomization.generalFields?.receivedAmount?.visible),
    generalBalanceVisible: Boolean(receiptCustomization.generalFields?.balanceAmt?.visible),
    generalYouSavedVisible: Boolean(receiptCustomization.generalFields?.youSaved?.visible),
    message: receiptCustomization.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
  };
};

/* ───────────────── COMPONENT ───────────────── */
const POSOld = () => {
  const authUser = useSelector((state) => state.auth.user);
  // Pops automatically once per login if this user has no counter assigned yet -- previously
  // they'd only discover this was required when a sale failed to save.
  const [counterAssignmentOpen, setCounterAssignmentOpen] = useState(false);
  useEffect(() => {
    if (authUser && !authUser.counter_id) {
      setCounterAssignmentOpen(true);
    }
  }, [authUser?.id]);
  const { printerConnected, queuePrintHtml } = usePrintContext();
  const barcodeRef = useRef(null);
  const returnBillInputRef = useRef(null);
  const returnReasonSelectWrapRef = useRef(null);
  const returnLinesScanRef = useRef(null);
  const scannerVideoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerFrameRef = useRef(null);
  const scannerActiveRef = useRef(false);
  const scannerControlsRef = useRef(null);
  const scannerLastValueRef = useRef({ value: "", ts: 0 });

  const brandDropdownRef = useRef(null);

  // clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const cid = authUser?.company_id;
    if (!cid) return undefined;
    fetchSalesReceiptCustomization(api, cid).catch(() => {});
    return undefined;
  }, [authUser?.company_id]);

  // master data
  const [loading, setLoading] = useState(true);
  const [stockRows, setStockRows] = useState([]);
  const [productList, setProductList] = useState([]); // { id, barcode, productName, price, mrp, qty, brandName, brandId }
  const [brands, setBrands] = useState([]); // [{ id, name }]
  const [customers, setCustomers] = useState([]);
  const [billNo, setBillNo] = useState(1);
  const [nextReturnNo, setNextReturnNo] = useState(1);

  // right panel
  const [rightTab, setRightTab] = useState("products"); // products | brands
  const [productSearch, setProductSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  useEffect(() => {
    if (!brandDropdownOpen) return;
    const handler = (e) => { if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target)) setBrandDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [brandDropdownOpen]);

  // multi-bill tabs
  const [tabs, setTabs] = useState([{
    id: 1,
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    cart: [],
    customerMode: "walking",
    existingCustomerId: "",
    customerMobile: "",
    customerName: "",
    paymentMode: "cash",
    paidCash: "",
  }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const tabCounter = useRef(1);

  // dialogs
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [holdConfirm, setHoldConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showSearchPage, setShowSearchPage] = useState(false);

  // close register denominations
  const [denomCounts, setDenomCounts] = useState(
    DENOMINATIONS.reduce((a, d) => ({ ...a, [`c_${d}`]: 0 }), {})
  );
  const [closeNote, setCloseNote] = useState("");
  const [sessionSummary, setSessionSummary] = useState({ cash: 0, online_pay: 0, credit_card: 0, point: 0, returns: 0, total: 0 });

  // return/exchange
  const [returnReasons, setReturnReasons] = useState([]);
  const [selectedReturnReasonId, setSelectedReturnReasonId] = useState("");
  const [returnBillLookup, setReturnBillLookup] = useState("");
  const [returnSourceSale, setReturnSourceSale] = useState(null);
  const [returnCartDraft, setReturnCartDraft] = useState([]);
  const [returnTemplateSnapshot, setReturnTemplateSnapshot] = useState([]);
  const [loadingReturnBill, setLoadingReturnBill] = useState(false);
  const [showReturnLinesDialog, setShowReturnLinesDialog] = useState(false);
  const [returnScanInput, setReturnScanInput] = useState("");
  const [returnSaving, setReturnSaving] = useState(false);

  // saving
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(20);
  const [searchPagination, setSearchPagination] = useState({ total: 0, totalPages: 1 });
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    billNo: "",
    customerName: "",
    product: "",
    barcode: "",
  });
  const searchFiltersRef = useRef(searchFilters);

  // barcode input
  const [barcodeInput, setBarcodeInput] = useState("");
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountPercentInput, setDiscountPercentInput] = useState("");
  const [discountValueInput, setDiscountValueInput] = useState("");
  const [discountSelectedLineIds, setDiscountSelectedLineIds] = useState([]);
  const [discountRowDrafts, setDiscountRowDrafts] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState("");

  useEffect(() => {
    searchFiltersRef.current = searchFilters;
  }, [searchFilters]);

  /* ─── active tab helpers ─── */
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);

  const updateActiveTab = useCallback((patch) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...patch } : t)));
  }, [activeTabId]);

  const cart = activeTab.cart;
  const setCart = useCallback((updater) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeTabId) return t;
        const newCart = typeof updater === "function" ? updater(t.cart) : updater;
        return { ...t, cart: newCart };
      })
    );
  }, [activeTabId]);

  /* ─── load data ─── */
  const loadMasterData = useCallback(async () => {
    try {
      const cfgRows = (type) =>
        api
          .get(`/configurations/${type}`)
          .then((res) =>
            (res.data?.data || []).map((row) => ({
              value: String(row.id),
              label: row.name || "",
            }))
          )
          .catch(() => []);

      const [stockProductsRes, customersRes, brandsRes, reasonRows] = await Promise.all([
        api.get("/pos-sales/stock-products", { params: { all: true } }).catch(() => ({ data: { data: [] } })),
        api.get("/customers", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get("/brands").catch(() => ({ data: { data: [] } })),
        cfgRows("return_reason"),
      ]);

      setReturnReasons(reasonRows);

      const stock = (stockProductsRes.data?.data || [])
        .map((row) => ({
          id: String(row.id),
          variantId: row.variantId ?? null,
          sellingMode: row.sellingMode || "PIECE",
          requiresQuantityPrompt: !!row.requiresQuantityPrompt,
          barcode: row.barcode || "",
          productName: row.productName || "Unknown",
          qty: Math.max(0, toNum(row.qty, 0)),
          cost: toNum(row.cost, 0),
          price: toNum(row.price || row.mrp, 0),
          mrp: toNum(row.mrp, 0),
          tax: toNum(row.tax, 0),
          taxName: row.taxName || "",
          taxType: row.taxType || "",
          brandId: row.brandId || null,
          brandName: row.brandName || "",
        }))
        .filter((r) => r.qty > 0);

      setStockRows(stock);

      // build unique product list for right panel
      const grouped = new Map();
      stock.forEach((r) => {
        const key = normalize(r.productName);
        if (!key) return;
        const cur = grouped.get(key) || { ...r, totalQty: 0 };
        cur.totalQty += r.qty;
        grouped.set(key, cur);
      });
      setProductList(Array.from(grouped.values()).sort((a, b) => a.productName.localeCompare(b.productName)));

      // brands
      const brandRows = brandsRes.data?.data || [];
      setBrands(brandRows.map((b) => ({ id: b.id, name: b.name })));

      setCustomers((customersRes.data?.data || []).map(mapCustomerRow));
    } catch {
      toast.error("Failed to load data");
    }
  }, []);

  const loadNextBillNo = useCallback(async () => {
    try {
      const res = await api.get("/pos-old-sales/next-bill-no");
      setBillNo(toNum(res.data?.data?.billNo, 1));
    } catch { setBillNo(1); }
  }, []);

  const loadNextReturnNo = useCallback(async () => {
    try {
      const res = await api.get("/pos-returns/next-return-no");
      setNextReturnNo(toNum(res.data?.data?.returnNo, 1));
    } catch { setNextReturnNo(1); }
  }, []);

  useEffect(() => {
    let m = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadMasterData(), loadNextBillNo(), loadNextReturnNo()]);
      if (m) setLoading(false);
    })();
    return () => { m = false; };
  }, [loadMasterData, loadNextBillNo, loadNextReturnNo]);

  const posOldReturnPendingDocNo = useMemo(() => {
    if (!returnSourceSale) return "";
    const prefix = returnSourceSale.sourceBillSaleType === "pos_old_sale" ? "RO" : "RR";
    return formatReturnDocNo(nextReturnNo, prefix);
  }, [nextReturnNo, returnSourceSale]);

  /* ─── cart calculations ─── */
  const usedQtyByBarcode = useMemo(() => {
    const map = new Map();
    cart
      .filter((line) => !isExchangeReturnLine(line))
      .forEach((l) => map.set(l.stockId, (map.get(l.stockId) || 0) + toNum(l.qty, 0)));
    return map;
  }, [cart]);

  const cartWithTotals = useMemo(
    () =>
      cart.map((line) => {
        const qty = Math.max(0, toNum(line.qty, 0));
        const price = Math.max(0, toNum(line.price, 0));
        const signedPrice = isExchangeReturnLine(line) ? -price : price;
        const discPerc = isExchangeReturnLine(line) ? 0 : Math.max(0, toNum(line.discPerc, 0));
        const discAmt = isExchangeReturnLine(line) ? 0 : Math.max(0, toNum(line.discAmt, 0));
        const total = isExchangeReturnLine(line)
          ? -round2(qty * price)
          : round2(Math.max(qty * price - discAmt, 0));
        return { ...line, price, signedPrice, total, discPerc, discAmt };
      }),
    [cart]
  );

  const subtotal = useMemo(() => cartWithTotals.reduce((s, l) => s + l.total, 0), [cartWithTotals]);
  const totalItems = useMemo(() => cartWithTotals.reduce((s, l) => s + toNum(l.qty, 0), 0), [cartWithTotals]);
  const totalAmount = round2(subtotal);
  const positiveCartLines = useMemo(
    () => cartWithTotals.filter((line) => !isExchangeReturnLine(line)),
    [cartWithTotals]
  );
  const exchangeReturnLines = useMemo(
    () => cartWithTotals.filter((line) => isExchangeReturnLine(line)),
    [cartWithTotals]
  );
  const returnAmount = useMemo(
    () => round2(exchangeReturnLines.reduce((sum, line) => sum + Math.abs(toNum(line.total, 0)), 0)),
    [exchangeReturnLines]
  );
  const paidCash = Math.max(totalAmount, 0);
  const balanceAmount = round2(-totalAmount);

  const discountDialogSelectedSet = useMemo(
    () => new Set(discountSelectedLineIds),
    [discountSelectedLineIds]
  );
  const discountDialogRows = useMemo(
    () =>
      positiveCartLines.map((line) => {
        const lineAmount = round2(toNum(line.qty, 0) * toNum(line.price, 0));
        const appliedDiscountValue = Math.min(lineAmount, Math.max(0, toNum(line.discAmt, 0)));
        const appliedPercent = lineAmount > 0 ? round2((appliedDiscountValue / lineAmount) * 100) : 0;
        const draft = discountRowDrafts[line.lineId] || {};
        const previewDiscountValue = Math.min(
          lineAmount,
          Math.max(0, toNum(draft.valueInput, appliedDiscountValue))
        );
        const previewNetAmount = round2(Math.max(lineAmount - previewDiscountValue, 0));

        return {
          ...line,
          lineAmount,
          appliedPercent,
          percentInput: draft.percentInput ?? formatEditableDecimal(appliedPercent),
          valueInput: draft.valueInput ?? formatEditableDecimal(appliedDiscountValue),
          previewDiscountValue,
          previewNetAmount,
        };
      }),
    [positiveCartLines, discountRowDrafts]
  );
  const discountDialogTotals = useMemo(() => {
    const selectedAmount = discountDialogRows.reduce(
      (sum, line) => sum + (discountDialogSelectedSet.has(line.lineId) ? line.lineAmount : 0),
      0
    );
    const previewDiscountValue = discountDialogRows.reduce(
      (sum, line) => sum + (discountDialogSelectedSet.has(line.lineId) ? line.previewDiscountValue : 0),
      0
    );

    return {
      selectedAmount: round2(selectedAmount),
      previewDiscountValue: round2(previewDiscountValue),
    };
  }, [discountDialogRows, discountDialogSelectedSet]);

  const focusBarcodeInput = useCallback(() => {
    setTimeout(() => barcodeRef.current?.focus(), 0);
  }, []);

  const openDiscountDialog = useCallback(() => {
    if (positiveCartLines.length === 0) {
      toast.error("Add at least one product before applying discount");
      return;
    }
    const nextDrafts = positiveCartLines.reduce((acc, line) => {
      const lineAmount = round2(toNum(line.qty, 0) * toNum(line.price, 0));
      const appliedDiscountValue = Math.min(lineAmount, Math.max(0, toNum(line.discAmt, 0)));
      const appliedPercent = lineAmount > 0 ? round2((appliedDiscountValue / lineAmount) * 100) : 0;
      acc[line.lineId] = {
        percentInput: formatEditableDecimal(appliedPercent),
        valueInput: formatEditableDecimal(appliedDiscountValue),
      };
      return acc;
    }, {});
    setDiscountRowDrafts(nextDrafts);
    setDiscountSelectedLineIds(positiveCartLines.map((line) => line.lineId));
    setDiscountPercentInput("");
    setDiscountValueInput("");
    setDiscountDialogOpen(true);
  }, [positiveCartLines]);

  const closeDiscountDialog = useCallback(() => {
    setDiscountDialogOpen(false);
    setDiscountPercentInput("");
    setDiscountValueInput("");
  }, []);

  useEffect(() => {
    if (!discountDialogOpen) return undefined;
    const onEsc = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      closeDiscountDialog();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [discountDialogOpen, closeDiscountDialog]);

  const handleDiscountRowToggle = useCallback((lineId) => {
    setDiscountSelectedLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
    );
  }, []);

  const handleDiscountToggleAll = useCallback(() => {
    setDiscountSelectedLineIds((prev) =>
      prev.length === positiveCartLines.length ? [] : positiveCartLines.map((line) => line.lineId)
    );
  }, [positiveCartLines]);

  const updateDiscountRowDraft = useCallback((lineId, patch) => {
    setDiscountRowDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        ...patch,
      },
    }));
    setDiscountSelectedLineIds((prev) => (prev.includes(lineId) ? prev : [...prev, lineId]));
  }, []);

  const handleDiscountRowPercentChange = useCallback((lineId, rawValue) => {
    const line = discountDialogRows.find((entry) => entry.lineId === lineId);
    if (!line) return;
    const percent = Math.min(100, Math.max(0, toNum(rawValue, 0)));
    const discountValue = round2((line.lineAmount * percent) / 100);
    updateDiscountRowDraft(lineId, {
      percentInput: rawValue,
      valueInput: formatEditableDecimal(discountValue),
    });
  }, [discountDialogRows, updateDiscountRowDraft]);

  const handleDiscountRowValueChange = useCallback((lineId, rawValue) => {
    const line = discountDialogRows.find((entry) => entry.lineId === lineId);
    if (!line) return;
    const discountValue = Math.min(line.lineAmount, Math.max(0, toNum(rawValue, 0)));
    const percent = line.lineAmount > 0 ? round2((discountValue / line.lineAmount) * 100) : 0;
    updateDiscountRowDraft(lineId, {
      percentInput: formatEditableDecimal(percent),
      valueInput: rawValue,
    });
  }, [discountDialogRows, updateDiscountRowDraft]);

  const applyDiscountPercentToSelected = useCallback((rawValue) => {
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
  }, [discountDialogRows, discountDialogSelectedSet, discountDialogTotals.selectedAmount]);

  const applyDiscountValueToSelected = useCallback((rawValue) => {
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
  }, [discountDialogRows, discountDialogSelectedSet, discountDialogTotals.selectedAmount]);

  const applyDiscountDialog = useCallback(() => {
    if (discountSelectedLineIds.length === 0) {
      toast.error("Select at least one row");
      return;
    }

    setCart((prev) =>
      prev.map((line) => {
        if (!discountDialogSelectedSet.has(line.lineId) || isExchangeReturnLine(line)) return line;
        const draft = discountRowDrafts[line.lineId] || {};
        const base = round2(toNum(line.price, 0) * toNum(line.qty, 0));
        const nextDiscAmt = Math.min(base, Math.max(0, toNum(draft.valueInput, line.discAmt)));
        const nextDiscPerc = base > 0 ? round2((nextDiscAmt / base) * 10000) / 100 : 0;
        return {
          ...line,
          discAmt: round2(nextDiscAmt),
          discPerc: nextDiscPerc,
        };
      })
    );
    closeDiscountDialog();
    focusBarcodeInput();
  }, [
    closeDiscountDialog,
    discountDialogSelectedSet,
    discountRowDrafts,
    discountSelectedLineIds.length,
    focusBarcodeInput,
    setCart,
  ]);

  /* ─── add product to cart ─── */
  const addToCart = useCallback(
    (source) => {
      if (!source) return;
      const used = usedQtyByBarcode.get(source.id) || 0;
      const remaining = source.qty - used;
      if (remaining <= 0) {
        toast.error("No stock available");
        return;
      }
      setCart((prev) => {
        const idx = prev.findIndex((l) => !isExchangeReturnLine(l) && l.stockId === source.id);
        if (idx !== -1) {
          const next = [...prev];
          const newQty = toNum(next[idx].qty, 0) + 1;
          if (newQty > source.qty) {
            toast.error("Quantity exceeds stock");
            return prev;
          }
          next[idx] = { ...next[idx], qty: newQty };
          return next;
        }
        return [
          ...prev,
          {
            lineId: `${source.id}-${Date.now()}`,
            stockId: source.id,
            variantId: source.variantId ?? null,
            barcode: source.barcode,
            productName: source.productName,
            mrp: source.mrp,
            price: source.price,
            tax: source.tax,
            qty: 1,
            discPerc: 0,
            discAmt: 0,
          },
        ];
      });
    },
    [usedQtyByBarcode, setCart]
  );

  const stopScanner = useCallback(() => {
    scannerActiveRef.current = false;
    // @zxing/browser 0.2 removed BrowserMultiFormatReader.reset(); the camera is torn down by the
    // controls object that decodeFromVideoDevice returns (controls.stop() above), which is the
    // modern lifecycle and already the primary path here. The old reset() call was belt-and-braces
    // legacy cleanup and is a no-op on 0.2, so it is gone along with its now-unused reader ref.
    if (scannerControlsRef.current?.stop) {
      try { scannerControlsRef.current.stop(); } catch { /* noop */ }
      scannerControlsRef.current = null;
    }
    if (scannerFrameRef.current) {
      window.cancelAnimationFrame(scannerFrameRef.current);
      scannerFrameRef.current = null;
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }
    if (scannerVideoRef.current) {
      scannerVideoRef.current.srcObject = null;
    }
    setScannerLoading(false);
  }, []);

  const handleBarcodeValue = useCallback((value, options = {}) => {
    const { silentNotFound = false } = options;
    const code = String(value || "").trim();
    if (!code) return false;
    const normalizedCode = normalize(code);
    const compactCode = compactBarcode(code);
    const source = stockRows.find((r) => {
      const barcode = r.barcode || "";
      return normalize(barcode) === normalizedCode || compactBarcode(barcode) === compactCode;
    });
    if (!source) {
      if (!silentNotFound) toast.error("Barcode not found");
      return false;
    }
    addToCart(source);
    setBarcodeInput("");
    return true;
  }, [addToCart, stockRows]);

  const handleBarcodeSubmit = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const shortcut = String(barcodeInput || "").trim().toUpperCase();
    if (shortcut === "D") {
      setBarcodeInput("");
      openDiscountDialog();
      return;
    }
    if (handleBarcodeValue(barcodeInput)) {
      setShowScanner(false);
    }
  };

  const handleOpenScanner = () => {
    setScannerError("");
    scannerLastValueRef.current = { value: "", ts: 0 };
    setShowScanner(true);
  };

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
    stopScanner();
  }, [stopScanner]);

  useEffect(() => {
    if (!showScanner) {
      stopScanner();
      return undefined;
    }

    let mounted = true;

    const startScanner = async () => {
      if (!window.isSecureContext) {
        setScannerError("Camera access requires HTTPS (or localhost).");
        return;
      }
      if (!navigator?.mediaDevices?.getUserMedia) {
        setScannerError("Camera is not supported on this device/browser.");
        return;
      }
      const DetectorClass = window.BarcodeDetector;
      setScannerLoading(true);
      setScannerError("");

      try {
        if (!DetectorClass) {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          if (!mounted) return;

          const videoEl = scannerVideoRef.current;
          if (!videoEl) {
            setScannerError("Unable to initialize scanner view.");
            setScannerLoading(false);
            stopScanner();
            return;
          }

          const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120 });
          scannerActiveRef.current = true;

          const controls = await reader.decodeFromVideoDevice(undefined, videoEl, (result) => {
            if (!mounted || !scannerActiveRef.current || !result) return;
            const raw = result.getText ? result.getText() : result.text;
            const compactRaw = compactBarcode(raw);
            const nowTs = Date.now();
            if (
              compactRaw
              && scannerLastValueRef.current.value === compactRaw
              && nowTs - scannerLastValueRef.current.ts < 1200
            ) return;
            scannerLastValueRef.current = { value: compactRaw, ts: nowTs };
            if (raw && handleBarcodeValue(raw, { silentNotFound: true })) {
              toast.success("Barcode scanned");
              handleCloseScanner();
            }
          });

          if (!mounted) {
            if (controls?.stop) controls.stop();
            return;
          }

          scannerControlsRef.current = controls;
          setScannerLoading(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;

        const videoEl = scannerVideoRef.current;
        if (!videoEl) {
          setScannerError("Unable to initialize scanner view.");
          setScannerLoading(false);
          stopScanner();
          return;
        }

        videoEl.srcObject = stream;
        await videoEl.play();

        const detector = new DetectorClass({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"],
        });

        scannerActiveRef.current = true;
        setScannerLoading(false);

        const scanLoop = async () => {
          if (!mounted || !scannerActiveRef.current) return;
          try {
            if (videoEl.readyState >= 2) {
              const results = await detector.detect(videoEl);
              if (results?.length) {
                const raw = results[0]?.rawValue;
                const compactRaw = compactBarcode(raw);
                const nowTs = Date.now();
                if (
                  compactRaw
                  && scannerLastValueRef.current.value === compactRaw
                  && nowTs - scannerLastValueRef.current.ts < 1200
                ) return;
                scannerLastValueRef.current = { value: compactRaw, ts: nowTs };
                if (raw && handleBarcodeValue(raw, { silentNotFound: true })) {
                  toast.success("Barcode scanned");
                  handleCloseScanner();
                  return;
                }
              }
            }
          } catch {
            // Ignore transient camera/frame decode failures and continue scanning.
          }

          scannerFrameRef.current = window.requestAnimationFrame(() => {
            void scanLoop();
          });
        };

        void scanLoop();
      } catch (err) {
        const permissionDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
        setScannerError(permissionDenied
          ? "Camera permission denied. Please allow camera access."
          : "Unable to access camera. Please allow camera permission.");
        setScannerLoading(false);
        stopScanner();
      }
    };

    void startScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [handleBarcodeValue, handleCloseScanner, showScanner, stopScanner]);

  const handleLineChange = (lineId, field, raw) => {
    const currentLine = cart.find((line) => line.lineId === lineId);
    if (!currentLine) return;
    if (isExchangeReturnLine(currentLine) && field !== "qty") return;

    const val = Math.max(0, toNum(raw, 0));
    let validationMessage = "";
    const nextCart = cart.map((l) => {
      if (l.lineId !== lineId) return l;
      let nextVal = val;
      if (isExchangeReturnLine(l) && field === "qty") {
        const maxAllowed = Math.max(0, toNum(l.maxQty ?? l.qty, 0));
        if (nextVal > maxAllowed) {
          validationMessage = `Quantity exceed maximum quantity for this product is ${formatQty(maxAllowed)}`;
          nextVal = maxAllowed;
        }
      }
      if (field === "qty") {
        const source = stockRows.find((s) => s.id === l.stockId);
        if (source && !isExchangeReturnLine(l)) {
          const usedByOtherLines = cart.reduce((sum, row) => {
            if (isExchangeReturnLine(row) || row.stockId !== l.stockId || row.lineId === l.lineId) return sum;
            return sum + Math.max(0, toNum(row.qty, 0));
          }, 0);
          const maxAllowed = Math.max(0, toNum(source.qty, 0) - usedByOtherLines);
          if (nextVal > maxAllowed) {
            validationMessage = `Quantity exceed maximum quantity for this product is ${formatQty(maxAllowed)}`;
            nextVal = maxAllowed;
          }
        }
      }
      const updated = { ...l, [field]: nextVal };
      // recalc discount amt from % or vice versa
      if (!isExchangeReturnLine(l) && field === "discPerc") {
        updated.discAmt = Math.round(((updated.qty * updated.price * nextVal) / 100) * 100) / 100;
      }
      if (!isExchangeReturnLine(l) && field === "discAmt") {
        const base = updated.qty * updated.price;
        updated.discPerc = base > 0 ? Math.round((nextVal / base) * 10000) / 100 : 0;
      }
      return updated;
    });
    setCart(nextCart);
    if (validationMessage) toast.error(validationMessage);
  };

  const removeLine = (lineId) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const nextCart = tab.cart.filter((line) => line.lineId !== lineId);
        if (nextCart.some(isExchangeReturnLine)) {
          return { ...tab, cart: nextCart };
        }
        return {
          ...tab,
          cart: nextCart,
          returnSaleId: null,
          returnBillNo: null,
          returnSaleType: null,
          returnAmount: 0,
          isExchange: false,
        };
      })
    );
  };

  /* ─── tab management ─── */
  const handleAddTab = () => setHoldConfirm(true);

  const confirmAddTab = () => {
    setHoldConfirm(false);
    tabCounter.current += 1;
    const newTab = {
      id: tabCounter.current,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      cart: [],
      customerMode: "walking",
      existingCustomerId: "",
      customerMobile: "",
      customerName: "",
      paymentMode: "cash",
      paidCash: "",
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleDeleteTab = (tabId) => {
    if (tabId === 1) { toast.error("Cannot delete the first tab"); return; }
    setDeleteConfirm(tabId);
  };

  const confirmDeleteTab = () => {
    const tabId = deleteConfirm;
    setDeleteConfirm(null);
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeTabId === tabId) setActiveTabId(1);
  };

  const handlePrintReceipt = useCallback(async (data) => {
    const receiptCustomization = data.receiptCustomization;
    const billCode = String(data.billBarcode || data.billNo || "").trim();
    const html = buildPosSaleReceiptHtml(
      {
        ...data,
        billCodeMarkup: await buildReceiptCodeMarkupAsync(billCode, receiptCustomization, "bill"),
        paymentQrMarkup: await buildPaymentQrMarkup(receiptCustomization, {
          billAmount: data.total,
          billNo: data.billNo,
          storeName: data.storeName,
        }),
      },
      receiptCustomization
    );
    const isDirectPrint = receiptCustomization.printMode !== "browser";
    if (isDirectPrint) {
      await queuePrintHtml(html, {
        label: `POSOld-${data.billNo}`,
        docType: "pos_old_sale_receipt",
        copies: 1,
        companyId: data.companyId,
        receiptData: data,
      });
      return;
    }

    const win = window.open("", "_blank", "width=400,height=650");
    if (!win) { toast.error("Popup blocked – please allow popups for printing"); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  }, [printerConnected, queuePrintHtml]);

  const handlePrintReturnReceipt = useCallback(async (savedReturn, printOpts = {}) => {
    if (!savedReturn) return;

    const receiptCustomization = loadSalesReceiptCustomization(authUser?.company_id || "default");
    const companyInfo = await fetchReceiptCompanyInfo(authUser?.company_id || null);
    const displayReturnNo = getPosReturnBarcodeValue(
      savedReturn?.display_return_no || savedReturn?.return_no || savedReturn?.id
    );
    const sourceBillNo = savedReturn?.source_bill_no
      ? getPosBillBarcodeValue(savedReturn.source_bill_no)
      : "";
    const receiptItems = (savedReturn.items || []).map((item) => {
      const qty = Math.max(0, toNum(item.qty, 0));
      const rate = Math.max(0, toNum(item.price ?? item.rate, 0));
      const taxPerc = Math.max(0, toNum(item.tax_perc ?? item.taxPerc ?? item.tax, 0));
      const discount = Math.max(0, toNum(item.discount, 0));
      const subtotal = round2(qty * rate);
      const taxAmount = round2((subtotal * taxPerc) / 100);
      const amount = round2(
        Math.abs(toNum(item.total ?? item.amount, 0)) || Math.max(subtotal + taxAmount - discount, 0)
      );

      return {
        name: item.product_name || item.productName || item.barcode || "-",
        qty,
        rate,
        taxPerc,
        taxName: item.tax_name || item.taxName || "",
        taxType: item.tax_type || item.taxType || "",
        baseAmount: subtotal,
        taxAmount,
        discountAmount: discount,
        amount,
        code: item.barcode || "",
      };
    });

    const receiptTotalDiscount = Math.max(0, toNum(savedReturn?.total_discount, 0));
    const receiptNetAmount = round2(-Math.abs(toNum(savedReturn?.amount, 0)));
    const reasonLabel =
      String(printOpts.returnReasonLabel || savedReturn?.return_reason_name || "").trim() || "";

    const receiptData = {
      receiptCustomization,
      storeName:
        String(authUser?.company_name || "").trim()
        || String(authUser?.name || "").trim()
        || "Store",
      storeAddress: companyInfo.storeAddress,
      storePhone: companyInfo.storePhone,
      storeGstNo: companyInfo.storeGstNo,
      billNo: displayReturnNo,
      billBarcode: displayReturnNo,
      dateTime: savedReturn?.return_at || new Date().toISOString(),
      cashierName: String(authUser?.name || authUser?.email || "POS").trim(),
      counterName: String(authUser?.counter_name || savedReturn?.counter_name || "").trim(),
      customerName:
        String(savedReturn?.customer_name || savedReturn?.customer?.name || "").trim()
        || "Walking customer",
      returnReason: reasonLabel,
      sourceBillNo,
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
    const html = buildPosReturnReceiptHtml(receiptData, receiptCustomization);

    const isReturnDirectPrint = receiptCustomization.printMode !== "browser";
    if (isReturnDirectPrint) {
      await queuePrintHtml(html, {
        label: `POSOldReturn-${displayReturnNo}`,
        docType: "pos_return_receipt",
        copies: 1,
        companyId: authUser?.company_id,
        receiptData,
      });
      return;
    }

    const win = window.open("", "_blank", "width=420,height=720");
    if (!win) {
      toast.error("Popup blocked – please allow popups for printing");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  }, [
    authUser?.company_id,
    authUser?.company_name,
    authUser?.counter_name,
    authUser?.email,
    authUser?.name,
    printerConnected,
    queuePrintHtml,
  ]);

  // customers is only ever seeded with a small batch (see the loadDropdownData-style effect
  // above) -- this hits /customers' own ?search= endpoint for anything beyond that, and merges
  // any new matches into the cache so a customer found once stays instantly findable.
  const handleAsyncCustomerSearch = useCallback(async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/customers", { params: { search: trimmed, limit: 20 } });
      const mapped = (res.data?.data || []).map(mapCustomerRow);
      if (mapped.length) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.value));
          const newOnes = mapped.filter((c) => !existingIds.has(c.value));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  /* ─── save sale (Quick Pay & Print) ─── */
  const handleCustomerNumberLookup = useCallback(async (rawValue, mode = activeTab.customerMode) => {
    const query = String(rawValue || "").trim();
    const digitsQuery = query.replace(/\D/g, "");

    if (!query) {
      updateActiveTab({
        existingCustomerId: "",
        customerName: "",
      });
      return null;
    }

    const findByNumber = (list) => list.find((row) => {
      const mobileDigits = String(row.mobileNo || "").replace(/\D/g, "");
      return digitsQuery ? mobileDigits === digitsQuery : String(row.mobileNo || "").trim() === query;
    });

    let matched = findByNumber(customers);
    if (!matched) {
      const serverResults = await handleAsyncCustomerSearch(query);
      matched = findByNumber(serverResults);
    }

    if (matched) {
      updateActiveTab({
        existingCustomerId: matched.value,
        customerMobile: matched.mobileNo || query,
        customerName: matched.name || "",
      });
      return matched;
    }

    if (mode === "existing") {
      updateActiveTab({
        existingCustomerId: "",
        customerName: "",
      });
      toast.error("Customer not found");
      return null;
    }

    updateActiveTab({
      existingCustomerId: "",
      customerMobile: query,
    });
    return null;
  }, [activeTab.customerMode, customers, updateActiveTab, handleAsyncCustomerSearch]);

  const handleSave = async () => {
    if (!authUser?.counter_id) {
      setCounterAssignmentOpen(true);
      toast.error("Please assign a counter before checkout");
      return;
    }
    if (cartWithTotals.length === 0) { toast.error("Add at least one product"); return; }
    if (activeTab.isExchange) {
      toast.error("Exchange checkout isn't available yet - please process the return and the new sale separately");
      return;
    }
    const customerMobile = String(activeTab.customerMobile || "").trim();
    const customerName = String(activeTab.customerName || "").trim();
    if (activeTab.customerMode === "existing" && !activeTab.existingCustomerId) {
      toast.error("Enter customer number and press Enter");
      return;
    }
    if (activeTab.customerMode === "new" && !customerName) {
      toast.error("Customer name is required");
      return;
    }
    const usedByStock = new Map();
    positiveCartLines.forEach((line) => {
      usedByStock.set(line.stockId, (usedByStock.get(line.stockId) || 0) + Math.max(0, toNum(line.qty, 0)));
    });
    for (const line of positiveCartLines) {
      const source = stockRows.find((s) => s.id === line.stockId);
      if (!source) continue;
      const maxAllowed = Math.max(0, toNum(source.qty, 0));
      const used = usedByStock.get(line.stockId) || 0;
      if (used > maxAllowed) {
        toast.error(`Quantity exceed maximum quantity for this product is ${formatQty(maxAllowed)}`);
        return;
      }
    }

    const payload = {
      customerMode: activeTab.customerMode,
      customerId: activeTab.customerMode === "existing" ? activeTab.existingCustomerId : null,
      ...(activeTab.customerMode === "new"
        ? {
            customer: {
              name: customerName,
              mobileNo: customerMobile || null,
            },
          }
        : {}),
      saleAt: now.toISOString(),
      paymentMode: "cash",
      shipping: 0,
      paidCash: paidCash,
      returnSaleId: activeTab.returnSaleId || null,
      returnBillNo: activeTab.returnBillNo || null,
      returnSaleType: activeTab.returnSaleType || null,
      returnAmount: returnAmount,
      isExchange: !!activeTab.isExchange,
      items: positiveCartLines.map((l) => ({
        barcodeId: l.stockId,
        variantId: l.variantId ?? null,
        barcode: l.barcode,
        productName: l.productName,
        mrp: l.mrp,
        qty: l.qty,
        price: l.price,
        discountPerc: l.discPerc,
        discountAmt: l.discAmt,
      })),
    };

    setSaving(true);
    try {
      const res = await api.post("/pos-old-sales", payload);
      const saved = res.data?.data;
      const savedBillNo = saved?.bill_no || saved?.bill?.bill_no || billNo;
      toast.success(`Sale saved (Bill #${getPosBillBarcodeValue(savedBillNo)})`);

      // print receipt
      const receiptCompanyId = saved?.company_id || authUser?.company_id || null;
      const receiptCustomization = loadSalesReceiptCustomization(receiptCompanyId || "default");
      const companyInfo = await fetchReceiptCompanyInfo(receiptCompanyId);
      const selectedCustomer = customers.find((row) => String(row.value) === String(activeTab.existingCustomerId || ""));
      const receiptCustomerName =
        String(saved?.customer_name || saved?.customer?.name || "").trim()
        || String(selectedCustomer?.name || "").trim()
        || customerName
        || WALKING_CUSTOMER_NAME;
      await handlePrintReceipt(buildPosOldSaleReceiptPayload({
        sale: saved,
        authUser,
        receiptCustomization,
        companyInfo,
        stockRows,
        returnItems: exchangeReturnLines.map((line) => ({
          name: line.productName || line.barcode || "-",
          qty: Math.max(0, toNum(line.qty, 0)),
          amount: Math.abs(toNum(line.total, 0)),
          code: line.barcode || "",
        })),
        appliedReturnNo: activeTab.returnBillNo ? String(activeTab.returnBillNo) : "",
        paymentMethod: activeTab.isExchange ? "Exchange" : "Cash",
        customerNameOverride: receiptCustomerName,
      }));

      // reset tab
      updateActiveTab({ cart: [], paidCash: "", returnSaleId: null, returnBillNo: null, returnSaleType: null, returnAmount: 0, isExchange: false });
      await Promise.all([loadMasterData(), loadNextBillNo()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ─── cancel ─── */
  const handleCancel = () => {
    updateActiveTab({
      cart: [],
      paidCash: "",
      paymentMode: "cash",
      customerMode: "walking",
      existingCustomerId: "",
      customerMobile: "",
      customerName: "",
      returnSaleId: null,
      returnBillNo: null,
      returnSaleType: null,
      returnAmount: 0,
      isExchange: false,
    });
  };

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.defaultPrevented || event.repeat) return;

      if (event.key === "F4") {
        event.preventDefault();
        handleCancel();
        return;
      }

      if (event.key === "F8") {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleSave, handleCancel]);

  /* ─── close register ─── */
  const handleOpenCloseRegister = async () => {
    setShowCloseRegister(true);
    try {
      const res = await api.get("/pos-old-sales/session-summary");
      setSessionSummary(res.data?.data || { cash: 0, online_pay: 0, credit_card: 0, point: 0, returns: 0, total: 0 });
    } catch { /* keep defaults */ }
  };

  const denomTotal = useMemo(
    () => DENOMINATIONS.reduce((s, d) => s + toInt(denomCounts[`c_${d}`], 0) * d, 0),
    [denomCounts]
  );

  const mapLookupSaleItemsToExchangeDraft = useCallback((items) => {
    return (items || []).map((item, index) => {
      const qty = Math.max(1, toInt(item.qty, 1));
      return {
        lineId: `exchange-draft-${item.id || index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stockId: null,
        barcode: item.barcode || "",
        productName: item.productName || item.barcode || "-",
        standaloneLine: false,
        qty,
        maxQty: qty,
        originalQty: qty,
        returnedQty: 0,
        price: Math.max(0, toNum(item.price ?? item.total, 0)),
        tax: 0,
        cost: 0,
        discount: 0,
      };
    });
  }, []);

  const applyExchangeLookupToDraft = useCallback(
    (data) => {
      if (!data?.items?.length) {
        toast.error("No exchangeable lines found");
        setReturnSourceSale(null);
        setReturnCartDraft([]);
        setReturnTemplateSnapshot([]);
        return;
      }

      const saleType = String(data.saleType || "pos_sale");
      const lines = mapLookupSaleItemsToExchangeDraft(data.items);
      setReturnSourceSale({
        id: data.saleId,
        billNo: saleType === "pos_return" ? toInt(data.returnNo, data.saleId) : data.billNo,
        customerId: "",
        customerMode: "walking",
        customerName: data.customerName || "",
        customerMobile: "",
        sourceBillSaleType: saleType,
        exchangeDisplayBillNo: data.billNo,
      });
      setReturnTemplateSnapshot(lines.map((line) => ({ ...line })));
      setReturnCartDraft(lines);
      setReturnBillLookup("");
      toast.success(
        saleType === "pos_return"
          ? `Return note ${data.billNo} loaded`
          : `Bill ${formatPosSaleBillNo(data.billNo)} loaded`
      );
      setTimeout(() => {
        const wrap = returnReasonSelectWrapRef.current;
        const trigger = wrap?.querySelector("[data-searchable-select-trigger]");
        if (trigger instanceof HTMLElement) {
          trigger.focus();
          trigger.click();
        }
      }, 0);
    },
    [mapLookupSaleItemsToExchangeDraft]
  );

  const mapReturnApiItemsToCartLines = useCallback((items, options = {}) => {
    const isStandalone = options.standalone === true;
    return (items || []).map((item) => {
      const maxQty = isStandalone ? STANDALONE_MAX_QTY : Math.max(1, toInt(item.maxQty, 1));
      return {
        lineId: `${item.barcodeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        stockId: item.barcodeId,
        barcode: item.barcode || "",
        productName: item.productName || "",
        standaloneLine: isStandalone,
        qty: Math.max(1, toInt(item.qty, 1)),
        maxQty,
        originalQty: isStandalone ? 0 : Math.max(0, toInt(item.originalQty, 0)),
        returnedQty: isStandalone ? 0 : Math.max(0, toInt(item.returnedQty, 0)),
        price: Math.max(0, toNum(item.price, 0)),
        tax: Math.max(0, toNum(item.tax, 0)),
        cost: Math.max(0, toNum(item.cost, 0)),
        discount: isStandalone ? 0 : Math.max(0, toNum(item.discount, 0)),
      };
    });
  }, []);

  const mergeStandaloneIntoReturnDraft = useCallback(
    (barcodeData) => {
      if (!barcodeData?.standalone) return false;
      const nextCartLines = mapReturnApiItemsToCartLines(barcodeData.items || [], { standalone: true });
      if (!nextCartLines.length) return false;

      setReturnCartDraft((cartPrev) => {
        const next = [...cartPrev];
        for (const nl of nextCartLines) {
          const idx = next.findIndex((l) => String(l.stockId) === String(nl.stockId));
          if (idx >= 0) {
            const existing = next[idx];
            const cap = nl.maxQty;
            next[idx] = {
              ...nl,
              lineId: existing.lineId,
              maxQty: cap,
              qty: Math.min(Math.max(existing.qty, 1), cap),
            };
          } else {
            next.push(nl);
          }
        }
        return next;
      });

      setReturnSourceSale((prev) => {
        if (!prev?.standalone) {
          return {
            standalone: true,
            id: null,
            billNo: null,
            customerId: "",
            customerMode: "walking",
            customerName: "",
            customerMobile: "",
          };
        }
        return prev;
      });
      setReturnTemplateSnapshot([]);
      return true;
    },
    [mapReturnApiItemsToCartLines]
  );

  const loadReturnEntryFromInput = useCallback(
    async (rawInput) => {
      const trimmed = String(rawInput || "").trim();
      if (!trimmed) {
        toast.error("Enter POS bill number or scan a product barcode");
        return;
      }

      const applySourceBillPayload = (data, successMsg) => {
        if (!data?.items?.length) {
          toast.error("No returnable lines on this bill");
          setReturnSourceSale(null);
          setReturnCartDraft([]);
          setReturnTemplateSnapshot([]);
          return;
        }
        setReturnSourceSale({
          id: data.id,
          billNo: data.billNo,
          customerId: data.customerId != null ? String(data.customerId) : "",
          customerMode: data.customerMode || "walking",
          customerName: data.customerName || "",
          customerMobile: data.customerMobile || "",
          sourceBillSaleType: data.sourceBillSaleType || "pos_sale",
        });
        const lines = mapReturnApiItemsToCartLines(data.items);
        setReturnTemplateSnapshot(lines.map((l) => ({ ...l })));
        setReturnCartDraft(lines);
        setReturnBillLookup("");
        toast.success(successMsg || `Bill ${formatPosSaleBillNo(data.billNo)} loaded`);
        setTimeout(() => {
          const wrap = returnReasonSelectWrapRef.current;
          const trigger = wrap?.querySelector("[data-searchable-select-trigger]");
          if (trigger instanceof HTMLElement) {
            trigger.focus();
            trigger.click();
          }
        }, 0);
      };

      setLoadingReturnBill(true);
      try {
        if (isLikelySaleBillInput(trimmed)) {
          const billNum = parseBillNoFromInput(trimmed);
          if (billNum === null || billNum < 1) {
            toast.error("Enter bill number (e.g. SB/1 or 1)");
            return;
          }
          try {
            const res = await api.get("/pos-returns/source-bill", { params: { billNo: trimmed } });
            applySourceBillPayload(res.data?.data, null);
            return;
          } catch (billErr) {
            const status = billErr?.response?.status;
            if (status !== 404 && status !== 422) throw billErr;
          }
        }

        /* Match POS Return: non-bill input uses return-product-barcode only (no bill auto-load). */
        try {
          const bcRes = await api.get("/pos-returns/return-product-barcode", { params: { barcode: trimmed } });
          const barcodeData = bcRes.data?.data;
          if (barcodeData?.standalone) {
            if (
              returnSourceSale
              && !returnSourceSale.standalone
              && (returnSourceSale.id || returnSourceSale.billNo != null)
            ) {
              toast.error("Cart is tied to a POS bill. Close Return and start again for a barcode-only return.");
              return;
            }
            const ok = mergeStandaloneIntoReturnDraft(barcodeData);
            if (ok) {
              setReturnBillLookup("");
              toast.success("Product added — adjust quantity on the lines step (catalogue pricing)");
              setTimeout(() => {
                const wrap = returnReasonSelectWrapRef.current;
                const trigger = wrap?.querySelector("[data-searchable-select-trigger]");
                if (trigger instanceof HTMLElement) {
                  trigger.focus();
                  trigger.click();
                }
              }, 0);
              return;
            }
          }
        } catch {
          /* fall through */
        }

        toast.error("Bill not found or unknown barcode");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Bill not found");
        setReturnSourceSale(null);
        setReturnCartDraft([]);
        setReturnTemplateSnapshot([]);
      } finally {
        setLoadingReturnBill(false);
      }
    },
    [mapReturnApiItemsToCartLines, mergeStandaloneIntoReturnDraft, returnSourceSale]
  );

  const loadExchangeEntryFromInput = useCallback(
    async (rawInput) => {
      const trimmed = String(rawInput || "").trim();
      if (!trimmed) {
        toast.error("Enter return note, bill number, or product barcode");
        return;
      }

      if (/^(rr|ro)\//i.test(trimmed)) {
        setLoadingReturnBill(true);
        try {
          const res = await api.get("/pos-old-sales/lookup-sale", { params: { saleNo: trimmed } });
          applyExchangeLookupToDraft(res.data?.data || null);
        } catch (err) {
          toast.error(err?.response?.data?.message || "Return note not found");
          setReturnSourceSale(null);
          setReturnCartDraft([]);
          setReturnTemplateSnapshot([]);
        } finally {
          setLoadingReturnBill(false);
        }
        return;
      }

      await loadReturnEntryFromInput(trimmed);
    },
    [applyExchangeLookupToDraft, loadReturnEntryFromInput]
  );

  const handleReturnDraftQtyChange = useCallback((lineId, rawValue) => {
    const enteredQty = Math.max(0, toInt(rawValue, 0));
    setReturnCartDraft((prev) =>
      prev.map((line) => {
        if (line.lineId !== lineId) return line;
        const cap = line.standaloneLine ? STANDALONE_MAX_QTY : Math.max(1, toInt(line.maxQty, 1));
        return { ...line, qty: Math.min(Math.max(enteredQty, 0), cap) };
      })
    );
  }, []);

  const handleRemoveReturnDraftLine = useCallback((lineId) => {
    setReturnCartDraft((prev) => prev.filter((line) => line.lineId !== lineId));
  }, []);

  const submitReturnFromPosOldDialog = useCallback(
    async ({ shouldPrint }) => {
      const isStandalone = returnSourceSale?.standalone === true;
      if (!returnSourceSale) {
        toast.error("Load a bill or scan a product first");
        return;
      }
      if (!isStandalone && (!returnSourceSale.id || returnSourceSale.billNo == null)) {
        toast.error("Load a bill first");
        return;
      }
      const activeLines = returnCartDraft.filter((line) => toInt(line.qty, 0) > 0);
      if (activeLines.length === 0) {
        toast.error("Select at least one product to return");
        return;
      }
      if (!selectedReturnReasonId) {
        toast.error("Select a return reason");
        return;
      }
      const reasonLabel = returnReasons.find((r) => r.value === selectedReturnReasonId)?.label || "";
      const payload = {
        customerMode: returnSourceSale.customerId ? "existing" : "walking",
        customerId: returnSourceSale.customerId || null,
        customerName: String(returnSourceSale.customerName || "").trim() || null,
        customerMobile: String(returnSourceSale.customerMobile || "").trim() || null,
        returnReasonId: selectedReturnReasonId || null,
        returnReasonName: reasonLabel || null,
        ...(isStandalone ? { standalone: true } : { sourcePosSaleId: returnSourceSale.id, sourceBillNo: returnSourceSale.billNo }),
        returnAt: new Date().toISOString(),
        items: activeLines.map((line) => ({
          barcodeId: line.stockId,
          barcode: line.barcode,
          productName: line.productName,
          qty: toInt(line.qty, 0),
          maxQty: line.maxQty,
          price: line.price,
          tax: line.tax,
          cost: line.cost,
          discount: line.discount,
        })),
      };

      setReturnSaving(true);
      try {
        const res = await api.post("/pos-returns", payload);
        const data = res.data?.data;
        toast.success(
          `Return saved${data?.display_return_no ? ` (${data.display_return_no})` : ""}. Rs.${formatMoney(Math.abs(toNum(data?.amount, 0)))}`
        );
        if (shouldPrint) {
          await handlePrintReturnReceipt(data, { returnReasonLabel: reasonLabel });
        }
        setShowReturnLinesDialog(false);
        setShowReturnDialog(false);
        setReturnSourceSale(null);
        setReturnBillLookup("");
        setSelectedReturnReasonId("");
        setReturnCartDraft([]);
        setReturnTemplateSnapshot([]);
        setReturnScanInput("");
        await Promise.all([loadMasterData(), loadNextReturnNo()]);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to save return");
      } finally {
        setReturnSaving(false);
      }
    },
    [
      returnSourceSale,
      returnCartDraft,
      selectedReturnReasonId,
      returnReasons,
      handlePrintReturnReceipt,
      loadMasterData,
      loadNextReturnNo,
    ]
  );

  const bumpReturnScanQty = useCallback((matchLine) => {
    setReturnCartDraft((prev) => {
      const idx = prev.findIndex((l) => String(l.stockId) === String(matchLine.stockId));
      if (idx >= 0) {
        const line = prev[idx];
        const cap = line.standaloneLine ? STANDALONE_MAX_QTY : Math.max(1, toInt(line.maxQty, 1));
        const nextQty = Math.min(toInt(line.qty, 0) + 1, cap);
        return prev.map((l, i) => (i === idx ? { ...l, qty: nextQty } : l));
      }
      return [
        ...prev,
        {
          ...matchLine,
          lineId: `${matchLine.stockId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          qty: 1,
        },
      ];
    });
    setReturnScanInput("");
  }, []);

  const openReturnProductsStep = useCallback((reasonIdOverride) => {
    const rid = reasonIdOverride ?? selectedReturnReasonId;
    if (!returnSourceSale) {
      toast.error("Load a bill or scan a product first");
      return;
    }
    if (!rid) {
      toast.error(showExchangeDialog ? "Select an exchange reason" : "Select a return reason");
      return;
    }
    setShowReturnLinesDialog(true);
    setTimeout(() => returnLinesScanRef.current?.focus(), 0);
  }, [returnSourceSale, selectedReturnReasonId, showExchangeDialog]);

  const resetReturnExchangeDialogState = useCallback(() => {
    setShowReturnLinesDialog(false);
    setReturnSourceSale(null);
    setReturnBillLookup("");
    setSelectedReturnReasonId("");
    setReturnCartDraft([]);
    setReturnTemplateSnapshot([]);
    setReturnScanInput("");
  }, []);

  const closeReturnDialog = useCallback(() => {
    setShowReturnDialog(false);
    resetReturnExchangeDialogState();
  }, [resetReturnExchangeDialogState]);

  const closeExchangeDialog = useCallback(() => {
    setShowExchangeDialog(false);
    resetReturnExchangeDialogState();
  }, [resetReturnExchangeDialogState]);

  useEffect(() => {
    if (!showReturnDialog && !showExchangeDialog) return undefined;
    const onEsc = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      if (showReturnLinesDialog) {
        setShowReturnLinesDialog(false);
        setReturnScanInput("");
        return;
      }
      if (showExchangeDialog) {
        closeExchangeDialog();
        return;
      }
      closeReturnDialog();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [
    showReturnDialog,
    showExchangeDialog,
    showReturnLinesDialog,
    closeReturnDialog,
    closeExchangeDialog,
  ]);

  const returnDraftSummary = useMemo(() => {
    let amount = 0;
    let totalQty = 0;
    returnCartDraft.forEach((line) => {
      const qty = Math.max(0, toInt(line.qty, 0));
      const price = Math.max(0, toNum(line.price, 0));
      const tax = Math.max(0, toNum(line.tax, 0));
      const discount = Math.max(0, toNum(line.discount, 0));
      const subtotal = qty * price;
      const taxAmount = (subtotal * tax) / 100;
      const rawTotal = Math.max(subtotal + taxAmount - discount, 0);
      amount += -rawTotal;
      totalQty += qty;
    });
    return { amount: round2(amount), totalQty };
  }, [returnCartDraft]);

  const applyExchangeFromDraft = useCallback(() => {
    if (!returnSourceSale) {
      toast.error("Load a bill, return note, or scan a product first");
      return;
    }
    const activeLines = returnCartDraft.filter((line) => toInt(line.qty, 0) > 0);
    if (activeLines.length === 0) {
      toast.error("Select at least one product to exchange");
      return;
    }
    if (!selectedReturnReasonId) {
      toast.error("Select an exchange reason");
      return;
    }

    const exchangeLines = activeLines.map((line, index) => {
      const qty = Math.max(0, toInt(line.qty, 0));
      const price = Math.max(0, toNum(line.price, 0));
      return {
        lineId: `exchange-return-${returnSourceSale.id || "draft"}-${line.stockId || index}-${Date.now()}`,
        stockId: line.stockId,
        barcode: line.barcode || "",
        productName: line.productName || line.barcode || "-",
        mrp: price,
        price,
        tax: Math.max(0, toNum(line.tax, 0)),
        qty,
        maxQty: qty,
        discPerc: 0,
        discAmt: 0,
        isExchangeReturn: true,
      };
    });
    const returnAmount = round2(
      activeLines.reduce((sum, line) => {
        const qty = Math.max(0, toInt(line.qty, 0));
        const price = Math.max(0, toNum(line.price, 0));
        const tax = Math.max(0, toNum(line.tax, 0));
        const discount = Math.max(0, toNum(line.discount, 0));
        const subtotal = qty * price;
        const taxAmount = (subtotal * tax) / 100;
        return sum + Math.max(subtotal + taxAmount - discount, 0);
      }, 0)
    );

    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const preservedSaleLines = (tab.cart || []).filter((line) => !isExchangeReturnLine(line));
        return {
          ...tab,
          returnSaleId: returnSourceSale.id,
          returnBillNo: returnSourceSale.exchangeDisplayBillNo || returnSourceSale.billNo,
          returnSaleType: returnSourceSale.sourceBillSaleType || "pos_sale",
          returnAmount,
          isExchange: true,
          cart: [...exchangeLines, ...preservedSaleLines],
        };
      })
    );
    toast.success(`Exchange amount Rs.${formatMoney(returnAmount)} applied. Add new items.`);
    closeExchangeDialog();
  }, [
    activeTabId,
    closeExchangeDialog,
    returnCartDraft,
    returnSourceSale,
    selectedReturnReasonId,
  ]);

  const handleReturnLinesScanKeyDown = useCallback(
    async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const raw = String(event.currentTarget.value || "").trim();
      if (raw === "0") {
        setReturnScanInput("");
        if (showExchangeDialog) {
          applyExchangeFromDraft();
          return;
        }
        await submitReturnFromPosOldDialog({ shouldPrint: true });
        return;
      }
      if (!raw || !returnSourceSale) return;

      if (returnSourceSale.standalone) {
        const draftHit = returnCartDraft.find((t) => barcodeMatchesReturnScan(t.barcode, raw));
        if (draftHit) {
          bumpReturnScanQty(draftHit);
          return;
        }
        try {
          const bcRes = await api.get("/pos-returns/return-product-barcode", { params: { barcode: raw } });
          const data = bcRes.data?.data;
          if (data?.standalone && data?.items?.length) {
            const mapped = mapReturnApiItemsToCartLines(data.items, { standalone: true })[0];
            if (mapped) {
              bumpReturnScanQty(mapped);
              return;
            }
          }
        } catch (err) {
          toast.error(err?.response?.data?.message || "Product barcode not found");
          return;
        }
        toast.error("Unknown barcode");
        return;
      }

      const tplHit = returnTemplateSnapshot.find((t) => barcodeMatchesReturnScan(t.barcode, raw));
      if (tplHit) {
        bumpReturnScanQty(tplHit);
        return;
      }

      try {
        const bcRes = await api.get("/pos-returns/return-product-barcode", { params: { barcode: raw } });
        const row = bcRes.data?.data?.items?.[0];
        const bid = row?.barcodeId ?? row?.stockId;
        if (bid) {
          const tpl = returnTemplateSnapshot.find((t) => String(t.stockId) === String(bid));
          if (tpl) {
            bumpReturnScanQty(tpl);
            return;
          }
          toast.error("Barcode not on this bill");
          return;
        }
      } catch {
        /* fall through to bill-scoped sale lookup */
      }

      try {
        const res = await api.get("/pos-returns/source-by-barcode", { params: { barcode: raw } });
        const data = res.data?.data;
        const row = data?.items?.[0];
        if (
          row
          && toInt(data.billNo, -999) === toInt(returnSourceSale.billNo, -998)
        ) {
          const mapped = mapReturnApiItemsToCartLines([row])[0];
          if (mapped) {
            bumpReturnScanQty(mapped);
            return;
          }
        }
        toast.error("Barcode not on this bill");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Product barcode not found in this store");
      }
    },
    [
      returnSourceSale,
      returnCartDraft,
      returnTemplateSnapshot,
      submitReturnFromPosOldDialog,
      bumpReturnScanQty,
      mapReturnApiItemsToCartLines,
      showExchangeDialog,
      applyExchangeFromDraft,
    ]
  );

  /* ─── filtered products for right panel ─── */
  const filteredProducts = useMemo(() => {
    let list = productList;
    if (productSearch) {
      const q = normalize(productSearch);
      list = list.filter(
        (p) => normalize(p.productName).includes(q) || normalize(p.barcode).includes(q)
      );
    }
    if (rightTab === "brands" && selectedBrand) {
      list = list.filter((p) => p.brandId === selectedBrand);
    }
    return list;
  }, [productList, productSearch, rightTab, selectedBrand]);

  // group by brand for brand tab
  const productsByBrand = useMemo(() => {
    if (rightTab !== "brands") return {};
    const map = {};
    filteredProducts.forEach((p) => {
      const bName = p.brandName || "Other";
      if (!map[bName]) map[bName] = [];
      map[bName].push(p);
    });
    return map;
  }, [filteredProducts, rightTab]);

  const posOldSearchColumns = useMemo(
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
        valueGetter: (row) => toNum(row.total_qty || row.totalQty || 0),
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

  const resolvePosOldSearchFilters = useCallback((overrideFilters = null) => {
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

  const runPosOldSearch = useCallback(async (overrideFilters = null, pageOverride = 1, limitOverride = searchLimit) => {
    const filters = resolvePosOldSearchFilters(overrideFilters);
    setSearching(true);
    try {
      const params = { page: pageOverride, limit: limitOverride };
      if (String(filters.search || "").trim()) params.search = filters.search;
      if (String(filters.billNo || "").trim()) params.billNo = filters.billNo;
      if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
      if (String(filters.product || "").trim()) params.product = filters.product;
      if (String(filters.barcode || "").trim()) params.barcode = filters.barcode;

      const res = await api.get("/pos-old-sales", { params });
      setSearchResults(res.data?.data || []);
      const p = res.data?.pagination || {};
      const total = Number(p.total ?? res.data?.total ?? 0) || 0;
      const totalPages = Math.max(Number(p.totalPages ?? Math.ceil(total / Math.max(limitOverride, 1))) || 1, 1);
      setSearchPagination({ total, totalPages });
      setSearchPage(pageOverride);
    } catch {
      toast.error("Failed to search POS old sales");
    } finally {
      setSearching(false);
    }
  }, [resolvePosOldSearchFilters, searchLimit]);

  const loadAllPosOldSearchRows = useCallback(async (overrideFilters = null) => {
    const filters = resolvePosOldSearchFilters(overrideFilters);
    const params = { all: "true" };
    if (String(filters.search || "").trim()) params.search = filters.search;
    if (String(filters.billNo || "").trim()) params.billNo = filters.billNo;
    if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
    if (String(filters.product || "").trim()) params.product = filters.product;
    if (String(filters.barcode || "").trim()) params.barcode = filters.barcode;

    const res = await api.get("/pos-old-sales", { params });
    return res.data?.data || [];
  }, [resolvePosOldSearchFilters]);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = { search: "", billNo: "", customerName: "", product: "", barcode: "" };
    setSearchFilters(empty);
    await runPosOldSearch(empty, 1, searchLimit);
  };

  const handlePosOldServerSearch = useCallback(({ query, field }) => {
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

      runPosOldSearch(nextFilters, 1, searchLimit);
      return nextFilters;
    });
    setSearchPage(1);
  }, [runPosOldSearch, searchLimit]);

  const renderSearchPage = () => (
    <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, flexDirection: "column", borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2, boxShadow: 1 }}>
      <FilterableDataTable
        rows={searchResults}
        columns={posOldSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No POS old sales found"
        searchPlaceholder="Search in POS old sale fields..."
        exportFileName="pos_old_sale_report"
        exportSheetName="POS Old Sale"
        exportTitle={String(authUser?.company_name || "").trim()}
        exportSubtitle="POS OLD SALE Report"
        enableColumnResize
        tablePreferenceKey="sales.pos_old.search"
        onExportRows={loadAllPosOldSearchRows}
        enableServerSearch
        onServerSearch={handlePosOldServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={(p) => {
          setSearchPage(p);
          runPosOldSearch(null, p, searchLimit);
        }}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
          runPosOldSearch(null, 1, value);
        }}
        onFetchGroupSummaries={fetchPosOldSaleGroupSummaries}
        onFetchGroupRows={fetchPosOldSaleGroupRows}
        paginationMode="server"
        enableVirtualization
        fillHeight
      />
    </Box>
  );

  /* ───────────────── RENDER ───────────────── */
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "hidden" }}>
      {/* ─── TOP BAR ─── */}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, py: 0.75, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1, flexShrink: 0 }}>
        {/* Tabs */}
        <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, overflowX: "auto" }}>
          {tabs.map((tab, idx) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              variant={tab.id === activeTabId ? "contained" : "outlined"}
              size="small"
              sx={{ fontSize: 12.25, fontWeight: 500 }}
            >
              {`Bill ${idx + 1}`}
            </Button>
          ))}
          <Button onClick={handleAddTab} className="glass-btn glass-btn-success" sx={{ px: 1, py: 0.5, minWidth: 0 }} title="Hold & New">
            <Plus size={16} />
          </Button>
          {tabs.length > 1 && (
            <Button onClick={() => handleDeleteTab(activeTabId)} className="glass-btn glass-btn-danger" sx={{ px: 1, py: 0.5, minWidth: 0 }} title="Delete Tab">
              <Minus size={16} />
            </Button>
          )}
        </Stack>

        {/* Top right buttons */}
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          {!showSearchPage && (
            <>
              <Button
                onClick={async () => {
                  try {
                    const res = await api.get("/pos-old-sales/last-receipt");
                    const sale = res.data?.data;
                    if (!sale) {
                      toast.error("No previous sale found");
                      return;
                    }
                    const receiptCompanyId = sale?.company_id || authUser?.company_id || null;
                    const receiptCustomization = loadSalesReceiptCustomization(receiptCompanyId || "default");
                    const companyInfo = await fetchReceiptCompanyInfo(receiptCompanyId);
                    await handlePrintReceipt(buildPosOldSaleReceiptPayload({
                      sale,
                      authUser,
                      receiptCustomization,
                      companyInfo,
                      stockRows,
                      paymentMethod: sale?.is_exchange ? "Exchange" : "Cash",
                    }));
                  } catch (err) {
                    toast.error(err?.response?.data?.message || "No previous sale found");
                  }
                }}
                className="glass-btn glass-btn-primary"
                startIcon={<Printer size={16} />}
                sx={{ fontSize: 12.25 }}
              >
                Receipt
              </Button>
              <Button onClick={handleOpenCloseRegister} className="glass-btn glass-btn-primary" startIcon={<CreditCard size={16} />} sx={{ fontSize: 12.25 }}>
                Close
              </Button>
            </>
          )}
          {showSearchPage && (
            <UploadImportButton
              endpoint="/pos-old-sales/bulk"
              fieldConfig={POS_OLD_SALE_IMPORT_CONFIG}
            />
          )}
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary"
            startIcon={<Search size={16} />}
            sx={{ fontSize: 12.25 }}
          >
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      {/* ─── MAIN AREA ─── */}
      {showSearchPage ? <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", p: 2 }}>{renderSearchPage()}</Box> : <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ─── LEFT PANEL ─── */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: 1, borderColor: "divider" }}>
          {/* Customer + Barcode row */}
          <Stack direction="row" sx={{ alignItems: "center", gap: 1, px: 1.5, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
            <TextField
              select
              value={activeTab.customerMode}
              onChange={(e) => updateActiveTab({
                customerMode: e.target.value,
                existingCustomerId: "",
                customerMobile: "",
                customerName: "",
              })}
              size="small"
              sx={{ width: 176, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            >
              <MenuItem value="walking">WalkinCustomer</MenuItem>
              <MenuItem value="existing">Existing Customer</MenuItem>
              <MenuItem value="new">New Customer</MenuItem>
            </TextField>
            {activeTab.customerMode === "existing" ? (
              <input
                type="text"
                value={activeTab.customerMobile}
                onChange={(e) => {
                  const value = e.target.value;
                  const currentMatchedDigits = String(
                    customers.find((row) => String(row.value) === String(activeTab.existingCustomerId || ""))?.mobileNo || ""
                  ).replace(/\D/g, "");
                  const nextDigits = String(value || "").replace(/\D/g, "");
                  updateActiveTab({
                    customerMobile: value,
                    ...(activeTab.existingCustomerId && nextDigits !== currentMatchedDigits
                      ? { existingCustomerId: "", customerName: "" }
                      : {}),
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  handleCustomerNumberLookup(e.currentTarget.value, "existing");
                }}
                placeholder="Customer number, press Enter"
                size="small"
                sx={{ width: 192, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              />
            ) : null}
            {activeTab.customerMode === "new" ? (
              <>
                <TextField
                  type="text"
                  value={activeTab.customerMobile}
                  onChange={(e) => updateActiveTab({ customerMobile: e.target.value, existingCustomerId: "" })}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    handleCustomerNumberLookup(e.currentTarget.value, "new");
                  }}
                  placeholder="Customer number"
                  size="small"
                  sx={{ width: 144, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                />
                <TextField
                  type="text"
                  value={activeTab.customerName}
                  onChange={(e) => updateActiveTab({ customerName: e.target.value, existingCustomerId: "" })}
                  placeholder="Customer name"
                  size="small"
                  sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                />
              </>
            ) : null}
            <Box sx={{ display: { xs: "none", lg: "block" }, flex: 1, position: "relative" }}>
              <TextField
                inputRef={barcodeRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeSubmit}
                placeholder="Barcode_Product_Name"
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              />
            </Box>
            <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, fontSize: 17.5, fontWeight: 600, color: "text.secondary" }}>
              <Box component="span">🛒</Box>
              <Box component="span">{totalItems} item{totalItems !== 1 ? "s" : ""}</Box>
            </Stack>
          </Stack>

          {/* Cart Table */}
          <Box sx={{ flex: 1, overflow: "auto", bgcolor: "background.paper" }}>
            <Table sx={{ width: "100%", fontSize: 12.25, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 60 }} />
                <col />
                <col style={{ width: 80 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 36 }} />
              </colgroup>
              <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                <TableRow sx={{ color: "text.secondary", fontWeight: 600 }}>
                  <TableCell sx={{ textAlign: "left" }}>S.No</TableCell>
                  <TableCell sx={{ textAlign: "left" }}>Product</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>MRP</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>Price</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>Quantity</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>Dis %</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>Dis AMT</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>Total</TableCell>
                  <TableCell sx={{ textAlign: "center" }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {cartWithTotals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ py: 8, textAlign: "center", color: "text.disabled" }}>
                      Scan barcode or select products from right panel
                    </TableCell>
                  </TableRow>
                ) : (
                  cartWithTotals.map((line, idx) => (
                    <TableRow
                      key={line.lineId}
                      hover
                      sx={isExchangeReturnLine(line) ? { bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.12 : 0.06) } : undefined}
                    >
                      <TableCell sx={{ fontSize: 10.5, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idx + 1}</TableCell>
                      <TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isExchangeReturnLine(line) ? "error.main" : undefined }} title={line.productName}>{line.productName}</TableCell>
                      <TableCell sx={{ textAlign: "right", color: isExchangeReturnLine(line) ? "error.main" : undefined }}>{formatMoney(line.mrp)}</TableCell>
                      <TableCell>
                        <Box
                          component="input"
                          type="number" min="0" step="0.1"
                          value={isExchangeReturnLine(line) ? line.signedPrice : line.price}
                          onChange={(e) => handleLineChange(line.lineId, "price", e.target.value)}
                          readOnly={isExchangeReturnLine(line)}
                          sx={{
                            width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", px: 0.5, py: 0.25, textAlign: "right", fontSize: 12.25, bgcolor: "background.paper", color: "text.primary",
                            ...(isExchangeReturnLine(line) ? { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08), color: "error.main" } : {}),
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <Box
                          component="input"
                          type="number" min="0"
                          value={line.qty}
                          onChange={(e) => handleLineChange(line.lineId, "qty", e.target.value)}
                          sx={{
                            width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", px: 0.5, py: 0.25, textAlign: "center", fontSize: 12.25, bgcolor: "background.paper", color: "text.primary",
                            ...(isExchangeReturnLine(line) ? { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08), color: "error.main" } : {}),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          component="input"
                          type="number" min="0" step="0.1"
                          value={line.discPerc}
                          onChange={(e) => handleLineChange(line.lineId, "discPerc", e.target.value)}
                          readOnly={isExchangeReturnLine(line)}
                          sx={{
                            width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", px: 0.5, py: 0.25, textAlign: "right", fontSize: 12.25, bgcolor: "background.paper", color: "text.primary",
                            ...(isExchangeReturnLine(line) ? { bgcolor: "action.hover", color: "text.disabled" } : {}),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          component="input"
                          type="number" min="0" step="0.1"
                          value={line.discAmt}
                          onChange={(e) => handleLineChange(line.lineId, "discAmt", e.target.value)}
                          readOnly={isExchangeReturnLine(line)}
                          sx={{
                            width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", px: 0.5, py: 0.25, textAlign: "right", fontSize: 12.25, bgcolor: "background.paper", color: "text.primary",
                            ...(isExchangeReturnLine(line) ? { bgcolor: "action.hover", color: "text.disabled" } : {}),
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: "right", fontWeight: 600, color: line.total < 0 ? "error.main" : undefined }}>{formatMoney(line.total)}</TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <IconButton
                          type="button"
                          onClick={() => removeLine(line.lineId)}
                          size="small"
                          aria-label="Remove line"
                          sx={{ color: "error.main", "&:hover": { color: "error.dark" }, fontWeight: 700, fontSize: 17.5 }}
                        >
                          &times;
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          {/* Bottom summary */}
          <Stack sx={{ display: { xs: "none", lg: "block" }, bgcolor: "background.paper", borderTop: 1, borderColor: "divider", px: 1.5, py: 1, flexShrink: 0, gap: 1 }}>
            {/* Row 1: Discount, SubTotal, Total, Balance */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5, alignItems: "flex-end" }}>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Discount_amt</Typography>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>{formatMoney(cartWithTotals.reduce((s, l) => s + l.discAmt, 0))}</Typography>
              </Box>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>SubTotal</Typography>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>{formatMoney(subtotal)}</Typography>
              </Box>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "error.main" }}>Total</Typography>
                <Typography sx={{ fontSize: 21, fontWeight: 700, color: "error.main" }}>₹ {formatMoney(totalAmount)}</Typography>
              </Box>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Balanceamt</Typography>
                <Typography sx={{ fontSize: 15.75, fontWeight: 700, color: balanceAmount < 0 ? "error.main" : "success.main" }}>
                  ₹ {formatMoney(balanceAmount)}
                </Typography>
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
              <Button onClick={handleCancel} className="glass-btn glass-btn-danger" startIcon={<RotateCcw size={16} />} sx={{ py: 1.25, fontSize: 12.25, fontWeight: 700 }}>
                CANCEL (F4)
              </Button>
              <Button
                onClick={() => {
                  setShowExchangeDialog(false);
                  setShowReturnDialog(true);
                  resetReturnExchangeDialogState();
                  setTimeout(() => returnBillInputRef.current?.focus(), 0);
                }}
                className="glass-btn glass-btn-warning"
                startIcon={<Repeat size={16} />}
                sx={{ py: 1.25, fontSize: 12.25, fontWeight: 700 }}
              >
                Return
              </Button>
              <Button
                onClick={() => {
                  setShowReturnDialog(false);
                  setShowExchangeDialog(true);
                  resetReturnExchangeDialogState();
                  setTimeout(() => returnBillInputRef.current?.focus(), 0);
                }}
                className="glass-btn glass-btn-warning"
                startIcon={<Repeat size={16} />}
                sx={{ py: 1.25, fontSize: 12.25, fontWeight: 700 }}
              >
                Exchange
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="glass-btn glass-btn-primary"
                startIcon={<Printer size={16} />}
                sx={{ py: 1.25, fontSize: 12.25, fontWeight: 700 }}
              >
                {saving ? "Saving..." : "Quick Pay & Print (F8)"}
              </Button>
            </Box>
          </Stack>

          <Stack sx={{ display: { lg: "none" }, bgcolor: "background.paper", borderTop: 1, borderColor: "divider", px: 1.5, py: 1, gap: 1, flexShrink: 0 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "text.secondary" }}>
              <Box component="span">{totalItems} item{totalItems !== 1 ? "s" : ""} · SubTotal</Box>
              <Box component="span" sx={{ fontSize: 15.75, fontWeight: 700, color: "text.primary" }}>₹{formatMoney(totalAmount)}</Box>
            </Stack>
            <Stack direction="row" sx={{ flexWrap: "nowrap", alignItems: "center", gap: 1 }}>
              <Button
                type="button"
                onClick={handleOpenScanner}
                className="glass-btn glass-btn-secondary"
                startIcon={<ScanLine size={16} />}
                sx={{ flex: 1, minWidth: 0, height: 44, fontSize: 12.25, fontWeight: 700, whiteSpace: "nowrap" }}
              >
                Scan
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="glass-btn glass-btn-primary"
                sx={{ flex: 1, minWidth: 0, height: 44, fontSize: 12.25, fontWeight: 700, whiteSpace: "nowrap" }}
              >
                <Printer size={16} />
                {saving ? "Saving..." : "Quick Pay & Print"}
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            position: "relative",
            borderLeft: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
            transition: "width 0.2s ease-out",
            width: isRightPanelOpen ? "332px" : "12px",
          }}
          onMouseEnter={() => setIsRightPanelOpen(true)}
          onMouseLeave={() => {
            setIsRightPanelOpen(false);
            setBrandDropdownOpen(false);
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: 1,
              borderColor: "grey.300",
              transition: "background-color 0.15s",
              bgcolor: "background.paper",
              "&:hover": !isRightPanelOpen ? { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08) } : undefined,
            }}
            title="Hover to open Products / Brands"
          >
            <Box component="span" sx={{ display: "inline-flex", color: "text.disabled" }}>
              <ChevronsLeft size={12} />
            </Box>
          </Box>

        {/* ─── RIGHT PANEL ─── */}
        {isRightPanelOpen && (
        <Box sx={{ position: "absolute", inset: "0 auto 0 12px", width: 320, display: "flex", flexDirection: "column", bgcolor: "background.paper", overflow: "hidden", flexShrink: 0, boxShadow: 1 }}>
          {/* Tabs: Products | Brands */}
          <Stack direction="row" sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
            <Box
              component="button"
              onClick={() => { setRightTab("products"); setSelectedBrand(null); }}
              sx={{
                flex: 1, px: 1.5, py: 1, fontSize: 12.25, fontWeight: 500, textAlign: "center", transition: "background-color 0.15s",
                bgcolor: rightTab === "products" ? "primary.main" : "action.hover",
                color: rightTab === "products" ? "primary.contrastText" : "text.secondary",
                "&:hover": rightTab !== "products" ? { bgcolor: "action.selected" } : undefined,
              }}
            >
              Products
            </Box>
            <Box
              component="button"
              onClick={() => setRightTab("brands")}
              sx={{
                flex: 1, px: 1.5, py: 1, fontSize: 12.25, fontWeight: 500, textAlign: "center", transition: "background-color 0.15s",
                bgcolor: rightTab === "brands" ? "primary.main" : "action.hover",
                color: rightTab === "brands" ? "primary.contrastText" : "text.secondary",
                "&:hover": rightTab !== "brands" ? { bgcolor: "action.selected" } : undefined,
              }}
            >
              Brands
            </Box>
          </Stack>

          {/* Search */}
          <Box sx={{ px: 1, py: 1, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
            <Box sx={{ position: "relative" }}>
              <Box component="span" sx={{ display: "inline-flex", position: "absolute", left: 8, top: 10, color: "text.disabled" }}>
                <Search size={16} />
              </Box>
              <TextField
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search"
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, pl: 4, pr: 1 } }}
              />
            </Box>
          </Box>

          {/* Brand selector dropdown (only in brands tab) */}
          {rightTab === "brands" && (
            <Box ref={brandDropdownRef} sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: "divider", flexShrink: 0, position: "relative" }}>
              <Box
                sx={{ width: "100%", border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.75, fontSize: 12.25, bgcolor: "background.paper", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                onClick={() => setBrandDropdownOpen((v) => !v)}
              >
                <Box component="span" sx={{ color: selectedBrand ? "text.primary" : "text.disabled" }}>
                  {selectedBrand ? brands.find((b) => b.id === selectedBrand)?.name || "All Brands" : "All Brands"}
                </Box>
                {selectedBrand && (
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setSelectedBrand(null); setBrandSearch(""); }}
                    sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" }, ml: 0.5, p: 0.25 }}
                  >
                    <X size={14} />
                  </IconButton>
                )}
              </Box>
              {brandDropdownOpen && (
                <Box sx={{ position: "absolute", left: 8, right: 8, top: "100%", mt: 0.25, bgcolor: "background.paper", border: 1, borderColor: "grey.300", borderRadius: "3.5px", boxShadow: 8, zIndex: 30, maxHeight: 240, display: "flex", flexDirection: "column" }}>
                  <Box sx={{ p: 0.75, borderBottom: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      autoFocus
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Search brand..."
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.5 } }}
                    />
                  </Box>
                  <Box sx={{ overflowY: "auto", flex: 1 }}>
                    <Box
                      onClick={() => { setSelectedBrand(null); setBrandDropdownOpen(false); setBrandSearch(""); }}
                      sx={{
                        px: 1.5, py: 0.75, fontSize: 12.25, cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
                        ...(!selectedBrand ? { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12), fontWeight: 500 } : { color: "text.secondary" }),
                      }}
                    >
                      All Brands
                    </Box>
                    {brands
                      .filter((b) => !brandSearch || normalize(b.name).includes(normalize(brandSearch)))
                      .map((b) => (
                        <Box
                          key={b.id}
                          onClick={() => { setSelectedBrand(b.id); setBrandDropdownOpen(false); setBrandSearch(""); }}
                          sx={{
                            px: 1.5, py: 0.75, fontSize: 12.25, cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
                            ...(selectedBrand === b.id ? { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12), fontWeight: 500 } : { color: "text.secondary" }),
                          }}
                        >
                          {b.name}
                        </Box>
                      ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Product list */}
          <Box sx={{ flex: 1, overflowY: "auto", borderTop: 1, borderColor: "divider" }}>
            {rightTab === "products" ? (
              filteredProducts.map((p) => (
                <Box key={p.id} sx={{ width: "100%", borderBottom: 1, borderColor: "divider" }}>
                  <Box
                    component="button"
                    onClick={() => addToCart(stockRows.find((s) => s.id === p.id))}
                    sx={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 1.5, px: 1.5, py: 1, textAlign: "left", fontSize: 12.25, transition: "background-color 0.15s", "&:hover": { bgcolor: "action.hover" } }}
                  >
                    <Box component="span" sx={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.primary" }} title={p.productName}>{p.productName}</Box>
                    <Box component="span" sx={{ flexShrink: 0, fontWeight: 600, whiteSpace: "nowrap", color: "error.main" }}>-Rs.{formatMoney(p.price)}</Box>
                  </Box>
                </Box>
              ))
            ) : (
              Object.entries(productsByBrand).map(([brandName, prods]) => (
                <Box key={brandName}>
                  <Box sx={{ px: 1.5, py: 0.75, bgcolor: "action.hover", fontSize: 10.5, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", position: "sticky", top: 0 }}>
                    {brandName}
                  </Box>
                  {prods.map((p) => (
                    <Box key={p.id} sx={{ width: "100%", borderBottom: 1, borderColor: "divider" }}>
                      <Box
                        component="button"
                        onClick={() => addToCart(stockRows.find((s) => s.id === p.id))}
                        sx={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 1.5, px: 1.5, py: 1, textAlign: "left", fontSize: 12.25, transition: "background-color 0.15s", "&:hover": { bgcolor: "action.hover" } }}
                      >
                        <Box component="span" sx={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.primary" }} title={p.productName}>{p.productName}</Box>
                        <Box component="span" sx={{ flexShrink: 0, fontWeight: 600, whiteSpace: "nowrap", color: "error.main" }}>-Rs.{formatMoney(p.price)}</Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ))
            )}
            {filteredProducts.length === 0 && (
              <Box sx={{ px: 1.5, py: 4, textAlign: "center", color: "text.disabled", fontSize: 12.25 }}>No products found</Box>
            )}
          </Box>
        </Box>
        )}
        </Box>
      </Box>}

      {/* ═══════════ DIALOGS ═══════════ */}

      {showScanner && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, p: 1.5 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", boxShadow: 12, width: "100%", maxWidth: 448, overflow: "hidden" }}>
            <Stack direction="row" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", alignItems: "center", justifyContent: "space-between" }}>
              <Typography component="h3" sx={{ fontWeight: 600, fontSize: 14, color: "text.primary" }}>Scan Barcode</Typography>
              <IconButton onClick={handleCloseScanner} size="small" sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                <X size={20} />
              </IconButton>
            </Stack>
            <Stack sx={{ p: 1.5, gap: 1.5 }}>
              <Box sx={{ position: "relative", aspectRatio: "16 / 9", width: "100%", bgcolor: "common.black", borderRadius: "5.25px", overflow: "hidden" }}>
                <Box
                  component="video"
                  ref={scannerVideoRef}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  autoPlay
                  muted
                  playsInline
                />
                {scannerLoading && (
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "common.white", fontSize: 12.25, bgcolor: "rgba(0,0,0,0.7)" }}>
                    Starting camera...
                  </Box>
                )}
                {!scannerLoading && scannerError && (
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "common.white", textAlign: "center", fontSize: 10.5, px: 2, bgcolor: "rgba(0,0,0,0.8)" }}>
                    {scannerError}
                  </Box>
                )}
                {!scannerLoading && !scannerError && (
                  <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center", color: "common.white", fontSize: 10.5, py: 0.5, bgcolor: "rgba(0,0,0,0.4)" }}>
                    Place barcode inside frame
                  </Box>
                )}
              </Box>

              {scannerError && (
                <TextField
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeSubmit}
                  placeholder="Enter barcode manually"
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                />
              )}

              <Button
                type="button"
                onClick={handleCloseScanner}
                className="glass-btn glass-btn-danger"
                fullWidth
                sx={{ py: 1, fontSize: 12.25, fontWeight: 500 }}
              >
                Close
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Hold Confirm */}
      {holdConfirm && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", boxShadow: 12, p: 3, width: 320 }}>
            <Typography component="h3" sx={{ fontSize: 15.75, fontWeight: 600, mb: 1, color: "text.primary" }}>Are you sure</Typography>
            <Typography sx={{ color: "text.secondary", mb: 2 }}>Do you want to hold the customer?</Typography>
            <Stack direction="row" sx={{ gap: 1, justifyContent: "flex-end" }}>
              <Button onClick={() => setHoldConfirm(false)} className="glass-btn glass-btn-danger" sx={{ px: 2, py: 0.75 }}>No</Button>
              <Button onClick={confirmAddTab} className="glass-btn glass-btn-success" sx={{ px: 2, py: 0.75 }}>Yes</Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Delete Tab Confirm */}
      {deleteConfirm && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", boxShadow: 12, p: 3, width: 320 }}>
            <Typography component="h3" sx={{ fontSize: 15.75, fontWeight: 600, mb: 1, color: "text.primary" }}>Delete Tab</Typography>
            <Typography sx={{ color: "text.secondary", mb: 2 }}>Are you sure you want to delete this tab?</Typography>
            <Stack direction="row" sx={{ gap: 1, justifyContent: "flex-end" }}>
              <Button onClick={() => setDeleteConfirm(null)} className="glass-btn glass-btn-danger" sx={{ px: 2, py: 0.75 }}>No</Button>
              <Button onClick={confirmDeleteTab} className="glass-btn glass-btn-success" sx={{ px: 2, py: 0.75 }}>Yes</Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Close Register Dialog */}
      {showCloseRegister && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", boxShadow: 12, width: 700, maxHeight: "90vh", overflow: "auto" }}>
            <Stack direction="row" sx={{ bgcolor: "#6B8E23", color: "common.white", px: 2, py: 1.5, alignItems: "center", justifyContent: "space-between", borderTopLeftRadius: "7px", borderTopRightRadius: "7px" }}>
              <Typography component="h3" sx={{ fontWeight: 600 }}>CloseRegister</Typography>
              <IconButton onClick={() => setShowCloseRegister(false)} size="small" sx={{ color: "common.white", "&:hover": { opacity: 0.8 } }}>
                <X size={20} />
              </IconButton>
            </Stack>
            <Stack sx={{ p: 2, gap: 2 }}>
              {/* Info row */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, fontSize: 12.25 }}>
                <Box>
                  <Box sx={{ color: "text.secondary", fontWeight: 600 }}>Opened by</Box>
                  <Box sx={{ color: "text.primary" }}>POS User</Box>
                </Box>
                <Box>
                  <Box sx={{ color: "text.secondary", fontWeight: 600 }}>Cash in Hand</Box>
                  <Box sx={{ color: "text.primary" }}>0.00 INR</Box>
                </Box>
                <Box>
                  <Box sx={{ color: "text.secondary", fontWeight: 600 }}>Opening Time</Box>
                  <Box sx={{ color: "text.primary" }}>{now.toLocaleDateString("en-IN")} {now.toLocaleTimeString("en-IN")}</Box>
                </Box>
              </Box>

              {/* Payments Summary */}
              <Box>
                <Typography sx={{ fontSize: 15.75, fontWeight: 600, color: "text.secondary", mb: 1 }}>Payments Summary</Typography>
                <Table sx={{ width: "100%", fontSize: 12.25 }}>
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ textAlign: "left" }}>Payment Type</TableCell>
                      <TableCell sx={{ textAlign: "left" }}>Expected (INR)</TableCell>
                      <TableCell sx={{ textAlign: "left" }}>Counted</TableCell>
                      <TableCell sx={{ textAlign: "left" }}>Difference</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { label: "Cash", key: "cash" },
                      { label: "Credit Card", key: "credit_card" },
                      { label: "Point", key: "point" },
                      { label: "Online Pay", key: "online_pay" },
                      { label: "Returns", key: "returns" },
                    ].map((row) => (
                      <TableRow key={row.key}>
                        <TableCell sx={{ fontWeight: 500, color: "text.primary" }}>{row.label}</TableCell>
                        <TableCell>
                          <Box component="input" type="text" readOnly value={toNum(sessionSummary[row.key], 0).toFixed(2)} sx={{ width: "100%", bgcolor: "action.hover", border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.5, fontSize: 12.25, color: "text.primary" }} />
                        </TableCell>
                        <TableCell>
                          <Box component="input" type="text" defaultValue="0.00" sx={{ width: "100%", border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.5, fontSize: 12.25, bgcolor: "background.paper", color: "text.primary" }} />
                        </TableCell>
                        <TableCell>
                          <Box component="input" type="text" readOnly defaultValue={(-toNum(sessionSummary[row.key], 0)).toFixed(2)} sx={{ width: "100%", bgcolor: "action.hover", border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.5, fontSize: 12.25, color: "text.primary" }} />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>Total</TableCell>
                      <TableCell>
                        <Box component="input" type="text" readOnly value={toNum(sessionSummary.total, 0).toFixed(2)} sx={{ width: "100%", bgcolor: "action.hover", border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.5, fontSize: 12.25, fontWeight: 700, color: "text.primary" }} />
                      </TableCell>
                      <TableCell>
                        <Box component="input" type="text" readOnly defaultValue="0.00" sx={{ width: "100%", bgcolor: "action.hover", border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.5, fontSize: 12.25, fontWeight: 700, color: "text.primary" }} />
                      </TableCell>
                      <TableCell>
                        <Box component="input" type="text" readOnly defaultValue="0.00" sx={{ width: "100%", bgcolor: "action.hover", border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.5, fontSize: 12.25, fontWeight: 700, color: "text.primary" }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              {/* Cash Denominations + Note */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 15.75, fontWeight: 600, color: "text.secondary", mb: 1 }}>Cash Denominations</Typography>
                  <Stack sx={{ gap: 0.5 }}>
                    {DENOMINATIONS.map((d) => (
                      <Stack direction="row" key={d} sx={{ alignItems: "center", gap: 1, fontSize: 12.25 }}>
                        <Box component="span" sx={{ width: 48, fontWeight: 500, color: "text.primary" }}>{d}</Box>
                        <Box component="span" sx={{ color: "text.disabled" }}>X</Box>
                        <Box
                          component="input"
                          type="number" min="0"
                          value={denomCounts[`c_${d}`]}
                          onChange={(e) => setDenomCounts((p) => ({ ...p, [`c_${d}`]: toInt(e.target.value, 0) }))}
                          sx={{ width: 64, border: 1, borderColor: "grey.300", borderRadius: "3.5px", px: 1, py: 0.25, fontSize: 12.25, textAlign: "right", bgcolor: "background.paper", color: "text.primary" }}
                        />
                        <Box component="span" sx={{ fontSize: 12.25, color: "text.secondary" }}>{(toInt(denomCounts[`c_${d}`], 0) * d).toFixed(2)}</Box>
                      </Stack>
                    ))}
                    <Stack direction="row" sx={{ alignItems: "center", gap: 1, fontSize: 12.25, fontWeight: 700, borderTop: 1, borderColor: "divider", pt: 0.5, color: "text.primary" }}>
                      <Box component="span">Total:</Box>
                      <Box component="span">{denomTotal.toFixed(2)}</Box>
                    </Stack>
                  </Stack>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 15.75, fontWeight: 600, color: "text.secondary", mb: 1 }}>Note</Typography>
                  <TextField
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    multiline
                    rows={6}
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                  />
                </Box>
              </Box>

              <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1 }}>
                <Button onClick={() => setShowCloseRegister(false)} className="glass-btn glass-btn-danger" sx={{ px: 2, py: 1 }}>Close</Button>
                <Button className="glass-btn glass-btn-primary" sx={{ px: 2, py: 1 }}>save&print</Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Return / Exchange dialog — bill → reason → lines */}
      {(showReturnDialog || showExchangeDialog) && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, p: 2 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", border: 1, borderColor: "divider", boxShadow: 12, width: "100%", maxWidth: 512, maxHeight: "80vh", overflow: "auto" }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5, borderTopLeftRadius: "7px", borderTopRightRadius: "7px" }}>
              <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 0.5, fontSize: 12.25 }}>
                <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{showExchangeDialog ? "Exchange" : "Return"}</Box>
                {returnSourceSale ? (
                  <>
                    <Box component="span" sx={{ color: "text.secondary" }}>{formatMoney(Math.abs(returnDraftSummary.amount))}</Box>
                    <Box component="span" sx={{ color: "text.secondary" }}>Qty: {returnDraftSummary.totalQty}</Box>
                  </>
                ) : null}
              </Stack>
              <Box component="span" sx={{ fontSize: 10, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.5 }}>Esc close</Box>
            </Stack>
            <Stack sx={{ p: 2, gap: 1.5 }}>
              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "text.secondary" }}>Bill no. or barcode</Typography>
                <TextField
                  inputRef={returnBillInputRef}
                  type="text"
                  value={returnBillLookup}
                  onChange={(e) => setReturnBillLookup(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!loadingReturnBill) {
                        if (showExchangeDialog) {
                          loadExchangeEntryFromInput(e.currentTarget.value);
                        } else {
                          loadReturnEntryFromInput(e.currentTarget.value);
                        }
                      }
                    }
                  }}
                  placeholder={
                    showExchangeDialog
                      ? "RR/12, SB/12, 12, or product barcode"
                      : "SB/12, 12, or product barcode (same as POS Return)"
                  }
                  disabled={loadingReturnBill}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                />
              </Box>
              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "text.secondary" }}>Selected bill</Typography>
                <TextField
                  type="text"
                  slotProps={{ input: { readOnly: true } }}
                  value={
                    returnSourceSale
                      ? returnSourceSale.standalone
                        ? "— (barcode / catalogue)"
                        : showExchangeDialog && returnSourceSale.exchangeDisplayBillNo
                          ? returnSourceSale.exchangeDisplayBillNo
                          : formatPosSaleBillNo(returnSourceSale.billNo)
                      : ""
                  }
                  placeholder="Load a bill or scan a product first"
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25 }, "& .MuiInputBase-root": { bgcolor: "action.hover" } }}
                />
              </Box>
              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "text.secondary" }}>Reason</Typography>
                <Box
                  ref={returnReasonSelectWrapRef}
                  sx={!returnSourceSale ? { pointerEvents: "none", opacity: 0.55 } : undefined}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || !selectedReturnReasonId) return;
                    e.preventDefault();
                    openReturnProductsStep();
                  }}
                >
                  <SearchableSelect
                    name="posOldReturnReason"
                    placeholder={showExchangeDialog ? "Select exchange reason" : "Select return reason"}
                    options={returnReasons}
                    value={selectedReturnReasonId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedReturnReasonId(v);
                      if (v) openReturnProductsStep(v);
                    }}
                    showEmptyOption
                    portalDropdown
                    openOnFocus
                    triggerSx={{ px: 1.5, py: 1, fontSize: 12.25, borderRadius: "5px", minHeight: "38px" }}
                    searchInputSx={{ fontSize: 12.25 }}
                  />
                </Box>
              </Box>
              {returnSourceSale && posOldReturnPendingDocNo ? (
                <Typography sx={{ fontSize: 15.75, fontWeight: 700, color: "text.primary", fontFamily: "monospace", pt: 0.5 }}>{posOldReturnPendingDocNo}</Typography>
              ) : null}
            </Stack>
          </Box>

          {showReturnLinesDialog && (
            <Box sx={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.5)", p: 1.5 }}>
              <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", border: 1, borderColor: "divider", boxShadow: 12, width: "100%", maxWidth: 896, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5, borderTopLeftRadius: "7px", borderTopRightRadius: "7px", flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>{showExchangeDialog ? "Exchange lines" : "Return lines"}</Typography>
                  <Box component="span" sx={{ fontSize: 10, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.5 }}>Esc back</Box>
                </Stack>
                <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 1.5 }}>
                  <Table sx={{ width: "100%", fontSize: 12.25, borderCollapse: "collapse" }}>
                    <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                      <TableRow sx={{ color: "text.secondary" }}>
                        <TableCell sx={{ border: 1, borderColor: "divider", width: 40, textAlign: "left" }}>#</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "left" }}>Barcode</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "left" }}>Product</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", width: 96, textAlign: "left" }}>Qty</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", width: 96, textAlign: "right" }}>Price</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", width: 80, textAlign: "right" }}>Tax%</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", width: 96, textAlign: "right" }}>Disc.</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", width: 112, textAlign: "right" }}>Total</TableCell>
                        <TableCell sx={{ border: 1, borderColor: "divider", width: 48 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returnCartDraft.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} sx={{ border: 1, borderColor: "divider", py: 4, textAlign: "center", color: "text.disabled" }}>
                            No lines
                          </TableCell>
                        </TableRow>
                      ) : (
                        returnCartDraft.map((line, idx) => {
                          const qty = Math.max(0, toInt(line.qty, 0));
                          const price = Math.max(0, toNum(line.price, 0));
                          const tax = Math.max(0, toNum(line.tax, 0));
                          const discount = Math.max(0, toNum(line.discount, 0));
                          const subtotal = qty * price;
                          const taxAmount = (subtotal * tax) / 100;
                          const lineTotal = round2(-Math.max(subtotal + taxAmount - discount, 0));
                          return (
                            <TableRow key={line.lineId} hover>
                              <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "center", color: "text.primary" }}>{idx + 1}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", fontFamily: "monospace", fontSize: 10.5, color: "text.secondary" }}>{line.barcode || "—"}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.primary" }} title={line.productName}>
                                {line.productName || "—"}
                                {!line.productName ? null : (
                                  <Box sx={{ fontSize: 10, color: "text.disabled", whiteSpace: "normal" }}>
                                    {line.standaloneLine
                                      ? "Barcode return (catalogue pricing)"
                                      : `Original ${line.originalQty} · Returned ${line.returnedQty} · Max ${line.maxQty}`}
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider" }}>
                                <Box
                                  component="input"
                                  type="number"
                                  min={0}
                                  max={line.standaloneLine ? STANDALONE_MAX_QTY : line.maxQty}
                                  value={line.qty}
                                  onChange={(e) => handleReturnDraftQtyChange(line.lineId, e.target.value)}
                                  sx={{ width: "100%", borderRadius: "3.5px", border: 1, borderColor: "grey.300", px: 0.5, py: 0.25, textAlign: "center", fontSize: 12.25, bgcolor: "background.paper", color: "text.primary" }}
                                />
                              </TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "right", color: "text.primary" }}>{formatMoney(line.price)}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "right", color: "text.primary" }}>{formatMoney(line.tax)}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "right", color: "text.primary" }}>{formatMoney(line.discount)}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "right", fontWeight: 500, color: "text.primary" }}>{formatMoney(lineTotal)}</TableCell>
                              <TableCell sx={{ border: 1, borderColor: "divider", textAlign: "center" }}>
                                <IconButton
                                  type="button"
                                  onClick={() => handleRemoveReturnDraftLine(line.lineId)}
                                  size="small"
                                  aria-label="Remove line"
                                  sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Box>
                <Stack sx={{ borderTop: 1, borderColor: "divider", px: 2, py: 1.5, gap: 1.5, flexShrink: 0 }}>
                  <Box>
                    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "text.secondary" }}>Scan / enter barcode</Typography>
                    <TextField
                      inputRef={returnLinesScanRef}
                      type="text"
                      value={returnScanInput}
                      onChange={(e) => setReturnScanInput(e.target.value)}
                      onKeyDown={handleReturnLinesScanKeyDown}
                      placeholder={
                        showExchangeDialog
                          ? "Barcode · 0 + Enter = Apply to bill"
                          : "Barcode (same as POS Return) · 0 + Enter = Save & Print"
                      }
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                    />
                  </Box>
                  {!showExchangeDialog ? (
                    <Stack direction="row" sx={{ flexWrap: "wrap", justifyContent: "flex-end", gap: 1 }}>
                      <Button
                        type="button"
                        onClick={() => submitReturnFromPosOldDialog({ shouldPrint: false })}
                        disabled={returnSaving}
                        className="glass-btn glass-btn-secondary"
                        sx={{ px: 2, py: 1 }}
                      >
                        {returnSaving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => submitReturnFromPosOldDialog({ shouldPrint: true })}
                        disabled={returnSaving}
                        className="glass-btn glass-btn-primary"
                        sx={{ px: 2, py: 1 }}
                      >
                        {returnSaving ? "Saving…" : "Save & Print"}
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </Box>
          )}
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
                  Select sale rows and apply a discount percentage to the current POS Old bill.
                </Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closeDiscountDialog}
                size="small"
                aria-label="Close discount dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X className="h-4 w-4" />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2 }}>
              <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
                <Box sx={{ maxHeight: "44vh", overflow: "auto" }}>
                  <Table sx={{ width: "100%", minWidth: 760, fontSize: 12.25 }}>
                    <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover", color: "text.secondary" }}>
                      <TableRow>
                        <TableCell sx={{ width: 48 }}>
                          <Checkbox
                            checked={positiveCartLines.length > 0 && discountSelectedLineIds.length === positiveCartLines.length}
                            onChange={handleDiscountToggleAll}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Barcode</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell>Discount</TableCell>
                        <TableCell align="right">Dis %</TableCell>
                        <TableCell align="right">Dis AMT</TableCell>
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
                          <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>{line.barcode || "-"}</TableCell>
                          <TableCell>{line.productName || "-"}</TableCell>
                          <TableCell align="right">{formatMoney(line.price)}</TableCell>
                          <TableCell align="right">{toNum(line.qty, 0)}</TableCell>
                          <TableCell sx={{ color: "text.secondary" }}>{`${formatMoney(line.discAmt)} @ ${line.appliedPercent}%`}</TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
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

      {loading && (
        <Box sx={{ position: "fixed", bottom: 16, left: 16, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "3.5px", boxShadow: 1, px: 1.5, py: 0.75, fontSize: 10.5, color: "text.secondary" }}>
          Loading master data...
        </Box>
      )}
      <CounterAssignmentDialog
        open={counterAssignmentOpen}
        onClose={() => setCounterAssignmentOpen(false)}
      />
    </Box>
  );
};

export default POSOld;
