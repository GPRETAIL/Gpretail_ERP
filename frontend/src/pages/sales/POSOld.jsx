import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronsLeft, Minus, Plus, Printer, X, Search, RotateCcw, Repeat, CreditCard, ScanLine, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import { fetchReceiptCompanyInfo } from "../../utils/receiptCompanyInfo";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchableSelect from "../../components/SearchableSelect";
import UploadImportButton from "../../components/UploadImportButton";
import CounterAssignmentDialog from "../../components/CounterAssignmentDialog";
import { usePrintContext } from "../../context/PrintContext";

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
import { buildPosReturnReceiptHtml, buildPosSaleReceiptHtml } from "../../utils/posReceiptHtml";

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
        api.get("/customers").catch(() => ({ data: { data: [] } })),
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

      setCustomers(
        (customersRes.data?.data || []).map((r) => ({
          value: String(r.id),
          label: `${r.name || "Unnamed"}${r.mobile_no ? ` (${r.mobile_no})` : ""}`,
          name: r.name || "",
          mobileNo: r.mobile_no || "",
        }))
      );
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

  /* ─── save sale (Quick Pay & Print) ─── */
  const handleCustomerNumberLookup = useCallback((rawValue, mode = activeTab.customerMode) => {
    const query = String(rawValue || "").trim();
    const digitsQuery = query.replace(/\D/g, "");

    if (!query) {
      updateActiveTab({
        existingCustomerId: "",
        customerName: "",
      });
      return null;
    }

    const matched = customers.find((row) => {
      const mobileDigits = String(row.mobileNo || "").replace(/\D/g, "");
      return digitsQuery ? mobileDigits === digitsQuery : String(row.mobileNo || "").trim() === query;
    });

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
  }, [activeTab.customerMode, customers, updateActiveTab]);

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
        render: (value) => <div className="text-right">{formatMoney(value || 0)}</div>,
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
    <div className="flex flex-1 min-h-0 min-w-0 flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
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
        paginationMode="server"
        fillHeight
      />
    </div>
  );

  /* ───────────────── RENDER ───────────────── */
  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 overflow-hidden">
      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm flex-shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-medium border transition ${
                tab.id === activeTabId
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700/50"
              }`}
            >
              <span>{`Bill ${idx + 1}`}</span>
            </button>
          ))}
          <button onClick={handleAddTab} className="glass-btn glass-btn-success px-2 py-1" title="Hold & New">
            <Plus className="w-4 h-4" />
          </button>
          {tabs.length > 1 && (
            <button onClick={() => handleDeleteTab(activeTabId)} className="glass-btn glass-btn-danger px-2 py-1" title="Delete Tab">
              <Minus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Top right buttons */}
        <div className="flex items-center gap-2">
          {!showSearchPage && (
            <>
              <button
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
                className="glass-btn glass-btn-primary inline-flex items-center gap-1 text-sm"
              >
                <Printer className="w-4 h-4" /> Receipt
              </button>
              <button onClick={handleOpenCloseRegister} className="glass-btn glass-btn-primary inline-flex items-center gap-1 text-sm">
                <CreditCard className="w-4 h-4" /> Close
              </button>
            </>
          )}
          {showSearchPage && (
            <UploadImportButton
              endpoint="/pos-old-sales/bulk"
              fieldConfig={POS_OLD_SALE_IMPORT_CONFIG}
            />
          )}
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary inline-flex items-center gap-1 text-sm"
          >
            <Search className="w-4 h-4" /> {showSearchPage ? "Back" : "Search"}
          </button>
        </div>
      </div>

      {/* ─── MAIN AREA ─── */}
      {showSearchPage ? <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden p-4">{renderSearchPage()}</div> : <div className="flex flex-1 overflow-hidden">
        {/* ─── LEFT PANEL ─── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r dark:border-gray-700">
          {/* Customer + Barcode row */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
            <select
              value={activeTab.customerMode}
              onChange={(e) => updateActiveTab({
                customerMode: e.target.value,
                existingCustomerId: "",
                customerMobile: "",
                customerName: "",
              })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white w-44 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            >
              <option value="walking">WalkinCustomer</option>
              <option value="existing">Existing Customer</option>
              <option value="new">New Customer</option>
            </select>
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
                className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white w-48 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            ) : null}
            {activeTab.customerMode === "new" ? (
              <>
                <input
                  type="text"
                  value={activeTab.customerMobile}
                  onChange={(e) => updateActiveTab({ customerMobile: e.target.value, existingCustomerId: "" })}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    handleCustomerNumberLookup(e.currentTarget.value, "new");
                  }}
                  placeholder="Customer number"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white w-36 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={activeTab.customerName}
                  onChange={(e) => updateActiveTab({ customerName: e.target.value, existingCustomerId: "" })}
                  placeholder="Customer name"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white w-40 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
              </>
            ) : null}
            <div className="hidden lg:block flex-1 relative">
              <input
                ref={barcodeRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeSubmit}
                placeholder="Barcode_Product_Name"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500"
              />
            </div>
            <div className="flex items-center gap-1 text-lg font-semibold text-gray-700 dark:text-gray-300">
              <span>🛒</span>
              <span>{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[60px]" />
                <col />
                <col className="w-[80px]" />
                <col className="w-[100px]" />
                <col className="w-[80px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[36px]" />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr className="text-gray-600 dark:text-gray-300 font-semibold">
                  <th className="px-2 py-2 text-left border-b dark:border-gray-700">S.No</th>
                  <th className="px-2 py-2 text-left border-b dark:border-gray-700">Product</th>
                  <th className="px-2 py-2 text-right border-b dark:border-gray-700">MRP</th>
                  <th className="px-2 py-2 text-center border-b dark:border-gray-700">Price</th>
                  <th className="px-2 py-2 text-center border-b dark:border-gray-700">Quantity</th>
                  <th className="px-2 py-2 text-center border-b dark:border-gray-700">Dis %</th>
                  <th className="px-2 py-2 text-center border-b dark:border-gray-700">Dis AMT</th>
                  <th className="px-2 py-2 text-right border-b dark:border-gray-700">Total</th>
                  <th className="px-2 py-2 text-center border-b dark:border-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {cartWithTotals.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-3 py-16 text-center text-gray-400 dark:text-gray-500">
                      Scan barcode or select products from right panel
                    </td>
                  </tr>
                ) : (
                  cartWithTotals.map((line, idx) => (
                    <tr key={line.lineId} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isExchangeReturnLine(line) ? "bg-red-50/60 dark:bg-red-900/20" : ""}`}>
                      <td className="px-2 py-1.5 text-xs font-mono truncate">{idx + 1}</td>
                      <td className={`px-2 py-1.5 truncate ${isExchangeReturnLine(line) ? "text-red-700 dark:text-red-400" : ""}`} title={line.productName}>{line.productName}</td>
                      <td className={`px-2 py-1.5 text-right ${isExchangeReturnLine(line) ? "text-red-700 dark:text-red-400" : ""}`}>{formatMoney(line.mrp)}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" min="0" step="0.1"
                          value={isExchangeReturnLine(line) ? line.signedPrice : line.price}
                          onChange={(e) => handleLineChange(line.lineId, "price", e.target.value)}
                          readOnly={isExchangeReturnLine(line)}
                          className={`w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-sm dark:bg-gray-700 dark:text-gray-100 ${isExchangeReturnLine(line) ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number" min="0"
                          value={line.qty}
                          onChange={(e) => handleLineChange(line.lineId, "qty", e.target.value)}
                          className={`w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center text-sm dark:bg-gray-700 dark:text-gray-100 ${isExchangeReturnLine(line) ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" min="0" step="0.1"
                          value={line.discPerc}
                          onChange={(e) => handleLineChange(line.lineId, "discPerc", e.target.value)}
                          readOnly={isExchangeReturnLine(line)}
                          className={`w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-sm dark:bg-gray-700 dark:text-gray-100 ${isExchangeReturnLine(line) ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" : ""}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" min="0" step="0.1"
                          value={line.discAmt}
                          onChange={(e) => handleLineChange(line.lineId, "discAmt", e.target.value)}
                          readOnly={isExchangeReturnLine(line)}
                          className={`w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-sm dark:bg-gray-700 dark:text-gray-100 ${isExchangeReturnLine(line) ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" : ""}`}
                        />
                      </td>
                      <td className={`px-2 py-1.5 text-right font-semibold ${line.total < 0 ? "text-red-700 dark:text-red-400" : ""}`}>{formatMoney(line.total)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.lineId)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-lg"
                          aria-label="Remove line"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom summary */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-3 py-2 flex-shrink-0 space-y-2">
            {/* Row 1: Discount, SubTotal, Total, Balance */}
            <div className="grid grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Discount_amt</label>
                <div className="text-sm font-semibold dark:text-gray-100">{formatMoney(cartWithTotals.reduce((s, l) => s + l.discAmt, 0))}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">SubTotal</label>
                <div className="text-sm font-semibold dark:text-gray-100">{formatMoney(subtotal)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block text-red-600 dark:text-red-400">Total</label>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">₹ {formatMoney(totalAmount)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">Balanceamt</label>
                <div className={`text-lg font-bold ${balanceAmount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  ₹ {formatMoney(balanceAmount)}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={handleCancel} className="glass-btn glass-btn-danger py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1">
                <RotateCcw className="w-4 h-4" /> CANCEL (F4)
              </button>
              <button
                onClick={() => {
                  setShowExchangeDialog(false);
                  setShowReturnDialog(true);
                  resetReturnExchangeDialogState();
                  setTimeout(() => returnBillInputRef.current?.focus(), 0);
                }}
                className="glass-btn glass-btn-warning py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1"
              >
                <Repeat className="w-4 h-4" /> Return
              </button>
              <button
                onClick={() => {
                  setShowReturnDialog(false);
                  setShowExchangeDialog(true);
                  resetReturnExchangeDialogState();
                  setTimeout(() => returnBillInputRef.current?.focus(), 0);
                }}
                className="glass-btn glass-btn-warning py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1"
              >
                <Repeat className="w-4 h-4" /> Exchange
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="glass-btn glass-btn-primary py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> {saving ? "Saving..." : "Quick Pay & Print (F8)"}
              </button>
            </div>
          </div>

          <div className="lg:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-3 py-2 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{totalItems} item{totalItems !== 1 ? "s" : ""} · SubTotal</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">₹{formatMoney(totalAmount)}</span>
            </div>
            <div className="flex flex-nowrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenScanner}
                className="glass-btn glass-btn-secondary flex-1 min-w-0 h-11 text-sm font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <ScanLine className="w-4 h-4" />
                Scan
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="glass-btn glass-btn-primary flex-1 min-w-0 h-11 text-sm font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {saving ? "Saving..." : "Quick Pay & Print"}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`relative border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 transition-[width] duration-200 ease-out ${
            isRightPanelOpen ? "w-[332px]" : "w-3"
          }`}
          onMouseEnter={() => setIsRightPanelOpen(true)}
          onMouseLeave={() => {
            setIsRightPanelOpen(false);
            setBrandDropdownOpen(false);
          }}
        >
          <div
            className={`absolute inset-y-0 left-0 w-3 flex items-center justify-center border-l border-gray-300 dark:border-gray-600 transition-colors ${
              isRightPanelOpen ? "bg-white dark:bg-gray-800" : "bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-indigo-900/30"
            }`}
            title="Hover to open Products / Brands"
          >
            <ChevronsLeft className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          </div>

        {/* ─── RIGHT PANEL ─── */}
        {isRightPanelOpen && (
        <div className="absolute inset-y-0 left-3 w-80 flex flex-col bg-white dark:bg-gray-800 overflow-hidden flex-shrink-0 shadow-sm">
          {/* Tabs: Products | Brands */}
          <div className="flex border-b dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => { setRightTab("products"); setSelectedBrand(null); }}
              className={`flex-1 px-3 py-2 text-sm font-medium text-center transition ${
                rightTab === "products" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setRightTab("brands")}
              className={`flex-1 px-3 py-2 text-sm font-medium text-center transition ${
                rightTab === "brands" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Brands
            </button>
          </div>

          {/* Search */}
          <div className="px-2 py-2 border-b dark:border-gray-700 flex-shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search"
                className="w-full border border-gray-300 rounded pl-8 pr-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Brand selector dropdown (only in brands tab) */}
          {rightTab === "brands" && (
            <div ref={brandDropdownRef} className="px-2 py-1 border-b dark:border-gray-700 flex-shrink-0 relative">
              <div
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white cursor-pointer flex items-center justify-between dark:bg-gray-700 dark:border-gray-600"
                onClick={() => setBrandDropdownOpen((v) => !v)}
              >
                <span className={selectedBrand ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}>
                  {selectedBrand ? brands.find((b) => b.id === selectedBrand)?.name || "All Brands" : "All Brands"}
                </span>
                {selectedBrand && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedBrand(null); setBrandSearch(""); }}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {brandDropdownOpen && (
                <div className="absolute left-2 right-2 top-full mt-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-30 max-h-60 flex flex-col">
                  <div className="p-1.5 border-b dark:border-gray-700">
                    <input
                      type="text"
                      autoFocus
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Search brand..."
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <div
                      onClick={() => { setSelectedBrand(null); setBrandDropdownOpen(false); setBrandSearch(""); }}
                      className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-indigo-900/30 ${!selectedBrand ? "bg-blue-100 font-medium dark:bg-indigo-900/40 dark:text-indigo-300" : "dark:text-gray-200"}`}
                    >
                      All Brands
                    </div>
                    {brands
                      .filter((b) => !brandSearch || normalize(b.name).includes(normalize(brandSearch)))
                      .map((b) => (
                        <div
                          key={b.id}
                          onClick={() => { setSelectedBrand(b.id); setBrandDropdownOpen(false); setBrandSearch(""); }}
                          className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-indigo-900/30 ${selectedBrand === b.id ? "bg-blue-100 font-medium dark:bg-indigo-900/40 dark:text-indigo-300" : "dark:text-gray-200"}`}
                        >
                          {b.name}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product list */}
          <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
            {rightTab === "products" ? (
              filteredProducts.map((p) => (
                <div key={p.id} className="w-full border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => addToCart(stockRows.find((s) => s.id === p.id))}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-indigo-900/30"
                  >
                    <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-100" title={p.productName}>{p.productName}</span>
                    <span className="flex-shrink-0 font-semibold whitespace-nowrap text-red-600 dark:text-red-400">-Rs.{formatMoney(p.price)}</span>
                  </button>
                </div>
              ))
            ) : (
              Object.entries(productsByBrand).map(([brandName, prods]) => (
                <div key={brandName}>
                  <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase sticky top-0">
                    {brandName}
                  </div>
                  {prods.map((p) => (
                    <div key={p.id} className="w-full border-b border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => addToCart(stockRows.find((s) => s.id === p.id))}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-indigo-900/30"
                      >
                        <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-100" title={p.productName}>{p.productName}</span>
                        <span className="flex-shrink-0 font-semibold whitespace-nowrap text-red-600 dark:text-red-400">-Rs.{formatMoney(p.price)}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
            {filteredProducts.length === 0 && (
              <div className="px-3 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No products found</div>
            )}
          </div>
        </div>
        )}
        </div>
      </div>}

      {/* ═══════════ DIALOGS ═══════════ */}

      {showScanner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-base dark:text-gray-100">Scan Barcode</h3>
              <button onClick={handleCloseScanner} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden">
                <video
                  ref={scannerVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                {scannerLoading && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/70">
                    Starting camera...
                  </div>
                )}
                {!scannerLoading && scannerError && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-center text-xs px-4 bg-black/80">
                    {scannerError}
                  </div>
                )}
                {!scannerLoading && !scannerError && (
                  <div className="absolute inset-x-0 bottom-0 text-center text-white text-xs py-1 bg-black/40">
                    Place barcode inside frame
                  </div>
                )}
              </div>

              {scannerError && (
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeSubmit}
                  placeholder="Enter barcode manually"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500"
                />
              )}

              <button
                type="button"
                onClick={handleCloseScanner}
                className="w-full glass-btn glass-btn-danger py-2 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Confirm */}
      {holdConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Are you sure</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Do you want to hold the customer?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setHoldConfirm(false)} className="glass-btn glass-btn-danger px-4 py-1.5">No</button>
              <button onClick={confirmAddTab} className="glass-btn glass-btn-success px-4 py-1.5">Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tab Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Delete Tab</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Are you sure you want to delete this tab?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="glass-btn glass-btn-danger px-4 py-1.5">No</button>
              <button onClick={confirmDeleteTab} className="glass-btn glass-btn-success px-4 py-1.5">Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Register Dialog */}
      {showCloseRegister && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[700px] max-h-[90vh] overflow-auto">
            <div className="bg-[#6B8E23] text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
              <h3 className="font-semibold">CloseRegister</h3>
              <button onClick={() => setShowCloseRegister(false)} className="text-white hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Info row */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 font-semibold">Opened by</div>
                  <div className="dark:text-gray-100">POS User</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 font-semibold">Cash in Hand</div>
                  <div className="dark:text-gray-100">0.00 INR</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 font-semibold">Opening Time</div>
                  <div className="dark:text-gray-100">{now.toLocaleDateString("en-IN")} {now.toLocaleTimeString("en-IN")}</div>
                </div>
              </div>

              {/* Payments Summary */}
              <div>
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Payments Summary</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 dark:text-gray-300">Payment Type</th>
                      <th className="text-left px-3 py-2 dark:text-gray-300">Expected (INR)</th>
                      <th className="text-left px-3 py-2 dark:text-gray-300">Counted</th>
                      <th className="text-left px-3 py-2 dark:text-gray-300">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Cash", key: "cash" },
                      { label: "Credit Card", key: "credit_card" },
                      { label: "Point", key: "point" },
                      { label: "Online Pay", key: "online_pay" },
                      { label: "Returns", key: "returns" },
                    ].map((row) => (
                      <tr key={row.key} className="border-b dark:border-gray-700">
                        <td className="px-3 py-2 font-medium dark:text-gray-100">{row.label}</td>
                        <td className="px-3 py-2">
                          <input type="text" readOnly value={toNum(sessionSummary[row.key], 0).toFixed(2)} className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" defaultValue="0.00" className="w-full border border-gray-300 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" readOnly defaultValue={(-toNum(sessionSummary[row.key], 0)).toFixed(2)} className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 dark:bg-gray-700 font-bold">
                      <td className="px-3 py-2 dark:text-gray-100">Total</td>
                      <td className="px-3 py-2">
                        <input type="text" readOnly value={toNum(sessionSummary.total, 0).toFixed(2)} className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-bold dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" readOnly defaultValue="0.00" className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-bold dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" readOnly defaultValue="0.00" className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-bold dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cash Denominations + Note */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Cash Denominations</h4>
                  <div className="space-y-1">
                    {DENOMINATIONS.map((d) => (
                      <div key={d} className="flex items-center gap-2 text-sm">
                        <span className="w-12 font-medium dark:text-gray-100">{d}</span>
                        <span className="text-gray-400 dark:text-gray-500">X</span>
                        <input
                          type="number" min="0"
                          value={denomCounts[`c_${d}`]}
                          onChange={(e) => setDenomCounts((p) => ({ ...p, [`c_${d}`]: toInt(e.target.value, 0) }))}
                          className="w-16 border border-gray-300 rounded px-2 py-0.5 text-sm text-right dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        />
                        <span className="text-sm dark:text-gray-300">{(toInt(denomCounts[`c_${d}`], 0) * d).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm font-bold border-t dark:border-gray-700 pt-1 dark:text-gray-100">
                      <span>Total:</span>
                      <span>{denomTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Note</h4>
                  <textarea
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    rows={6}
                    className="w-full border border-gray-300 rounded p-2 text-sm resize-y dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCloseRegister(false)} className="glass-btn glass-btn-danger px-4 py-2">Close</button>
                <button className="glass-btn glass-btn-primary px-4 py-2">save&print</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return / Exchange dialog — bill → reason → lines */}
      {(showReturnDialog || showExchangeDialog) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between border-b dark:border-gray-700 px-4 py-3 rounded-t-lg">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{showExchangeDialog ? "Exchange" : "Return"}</span>
                {returnSourceSale ? (
                  <>
                    <span className="text-gray-600 dark:text-gray-300">{formatMoney(Math.abs(returnDraftSummary.amount))}</span>
                    <span className="text-gray-600 dark:text-gray-300">Qty: {returnDraftSummary.totalQty}</span>
                  </>
                ) : null}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Esc close</span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Bill no. or barcode</label>
                <input
                  ref={returnBillInputRef}
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
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Selected bill</label>
                <input
                  type="text"
                  readOnly
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
                  className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Reason</label>
                <div
                  ref={returnReasonSelectWrapRef}
                  className={!returnSourceSale ? "pointer-events-none opacity-55" : ""}
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
                    triggerClassName="px-3 py-2 text-sm rounded-md min-h-[38px]"
                    searchInputClassName="text-sm"
                  />
                </div>
              </div>
              {returnSourceSale && posOldReturnPendingDocNo ? (
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono pt-1">{posOldReturnPendingDocNo}</p>
              ) : null}
            </div>
          </div>

          {showReturnLinesDialog && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between border-b dark:border-gray-700 px-4 py-3 rounded-t-lg flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{showExchangeDialog ? "Exchange lines" : "Return lines"}</div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Esc back</span>
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-3">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr className="text-left text-gray-700 dark:text-gray-300">
                        <th className="border dark:border-gray-600 px-2 py-2 w-10">#</th>
                        <th className="border dark:border-gray-600 px-2 py-2">Barcode</th>
                        <th className="border dark:border-gray-600 px-2 py-2">Product</th>
                        <th className="border dark:border-gray-600 px-2 py-2 w-24">Qty</th>
                        <th className="border dark:border-gray-600 px-2 py-2 w-24 text-right">Price</th>
                        <th className="border dark:border-gray-600 px-2 py-2 w-20 text-right">Tax%</th>
                        <th className="border dark:border-gray-600 px-2 py-2 w-24 text-right">Disc.</th>
                        <th className="border dark:border-gray-600 px-2 py-2 w-28 text-right">Total</th>
                        <th className="border dark:border-gray-600 px-2 py-2 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {returnCartDraft.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border dark:border-gray-600 px-3 py-8 text-center text-gray-400 dark:text-gray-500">
                            No lines
                          </td>
                        </tr>
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
                            <tr key={line.lineId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="border dark:border-gray-600 px-2 py-1.5 text-center dark:text-gray-100">{idx + 1}</td>
                              <td className="border dark:border-gray-600 px-2 py-1.5 font-mono text-xs dark:text-gray-300">{line.barcode || "—"}</td>
                              <td className="border dark:border-gray-600 px-2 py-1.5 truncate max-w-[200px] dark:text-gray-100" title={line.productName}>
                                {line.productName || "—"}
                                {!line.productName ? null : (
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-normal">
                                    {line.standaloneLine
                                      ? "Barcode return (catalogue pricing)"
                                      : `Original ${line.originalQty} · Returned ${line.returnedQty} · Max ${line.maxQty}`}
                                  </div>
                                )}
                              </td>
                              <td className="border dark:border-gray-600 px-2 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={line.standaloneLine ? STANDALONE_MAX_QTY : line.maxQty}
                                  value={line.qty}
                                  onChange={(e) => handleReturnDraftQtyChange(line.lineId, e.target.value)}
                                  className="w-full rounded border border-gray-300 px-1 py-0.5 text-center text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                />
                              </td>
                              <td className="border dark:border-gray-600 px-2 py-1.5 text-right dark:text-gray-100">{formatMoney(line.price)}</td>
                              <td className="border dark:border-gray-600 px-2 py-1.5 text-right dark:text-gray-100">{formatMoney(line.tax)}</td>
                              <td className="border dark:border-gray-600 px-2 py-1.5 text-right dark:text-gray-100">{formatMoney(line.discount)}</td>
                              <td className="border dark:border-gray-600 px-2 py-1.5 text-right font-medium dark:text-gray-100">{formatMoney(lineTotal)}</td>
                              <td className="border dark:border-gray-600 px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReturnDraftLine(line.lineId)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 inline-flex"
                                  aria-label="Remove line"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="border-t dark:border-gray-700 px-4 py-3 space-y-3 flex-shrink-0">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Scan / enter barcode</label>
                    <input
                      ref={returnLinesScanRef}
                      type="text"
                      value={returnScanInput}
                      onChange={(e) => setReturnScanInput(e.target.value)}
                      onKeyDown={handleReturnLinesScanKeyDown}
                      placeholder={
                        showExchangeDialog
                          ? "Barcode · 0 + Enter = Apply to bill"
                          : "Barcode (same as POS Return) · 0 + Enter = Save & Print"
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500"
                    />
                  </div>
                  {!showExchangeDialog ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => submitReturnFromPosOldDialog({ shouldPrint: false })}
                        disabled={returnSaving}
                        className="glass-btn glass-btn-secondary px-4 py-2 disabled:opacity-50"
                      >
                        {returnSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => submitReturnFromPosOldDialog({ shouldPrint: true })}
                        disabled={returnSaving}
                        className="glass-btn glass-btn-primary px-4 py-2 disabled:opacity-50"
                      >
                        {returnSaving ? "Saving…" : "Save & Print"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
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
            <div className="flex items-center justify-between border-b dark:border-gray-700 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sale Discount</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Select sale rows and apply a discount percentage to the current POS Old bill.
                </div>
              </div>
              <button
                type="button"
                onClick={closeDiscountDialog}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close discount dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">
              <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                <div className="max-h-[44vh] overflow-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="w-12 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={positiveCartLines.length > 0 && discountSelectedLineIds.length === positiveCartLines.length}
                            onChange={handleDiscountToggleAll}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </th>
                        <th className="px-3 py-3 text-left">Barcode</th>
                        <th className="px-3 py-3 text-left">Product</th>
                        <th className="px-3 py-3 text-right">Price</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-left">Discount</th>
                        <th className="px-3 py-3 text-right">Dis %</th>
                        <th className="px-3 py-3 text-right">Dis AMT</th>
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
                              <span className="text-gray-600 dark:text-gray-400">{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono dark:text-gray-300">{line.barcode || "-"}</td>
                          <td className="px-3 py-3 dark:text-gray-100">{line.productName || "-"}</td>
                          <td className="px-3 py-3 text-right dark:text-gray-100">{formatMoney(line.price)}</td>
                          <td className="px-3 py-3 text-right dark:text-gray-100">{toNum(line.qty, 0)}</td>
                          <td className="px-3 py-3 dark:text-gray-300">{`${formatMoney(line.discAmt)} @ ${line.appliedPercent}%`}</td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.percentInput}
                              onChange={(event) => handleDiscountRowPercentChange(line.lineId, event.target.value)}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.valueInput}
                              onChange={(event) => handleDiscountRowValueChange(line.lineId, event.target.value)}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                            />
                          </td>
                          <td className="px-3 py-3 text-right dark:text-gray-100">{formatMoney(line.previewNetAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t dark:border-gray-700 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountPercentInput}
                    onChange={(event) => applyDiscountPercentToSelected(event.target.value)}
                    className="w-32 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
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
                    className="w-40 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
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

      {loading && (
        <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
          Loading master data...
        </div>
      )}
      <CounterAssignmentDialog
        open={counterAssignmentOpen}
        onClose={() => setCounterAssignmentOpen(false)}
      />
    </div>
  );
};

export default POSOld;
