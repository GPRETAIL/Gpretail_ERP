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
        api.get("/customers").catch(() => ({ data: { data: [] } })),
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

  const fetchReceiptCompanyInfo = useCallback(async (companyId) => {
    if (!companyId) {
      return { storeAddress: "", storePhone: "", storeGstNo: "" };
    }
    try {
      const res = await api.get(`/companies/${companyId}`);
      const company = res.data?.data || {};
      return {
        storeAddress: String(company.address || "").trim(),
        storePhone: String(company.contact_no || company.phone || "").trim(),
        storeGstNo: String(company.gst_no || company.gstin || "").trim(),
      };
    } catch {
      return { storeAddress: "", storePhone: "", storeGstNo: "" };
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
    return customers.find((c) => String(c.mobile_no || "") === mobile) || null;
  }, [customerMobile, customers]);

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
      fetchReceiptCompanyInfo,
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
    <div className="flex h-full min-h-0 flex-col bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex shrink-0 items-center justify-between border-b bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-4">
        <div className="flex items-center space-x-2">
          <button onClick={() => navigate("/sales")} className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100" aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold">Sales / Touch Sale</h1>
        </div>
        <div className="flex items-center gap-3">
          <UploadImportButton
            endpoint="/touch-sales/bulk"
            fieldConfig={TOUCH_SALE_IMPORT_CONFIG}
          />
          <div className="text-sm text-gray-600 dark:text-gray-300">Next bill: <b>{formatSaleBillNo(billNo)}</b></div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
          <div className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-8">
            <input
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
              className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              disabled={applyingReturn}
            />

            {appliedReturn && (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs bg-amber-50 border border-amber-200 rounded-sm px-2 py-1.5 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100">
                <span>
                  <b>{appliedReturn.displayReturnNo || formatReturnNo(appliedReturn.returnNo)}</b>
                  {" · "}
                  Credit {formatMoney(Math.abs(toNum(appliedReturn.amount, 0)))}
                </span>
                <button
                  type="button"
                  onClick={clearAppliedReturn}
                  className="p-0.5 rounded hover:bg-amber-100 text-amber-900 dark:hover:bg-amber-800/40 dark:text-amber-200"
                  aria-label="Clear applied return"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {LETTER_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => applySearchKey(key)}
                  className="min-w-10 px-3 py-1.5 text-sm border-b-2 border-teal-400 bg-gray-100 rounded-sm hover:bg-gray-200 dark:border-teal-500 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  {key}
                </button>
              ))}
              <button
                onClick={() => applySearchKey("CLEAR")}
                className="px-3 py-1.5 text-sm border-b-2 border-red-400 bg-red-50 rounded-sm hover:bg-red-100 dark:border-red-600 dark:bg-red-900/30 dark:hover:bg-red-800/40"
              >
                Clear
              </button>
              <button
                onClick={() => applySearchKey("SPACE")}
                className="px-3 py-1.5 text-sm border-b-2 border-indigo-400 bg-gray-100 rounded-sm hover:bg-gray-200 dark:border-indigo-500 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Space
              </button>
              <button
                onClick={() => applySearchKey("SLASH")}
                className="px-3 py-1.5 text-sm border-b-2 border-gray-400 bg-gray-100 rounded-sm hover:bg-gray-200 font-mono dark:border-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                /
              </button>
              <button
                onClick={() => applySearchKey("ENTER")}
                disabled={applyingReturn}
                className="px-3 py-1.5 text-sm border-b-2 border-green-500 bg-green-50 rounded-sm hover:bg-green-100 disabled:opacity-50 inline-flex items-center dark:bg-green-900/30 dark:hover:bg-green-800/40"
              >
                <CornerDownLeft className="w-4 h-4 mr-1" /> Enter
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {searchTerm && filteredRows.length === 0 && (
                <div className="text-sm text-gray-500 px-1 dark:text-gray-400">No products found</div>
              )}

              {filteredRows.map((row) => {
                const pickedQty = getDraftQty(row.id);
                const used = usedQtyByStockId.get(row.id) || 0;
                const remaining = Math.max(0, row.qty - used);
                return (
                  <div key={row.id} className="border border-gray-200 rounded-md p-3 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm">{row.productName}</div>
                        <div className="text-xs text-gray-500 font-mono dark:text-gray-400">{row.barcode}</div>
                        <div className="text-xs text-gray-600 mt-1 dark:text-gray-300">
                          Selling Price: <b>{formatMoney(row.price)}</b> | Stock: <b>{remaining}</b>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustDraftQty(row.id, -1)}
                          className="p-1.5 border rounded-sm bg-white hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700/50"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="w-10 text-center text-sm font-semibold">{pickedQty}</div>
                        <button
                          onClick={() => adjustDraftQty(row.id, 1)}
                          className="p-1.5 border rounded-sm bg-white hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700/50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => addToCart(row)}
                          className="glass-btn glass-btn-primary"
                        >
                          Add To Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-4">
            <div className="shrink-0">
              <div className="text-sm font-semibold">COUNTER : //</div>
              <div className="mb-2 text-sm font-semibold">DATE/TIME : {now.toLocaleString()}</div>

              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyMobileKey("ENTER");
                  }}
                  placeholder="Customer mobile number"
                  className="flex-1 rounded-sm border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <button
                  onClick={() => setCustomerMobile((prev) => prev.slice(0, -1))}
                  className="glass-btn glass-btn-secondary"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCustomerMobile("")}
                  className="glass-btn glass-btn-danger"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {DIGIT_KEYS.map((digit) => (
                  <button
                    key={digit}
                    onClick={() => applyMobileKey(digit)}
                    className="min-w-10 rounded-sm border-b-2 border-teal-400 bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 dark:border-teal-500 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={() => applyMobileKey("ENTER")}
                  className="inline-flex items-center rounded-sm border-b-2 border-green-500 bg-green-50 px-3 py-1.5 text-sm hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/40"
                >
                  <CornerDownLeft className="mr-1 h-4 w-4" /> Enter
                </button>
              </div>

              {detectedCustomer && (
                <div className="mb-3 rounded-sm border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Customer: {detectedCustomer.name}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-sm border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[320px] text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 py-2 text-left">Item</th>
                    <th className="px-2 py-2 text-center">Quantity</th>
                    <th className="px-2 py-2 text-right">Price</th>
                    <th className="px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {billLinesForDisplay.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-2 py-4 text-center text-gray-400 dark:text-gray-500">No items in bill</td>
                    </tr>
                  ) : (
                    billLinesForDisplay.map((line) => {
                      if (line.isReturnDisplayLine) {
                        return (
                          <tr key={line.lineId} className="border-t bg-amber-50/60 dark:border-gray-700 dark:bg-amber-900/20">
                            <td className="px-2 py-2">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300">
                                {line.returnNoteLabel}
                              </div>
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{line.productName}</div>
                              <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{line.barcode}</div>
                            </td>
                            <td className="px-2 py-2 text-center font-medium text-red-700 dark:text-red-400">{line.qty}</td>
                            <td className="px-2 py-2 text-right">{formatMoney(line.price)}</td>
                            <td className={`px-2 py-2 text-right font-medium ${line.lineTotal < 0 ? "text-red-700 dark:text-red-400" : ""}`}>
                              {formatMoney(line.lineTotal)}
                            </td>
                          </tr>
                        );
                      }

                      const lineSubtotal = toNum(line.qty, 0) * toNum(line.price, 0);
                      const lineTax = (lineSubtotal * toNum(line.tax, 0)) / 100;
                      const lineFinal = lineSubtotal + lineTax;
                      return (
                        <tr key={line.lineId} className="border-t dark:border-gray-700">
                          <td className="px-2 py-2">
                            <div className="text-xs font-medium">{line.productName}</div>
                            <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{line.barcode}</div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => updateCartQty(line.lineId, -1)}
                                className="rounded-sm border p-0.5 dark:border-gray-600"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-5">{line.qty}</span>
                              <button
                                onClick={() => updateCartQty(line.lineId, 1)}
                                className="rounded-sm border p-0.5 dark:border-gray-600"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">{formatMoney(line.price)}</td>
                          <td className="px-2 py-2 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span>{formatMoney(lineFinal)}</span>
                              <button onClick={() => removeLine(line.lineId)} className="text-red-600 dark:text-red-400">
                                <Delete className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 shrink-0 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><b>{formatMoney(billSummary.subtotal)}</b></div>
                <div className="flex justify-between"><span>Tax</span><b>{formatMoney(billSummary.taxAmount)}</b></div>
                {appliedReturn ? (
                  <div className="flex justify-between"><span>Sale amount</span><b>{formatMoney(billSummary.finalAmount)}</b></div>
                ) : null}
                <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold dark:border-gray-700">
                  <span>Final Amount</span>
                  <b className={appliedReturn && billSummary.netAmount < 0 ? "text-red-700 dark:text-red-400" : ""}>
                    {formatMoney(appliedReturn ? billSummary.netAmount : billSummary.finalAmount)}
                  </b>
                </div>
              </div>

              {appliedReturn && billSummary.netAmount < 0 ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={refundApproved}
                    onChange={(e) => setRefundApproved(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Refund to customer confirmed ({formatMoney(Math.abs(billSummary.netAmount))})
                </label>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={() => saveTouchSale({ shouldPrint: false })}
                  disabled={saving || applyingReturn}
                  className="glass-btn glass-btn-success inline-flex items-center justify-center disabled:opacity-60"
                >
                  <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => saveTouchSale({ shouldPrint: true })}
                  disabled={saving || applyingReturn}
                  className="glass-btn glass-btn-primary inline-flex items-center justify-center disabled:opacity-60"
                >
                  <Printer className="mr-1 h-4 w-4" /> Save & Print
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading touch sale data...</p>}
      </div>
      <CounterAssignmentDialog
        open={counterAssignmentOpen}
        onClose={() => setCounterAssignmentOpen(false)}
      />
    </div>
  );
};

export default TouchSales;
