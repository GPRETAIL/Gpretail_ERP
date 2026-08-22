import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, PlusCircle, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";
import { usePrintContext } from "../../context/PrintContext";
import { buildSettlementReceiptHtml, browserPrintHtml } from "../../utils/settlementReceiptHtml";
import { loadSalesReceiptCustomization } from "../../utils/salesReceiptCustomization";
import { openNativeSelect } from "../../utils/enterToNextField";

const SETTLEMENT_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    settledat: "settledAt", settlementdate: "settledAt", date: "settledAt",
    locationname: "locationName", location: "locationName",
    countername: "counterName", counter: "counterName",
    cashamount: "cashAmount", cash: "cashAmount",
    cardamount: "cardAmount", card: "cardAmount",
    upiamount: "upiAmount", upi: "upiAmount",
    cardinfo: "cardInfo",
    receivedamount: "receivedAmount",
    returnamount: "returnAmount",
    totalreceived: "totalReceived",
  },
  required: [],
  sampleFileName: "settlement_sample.xlsx",
  sampleHeaders: [
    "company", "settledAt", "locationName", "counterName",
    "cashAmount", "cardAmount", "upiAmount", "receivedAmount", "returnAmount", "totalReceived",
  ],
};

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SETTLEMENT_FIELD_CLASS =
  "w-full h-10 border border-gray-300 dark:border-gray-600 rounded-sm px-3 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 box-border focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400";
const SETTLEMENT_SUMMARY_ROW_CLASS =
  "flex justify-between items-center gap-3 border border-gray-300 dark:border-gray-600 rounded-sm px-3 h-10 text-sm";
const SETTLEMENT_FIELD_LABEL_CLASS = "text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1";

const Settlement = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const companyId = authUser?.company_id;
  const { connected: printerConnected, printHtml: queuePrintHtml } = usePrintContext();

  const [now, setNow] = useState(new Date());
  const [billInput, setBillInput] = useState("");
  const [selectedBills, setSelectedBills] = useState([]);

  const [cashAmount, setCashAmount] = useState("0");
  const [cardAmount, setCardAmount] = useState("0");
  const [cardTypeId, setCardTypeId] = useState("");
  const [upiAmount, setUpiAmount] = useState("0");
  const [upiProviderId, setUpiProviderId] = useState("");

  const [cardTypes, setCardTypes] = useState([]);
  const [upiProviders, setUpiProviders] = useState([]);

  const [saving, setSaving] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(10);
  const [selectedSearchRows, setSelectedSearchRows] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditSearch, setCreditSearch] = useState("");
  const [creditSearching, setCreditSearching] = useState(false);
  const [creditResults, setCreditResults] = useState([]);
  const [creditSelectedCustomerId, setCreditSelectedCustomerId] = useState("");
  const [creditSaving, setCreditSaving] = useState(false);
  const [previewSettlementNo, setPreviewSettlementNo] = useState("");

  const cardTypeSelectRef = useRef(null);
  const upiProviderSelectRef = useRef(null);
  const skipCardTypeSaveOnNextEnterRef = useRef(false);
  const skipUpiProviderSaveOnNextEnterRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!companyId || showSearchPage) {
      setPreviewSettlementNo("");
      return undefined;
    }
    let cancelled = false;
    const loadPreview = async () => {
      try {
        const res = await api.get("/settlements/next-settlement-number", {
          params: { company_id: companyId, settledAt: new Date().toISOString() },
        });
        if (!cancelled) setPreviewSettlementNo(res.data?.data?.settlementNo || "");
      } catch {
        if (!cancelled) setPreviewSettlementNo("");
      }
    };
    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [companyId, showSearchPage]);

  const loadPaymentOptions = useCallback(async () => {
    try {
      const mapRows = (rows) =>
        (rows || []).map((row) => ({
          value: String(row.id),
          label: row.name,
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

  const loadUnpaidBills = useCallback(async (term = "") => {
    setSearching(true);
    try {
      const params = {
        all: "true",
        status: "all",
      };
      if (String(term || "").trim()) params.search = String(term).trim();
      const res = await api.get("/settlements/unpaid-bills", { params });
      setUnpaidBills(res.data?.data || []);
      setSearchPage(1);
    } catch {
      toast.error("Failed to load bills");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentOptions();
  }, [loadPaymentOptions]);

  const addBillToSelection = (bill) => {
    if (!bill?.id) {
      toast.error("Invalid bill row");
      return false;
    }
    if (bill?.is_canceled || String(bill?.status || "").toLowerCase() === "cancelled") {
      toast.info("Cancelled bill cannot be added");
      return false;
    }
    const normalizedStatus = String(bill?.status || "").toLowerCase();
    if (normalizedStatus === "paid" || normalizedStatus === "settled") {
      toast.info("Closed bill cannot be added");
      return false;
    }

    let added = false;
    setSelectedBills((prev) => {
      if (prev.some((row) => row.id === bill.id)) return prev;
      added = true;
      return [...prev, bill];
    });

    if (added) {
      toast.success(`Bill #${bill.bill_no} added`);
      setShowSearchPage(false);
      setSelectedSearchRows([]);
      return true;
    }

    toast.info(`Bill #${bill.bill_no} is already selected`);
    setShowSearchPage(false);
    return false;
  };

  const handleGoBill = async () => {
    const billNo = String(billInput || "").trim();
    if (!billNo) {
      toast.error("Enter bill number");
      return;
    }

    try {
      const res = await api.get(`/settlements/bill/${encodeURIComponent(billNo)}`);
      const bill = res.data?.data;
      if (!bill) {
        toast.error("Bill not found");
        return;
      }
      addBillToSelection(bill);
      setBillInput("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unpaid bill not found");
    }
  };

  const removeBill = (billId) => {
    setSelectedBills((prev) => prev.filter((row) => row.id !== billId));
  };

  const totals = useMemo(() => {
    const billsAmount = selectedBills.reduce((sum, row) => sum + toNum(row.settlement_amount ?? row.remaining_amount ?? row.amount, 0), 0);
    const discountAmount = selectedBills.reduce((sum, row) => sum + toNum(row.discount_amount, 0), 0);
    const netAmount = billsAmount;
    const isRefundSettlement = selectedBills.length > 0 && selectedBills.every((row) => Number(row?.sign || 1) < 0);

    const enteredAmount =
      Math.max(0, toNum(cashAmount, 0)) +
      Math.max(0, toNum(cardAmount, 0)) +
      Math.max(0, toNum(upiAmount, 0));
    const returnAmount = isRefundSettlement ? 0 : Math.max(enteredAmount - netAmount, 0);
    const totalReceived = isRefundSettlement ? 0 : enteredAmount - returnAmount;
    const refundedAmount = isRefundSettlement ? Math.min(enteredAmount, netAmount) : 0;
    const refundBalance = isRefundSettlement ? Math.max(netAmount - enteredAmount, 0) : 0;
    const extraRefund = isRefundSettlement ? Math.max(enteredAmount - netAmount, 0) : 0;

    return {
      billsAmount,
      discountAmount,
      netAmount,
      isRefundSettlement,
      enteredAmount,
      received: enteredAmount,
      returnAmount,
      totalReceived,
      refundedAmount,
      refundBalance,
      extraRefund,
    };
  }, [selectedBills, cashAmount, cardAmount, upiAmount]);

  const resetPayment = () => {
    setCashAmount("0");
    setCardAmount("0");
    setCardTypeId("");
    setUpiAmount("0");
    setUpiProviderId("");
  };

  const printSettlementSlip = useCallback(async ({
    settlement,
    billsSnapshot,
    cardTypeName,
    upiProviderName,
  }) => {
    const resolvedCompanyId = Number(authUser?.company_id || 0);
    let storeName =
      String(authUser?.company_name || authUser?.name || "").trim() || "Store";
    let storeAddress = "";

    if (resolvedCompanyId) {
      try {
        const res = await api.get(`/companies/${resolvedCompanyId}`);
        const company = res.data?.data || {};
        storeName =
          String(company.reg_name || company.name || storeName).trim() || storeName;
        storeAddress = String(company.address || "").trim();
      } catch {
        // Keep auth fallbacks when company details cannot be loaded.
      }
    }

    const cashValue = Math.max(0, toNum(settlement?.cash_amount ?? settlement?.cashAmount, 0));
    const cardValue = Math.max(0, toNum(settlement?.card_amount ?? settlement?.cardAmount, 0));
    const upiValue = Math.max(0, toNum(settlement?.upi_amount ?? settlement?.upiAmount, 0));
    const netAmount = toNum(settlement?.net_amount ?? settlement?.netAmount, 0);
    const isRefundSettlement = netAmount < 0;
    const refundAmount = toNum(settlement?.return_amount ?? settlement?.returnAmount, 0);
    const payments = [];
    if (cashValue > 0) payments.push({ label: "Cash", amount: cashValue });
    if (cardValue > 0) payments.push({ label: "Card", amount: cardValue });
    if (cardValue > 0 && cardTypeName) {
      payments.push({ label: "Card type", value: cardTypeName, isText: true });
    }
    if (upiValue > 0) payments.push({ label: "UPI", amount: upiValue });
    if (upiValue > 0 && upiProviderName) {
      payments.push({ label: "UPI type", value: upiProviderName, isText: true });
    }

    const receiptHtml = buildSettlementReceiptHtml({
      storeName,
      storeAddress,
      cashierName: String(authUser?.name || authUser?.email || "").trim(),
      counterName: String(settlement?.counter_name || settlement?.counterName || "Bill").trim(),
      settledAt: settlement?.settled_at || settlement?.settledAt || now.toISOString(),
      settlementNo: String(settlement?.settlement_no || settlement?.settlementNo || "").trim(),
      bills: (Array.isArray(billsSnapshot) ? billsSnapshot : []).map((row, index) => ({
        sno: index + 1,
        billNo: row.order_number || row.bill_no,
        amount: row.settlement_amount ?? row.remaining_amount ?? row.net_amount,
      })),
      grandTotal: netAmount,
      receivedAmount: toNum(settlement?.received_amount ?? settlement?.receivedAmount, 0),
      isRefundSettlement,
      refundAmount,
      payments,
    });

    const receiptCustomization = loadSalesReceiptCustomization(authUser?.company_id || "default");
    const isDirectPrint = receiptCustomization.printMode !== "browser";

    if (isDirectPrint) {
      await queuePrintHtml(receiptHtml, {
        label: `Settlement-${settlement?.settlement_no || settlement?.settlementNo || "slip"}`,
        docType: "settlement_receipt",
        copies: 1,
        companyId: authUser?.company_id,
      });
      return;
    }

    browserPrintHtml(receiptHtml, { copies: 1 });
  }, [authUser?.company_id, authUser?.company_name, authUser?.email, authUser?.name, now, printerConnected, queuePrintHtml]);

  const handleCashAmountKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!saving) {
      handleSave();
    }
  };

  const handleCardAmountKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (toNum(cardAmount, 0) <= 0) {
      if (!saving) {
        handleSave();
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
    if (toNum(upiAmount, 0) <= 0) {
      if (!saving) {
        handleSave();
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
      handleSave();
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
      handleSave();
    }
  };

  const handleSave = async () => {
    if (selectedBills.length === 0) {
      toast.error("Please add at least one bill");
      return;
    }

    const cardAmt = Math.max(0, toNum(cardAmount, 0));
    const upiAmt = Math.max(0, toNum(upiAmount, 0));

    if (cardAmt > 0 && !cardTypeId) {
      toast.error("Please select card type");
      return;
    }

    if (upiAmt > 0 && !upiProviderId) {
      toast.error("Please select UPI provider");
      return;
    }

    if (totals.isRefundSettlement && totals.refundBalance > 0) {
      toast.error(`Refund balance ${formatMoney(totals.refundBalance)} is still pending`);
      return;
    }

    if (totals.isRefundSettlement && totals.extraRefund > 0) {
      toast.error(`Refund amount cannot exceed ${formatMoney(totals.netAmount)}`);
      return;
    }

    const payload = {
      action: "settle",
      billIds: selectedBills.map((row) => row.id),
      settledAt: now.toISOString(),
      locationName: "main",
      counterName: String(authUser?.counter_name || "").trim() || null,
      cashAmount: Math.max(0, toNum(cashAmount, 0)),
      cardAmount: cardAmt,
      cardTypeId: cardTypeId || null,
      cardInfo: null,
      upiAmount: upiAmt,
      upiProviderId: upiProviderId || null,
    };

    setSaving(true);
    try {
      const billsSnapshot = selectedBills.map((row) => ({ ...row }));
      const cardTypeName = cardTypes.find((row) => row.value === cardTypeId)?.label || "";
      const upiProviderName = upiProviders.find((row) => row.value === upiProviderId)?.label || "";
      const res = await api.post("/settlements", payload);
      const settlementNo = res.data?.data?.settlement_no;
      toast.success(
        settlementNo ? `Settlement saved (${settlementNo})` : "Settlement saved successfully"
      );
      await printSettlementSlip({
        settlement: res.data?.data,
        billsSnapshot,
        cardTypeName,
        upiProviderName,
      });
      setSelectedBills([]);
      resetPayment();
      await loadUnpaidBills(searchTerm);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save settlement");
    } finally {
      setSaving(false);
    }
  };

  const searchCreditCustomers = useCallback(async (term) => {
    const mobile = String(term || "").trim();
    if (!mobile) {
      setCreditResults([]);
      setCreditSelectedCustomerId("");
      return;
    }

    setCreditSearching(true);
    try {
      const res = await api.get("/customers", { params: { search: mobile } });
      const rows = res.data?.data || [];
      setCreditResults(rows);
      setCreditSelectedCustomerId(rows[0]?.id ? String(rows[0].id) : "");
    } catch {
      toast.error("Failed to search customers");
    } finally {
      setCreditSearching(false);
    }
  }, []);

  const openCreditDialog = () => {
    if (selectedBills.length !== 1) {
      toast.error("Select exactly one bill to mark as credit");
      return;
    }
    const selectedBill = selectedBills[0];
    const normalizedStatus = String(selectedBill?.status || "").toLowerCase();
    if (normalizedStatus !== "unsettled" && normalizedStatus !== "credit") {
      toast.error("Only open unsettled bills can be marked as credit");
      return;
    }
    setCreditDialogOpen(true);
    setCreditSearch("");
    setCreditResults([]);
    setCreditSelectedCustomerId("");
  };

  const closeCreditDialog = () => {
    if (creditSaving) return;
    setCreditDialogOpen(false);
  };

  const handleSaveCredit = async () => {
    const selectedBill = selectedBills[0];
    if (!selectedBill?.id) {
      toast.error("Select a bill first");
      return;
    }
    if (!creditSelectedCustomerId) {
      toast.error("Select a customer for credit");
      return;
    }

    setCreditSaving(true);
    try {
      await api.post("/settlements", {
        action: "credit",
        billIds: [selectedBill.id],
        customerId: creditSelectedCustomerId,
      });
      toast.success("Bill marked as credit");
      setSelectedBills([]);
      setCreditDialogOpen(false);
      await loadUnpaidBills(searchTerm);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark bill as credit");
    } finally {
      setCreditSaving(false);
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/settlements/${id}`)));
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedSearchRows([]);
      await loadUnpaidBills(searchTerm);
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchTerm("");
    setSearchPage(1);
    await loadUnpaidBills("");
  };

  const handleServerSearch = useCallback(({ query }) => {
    setSearchTerm(query);
    setSearchPage(1);
    loadUnpaidBills(query);
  }, [loadUnpaidBills]);

  const settlementSearchColumns = useMemo(
    () => [
      {
        key: "settlement_no",
        label: "Settlement No",
        valueGetter: (row) => String(row.settlement_no || "").trim(),
        render: (_, row) => {
          const no = String(row?.settlement_no || "").trim();
          return (
            <span className="font-mono text-[11px] tracking-tight text-gray-800 dark:text-gray-100">
              {no || "—"}
            </span>
          );
        },
      },
      {
        key: "bill_no",
        label: "Bill No",
        valueGetter: (row) => row.bill_no || "-",
      },
      {
        key: "order_number",
        label: "Order Number",
        valueGetter: (row) => row.order_number || row.sale_id || "-",
      },
      {
        key: "sale_type",
        label: "Sale Type",
        valueGetter: (row) => row.sale_type || "-",
      },
      {
        key: "user_name",
        label: "User",
        valueGetter: (row) => row.user_name || "-",
      },
      {
        key: "counter_name",
        label: "Counter",
        valueGetter: (row) => row.counter_name || "-",
      },
      {
        key: "status",
        label: "Status",
        valueGetter: (row) => row.status || (row.is_paid ? "paid" : "unpaid"),
        render: (value) => {
          const normalized = String(value || "unpaid").toLowerCase();
          const statusClass = normalized === "paid"
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : normalized === "settled"
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            : normalized === "cancelled"
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            : normalized === "credit"
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
          const label = normalized === "paid"
            ? "Paid"
            : normalized === "settled"
              ? "Settled"
            : normalized === "cancelled"
              ? "Cancelled"
            : normalized === "credit"
              ? "Credit"
              : "Unsettled";

          return (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClass}`}>
              {label}
            </span>
          );
        },
      },
      {
        key: "settlement_amount",
        label: "Amount",
        valueGetter: (row) => toNum((row.settlement_amount ?? row.remaining_amount ?? row.amount) || 0),
        render: (value) => <div className="text-right">{formatMoney(value || 0)}</div>,
      },
      {
        key: "discount_amount",
        label: "Discount",
        valueGetter: (row) => toNum(row.discount_amount || 0),
        render: (value) => <div className="text-right">{formatMoney(value || 0)}</div>,
      },
      {
        key: "net_amount",
        label: "Net",
        valueGetter: (row) => toNum(row.net_amount || 0),
        render: (value) => <div className="text-right">{formatMoney(value || 0)}</div>,
      },
    ],
    []
  );

  const searchPagination = useMemo(() => {
    const total = unpaidBills.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(searchLimit, 1)), 1);
    return { total, totalPages };
  }, [unpaidBills.length, searchLimit]);

  const renderEntryPage = () => (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-9">
            <label className={SETTLEMENT_FIELD_LABEL_CLASS}>Bill Number</label>
            <input
              type="text"
              value={billInput}
              onChange={(e) => setBillInput(e.target.value)}
              placeholder="Enter bill number"
              className={SETTLEMENT_FIELD_CLASS}
            />
          </div>
          <div className="col-span-3">
            <button
              onClick={handleGoBill}
              className="glass-btn glass-btn-primary w-full h-10 inline-flex items-center justify-center"
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Go
            </button>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-50 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="border dark:border-gray-700 px-2 py-2 text-left">Bill Number</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-right">Amount</th>
                <th className="border dark:border-gray-700 px-2 py-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedBills.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">
                    No bill added
                  </td>
                </tr>
              ) : (
                selectedBills.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="border dark:border-gray-700 px-2 py-2 font-semibold">{row.bill_no}</td>
                    <td className="border dark:border-gray-700 px-2 py-2 text-right">{formatMoney((row.settlement_amount ?? row.remaining_amount ?? row.amount) || 0)}</td>
                    <td className="border dark:border-gray-700 px-2 py-2 text-center">
                      <button
                        onClick={() => removeBill(row.id)}
                        className="glass-btn glass-btn-danger"
                        aria-label="Remove bill"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="xl:col-span-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className={`${SETTLEMENT_SUMMARY_ROW_CLASS} md:col-span-2`}>
            <span className="text-gray-600 dark:text-gray-300">Next settlement no.</span>
            <span className="font-semibold font-mono tracking-tight">{previewSettlementNo || "—"}</span>
          </div>
          <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
            <span className="text-gray-600 dark:text-gray-300">Date</span>
            <span className="font-semibold">{now.toLocaleString()}</span>
          </div>
          <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
            <span className="text-gray-600 dark:text-gray-300">Location</span>
            <span className="font-semibold">main</span>
          </div>
          <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
            <span className="text-gray-600 dark:text-gray-300">Counter</span>
            <span className="font-semibold">{String(authUser?.counter_name || "").trim() || "-"}</span>
          </div>
          <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
            <span className="text-gray-600 dark:text-gray-300">Bill(s) Amount</span>
            <span className="font-semibold">{formatMoney(totals.billsAmount)}</span>
          </div>
          <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
            <span className="text-gray-600 dark:text-gray-300">Discount Amount</span>
            <span className="font-semibold">{formatMoney(totals.discountAmount)}</span>
          </div>
          <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
            <span className="text-gray-600 dark:text-gray-300">Net Amount</span>
            <span className="font-semibold">{formatMoney(totals.netAmount)}</span>
          </div>
          {totals.isRefundSettlement ? (
            <>
              <div className={`${SETTLEMENT_SUMMARY_ROW_CLASS} bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700`}>
                <span className="text-gray-700 dark:text-gray-300">Refund Amount</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">{formatMoney(totals.netAmount)}</span>
              </div>
              <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
                <span className="text-gray-600 dark:text-gray-300">Refunded</span>
                <span className="font-semibold">{formatMoney(totals.refundedAmount)}</span>
              </div>
              <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
                <span className="text-gray-600 dark:text-gray-300">Refund Balance</span>
                <span className={`font-semibold ${totals.refundBalance > 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                  {formatMoney(totals.refundBalance)}
                </span>
              </div>
            </>
          ) : (
            <div className={SETTLEMENT_SUMMARY_ROW_CLASS}>
              <span className="text-gray-600 dark:text-gray-300">Received</span>
              <span className="font-semibold">{formatMoney(totals.received)}</span>
            </div>
          )}
          {!totals.isRefundSettlement && totals.returnAmount > 0 && (
            <div className={`${SETTLEMENT_SUMMARY_ROW_CLASS} bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700`}>
              <span className="text-gray-700 dark:text-gray-300">Return</span>
              <span className="font-semibold">{formatMoney(totals.returnAmount)}</span>
            </div>
          )}
          {totals.isRefundSettlement && totals.extraRefund > 0 && (
            <div className={`${SETTLEMENT_SUMMARY_ROW_CLASS} bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700`}>
              <span className="text-gray-700 dark:text-gray-300">Extra Refund</span>
              <span className="font-semibold text-red-700 dark:text-red-400">{formatMoney(totals.extraRefund)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Payment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="md:col-span-2">
              <label className={SETTLEMENT_FIELD_LABEL_CLASS}>Cash</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                onKeyDown={handleCashAmountKeyDown}
                className={SETTLEMENT_FIELD_CLASS}
              />
            </div>
            <div>
              <label className={SETTLEMENT_FIELD_LABEL_CLASS}>Card</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                onKeyDown={handleCardAmountKeyDown}
                className={SETTLEMENT_FIELD_CLASS}
              />
            </div>
            <div>
              <label className={SETTLEMENT_FIELD_LABEL_CLASS}>Card type</label>
              <select
                ref={cardTypeSelectRef}
                value={cardTypeId}
                onChange={(e) => setCardTypeId(e.target.value)}
                onKeyDown={handleCardTypeKeyDown}
                className={SETTLEMENT_FIELD_CLASS}
              >
                <option value="">Select card type</option>
                {cardTypes.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={SETTLEMENT_FIELD_LABEL_CLASS}>UPI</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={upiAmount}
                onChange={(e) => setUpiAmount(e.target.value)}
                onKeyDown={handleUpiAmountKeyDown}
                className={SETTLEMENT_FIELD_CLASS}
              />
            </div>
            <div>
              <label className={SETTLEMENT_FIELD_LABEL_CLASS}>UPI type</label>
              <select
                ref={upiProviderSelectRef}
                value={upiProviderId}
                onChange={(e) => setUpiProviderId(e.target.value)}
                onKeyDown={handleUpiProviderKeyDown}
                className={SETTLEMENT_FIELD_CLASS}
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
    </div>
  );

  const renderSearchPage = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
      <FilterableDataTable
        rows={unpaidBills}
        columns={settlementSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No bills found"
        searchPlaceholder="Search in bill fields..."
        showExport={false}
        enableColumnResize
        tablePreferenceKey="sales.settlement.search"
        onRefresh={() => loadUnpaidBills(searchTerm)}
        refreshDisabled={searching}
        enableServerSearch
        onServerSearch={handleServerSearch}
        enableSelection
        selectedRows={selectedSearchRows}
        onSelectionChange={setSelectedSearchRows}
        onBulkDelete={handleBulkDelete}
        renderActions={(row) => (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addBillToSelection(row);
            }}
            className={`transition ${
              ["paid", "settled", "cancelled"].includes(String(row?.status || "").toLowerCase()) ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            }`}
            aria-label="Add bill"
            title={
              String(row?.status || "").toLowerCase() === "cancelled"
                ? "Cancelled bill cannot be added"
                : ["paid", "settled"].includes(String(row?.status || "").toLowerCase())
                  ? "Closed bill cannot be added"
                  : "Add bill"
            }
            disabled={["paid", "settled", "cancelled"].includes(String(row?.status || "").toLowerCase())}
          >
            <PlusCircle className="w-4 h-4 inline" />
          </button>
        )}
        actionsLabel="Action"
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={setSearchPage}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
        }}
        paginationMode="client"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Paid, settled, unsettled, credit, and cancelled bills are shown here. Only open unsettled or credit bills can be added.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            aria-label={showSearchPage ? "Back to settlement entry" : "Back to sales"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              Sales
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Settlement</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <UploadImportButton
            endpoint="/settlements/bulk"
            fieldConfig={SETTLEMENT_IMPORT_CONFIG}
          />
          <button
            onClick={openCreditDialog}
            disabled={saving || showSearchPage || selectedBills.length !== 1}
            className="glass-btn glass-btn-secondary inline-flex items-center disabled:opacity-50"
          >
            <UserRound className="w-4 h-4 mr-1" />
            Credit
          </button>
          <button
            onClick={handleSave}
            disabled={saving || showSearchPage}
            className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary inline-flex items-center"
            aria-label="Search"
          >
            <Search className="w-4 h-4 mr-1" />
            {showSearchPage ? "Back" : "Search"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-28">{showSearchPage ? renderSearchPage() : renderEntryPage()}</div>

      {creditDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closeCreditDialog}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b dark:border-gray-700 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Mark Bill As Credit</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Search customer by mobile number and assign this open bill as credit.</div>
              </div>
              <button
                type="button"
                onClick={closeCreditDialog}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close credit dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                <input
                  type="text"
                  value={creditSearch}
                  onChange={(event) => setCreditSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      searchCreditCustomers(creditSearch);
                    }
                  }}
                  placeholder="Write customer mobile number"
                  className="w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => searchCreditCustomers(creditSearch)}
                  disabled={creditSearching}
                  className="glass-btn glass-btn-primary disabled:opacity-50"
                >
                  {creditSearching ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="max-h-[320px] overflow-auto rounded border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="w-12 px-3 py-2 text-left"></th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditResults.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-10 text-center text-gray-400 dark:text-gray-500">
                          No customers found
                        </td>
                      </tr>
                    ) : (
                      creditResults.map((row) => {
                        const checked = String(row.id) === creditSelectedCustomerId;
                        return (
                          <tr key={row.id} className={`border-t dark:border-gray-700 ${checked ? "bg-blue-50 dark:bg-blue-900/30" : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}>
                            <td className="px-3 py-2">
                              <input
                                type="radio"
                                checked={checked}
                                onChange={() => setCreditSelectedCustomerId(String(row.id))}
                                className="h-4 w-4 accent-blue-600"
                              />
                            </td>
                            <td className="px-3 py-2">{row.name || "-"}</td>
                            <td className="px-3 py-2">{row.mobile_no || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                onClick={closeCreditDialog}
                disabled={creditSaving}
                className="glass-btn glass-btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCredit}
                disabled={creditSaving}
                className="glass-btn glass-btn-primary disabled:opacity-50"
              >
                {creditSaving ? "Saving..." : "Save Credit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlement;
