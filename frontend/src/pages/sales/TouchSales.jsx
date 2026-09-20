import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Minus,
  Plus,
  Save,
  Printer,
  Delete,
  CornerDownLeft,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import { fetchReceiptCompanyInfo } from "../../utils/receiptCompanyInfo";
import CounterAssignmentDialog from "../../components/CounterAssignmentDialog";
import UploadImportButton from "../../components/UploadImportButton";
import { usePrintContext } from "../../context/PrintContext";
import { buildPosSaleReceiptHtml } from "../../utils/posReceiptHtml";
import {
  DEFAULT_SALES_RECEIPT_MESSAGE,
  getPosBillBarcodeValue,
  getSalesReceiptPaperSize,
  loadSalesReceiptCustomization,
  fetchSalesReceiptCustomization,
  buildPaymentQrMarkup,
  buildReceiptCodeMarkupAsync,
} from "../../utils/salesReceiptCustomization";
import { Box, Stack, Typography, IconButton, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

// A touch sale is stored as a POS sale (the backend delegates both create and bulk import to
// PosSaleService), so the import columns are deliberately identical to POS Sale's.
const TOUCH_SALE_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    saleat: "saleAt", saledate: "saleAt", date: "saleAt",
    amount: "amount", billamount: "amount",
    customerid: "customerId",
    customername: "customerName", customer: "customerName",
    customermobile: "customerMobile", mobile: "customerMobile",
  },
  required: ["amount"],
  sampleFileName: "touch_sale_sample.xlsx",
  sampleHeaders: ["company", "saleAt", "amount", "customerName", "customerMobile"],
};

const LETTER_KEYS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];
const DIGIT_KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const normalize = (value) => String(value || "").trim().toLowerCase();
const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const round2 = (value) => Math.round((toNum(value, 0) + Number.EPSILON) * 100) / 100;

const formatSaleBillNo = (value) => `SB/${toNum(value, 0)}`;

const formatReturnNo = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw.startsWith("RR/") || raw.startsWith("RO/")) return raw;
  return `RR/${toNum(value, 0)}`;
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

const TouchSales = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const { printerConnected, queuePrintHtml } = usePrintContext();

  // Pops automatically once per login if this user has no counter assigned yet -- previously
  // they'd only discover this was required when a sale failed to save.
  const [counterAssignmentOpen, setCounterAssignmentOpen] = useState(false);
  useEffect(() => {
    if (authUser && !authUser.counter_id) {
      setCounterAssignmentOpen(true);
    }
  }, [authUser?.id]);

  const [now, setNow] = useState(new Date());
  const [billNo, setBillNo] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");

  const [stockRows, setStockRows] = useState([]);
  const [qtyDraft, setQtyDraft] = useState({});
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appliedReturn, setAppliedReturn] = useState(null);
  const [applyingReturn, setApplyingReturn] = useState(false);
  const [refundApproved, setRefundApproved] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const cid = authUser?.company_id;
    if (!cid) return undefined;
    fetchSalesReceiptCustomization(api, cid).catch(() => {});
    return undefined;
  }, [authUser?.company_id]);

  const loadMasterData = useCallback(async () => {
    try {
      const [barcodesRes, productsRes, customersRes] = await Promise.all([
        api.get("/barcodes").catch(() => ({ data: { data: [] } })),
        api.get("/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get("/customers", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
      ]);

      const products = productsRes.data?.data || [];
      const productTaxMap = new Map();
      products.forEach((p) => {
        const key = normalize(p.name);
        if (!key) return;
        productTaxMap.set(key, toNum(p?.salesTax?.tax_percentage, 0));
      });

      const stock = (barcodesRes.data?.data || [])
        .map((row) => {
          const productName = row.product_name || "Unknown Product";
          const tax = productTaxMap.get(normalize(productName)) || 0;
          return {
            id: String(row.id),
            barcode: row.barcode || "",
            productName,
            qty: Math.max(0, toNum(row.qty, 0)),
            cost: toNum(row.cost, 0),
            price: toNum(row.final_price || row.selling_price || row.mrp, 0),
            tax,
          };
        })
        .filter((row) => row.qty > 0 && row.barcode);

      setStockRows(stock);
      setCustomers(customersRes.data?.data || []);
    } catch {
      toast.error("Failed to load touch sales data");
    }
  }, []);

  const loadNextBillNo = useCallback(async () => {
    try {
      const res = await api.get("/touch-sales/next-bill-no");
      setBillNo(toNum(res.data?.data?.billNo, 1));
    } catch {
      setBillNo(1);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadMasterData(), loadNextBillNo()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadMasterData, loadNextBillNo]);

  const usedQtyByStockId = useMemo(() => {
    const map = new Map();
    cart.forEach((line) => {
      map.set(line.stockId, (map.get(line.stockId) || 0) + toNum(line.qty, 0));
    });
    return map;
  }, [cart]);

  const filteredRows = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return [];
    return stockRows
      .filter((row) => normalize(row.productName).includes(q) || normalize(row.barcode).includes(q))
      .slice(0, 40);
  }, [searchTerm, stockRows]);

  const detectedCustomer = useMemo(() => {
    const mobile = String(customerMobile || "").trim();
    if (!mobile) return null;
    // customers rows are the raw /customers API response -- the phone field is `phone`, not
    // `mobile_no` (mobile_no is only ever accepted as an input alias on write, never returned),
    // so this never matched anything before regardless of what was in the cache.
    return customers.find((c) => String(c.phone || "") === mobile) || null;
  }, [customerMobile, customers]);

  // customers is only ever seeded with a small batch above -- this hits /customers' own ?search=
  // endpoint for anything beyond that, and merges matches into the cache so detectedCustomer
  // (above) picks them up on its next recompute.
  const handleAsyncCustomerSearch = useCallback(async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/customers", { params: { search: trimmed, limit: 20 } });
      const rows = res.data?.data || [];
      if (rows.length) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => String(c.id)));
          const newOnes = rows.filter((c) => !existingIds.has(String(c.id)));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return rows;
    } catch {
      return [];
    }
  }, []);

  // Fires once the typed/tapped number looks complete (a full Indian mobile number) and isn't
  // already in the local cache, rather than on every digit -- detectedCustomer picks up the
  // result automatically once handleAsyncCustomerSearch merges it into `customers`.
  useEffect(() => {
    const mobile = String(customerMobile || "").trim();
    if (mobile.length < 10 || detectedCustomer) return undefined;
    const timer = setTimeout(() => {
      handleAsyncCustomerSearch(mobile);
    }, 250);
    return () => clearTimeout(timer);
  }, [customerMobile, detectedCustomer, handleAsyncCustomerSearch]);

  const billSummary = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    let finalAmount = 0;
    let qty = 0;

    cart.forEach((line) => {
      const lineQty = Math.max(0, toNum(line.qty, 0));
      const linePrice = Math.max(0, toNum(line.price, 0));
      const lineTaxPerc = Math.max(0, toNum(line.tax, 0));
      const lineSubtotal = lineQty * linePrice;
      const lineTax = (lineSubtotal * lineTaxPerc) / 100;
      const lineFinal = lineSubtotal + lineTax;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      finalAmount += lineFinal;
      qty += lineQty;
    });

    const saleAmount = round2(finalAmount);
    const availableReturnAmount = Math.max(0, Math.abs(toNum(appliedReturn?.amount, 0)));
    const returnAppliedAmount = round2(Math.min(saleAmount, availableReturnAmount));
    const refundDue = round2(Math.max(availableReturnAmount - saleAmount, 0));
    const netAmount = round2(saleAmount - availableReturnAmount);

    return {
      subtotal,
      taxAmount,
      finalAmount,
      qty,
      saleAmount,
      availableReturnAmount,
      returnAppliedAmount,
      refundDue,
      netAmount,
    };
  }, [cart, appliedReturn?.amount]);

  const appliedReturnDisplayLines = useMemo(() => {
    const returnItems = appliedReturn?.items || [];
    const returnLabel =
      appliedReturn?.displayReturnNo
      || (appliedReturn?.returnNo ? formatReturnNo(appliedReturn.returnNo) : "Return");

    return returnItems.map((item, index) => {
      const qty = Math.max(0, toNum(item?.qty, 0));
      const price = Math.max(0, toNum(item?.price ?? item?.rate, 0));
      const positiveTotal = getAppliedReturnItemTotal(item);
      const lineTotal = round2(-positiveTotal);

      return {
        lineId: `applied-return-${appliedReturn?.id || "draft"}-${index}`,
        isReturnDisplayLine: true,
        returnNoteLabel: returnLabel,
        productName: item?.product_name || item?.productName || item?.barcode || "-",
        barcode: item?.barcode || item?.barcodeRef?.barcode || "",
        qty: -qty,
        price,
        lineTotal,
      };
    });
  }, [appliedReturn]);

  const billLinesForDisplay = useMemo(
    () => [...appliedReturnDisplayLines, ...cart],
    [appliedReturnDisplayLines, cart]
  );

  useEffect(() => {
    if (billSummary.netAmount >= 0) setRefundApproved(false);
  }, [billSummary.netAmount]);

  const clearAppliedReturn = useCallback(() => {
    setAppliedReturn(null);
    setRefundApproved(false);
  }, []);

  const applyReturnCredit = useCallback(
    async (returnQuery) => {
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

        if (returnData.customerId) {
          const matched = customers.find((c) => String(c.id) === String(returnData.customerId));
          if (matched?.mobile_no) {
            setCustomerMobile(String(matched.mobile_no).replace(/\D/g, ""));
          }
        }
        if (returnData.customerMobile) {
          setCustomerMobile(String(returnData.customerMobile).replace(/\D/g, ""));
        }

        toast.success(`${returnData.displayReturnNo || formatReturnNo(returnData.returnNo)} applied`);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to fetch POS return");
      } finally {
        setApplyingReturn(false);
      }
    },
    [customers]
  );

  const adjustDraftQty = (stockId, delta) => {
    setQtyDraft((prev) => {
      const current = Math.max(1, toNum(prev[stockId], 1));
      const next = Math.max(1, current + delta);
      return { ...prev, [stockId]: next };
    });
  };

  const getDraftQty = (stockId) => Math.max(1, toNum(qtyDraft[stockId], 1));

  const addToCart = (row) => {
    const qtyToAdd = getDraftQty(row.id);
    const already = usedQtyByStockId.get(row.id) || 0;
    const available = row.qty - already;

    if (qtyToAdd > available) {
      toast.error(`Only ${Math.max(available, 0)} pcs available for ${row.productName}`);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((line) => line.stockId === row.id);
      if (idx === -1) {
        return [
          ...prev,
          {
            lineId: `${row.id}-${Date.now()}`,
            stockId: row.id,
            barcode: row.barcode,
            productName: row.productName,
            qty: qtyToAdd,
            price: row.price,
            tax: row.tax,
            cost: row.cost,
          },
        ];
      }

      const next = [...prev];
      const newQty = toNum(next[idx].qty, 0) + qtyToAdd;
      next[idx] = { ...next[idx], qty: newQty };
      return next;
    });
  };

  const updateCartQty = (lineId, delta) => {
    setCart((prev) => {
      const idx = prev.findIndex((line) => line.lineId === lineId);
      if (idx === -1) return prev;

      const line = prev[idx];
      const source = stockRows.find((r) => r.id === line.stockId);
      if (!source) return prev;

      const currentQty = Math.max(1, toNum(line.qty, 1));
      const nextQty = currentQty + delta;
      if (nextQty < 1) return prev;

      const usedExceptThis = (usedQtyByStockId.get(line.stockId) || 0) - currentQty;
      const available = source.qty - usedExceptThis;
      if (nextQty > available) {
        toast.error(`Only ${Math.max(available, 0)} pcs available for ${line.productName}`);
        return prev;
      }

      const next = [...prev];
      next[idx] = { ...line, qty: nextQty };
      return next;
    });
  };

  const removeLine = (lineId) => {
    setCart((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const resetDraftAndCart = () => {
    setSearchTerm("");
    setQtyDraft({});
    setCart([]);
    clearAppliedReturn();
  };

  const applySearchKey = (key) => {
    if (key === "CLEAR") {
      setSearchTerm("");
      return;
    }
    if (key === "SPACE") {
      setSearchTerm((prev) => `${prev} `);
      return;
    }
    if (key === "SLASH") {
      setSearchTerm((prev) => `${prev}/`);
      return;
    }
    if (key === "ENTER") {
      const q = String(searchTerm || "").trim();
      if (/^(rr|ro)\//i.test(q)) {
        void applyReturnCredit(q);
        setSearchTerm("");
      }
      return;
    }
    setSearchTerm((prev) => `${prev}${key}`);
  };

  const applyMobileKey = (key) => {
    if (key === "ENTER") {
      if (detectedCustomer) {
        toast.success(`Customer found: ${detectedCustomer.name}`);
      } else {
        toast.info("Customer number entered");
      }
      return;
    }
    setCustomerMobile((prev) => `${prev}${key}`);
  };

  const printPosSaleReceipt = useCallback(
    async (savedSale) => {
      const receiptCompanyId = savedSale?.company_id || authUser?.company_id || null;
      const receiptCustomization = loadSalesReceiptCustomization(receiptCompanyId || "default");
      const billNumber = savedSale?.bill_no ?? billNo;
      const displayBillNo = getPosBillBarcodeValue(billNumber);
      const saleAt = savedSale?.sale_at || new Date().toISOString();
      const savedItems = savedSale?.items || [];

      const appliedReturnId = toNum(
        savedSale?.applied_pos_return_id ?? savedSale?.appliedPosReturnId ?? appliedReturn?.id,
        0
      );
      const [companyInfo, linkedReturnRes] = await Promise.all([
        fetchReceiptCompanyInfo(receiptCompanyId),
        appliedReturnId
          ? api.get(`/pos-returns/${appliedReturnId}`).catch(() => ({ data: { data: null } }))
          : Promise.resolve({ data: { data: null } }),
      ]);
      const linkedReturn = linkedReturnRes?.data?.data || null;

      const receiptItems = savedItems.map((item) => {
        const qty = Math.max(0, toNum(item.qty, 0));
        const rate = Math.max(0, toNum(item.price, 0));
        const taxPerc = Math.max(0, toNum(item.tax_perc ?? item.taxPerc ?? item.tax, 0));
        const discountAmount = round2(Math.max(0, toNum(item.discount, 0)));
        const subtotal = round2(qty * rate);
        const taxAmount = round2((subtotal * taxPerc) / 100);
        const amount = round2(toNum(item.total, subtotal + taxAmount - discountAmount));
        return {
          name: item.product_name || item.productName || item.barcode || "-",
          qty,
          rate,
          taxPerc,
          taxName: item.tax_name || item.taxName || "",
          taxType: item.tax_type || item.taxType || "",
          baseAmount: subtotal,
          taxAmount,
          discountAmount,
          amount,
          code: item.barcode || "",
        };
      });

      const receiptTaxAmount = round2(receiptItems.reduce((sum, row) => sum + toNum(row.taxAmount, 0), 0));
      const receiptTotalDiscount = Math.max(0, toNum(savedSale?.total_discount, 0));
      const receiptNetAmount = round2(toNum(savedSale?.amount, 0));
      const receiptReceived = Math.max(0, toNum(savedSale?.received_amount, receiptNetAmount));
      const receiptChange = Math.max(0, toNum(savedSale?.change_amount, 0));
      const receiptReturnAdjustment = Math.min(0, toNum(savedSale?.applied_return_amount, 0));
      const receiptRefundAmount = Math.max(0, toNum(savedSale?.return_refund_amount, 0));
      const receiptReturnItems = (linkedReturn?.items || appliedReturn?.items || []).map((item) => ({
        name: item.product_name || item.productName || item.barcode || "-",
        qty: Math.max(0, toNum(item.qty, 0)),
        amount: Math.abs(toNum(item.total ?? item.amount, 0)),
        code: item.barcode || item.barcodeRef?.barcode || "",
      }));

      const storeName =
        String(authUser?.company_name || "").trim()
        || String(authUser?.name || "").trim()
        || "Store";
      const receiptData = {
        companyId: receiptCompanyId,
        receiptCustomization,
        storeName,
        storeAddress: companyInfo.storeAddress,
        storePhone: companyInfo.storePhone,
        storeGstNo: companyInfo.storeGstNo,
        billNo: displayBillNo,
        billBarcode: displayBillNo,
        dateTime: saleAt,
        cashierName: String(authUser?.name || authUser?.email || "POS").trim(),
        counterName: String(authUser?.counter_name || savedSale?.counter_name || "").trim(),
        customerName:
          String(savedSale?.customer_name || savedSale?.customer?.name || "").trim()
          || (customerMobile.trim() ? `Walking (${customerMobile.trim()})` : "Walking customer"),
        paperSize: getSalesReceiptPaperSize(receiptCustomization.receiptWidthInches),
        items: receiptItems,
        billAmount: round2(receiptItems.reduce((sum, row) => sum + toNum(row.amount, 0), 0) + receiptTotalDiscount),
        discountAmount: receiptTotalDiscount,
        taxAmount: receiptTaxAmount,
        returnAdjustment: receiptReturnAdjustment,
        refundAmount: receiptRefundAmount,
        appliedReturnNo:
          linkedReturn?.display_return_no
          || appliedReturn?.displayReturnNo
          || savedSale?.applied_return_no
          || (appliedReturn?.returnNo ? formatReturnNo(appliedReturn.returnNo) : ""),
        returnItems: receiptReturnItems,
        total: receiptNetAmount,
        paidAmount: receiptReceived,
        receivedAmount: receiptReceived,
        balanceAmount: 0,
        changeAmount: receiptChange,
        paymentMethod: "Cash",
        generalTaxVisible: Boolean(receiptCustomization.generalFields?.tax?.visible),
        generalPaidVisible: Boolean(receiptCustomization.generalFields?.paid?.visible),
        generalReceivedVisible: Boolean(receiptCustomization.generalFields?.receivedAmount?.visible),
        generalBalanceVisible: Boolean(receiptCustomization.generalFields?.balanceAmt?.visible),
        generalYouSavedVisible: Boolean(receiptCustomization.generalFields?.youSaved?.visible),
        message: receiptCustomization.thankYouMessage || DEFAULT_SALES_RECEIPT_MESSAGE,
        billCodeMarkup: await buildReceiptCodeMarkupAsync(displayBillNo, receiptCustomization, "bill"),
        paymentQrMarkup: await buildPaymentQrMarkup(receiptCustomization, {
          billAmount: receiptNetAmount,
          billNo: displayBillNo,
          storeName,
        }),
      };

      const html = buildPosSaleReceiptHtml(receiptData, receiptCustomization);
      const isDirectPrint = receiptCustomization.printMode !== "browser";

      if (isDirectPrint) {
        await queuePrintHtml(html, {
          label: `TouchPOS-${billNumber}`,
          docType: "pos_sale_receipt",
          copies: 1,
          companyId: receiptCompanyId,
          receiptData,
        });
        return;
      }

      const win = window.open("", "_blank", "width=400,height=650");
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
    },
    [
      authUser?.company_id,
      authUser?.company_name,
      authUser?.counter_name,
      authUser?.email,
      authUser?.name,
      billNo,
      customerMobile,
      appliedReturn?.id,
      appliedReturn?.items,
      appliedReturn?.displayReturnNo,
      appliedReturn?.returnNo,
      printerConnected,
      queuePrintHtml,
    ]
  );

  const saveTouchSale = async ({ shouldPrint = false } = {}) => {
    if (cart.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    const netAmount = billSummary.netAmount;
    const refundAmount = netAmount < 0 ? round2(Math.abs(netAmount)) : 0;
    if (refundAmount > 0 && !refundApproved) {
      toast.error(`Confirm refund ${formatMoney(refundAmount)} before saving`);
      return;
    }

    const payload = {
      saleAt: now.toISOString(),
      customerMobile: customerMobile.trim() || null,
      appliedPosReturnId: appliedReturn?.id || null,
      appliedReturnNo:
        appliedReturn?.displayReturnNo || (appliedReturn?.returnNo ? formatReturnNo(appliedReturn.returnNo) : null),
      ...(refundAmount > 0 ? { refundAmount } : {}),
      items: cart.map((line) => ({
        barcodeId: line.stockId,
        barcode: line.barcode,
        productName: line.productName,
        qty: line.qty,
        price: line.price,
        tax: line.tax,
        cost: line.cost,
        discount: 0,
      })),
    };

    setSaving(true);
    try {
      const res = await api.post("/touch-sales", payload);
      const saved = res.data?.data;
      toast.success(`Sale saved (Bill #${formatSaleBillNo(saved?.bill_no)})`);
      if (shouldPrint) {
        await printPosSaleReceipt(saved);
      }
      resetDraftAndCart();
      await Promise.all([loadMasterData(), loadNextBillNo()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save sale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack sx={{ height: "100%", minHeight: 0, bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ flexShrink: 0, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: { xs: 1.5, sm: 2 }, py: 1, boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate("/sales")} sx={{ color: "text.secondary" }} aria-label="Back">
            <ArrowLeft size={16} />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600 }}>Sales / Touch Sale</Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <UploadImportButton
            endpoint="/touch-sales/bulk"
            fieldConfig={TOUCH_SALE_IMPORT_CONFIG}
          />
          <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Next bill: <Box component="b">{formatSaleBillNo(billNo)}</Box></Typography>
        </Stack>
      </Stack>

      <Stack sx={{ minHeight: 0, flex: 1, p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: "grid", height: "100%", minHeight: 0, gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, gap: { xs: 1.5, sm: 2 } }}>
          <Stack sx={{ minHeight: 0, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 1.5, boxShadow: 1, gridColumn: { lg: "span 8" } }}>
            <Box
              component="input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const q = String(searchTerm || "").trim();
                if (/^(rr|ro)\//i.test(q)) {
                  void applyReturnCredit(q);
                  setSearchTerm("");
                }
              }}
              placeholder="Search product, barcode, or RR/… / RO/…"
              disabled={applyingReturn}
              sx={{ width: "100%", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1, fontSize: 12.25, bgcolor: "background.paper", color: "text.primary" }}
            />

            {appliedReturn && (
              <Stack direction="row" sx={{ mt: 1, alignItems: "center", justifyContent: "space-between", gap: 1, fontSize: 10.5, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08), border: "1px solid", borderColor: (theme) => alpha(theme.palette.warning.main, 0.4), borderRadius: "3.5px", px: 1, py: 0.75, color: "warning.dark" }}>
                <Box component="span">
                  <Box component="b">{appliedReturn.displayReturnNo || formatReturnNo(appliedReturn.returnNo)}</Box>
                  {" · "}
                  Credit {formatMoney(Math.abs(toNum(appliedReturn.amount, 0)))}
                </Box>
                <IconButton
                  type="button"
                  onClick={clearAppliedReturn}
                  size="small"
                  sx={{ color: "warning.dark", "&:hover": { bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16) } }}
                  aria-label="Clear applied return"
                >
                  <X size={16} />
                </IconButton>
              </Stack>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
              {LETTER_KEYS.map((key) => (
                <Button
                  key={key}
                  onClick={() => applySearchKey(key)}
                  sx={{ minWidth: 40, px: 1.5, py: 0.75, fontSize: 12.25, borderBottom: 2, borderBottomColor: "info.light", bgcolor: "action.hover", borderRadius: "3.5px", color: "text.primary", "&:hover": { bgcolor: "action.selected" } }}
                >
                  {key}
                </Button>
              ))}
              <Button
                onClick={() => applySearchKey("CLEAR")}
                sx={{ px: 1.5, py: 0.75, fontSize: 12.25, borderBottom: 2, borderBottomColor: "error.light", bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08), borderRadius: "3.5px", color: "text.primary" }}
              >
                Clear
              </Button>
              <Button
                onClick={() => applySearchKey("SPACE")}
                sx={{ px: 1.5, py: 0.75, fontSize: 12.25, borderBottom: 2, borderBottomColor: "primary.light", bgcolor: "action.hover", borderRadius: "3.5px", color: "text.primary" }}
              >
                Space
              </Button>
              <Button
                onClick={() => applySearchKey("SLASH")}
                sx={{ px: 1.5, py: 0.75, fontSize: 12.25, borderBottom: 2, borderBottomColor: "divider", bgcolor: "action.hover", borderRadius: "3.5px", color: "text.primary", fontFamily: "monospace" }}
              >
                /
              </Button>
              <Button
                onClick={() => applySearchKey("ENTER")}
                disabled={applyingReturn}
                sx={{ px: 1.5, py: 0.75, fontSize: 12.25, borderBottom: 2, borderBottomColor: "success.main", bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.08), borderRadius: "3.5px", display: "inline-flex", alignItems: "center", color: "text.primary" }}
              >
                <CornerDownLeft size={16} style={{marginRight: 4}} /> Enter
              </Button>
            </Stack>

            <Stack spacing={1} sx={{ mt: 2, minHeight: 0, flex: 1, overflowY: "auto", pr: 0.5 }}>
              {searchTerm && filteredRows.length === 0 && (
                <Box sx={{ fontSize: 12.25, color: "text.secondary", px: 0.5 }}>No products found</Box>
              )}

              {filteredRows.map((row) => {
                const pickedQty = getDraftQty(row.id);
                const used = usedQtyByStockId.get(row.id) || 0;
                const remaining = Math.max(0, row.qty - used);
                return (
                  <Box key={row.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "5.25px", p: 1.5, bgcolor: "action.hover" }}>
                    <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 12.25 }}>{row.productName}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: "text.secondary", fontFamily: "monospace" }}>{row.barcode}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: "text.secondary", mt: 0.5 }}>
                          Selling Price: <Box component="b">{formatMoney(row.price)}</Box> | Stock: <Box component="b">{remaining}</Box>
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <IconButton
                          onClick={() => adjustDraftQty(row.id, -1)}
                          size="small"
                          sx={{ border: 1, borderColor: "divider", borderRadius: "3.5px", bgcolor: "background.paper", "&:hover": { bgcolor: "action.selected" } }}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={16} />
                        </IconButton>
                        <Box sx={{ width: 40, textAlign: "center", fontSize: 12.25, fontWeight: 600 }}>{pickedQty}</Box>
                        <IconButton
                          onClick={() => adjustDraftQty(row.id, 1)}
                          size="small"
                          sx={{ border: 1, borderColor: "divider", borderRadius: "3.5px", bgcolor: "background.paper", "&:hover": { bgcolor: "action.selected" } }}
                          aria-label="Increase quantity"
                        >
                          <Plus size={16} />
                        </IconButton>
                        <Button
                          onClick={() => addToCart(row)}
                          className="glass-btn glass-btn-primary"
                        >
                          Add To Cart
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Stack>

          <Stack sx={{ minHeight: 0, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 1.5, boxShadow: 1, gridColumn: { lg: "span 4" } }}>
            <Box sx={{ flexShrink: 0 }}>
              <Typography sx={{ fontSize: 12.25, fontWeight: 600 }}>COUNTER : //</Typography>
              <Typography sx={{ mb: 1, fontSize: 12.25, fontWeight: 600 }}>DATE/TIME : {now.toLocaleString()}</Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Box
                  component="input"
                  type="text"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyMobileKey("ENTER");
                  }}
                  placeholder="Customer mobile number"
                  sx={{ flex: 1, borderRadius: "3.5px", border: "1px solid", borderColor: "divider", px: 1.5, py: 1, fontSize: 12.25, bgcolor: "background.paper", color: "text.primary" }}
                />
                <Button
                  onClick={() => setCustomerMobile((prev) => prev.slice(0, -1))}
                  className="glass-btn glass-btn-secondary"
                >
                  <ArrowLeft size={16} />
                </Button>
                <Button
                  onClick={() => setCustomerMobile("")}
                  className="glass-btn glass-btn-danger"
                >
                  <Delete size={16} />
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap" }}>
                {DIGIT_KEYS.map((digit) => (
                  <Button
                    key={digit}
                    onClick={() => applyMobileKey(digit)}
                    sx={{ minWidth: 40, borderRadius: "3.5px", borderBottom: 2, borderBottomColor: "info.light", bgcolor: "action.hover", px: 1.5, py: 0.75, fontSize: 12.25, color: "text.primary" }}
                  >
                    {digit}
                  </Button>
                ))}
                <Button
                  onClick={() => applyMobileKey("ENTER")}
                  sx={{ display: "inline-flex", alignItems: "center", borderRadius: "3.5px", borderBottom: 2, borderBottomColor: "success.main", bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1.5, py: 0.75, fontSize: 12.25, color: "text.primary" }}
                >
                  <CornerDownLeft size={16} style={{ marginRight: 4 }} /> Enter
                </Button>
              </Stack>

              {detectedCustomer && (
                <Box sx={{ mb: 1.5, borderRadius: "3.5px", border: "1px solid", borderColor: (theme) => alpha(theme.palette.success.main, 0.4), bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1, py: 0.5, fontSize: 10.5, color: "success.dark" }}>
                  Customer: {detectedCustomer.name}
                </Box>
              )}
            </Box>

            <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", borderRadius: "3.5px", border: "1px solid", borderColor: "divider" }}>
              <Table sx={{ width: "100%", minWidth: 320, fontSize: 12.25 }}>
                <TableHead sx={{ bgcolor: "action.hover" }}>
                  <TableRow>
                    <TableCell sx={{ px: 1, py: 1, textAlign: "left" }}>Item</TableCell>
                    <TableCell sx={{ px: 1, py: 1, textAlign: "center" }}>Quantity</TableCell>
                    <TableCell sx={{ px: 1, py: 1, textAlign: "right" }}>Price</TableCell>
                    <TableCell sx={{ px: 1, py: 1, textAlign: "right" }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billLinesForDisplay.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ px: 1, py: 2, textAlign: "center", color: "text.disabled" }}>No items in bill</TableCell>
                    </TableRow>
                  ) : (
                    billLinesForDisplay.map((line) => {
                      if (line.isReturnDisplayLine) {
                        return (
                          <TableRow key={line.lineId} sx={{ borderTop: 1, borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.12 : 0.06) }}>
                            <TableCell sx={{ px: 1, py: 1 }}>
                              <Typography sx={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "warning.dark" }}>
                                {line.returnNoteLabel}
                              </Typography>
                              <Typography sx={{ fontSize: 10.5, fontWeight: 500, color: "text.primary" }}>{line.productName}</Typography>
                              <Typography sx={{ fontSize: 9, fontFamily: "monospace", color: "text.secondary" }}>{line.barcode}</Typography>
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 1, textAlign: "center", fontWeight: 500, color: "error.main" }}>{line.qty}</TableCell>
                            <TableCell sx={{ px: 1, py: 1, textAlign: "right" }}>{formatMoney(line.price)}</TableCell>
                            <TableCell sx={{ px: 1, py: 1, textAlign: "right", fontWeight: 500, color: line.lineTotal < 0 ? "error.main" : undefined }}>
                              {formatMoney(line.lineTotal)}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      const lineSubtotal = toNum(line.qty, 0) * toNum(line.price, 0);
                      const lineTax = (lineSubtotal * toNum(line.tax, 0)) / 100;
                      const lineFinal = lineSubtotal + lineTax;
                      return (
                        <TableRow key={line.lineId} sx={{ borderTop: 1, borderColor: "divider" }}>
                          <TableCell sx={{ px: 1, py: 1 }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 500 }}>{line.productName}</Typography>
                            <Typography sx={{ fontSize: 9, fontFamily: "monospace", color: "text.secondary" }}>{line.barcode}</Typography>
                          </TableCell>
                          <TableCell sx={{ px: 1, py: 1, textAlign: "center" }}>
                            <Stack direction="row" spacing={0.5} sx={{ display: "inline-flex", alignItems: "center" }}>
                              <IconButton
                                onClick={() => updateCartQty(line.lineId, -1)}
                                size="small"
                                sx={{ border: 1, borderColor: "divider", borderRadius: "3.5px", p: 0.25 }}
                              >
                                <Minus size={12} />
                              </IconButton>
                              <Box component="span" sx={{ minWidth: 20 }}>{line.qty}</Box>
                              <IconButton
                                onClick={() => updateCartQty(line.lineId, 1)}
                                size="small"
                                sx={{ border: 1, borderColor: "divider", borderRadius: "3.5px", p: 0.25 }}
                              >
                                <Plus size={12} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ px: 1, py: 1, textAlign: "right" }}>{formatMoney(line.price)}</TableCell>
                          <TableCell sx={{ px: 1, py: 1, textAlign: "right" }}>
                            <Stack direction="row" spacing={0.5} sx={{ display: "inline-flex", alignItems: "center" }}>
                              <Box component="span">{formatMoney(lineFinal)}</Box>
                              <IconButton onClick={() => removeLine(line.lineId)} size="small" sx={{ color: "error.main", p: 0.25 }}>
                                <Delete size={14} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>

            <Stack spacing={1.5} sx={{ mt: 1.5, flexShrink: 0 }}>
              <Stack spacing={0.5} sx={{ fontSize: 12.25 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}><Box component="span">Subtotal</Box><Box component="b">{formatMoney(billSummary.subtotal)}</Box></Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}><Box component="span">Tax</Box><Box component="b">{formatMoney(billSummary.taxAmount)}</Box></Stack>
                {appliedReturn ? (
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}><Box component="span">Sale amount</Box><Box component="b">{formatMoney(billSummary.finalAmount)}</Box></Stack>
                ) : null}
                <Stack direction="row" sx={{ justifyContent: "space-between", borderTop: 1, borderColor: "divider", pt: 0.5, fontWeight: 600 }}>
                  <Box component="span">Final Amount</Box>
                  <Box component="b" sx={{ color: appliedReturn && billSummary.netAmount < 0 ? "error.main" : undefined }}>
                    {formatMoney(appliedReturn ? billSummary.netAmount : billSummary.finalAmount)}
                  </Box>
                </Stack>
              </Stack>

              {appliedReturn && billSummary.netAmount < 0 ? (
                <Stack component="label" direction="row" spacing={1} sx={{ alignItems: "center", cursor: "pointer", fontSize: 10.5, color: "text.secondary" }}>
                  <Checkbox
                    size="small"
                    checked={refundApproved}
                    onChange={(e) => setRefundApproved(e.target.checked)}
                    sx={{ p: 0 }}
                  />
                  Refund to customer confirmed ({formatMoney(Math.abs(billSummary.netAmount))})
                </Stack>
              ) : null}

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
                <Button
                  onClick={() => saveTouchSale({ shouldPrint: false })}
                  disabled={saving || applyingReturn}
                  className="glass-btn glass-btn-success"
                  sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Save size={16} style={{ marginRight: 4 }} /> {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={() => saveTouchSale({ shouldPrint: true })}
                  disabled={saving || applyingReturn}
                  className="glass-btn glass-btn-primary"
                  sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Printer size={16} style={{ marginRight: 4 }} /> Save & Print
                </Button>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {loading && <Typography sx={{ mt: 1, fontSize: 10.5, color: "text.secondary" }}>Loading touch sale data...</Typography>}
      </Stack>
      <CounterAssignmentDialog
        open={counterAssignmentOpen}
        onClose={() => setCounterAssignmentOpen(false)}
      />
    </Stack>
  );
};

export default TouchSales;
