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
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

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

const SETTLEMENT_FIELD_SX = {
  "& .MuiInputBase-root": { height: 40 },
  "& .MuiInputBase-input": { fontSize: 12.25 },
};
const SETTLEMENT_NATIVE_SELECT_SX = {
  width: "100%",
  height: 40,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "3.5px",
  px: 1.5,
  fontSize: 12.25,
  bgcolor: "background.paper",
  color: "text.primary",
  boxSizing: "border-box",
  "&:disabled": { bgcolor: "action.hover", color: "text.disabled" },
};
const SETTLEMENT_SUMMARY_ROW_SX = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 1.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "3.5px",
  px: 1.5,
  height: 40,
  fontSize: 12.25,
};
const SETTLEMENT_FIELD_LABEL_SX = { fontSize: 10.5, fontWeight: 500, color: "text.secondary", display: "block", mb: 0.5 };

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
            <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "-0.01em", color: "text.primary" }}>
              {no || "—"}
            </Box>
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
          const statusColor = normalized === "paid"
            ? "success"
            : normalized === "settled"
              ? "success"
            : normalized === "cancelled"
              ? "error"
            : normalized === "credit"
              ? "primary"
              : "warning";
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
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                px: 1,
                py: 0.25,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 500,
                bgcolor: (theme) => alpha(theme.palette[statusColor].main, theme.palette.mode === "dark" ? 0.16 : 0.08),
                color: `${statusColor}.main`,
              }}
            >
              {label}
            </Box>
          );
        },
      },
      {
        key: "settlement_amount",
        label: "Amount",
        valueGetter: (row) => toNum((row.settlement_amount ?? row.remaining_amount ?? row.amount) || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatMoney(value || 0)}</Box>,
      },
      {
        key: "discount_amount",
        label: "Discount",
        valueGetter: (row) => toNum(row.discount_amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatMoney(value || 0)}</Box>,
      },
      {
        key: "net_amount",
        label: "Net",
        valueGetter: (row) => toNum(row.net_amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatMoney(value || 0)}</Box>,
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
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(12, 1fr)" }, gap: 2 }}>
      <Stack spacing={2} sx={{ gridColumn: { xl: "span 5" }, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1, alignItems: "end" }}>
          <Box sx={{ gridColumn: "span 9" }}>
            <Typography component="label" sx={SETTLEMENT_FIELD_LABEL_SX}>Bill Number</Typography>
            <TextField
              type="text"
              value={billInput}
              onChange={(e) => setBillInput(e.target.value)}
              placeholder="Enter bill number"
              size="small"
              fullWidth
              sx={SETTLEMENT_FIELD_SX}
            />
          </Box>
          <Box sx={{ gridColumn: "span 3" }}>
            <Button
              onClick={handleGoBill}
              className="glass-btn glass-btn-primary"
              fullWidth
              sx={{ height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <PlusCircle size={16} style={{marginRight: 4}} /> Go
            </Button>
          </Box>
        </Box>

        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "5.25px", overflowX: "auto" }}>
          <Table sx={{ width: "100%", fontSize: 12.25 }}>
            <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "text.secondary" }}>
              <TableRow>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "left" }}>Bill Number</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Amount</TableCell>
                <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "center", width: 48 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ px: 1.5, py: 4, textAlign: "center", color: "text.disabled" }}>
                    No bill added
                  </TableCell>
                </TableRow>
              ) : (
                selectedBills.map((row) => (
                  <TableRow key={row.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, fontWeight: 600 }}>{row.bill_no}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>{formatMoney((row.settlement_amount ?? row.remaining_amount ?? row.amount) || 0)}</TableCell>
                    <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "center" }}>
                      <Button
                        onClick={() => removeBill(row.id)}
                        className="glass-btn glass-btn-danger"
                        aria-label="Remove bill"
                      >
                        <Trash2 size={16} style={{ display: "inline" }} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Stack>

      <Stack spacing={1.5} sx={{ gridColumn: { xl: "span 7" }, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1, fontSize: 12.25 }}>
          <Box sx={{ ...SETTLEMENT_SUMMARY_ROW_SX, gridColumn: { md: "span 2" } }}>
            <Box component="span" sx={{ color: "text.secondary" }}>Next settlement no.</Box>
            <Box component="span" sx={{ fontWeight: 600, fontFamily: "monospace", letterSpacing: "-0.01em" }}>{previewSettlementNo || "—"}</Box>
          </Box>
          <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
            <Box component="span" sx={{ color: "text.secondary" }}>Date</Box>
            <Box component="span" sx={{ fontWeight: 600 }}>{now.toLocaleString()}</Box>
          </Box>
          <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
            <Box component="span" sx={{ color: "text.secondary" }}>Location</Box>
            <Box component="span" sx={{ fontWeight: 600 }}>main</Box>
          </Box>
          <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
            <Box component="span" sx={{ color: "text.secondary" }}>Counter</Box>
            <Box component="span" sx={{ fontWeight: 600 }}>{String(authUser?.counter_name || "").trim() || "-"}</Box>
          </Box>
          <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
            <Box component="span" sx={{ color: "text.secondary" }}>Bill(s) Amount</Box>
            <Box component="span" sx={{ fontWeight: 600 }}>{formatMoney(totals.billsAmount)}</Box>
          </Box>
          <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
            <Box component="span" sx={{ color: "text.secondary" }}>Discount Amount</Box>
            <Box component="span" sx={{ fontWeight: 600 }}>{formatMoney(totals.discountAmount)}</Box>
          </Box>
          <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
            <Box component="span" sx={{ color: "text.secondary" }}>Net Amount</Box>
            <Box component="span" sx={{ fontWeight: 600 }}>{formatMoney(totals.netAmount)}</Box>
          </Box>
          {totals.isRefundSettlement ? (
            <>
              <Box sx={{ ...SETTLEMENT_SUMMARY_ROW_SX, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08), borderColor: (theme) => alpha(theme.palette.warning.main, 0.4) }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Refund Amount</Box>
                <Box component="span" sx={{ fontWeight: 600, color: "warning.dark" }}>{formatMoney(totals.netAmount)}</Box>
              </Box>
              <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
                <Box component="span" sx={{ color: "text.secondary" }}>Refunded</Box>
                <Box component="span" sx={{ fontWeight: 600 }}>{formatMoney(totals.refundedAmount)}</Box>
              </Box>
              <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
                <Box component="span" sx={{ color: "text.secondary" }}>Refund Balance</Box>
                <Box component="span" sx={{ fontWeight: 600, color: totals.refundBalance > 0 ? "error.main" : "success.main" }}>
                  {formatMoney(totals.refundBalance)}
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={SETTLEMENT_SUMMARY_ROW_SX}>
              <Box component="span" sx={{ color: "text.secondary" }}>Received</Box>
              <Box component="span" sx={{ fontWeight: 600 }}>{formatMoney(totals.received)}</Box>
            </Box>
          )}
          {!totals.isRefundSettlement && totals.returnAmount > 0 && (
            <Box sx={{ ...SETTLEMENT_SUMMARY_ROW_SX, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08), borderColor: (theme) => alpha(theme.palette.warning.main, 0.4) }}>
              <Box component="span" sx={{ color: "text.secondary" }}>Return</Box>
              <Box component="span" sx={{ fontWeight: 600 }}>{formatMoney(totals.returnAmount)}</Box>
            </Box>
          )}
          {totals.isRefundSettlement && totals.extraRefund > 0 && (
            <Box sx={{ ...SETTLEMENT_SUMMARY_ROW_SX, bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08), borderColor: (theme) => alpha(theme.palette.error.main, 0.4) }}>
              <Box component="span" sx={{ color: "text.secondary" }}>Extra Refund</Box>
              <Box component="span" sx={{ fontWeight: 600, color: "error.main" }}>{formatMoney(totals.extraRefund)}</Box>
            </Box>
          )}
        </Box>

        <Stack spacing={1}>
          <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Payment</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
            <Box sx={{ gridColumn: { md: "span 2" } }}>
              <Typography component="label" sx={SETTLEMENT_FIELD_LABEL_SX}>Cash</Typography>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                onKeyDown={handleCashAmountKeyDown}
                size="small"
                fullWidth
                sx={SETTLEMENT_FIELD_SX}
              />
            </Box>
            <Box>
              <Typography component="label" sx={SETTLEMENT_FIELD_LABEL_SX}>Card</Typography>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                onKeyDown={handleCardAmountKeyDown}
                size="small"
                fullWidth
                sx={SETTLEMENT_FIELD_SX}
              />
            </Box>
            <Box>
              <Typography component="label" sx={SETTLEMENT_FIELD_LABEL_SX}>Card type</Typography>
              <Box
                component="select"
                ref={cardTypeSelectRef}
                value={cardTypeId}
                onChange={(e) => setCardTypeId(e.target.value)}
                onKeyDown={handleCardTypeKeyDown}
                sx={SETTLEMENT_NATIVE_SELECT_SX}
              >
                <option value="">Select card type</option>
                {cardTypes.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography component="label" sx={SETTLEMENT_FIELD_LABEL_SX}>UPI</Typography>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={upiAmount}
                onChange={(e) => setUpiAmount(e.target.value)}
                onKeyDown={handleUpiAmountKeyDown}
                size="small"
                fullWidth
                sx={SETTLEMENT_FIELD_SX}
              />
            </Box>
            <Box>
              <Typography component="label" sx={SETTLEMENT_FIELD_LABEL_SX}>UPI type</Typography>
              <Box
                component="select"
                ref={upiProviderSelectRef}
                value={upiProviderId}
                onChange={(e) => setUpiProviderId(e.target.value)}
                onKeyDown={handleUpiProviderKeyDown}
                sx={SETTLEMENT_NATIVE_SELECT_SX}
              >
                <option value="">Select UPI provider</option>
                {upiProviders.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Box>
            </Box>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );

  const renderSearchPage = () => (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
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
          <IconButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addBillToSelection(row);
            }}
            size="small"
            sx={{
              color: ["paid", "settled", "cancelled"].includes(String(row?.status || "").toLowerCase()) ? "text.disabled" : "primary.main",
              cursor: ["paid", "settled", "cancelled"].includes(String(row?.status || "").toLowerCase()) ? "not-allowed" : "pointer",
            }}
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
            <PlusCircle size={16} style={{ display: "inline" }} />
          </IconButton>
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
      <Typography sx={{ fontSize: 10.5, color: "text.secondary", mt: 1 }}>Paid, settled, unsettled, credit, and cancelled bills are shown here. Only open unsettled or credit bills can be added.</Typography>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            sx={{ color: "text.secondary" }}
            aria-label={showSearchPage ? "Back to settlement entry" : "Back to sales"}
          >
            <ArrowLeft size={16} />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              type="button"
              onClick={() => navigate("/sales")}
              sx={{ color: "primary.main", textTransform: "none", minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}
            >
              Sales
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Settlement</Box>
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <UploadImportButton
            endpoint="/settlements/bulk"
            fieldConfig={SETTLEMENT_IMPORT_CONFIG}
          />
          <Button
            onClick={openCreditDialog}
            disabled={saving || showSearchPage || selectedBills.length !== 1}
            className="glass-btn glass-btn-secondary disabled:opacity-50"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <UserRound size={16} style={{marginRight: 4}} />
            Credit
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || showSearchPage}
            className="glass-btn glass-btn-success disabled:opacity-50"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Save size={16} style={{marginRight: 4}} />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary"
            sx={{ display: "inline-flex", alignItems: "center" }}
            aria-label="Search"
          >
            <Search size={16} style={{marginRight: 4}} />
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2} sx={{ p: 2, pb: 7 }}>{showSearchPage ? renderSearchPage() : renderEntryPage()}</Stack>

      {creditDialogOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closeCreditDialog}
        >
          <Box
            sx={{ width: "100%", maxWidth: 672, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 8 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Mark Bill As Credit</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Search customer by mobile number and assign this open bill as credit.</Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closeCreditDialog}
                size="small"
                sx={{ color: "text.disabled" }}
                aria-label="Close credit dialog"
              >
                <X size={16} />
              </IconButton>
            </Stack>

            <Stack spacing={2} sx={{ px: 2, py: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 96px", gap: 1 }}>
                <TextField
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
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
                />
                <Button
                  type="button"
                  onClick={() => searchCreditCustomers(creditSearch)}
                  disabled={creditSearching}
                  className="glass-btn glass-btn-primary disabled:opacity-50"
                >
                  {creditSearching ? "Searching..." : "Search"}
                </Button>
              </Box>

              <Box sx={{ maxHeight: 320, overflow: "auto", borderRadius: "3.5px", border: "1px solid", borderColor: "divider" }}>
                <Table sx={{ width: "100%", fontSize: 12.25 }}>
                  <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover", color: "text.secondary" }}>
                    <TableRow>
                      <TableCell sx={{ width: 48, px: 1.5, py: 1, textAlign: "left" }}></TableCell>
                      <TableCell sx={{ px: 1.5, py: 1, textAlign: "left" }}>Name</TableCell>
                      <TableCell sx={{ px: 1.5, py: 1, textAlign: "left" }}>Mobile</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {creditResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} sx={{ px: 1.5, py: 4, textAlign: "center", color: "text.disabled" }}>
                          No customers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      creditResults.map((row) => {
                        const checked = String(row.id) === creditSelectedCustomerId;
                        return (
                          <TableRow key={row.id} sx={{ borderTop: 1, borderColor: "divider", bgcolor: checked ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "transparent", "&:hover": { bgcolor: checked ? undefined : "action.hover" } }}>
                            <TableCell sx={{ px: 1.5, py: 1 }}>
                              <Box
                                component="input"
                                type="radio"
                                checked={checked}
                                onChange={() => setCreditSelectedCustomerId(String(row.id))}
                                sx={{ height: 16, width: 16, accentColor: "primary.main" }}
                              />
                            </TableCell>
                            <TableCell sx={{ px: 1.5, py: 1 }}>{row.name || "-"}</TableCell>
                            <TableCell sx={{ px: 1.5, py: 1 }}>{row.mobile_no || "-"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Button
                type="button"
                onClick={closeCreditDialog}
                disabled={creditSaving}
                className="glass-btn glass-btn-secondary disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCredit}
                disabled={creditSaving}
                className="glass-btn glass-btn-primary disabled:opacity-50"
              >
                {creditSaving ? "Saving..." : "Save Credit"}
              </Button>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Settlement;
