import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import SearchableSelect from "../../components/SearchableSelect";
import { useTheme as useAppTheme } from "../../features/theme-context";
import { createNamedTheme, TONES } from "../../theme/themeRegistry";
import { StatusChip } from "../../theme/StatusChip";
import {
  ThemeProvider,
  Box,
  Stack,
  Card,
  Typography,
  Breadcrumbs,
  Link,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";

const fmt = (val) => {
  const n = Number(val);
  if (isNaN(n)) return val ?? "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PAYMENT_MODES = ["Cheque", "Cash", "Multiple Cheque", "PDC"];
const getPaymentStatusMeta = (row) => {
  const paid = Number(row?.paid || 0);
  const balance = Number(row?.balance || 0);

  if (balance <= 0 && paid > 0) {
    return { label: "Paid", tone: "success" };
  }

  if (balance > 0 && paid > 0) {
    return { label: "Partial Paid", tone: "info" };
  }

  return { label: "Pending", tone: "warning" };
};

const DETAIL_COLUMNS = [
  { key: "product_name", label: "Product", align: "left" },
  { key: "brand_name", label: "Brand", align: "left" },
  { key: "size", label: "Size", align: "left" },
  { key: "design_no", label: "Design No", align: "left" },
  { key: "rate", label: "Rate", align: "right" },
  { key: "purchased_qty", label: "Purchased Qty", align: "right" },
  { key: "sold_qty", label: "Sold Qty", align: "right" },
  { key: "remaining_qty", label: "Available Qty", align: "right" },
  { key: "purchased_value", label: "Purchased Value", align: "right" },
  { key: "remaining_stock_value", label: "Stock Value", align: "right" },
];
const PENDING_TABLE_COLUMNS = [
  { key: "supplier_name", label: "Supplier Name" },
  { key: "invoice_no", label: "Inv. No" },
  {
    key: "invoice_type",
    label: "Invoice Type",
    valueGetter: (row) => (row.invoice_type === "invoice" ? "Invoice" : "Direct Purchase"),
    render: (_, row) => (
      <StatusChip
        label={row.invoice_type === "invoice" ? "Invoice" : "Direct Purchase"}
        tone={row.invoice_type === "invoice" ? "info" : "warning"}
      />
    ),
  },
  { key: "invoice_date", label: "Inv. Date" },
  {
    key: "days",
    label: "Days",
    render: (value) => (
      <span className={`font-medium ${
        Number(value) > 90 ? "text-red-600 dark:text-red-400" : Number(value) > 30 ? "text-orange-600 dark:text-orange-400" : "text-gray-700 dark:text-gray-300"
      }`}>
        {value}
      </span>
    ),
  },
  {
    key: "discount_perc",
    label: "Discount%",
    render: (value) => `${value}%`,
  },
  { key: "total", label: "Total", aggregate: "sum", render: (value) => fmt(value) },
  { key: "paid", label: "Paid", aggregate: "sum", render: (value) => <span className="text-green-600">{fmt(value)}</span> },
  { key: "balance", label: "Balance", aggregate: "sum", render: (value) => <span className="font-medium text-red-600 dark:text-red-400">{fmt(value)}</span> },
  {
    key: "status",
    label: "Status",
    valueGetter: (row) => getPaymentStatusMeta(row).label,
    render: (_, row) => {
      const status = getPaymentStatusMeta(row);
      return <StatusChip label={status.label} tone={status.tone} />;
    },
  },
  { key: "amount", label: "Amount", aggregate: "sum", render: (value) => <span className="font-medium">{fmt(value)}</span> },
];
const HISTORY_TABLE_COLUMNS = PENDING_TABLE_COLUMNS.filter((column) => column.key !== "amount");

// Label above a field, matching the app's existing small-caps field-label look.
const fieldLabelSx = { fontSize: 11, fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" };

// Read-only "field display" box used in the Invoice Summary panel.
const SummaryField = ({ label, children, sx }) => (
  <Box>
    <Typography component="label" sx={fieldLabelSx}>{label}</Typography>
    <Box sx={{ fontSize: 12, color: "text.primary", bgcolor: "action.hover", px: 1, py: 0.75, borderRadius: 1, ...sx }}>
      {children}
    </Box>
  </Box>
);

const SupplierPayment = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme: appTheme } = useAppTheme();
  const brand = useSelector((state) => state.auth.user?.brand);
  const muiTheme = useMemo(
    () => createNamedTheme("finance", appTheme, brand?.primary_color ? { primary: { main: brand.primary_color } } : {}),
    [appTheme, brand]
  );

  // ─── Screen state: "search", "detail", or "payment" ──────────────────────
  const [screen, setScreen] = useState("search");
  const [showSearchPage, setShowSearchPage] = useState(false);

  // ─── Dropdown data ─────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [cities, setCities] = useState([]);
  const [sections, setSections] = useState([]);

  // ─── Search filters ────────────────────────────────────────────────────────
  const [companyId, setCompanyId] = useState("");
  const [location, setLocation] = useState("");
  const [agentId, setAgentId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cityId, setCityId] = useState("");
  const [section, setSection] = useState("");

  // ─── Table state ───────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [totalPayable, setTotalPayable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Server-side search/sort (FilterableDataTable's enableServerSearch/onSortChange) ──────────
  const [pendingSearch, setPendingSearch] = useState({ query: "", field: "all" });
  const [pendingSort, setPendingSort] = useState({ column: null, direction: "asc" });
  const [historySearch, setHistorySearch] = useState({ query: "", field: "all" });
  const [historySort, setHistorySort] = useState({ column: null, direction: "asc" });

  // ─── Server-side pagination (FilterableDataTable's paginationMode="server") ──────────────────
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLimit, setPendingLimit] = useState(20);
  const [pendingPagination, setPendingPagination] = useState({ total: 0, totalPages: 1 });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(20);
  const [historyPagination, setHistoryPagination] = useState({ total: 0, totalPages: 1 });

  // ─── Payment form state ────────────────────────────────────────────────────
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [refNo, setRefNo] = useState("");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentBackScreen, setPaymentBackScreen] = useState("search");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // ─── Load dropdown data on mount ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [compRes, locRes, agentRes, cityRes, secRes] = await Promise.all([
          api.get("/companies").catch(() => ({ data: { data: [] } })),
          api.get("/configurations/location").catch(() => ({ data: { data: [] } })),
          api.get("/agents", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
          api.get("/configurations/city").catch(() => ({ data: { data: [] } })),
          api.get("/hr-sections").catch(() => ({ data: { data: [] } })),
        ]);
        setCompanies(compRes.data?.data || []);
        setLocations(locRes.data?.data || []);
        setAgents(agentRes.data?.data || []);
        setCities(cityRes.data?.data || []);
        setSections(secRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load supplier payment filters:", err);
      }
    };
    load();
  }, []);

  // ─── Search pending invoices ───────────────────────────────────────────────
  // `overrides.search`/`overrides.sort` let FilterableDataTable's onServerSearch/onSortChange
  // fire a fetch with the fresh value immediately, instead of round-tripping through state first
  // (which would read a stale value on this same call, since setState is async). Absent an
  // override, the currently active search/sort just carries forward -- so the "Search Pendings"
  // button (company/date/etc. filters) doesn't silently clear whatever the user had typed into
  // the table's own search box.
  const handleSearch = useCallback(async (overrides = {}) => {
    const search = overrides.search ?? pendingSearch;
    const sort = overrides.sort ?? pendingSort;
    const page = overrides.page ?? pendingPage;
    const limit = overrides.limit ?? pendingLimit;
    setLoading(true);
    try {
      const params = {};
      if (companyId) params.company_id = companyId;
      if (location) params.location = location;
      if (agentId) params.agent_id = agentId;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (cityId) params.city_id = cityId;
      if (section) params.section = section;
      if (search.query) {
        params.search = search.query;
        params.field = search.field;
      }
      if (sort.column) {
        params.sort = sort.column;
        params.dir = sort.direction;
      }
      params.page = page;
      params.limit = limit;
      // Value-compared, not blind: an unconditional setState here (even with identical content)
      // would still be a NEW object reference every call, and that reference feeds into
      // handlePendingServerSearch/handlePendingSortChange below -- which, without the stable-ref
      // pattern those use, would hand FilterableDataTable's onServerSearch-dependent debounce
      // effect a "changed" prop on every render, re-firing it forever.
      if (overrides.search && (overrides.search.query !== pendingSearch.query || overrides.search.field !== pendingSearch.field)) {
        setPendingSearch(overrides.search);
      }
      if (overrides.sort && (overrides.sort.column !== pendingSort.column || overrides.sort.direction !== pendingSort.direction)) {
        setPendingSort(overrides.sort);
      }
      if (overrides.page !== undefined && overrides.page !== pendingPage) {
        setPendingPage(overrides.page);
      }
      if (overrides.limit !== undefined && overrides.limit !== pendingLimit) {
        setPendingLimit(overrides.limit);
      }

      const res = await api.get("/supplier-payments/pending", { params });
      setRows(res.data?.data || []);
      setTotalPayable(res.data?.totalPayable || 0);
      setPendingPagination({
        total: res.data?.pagination?.total || 0,
        totalPages: res.data?.pagination?.totalPages || 1,
      });
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load pending bills");
      setRows([]);
      setTotalPayable(0);
      setPendingPagination({ total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [companyId, location, agentId, fromDate, toDate, cityId, section, pendingSearch, pendingSort, pendingPage, pendingLimit]);

  // Stable identity (never changes reference), so FilterableDataTable's own onServerSearch/
  // onSortChange-dependent effects never re-fire just because handleSearch itself was recreated
  // for an unrelated reason (a filter dropdown changed, or pendingSearch/pendingSort updated) --
  // these always call through to whatever handleSearch currently is via the ref.
  const handleSearchRef = useRef(handleSearch);
  useEffect(() => { handleSearchRef.current = handleSearch; }, [handleSearch]);

  const handlePendingServerSearch = useCallback(({ query, field }) => {
    handleSearchRef.current({ search: { query: query || "", field: field || "all" }, page: 1 });
  }, []);

  const handlePendingSortChange = useCallback((column, direction) => {
    handleSearchRef.current({ sort: { column, direction }, page: 1 });
  }, []);

  const handlePendingPageChange = useCallback((newPage) => {
    handleSearchRef.current({ page: newPage });
  }, []);

  const handlePendingLimitChange = useCallback((newLimit) => {
    handleSearchRef.current({ limit: newLimit, page: 1 });
  }, []);

  const handleHistorySearch = useCallback(async (overrides = {}) => {
    const search = overrides.search ?? historySearch;
    const sort = overrides.sort ?? historySort;
    const page = overrides.page ?? historyPage;
    const limit = overrides.limit ?? historyLimit;
    setHistoryLoading(true);
    try {
      const params = {};
      if (search.query) {
        params.search = search.query;
        params.field = search.field;
      }
      if (sort.column) {
        params.sort = sort.column;
        params.dir = sort.direction;
      }
      params.page = page;
      params.limit = limit;
      if (overrides.search && (overrides.search.query !== historySearch.query || overrides.search.field !== historySearch.field)) {
        setHistorySearch(overrides.search);
      }
      if (overrides.sort && (overrides.sort.column !== historySort.column || overrides.sort.direction !== historySort.direction)) {
        setHistorySort(overrides.sort);
      }
      if (overrides.page !== undefined && overrides.page !== historyPage) {
        setHistoryPage(overrides.page);
      }
      if (overrides.limit !== undefined && overrides.limit !== historyLimit) {
        setHistoryLimit(overrides.limit);
      }

      const res = await api.get("/supplier-payments/history", { params });
      setHistoryRows(res.data?.data || []);
      setHistoryPagination({
        total: res.data?.pagination?.total || 0,
        totalPages: res.data?.pagination?.totalPages || 1,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load supplier payment history");
      setHistoryRows([]);
      setHistoryPagination({ total: 0, totalPages: 1 });
    } finally {
      setHistoryLoading(false);
    }
  }, [historySearch, historySort, historyPage, historyLimit]);

  const handleHistorySearchRef = useRef(handleHistorySearch);
  useEffect(() => { handleHistorySearchRef.current = handleHistorySearch; }, [handleHistorySearch]);

  const handleHistoryServerSearch = useCallback(({ query, field }) => {
    handleHistorySearchRef.current({ search: { query: query || "", field: field || "all" }, page: 1 });
  }, []);

  const handleHistorySortChange = useCallback((column, direction) => {
    handleHistorySearchRef.current({ sort: { column, direction }, page: 1 });
  }, []);

  const handleHistoryPageChange = useCallback((newPage) => {
    handleHistorySearchRef.current({ page: newPage });
  }, []);

  const handleHistoryLimitChange = useCallback((newLimit) => {
    handleHistorySearchRef.current({ limit: newLimit, page: 1 });
  }, []);

  const openSearchPage = useCallback(() => {
    setScreen("search");
    setShowSearchPage(true);
    handleHistorySearch();
  }, [handleHistorySearch]);

  // ─── Selection helpers ─────────────────────────────────────────────────────
  const rowKey = (r) => `${r.invoice_type}-${r.id}`;

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(rowKey(r))),
    [rows, selectedIds]
  );
  const selectedRowKeys = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const handleSelectionChange = useCallback((keys) => {
    setSelectedIds(new Set(keys));
  }, []);
  const searchableTriggerCls = "w-full rounded-md border-gray-300 dark:border-gray-600 px-3 py-2 text-xs sm:text-sm";
  const searchableOptions = useMemo(() => ({
    companies: [{ value: "", label: "All Companies" }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))],
    locations: [{ value: "", label: "All Locations" }, ...locations.map((l) => ({ value: l.name, label: l.name }))],
    agents: [{ value: "", label: "All Agents" }, ...agents.map((a) => ({ value: String(a.id), label: a.name }))],
    cities: [{ value: "", label: "All Cities" }, ...cities.map((c) => ({ value: String(c.id), label: c.name }))],
    sections: [{ value: "", label: "All Sections" }, ...sections.map((s) => ({ value: s.name, label: s.name }))],
  }), [companies, locations, agents, cities, sections]);

  // ─── Navigate to payment screen ────────────────────────────────────────────
  const [paymentItems, setPaymentItems] = useState([]);

  const goToPayment = (items, backScreen = "search") => {
    const payableItems = (items || []).filter((item) => Number(item?.balance || 0) > 0);
    if (payableItems.length === 0) {
      toast.warn("This invoice is already fully paid");
      return;
    }

    setPaymentItems(payableItems);
    const total = payableItems.reduce((s, r) => s + r.balance, 0);
    setPaidAmountInput(total.toFixed(2));
    setPaymentBackScreen(backScreen);
    setScreen("payment");
  };

  const handlePaySingle = async (row) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/supplier-payments/pending/${row.invoice_type}/${row.id}/details`);
      setDetailData(res.data?.data || null);
      setScreen("detail");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load invoice details");
    } finally {
      setDetailLoading(false);
    }
  };

  // Deep-link from a notification click (Navbar's bell): ?openInvoiceType=
  // direct&openInvoiceId=123 auto-opens that invoice's detail screen on
  // arrival, then clears the params so a later refresh doesn't re-trigger it.
  useEffect(() => {
    const type = searchParams.get("openInvoiceType");
    const id = searchParams.get("openInvoiceId");
    if (type && id) {
      handlePaySingle({ invoice_type: type, id });
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPayment = () => {
    if (selectedRows.length === 0) {
      toast.warn("Please select at least one invoice");
      return;
    }
    goToPayment(selectedRows);
  };

  // ─── Save payment ──────────────────────────────────────────────────────────
  const handleSavePayment = async () => {
    const amt = Number(paidAmountInput || 0);
    if (amt <= 0) { toast.warn("Enter a valid amount"); return; }
    if (!paymentDate) { toast.warn("Select payment date"); return; }

    setSaving(true);
    try {
      await api.post("/supplier-payments", {
        paymentDate,
        paymentMode,
        refNo,
        paidAmount: amt,
        remarks,
        invoices: paymentItems.map((r) => ({
          id: r.id,
          invoice_type: r.invoice_type,
          supplier_id: r.supplier_id,
          company_id: r.company_id,
          amount: Math.min(r.balance, amt / paymentItems.length), // distribute evenly or up to balance
        })),
      });
      toast.success("Payment saved successfully");
      setScreen("search");
      handleSearch(); // refresh the pending list
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const totalSelectedPayable = paymentItems.reduce((s, r) => s + r.balance, 0);
  const isHistoryView = screen === "search" && showSearchPage;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        className="master-responsive"
        sx={{
          display: "flex", height: "100%", minHeight: 0, width: "100%", flexDirection: "column",
          overflow: "hidden", bgcolor: "background.default", color: "text.primary",
        }}
      >
        {/* ── Breadcrumb header ──────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton
              size="small"
              sx={{ color: "text.secondary" }}
              onClick={() => {
                if (screen === "payment") { setScreen(paymentBackScreen); return; }
                if (screen === "detail") { setScreen("search"); return; }
                if (showSearchPage) { setShowSearchPage(false); return; }
                navigate("/finance");
              }}
            >
              <ArrowLeft className="w-4 h-4" />
            </IconButton>
            <Breadcrumbs
              separator="/"
              sx={{ fontSize: 13, "& .MuiBreadcrumbs-separator": { color: "text.disabled", mx: 0.5 } }}
            >
              <Link component="button" type="button" underline="hover" color="primary" onClick={() => navigate("/finance")} sx={{ fontSize: 13, fontWeight: 600 }}>
                Finance
              </Link>
              <Link
                component="button"
                type="button"
                underline="hover"
                color="primary"
                sx={{ fontSize: 13, fontWeight: 600 }}
                onClick={() => { setShowSearchPage(false); setScreen("search"); }}
              >
                Supplier Payment
              </Link>
              {showSearchPage && <Typography sx={{ fontSize: 13, fontWeight: 600, color: "primary.main" }}>Supplier-Payment-Search</Typography>}
              {screen === "detail" && <Typography sx={{ fontSize: 13, fontWeight: 600, color: "primary.main" }}>Invoice Details</Typography>}
              {screen === "payment" && <Typography sx={{ fontSize: 13, fontWeight: 600, color: "primary.main" }}>Make Payment</Typography>}
            </Breadcrumbs>
          </Stack>
          <Box>
            {isHistoryView ? (
              <ExportBottomSheet
                columns={HISTORY_TABLE_COLUMNS}
                rows={historyRows}
                fileName="supplier_payment_search"
                title="Supplier-Payment-Search"
                buttonClassName="topbar-action-btn topbar-action-export"
              />
            ) : (
              <button type="button" className="glass-btn glass-btn-primary flex items-center" onClick={openSearchPage}>
                <Search className="w-4 h-4 mr-1" /> Search
              </button>
            )}
          </Box>
        </Box>

        {/* ═══════════════ SCREEN 1: SEARCH PENDING BILLS ═══════════════════════ */}
        {screen === "search" && !showSearchPage && (
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}>
            <Stack direction={{ xs: "column", xl: "row" }} spacing={{ xs: 2, xl: 1 }} sx={{ height: "100%", minHeight: 0, minWidth: 0 }}>
              {/* ── LEFT PANEL: Filters ──────────────────────────────────────── */}
              <Card sx={{ display: "flex", width: { xs: "100%", xl: 240 }, flexShrink: 0, flexDirection: "column", minHeight: 0, height: { xl: "100%" } }}>
                <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1.5, py: 1.25 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", mb: 1.5 }}>Search Filters</Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Company</Typography>
                      <SearchableSelect
                        name="companyId"
                        value={companyId}
                        options={searchableOptions.companies}
                        onChange={(e) => setCompanyId(e.target.value)}
                        placeholder="All Companies"
                        triggerClassName={searchableTriggerCls}
                        showEmptyOption={false}
                        portalDropdown
                      />
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Retail Location</Typography>
                      <SearchableSelect
                        name="location"
                        value={location}
                        options={searchableOptions.locations}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="All Locations"
                        triggerClassName={searchableTriggerCls}
                        showEmptyOption={false}
                        portalDropdown
                      />
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Agent</Typography>
                      <SearchableSelect
                        name="agentId"
                        value={agentId}
                        options={searchableOptions.agents}
                        onChange={(e) => setAgentId(e.target.value)}
                        placeholder="All Agents"
                        triggerClassName={searchableTriggerCls}
                        showEmptyOption={false}
                        portalDropdown
                      />
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Date Range</Typography>
                      <Stack direction={{ xs: "row", xl: "column" }} spacing={1}>
                        <TextField type="date" size="small" fullWidth value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        <TextField type="date" size="small" fullWidth value={toDate} onChange={(e) => setToDate(e.target.value)} />
                      </Stack>
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Supplier City</Typography>
                      <SearchableSelect
                        name="cityId"
                        value={cityId}
                        options={searchableOptions.cities}
                        onChange={(e) => setCityId(e.target.value)}
                        placeholder="All Cities"
                        triggerClassName={searchableTriggerCls}
                        showEmptyOption={false}
                        portalDropdown
                      />
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Section</Typography>
                      <SearchableSelect
                        name="section"
                        value={section}
                        options={searchableOptions.sections}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="All Sections"
                        triggerClassName={searchableTriggerCls}
                        showEmptyOption={false}
                        portalDropdown
                      />
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ borderTop: 1, borderColor: "divider", px: 1.5, py: 1.5 }}>
                  <button
                    onClick={() => handleSearch({ page: 1 })}
                    disabled={loading}
                    className="glass-btn glass-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <MagnifyingGlassIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Search Pendings
                  </button>
                </Box>
              </Card>

              {/* ── RIGHT PANEL: Results table ────────────────────────────────── */}
              <Card sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, flexDirection: "column", overflow: "hidden" }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{
                    borderBottom: 1, borderColor: "divider", px: 2, py: 1.5,
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: { xs: "flex-start", sm: "space-between" },
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Pending Supplier Bills</Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                      {rows.length} record{rows.length !== 1 ? "s" : ""}
                      {selectedIds.size > 0 && (
                        <Box component="span" sx={{ ml: 1, fontWeight: 600, color: "primary.main" }}>
                          ({selectedIds.size} selected)
                        </Box>
                      )}
                    </Typography>
                  </Box>
                  {selectedIds.size > 0 && (
                    <button onClick={handleAddPayment} className="glass-btn glass-btn-success inline-flex items-center gap-1.5 self-start sm:self-auto">
                      Add Payment
                    </button>
                  )}
                </Stack>
                <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, flexDirection: "column", p: { xs: 1.5, sm: 2 } }}>
                  <FilterableDataTable
                    rows={rows}
                    columns={PENDING_TABLE_COLUMNS}
                    loading={loading}
                    emptyText={rows.length === 0 ? 'Click "Search Pendings" to load pending bills' : "No records match the current filters"}
                    searchPlaceholder="Search in supplier payment fields..."
                    showExport={false}
                    enableColumnResize
                    tablePreferenceKey="finance.supplier_payment.pending"
                    rowKey={rowKey}
                    onRowClick={handlePaySingle}
                    enableSelection
                    enableKeyboardNav
                    selectedRows={selectedRowKeys}
                    onSelectionChange={handleSelectionChange}
                    selectionColumnWidthClassName="w-12"
                    fillHeight
                    searchButtonClassName="glass-btn glass-btn-primary flex items-center justify-center disabled:opacity-50"
                    enableServerSearch
                    onServerSearch={handlePendingServerSearch}
                    onSortChange={handlePendingSortChange}
                    paginationMode="server"
                    page={pendingPage}
                    limit={pendingLimit}
                    totalPages={pendingPagination.totalPages}
                    totalRows={pendingPagination.total}
                    onPageChange={handlePendingPageChange}
                    onLimitChange={handlePendingLimitChange}
                  />
                </Box>

                {/* Total payable bar */}
                {rows.length > 0 && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                      borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5,
                      alignItems: { xs: "flex-start", sm: "center" },
                      justifyContent: { xs: "flex-start", sm: "space-between" },
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      Total Payable: <Box component="span" sx={{ color: "error.main" }}>{fmt(totalPayable)}</Box>
                    </Typography>
                    {selectedIds.size > 0 && (
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        Selected Payable: <Box component="span" sx={{ color: "primary.main" }}>{fmt(selectedRows.reduce((s, r) => s + r.balance, 0))}</Box>
                      </Typography>
                    )}
                  </Stack>
                )}
              </Card>
            </Stack>
          </Box>
        )}

        {screen === "search" && showSearchPage && (
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", px: { xs: 1.5, sm: 2 }, pt: { xs: 1.5, sm: 2 } }}>
            <Card sx={{ display: "flex", height: "100%", minHeight: 0, minWidth: 0, flexDirection: "column" }}>
              <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Supplier-Payment-Search</Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                  {historyRows.length} record{historyRows.length !== 1 ? "s" : ""} with paid amount greater than zero
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, flexDirection: "column", p: { xs: 1.5, sm: 2 } }}>
                <FilterableDataTable
                  rows={historyRows}
                  columns={HISTORY_TABLE_COLUMNS}
                  loading={historyLoading}
                  emptyText="No supplier payment records found."
                  searchPlaceholder="Search in supplier payment history..."
                  showExport={false}
                  enableColumnResize
                  tablePreferenceKey="finance.supplier_payment.history"
                  rowKey={rowKey}
                  onRowClick={handlePaySingle}
                  enableKeyboardNav
                  fillHeight
                  searchButtonClassName="glass-btn glass-btn-primary flex items-center justify-center disabled:opacity-50"
                  enableServerSearch
                  onServerSearch={handleHistoryServerSearch}
                  onSortChange={handleHistorySortChange}
                  paginationMode="server"
                  page={historyPage}
                  limit={historyLimit}
                  totalPages={historyPagination.totalPages}
                  totalRows={historyPagination.total}
                  onPageChange={handleHistoryPageChange}
                  onLimitChange={handleHistoryLimitChange}
                />
              </Box>
            </Card>
          </Box>
        )}

        {/* ═══════════════ SCREEN 2: INVOICE DETAIL ══════════════════════════════ */}
        {screen === "detail" && (
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", p: { xs: 1.5, sm: 2 } }}>
            <Stack direction={{ xs: "column", xl: "row" }} spacing={2} sx={{ height: "100%", minHeight: 0, minWidth: 0 }}>
              <Card sx={{ display: "flex", width: { xs: "100%", xl: 320 }, flexShrink: 0, flexDirection: "column", minHeight: 0, height: { xl: "100%" } }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Invoice Summary</Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                    Review purchase and stock movement before payment
                  </Typography>
                </Box>

                <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, py: 1.5 }}>
                  {detailLoading ? (
                    Array.from({ length: 8 }).map((_, idx) => (
                      <Box key={idx} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Box sx={{ height: 12, width: 96, bgcolor: "action.hover", borderRadius: 1 }} className="animate-pulse" />
                        <Box sx={{ height: 32, bgcolor: "action.hover", borderRadius: 1 }} className="animate-pulse" />
                      </Box>
                    ))
                  ) : detailData?.invoice ? (
                    <>
                      <SummaryField label="Supplier">{detailData.invoice.supplier_name || "-"}</SummaryField>
                      <SummaryField label="Company">{detailData.invoice.company_name || "-"}</SummaryField>
                      <SummaryField label="Invoice No">{detailData.invoice.invoice_no || "-"}</SummaryField>
                      <SummaryField label="Invoice Type" sx={{ textTransform: "capitalize" }}>
                        {detailData.invoice.invoice_type === "invoice" ? "Invoice" : "Direct Purchase"}
                      </SummaryField>
                      <SummaryField label="Invoice Date">{detailData.invoice.invoice_date || "-"}</SummaryField>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        <SummaryField label="Invoice Amount">{fmt(detailData.invoice.total)}</SummaryField>
                        <SummaryField label="Tax">{fmt(detailData.invoice.tax)}</SummaryField>
                        <SummaryField label="Discount" sx={{ color: TONES.warning.fg, bgcolor: TONES.warning.bg }}>
                          {fmt(detailData.invoice.discount)}
                        </SummaryField>
                        <SummaryField label="Paid" sx={{ color: TONES.success.fg, bgcolor: TONES.success.bg }}>
                          {fmt(detailData.invoice.paid)}
                        </SummaryField>
                      </Box>
                      <SummaryField label="Balance" sx={{ fontSize: 15, fontWeight: 700, color: TONES.error.fg, bgcolor: TONES.error.bg, py: 1 }}>
                        {fmt(detailData.invoice.balance)}
                      </SummaryField>

                      <Divider sx={{ my: 0.5 }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary" }}>
                        Stock Movement
                      </Typography>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        <SummaryField label="Purchased Qty">{fmt(detailData.summary?.purchased_qty)}</SummaryField>
                        <SummaryField label="Sold Qty">{fmt(detailData.summary?.sold_qty)}</SummaryField>
                        <SummaryField label="Available Qty" sx={{ color: TONES.info.fg, bgcolor: TONES.info.bg }}>
                          {fmt(detailData.summary?.remaining_qty)}
                        </SummaryField>
                        <SummaryField label="Purchased Value">{fmt(detailData.summary?.purchased_value)}</SummaryField>
                        <SummaryField label="Sold Value" sx={{ color: TONES.success.fg, bgcolor: TONES.success.bg }}>
                          {fmt(
                            (detailData.summary?.purchased_value ?? 0) - (detailData.summary?.remaining_stock_value ?? 0)
                          )}
                        </SummaryField>
                        <SummaryField label="Stock Value" sx={{ color: TONES.warning.fg, bgcolor: TONES.warning.bg }}>
                          {fmt(detailData.summary?.remaining_stock_value)}
                        </SummaryField>
                      </Box>

                      {detailData.summary?.movement_label && (
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                          <StatusChip
                            label={detailData.summary.movement_label}
                            tone={
                              detailData.summary.movement_status === "FAST"
                                ? "success"
                                : detailData.summary.movement_status === "SLOW"
                                ? "error"
                                : "warning"
                            }
                          />
                        </Box>
                      )}
                      <Box
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          textAlign: "center",
                          color: detailData.summary?.eligible_for_payment ? TONES.success.fg : TONES.error.fg,
                          bgcolor: detailData.summary?.eligible_for_payment ? TONES.success.bg : TONES.error.bg,
                          borderRadius: 1,
                          py: 1,
                          px: 1,
                        }}
                      >
                        {detailData.summary?.eligible_for_payment ? "Eligible for Payment" : "Review Before Paying"}
                        <Typography component="div" sx={{ fontSize: 11, fontWeight: 500, mt: 0.25 }}>
                          {detailData.summary?.eligibility_reason}
                        </Typography>
                      </Box>

                      <Button
                        type="button"
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => goToPayment([detailData.invoice], "detail")}
                        disabled={Number(detailData.invoice.balance || 0) <= 0}
                      >
                        {Number(detailData.invoice.balance || 0) > 0 ? "Make Payment" : "Already Paid"}
                      </Button>
                    </>
                  ) : (
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Invoice detail is not available.</Typography>
                  )}
                </Stack>
              </Card>

              <Card sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, flexDirection: "column", overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Purchased Items</Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                    Purchased items and bought quantity for the selected invoice
                  </Typography>
                </Box>

                <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>#</TableCell>
                        {DETAIL_COLUMNS.map((col) => (
                          <TableCell key={col.key} align={col.align === "right" ? "right" : "left"} sx={{ fontSize: 12, fontWeight: 700 }}>
                            {col.label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={DETAIL_COLUMNS.length + 1}>
                              <Box sx={{ height: 14, bgcolor: "action.hover", borderRadius: 1 }} className="animate-pulse" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (detailData?.lines || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={DETAIL_COLUMNS.length + 1} sx={{ py: 6, textAlign: "center", color: "text.disabled" }}>
                            No purchase lines found for this invoice
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailData.lines.map((line, idx) => (
                          <TableRow key={line.id || idx} hover>
                            <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{idx + 1}</TableCell>
                            <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{line.product_name}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{line.brand_name}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{line.size}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{line.design_no}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(line.rate)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(line.purchased_qty)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                              {line.sold_qty === null || line.sold_qty === undefined ? "-" : fmt(line.sold_qty)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                              {line.remaining_qty === null || line.remaining_qty === undefined ? "-" : fmt(line.remaining_qty)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(line.purchased_value)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                              {line.remaining_stock_value === null || line.remaining_stock_value === undefined ? "-" : fmt(line.remaining_stock_value)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}
                >
                  <Stack direction="row" spacing={2.5}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      Purchased Qty: <Box component="span">{fmt(detailData?.summary?.purchased_qty || 0)}</Box>
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: TONES.success.fg }}>
                      Sold Qty: <Box component="span">{fmt(detailData?.summary?.sold_qty || 0)}</Box>
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: TONES.warning.fg }}>
                      Available Qty: <Box component="span">{fmt(detailData?.summary?.remaining_qty || 0)}</Box>
                    </Typography>
                  </Stack>
                  <Button
                    type="button"
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => detailData?.invoice && goToPayment([detailData.invoice], "detail")}
                    disabled={!detailData?.invoice || Number(detailData?.invoice?.balance || 0) <= 0}
                  >
                    {Number(detailData?.invoice?.balance || 0) > 0 ? "Payment" : "Paid"}
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </Box>
        )}

        {/* ═══════════════ SCREEN 3: MAKE PAYMENT ════════════════════════════════ */}
        {screen === "payment" && (
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", p: { xs: 1.5, sm: 2 } }}>
            <Stack direction={{ xs: "column", xl: "row" }} spacing={2} sx={{ height: "100%", minHeight: 0, minWidth: 0 }}>
              {/* ── LEFT PANEL: Payment form ─────────────────────────────────── */}
              <Card sx={{ display: "flex", width: { xs: "100%", xl: 288 }, flexShrink: 0, flexDirection: "column", minHeight: 0, height: { xl: "100%" } }}>
                <Box sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", mb: 1.5 }}>Payment Details</Typography>
                  <Stack spacing={1.5}>
                    {companyId && (
                      <SummaryField label="Company">{companies.find((c) => String(c.id) === String(companyId))?.name || "—"}</SummaryField>
                    )}
                    {location && <SummaryField label="Location">{location}</SummaryField>}

                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Payment Mode</Typography>
                      <Select size="small" fullWidth value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                        {PAYMENT_MODES.map((m) => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Payment Date</Typography>
                      <TextField type="date" size="small" fullWidth value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Ref. No</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={refNo}
                        onChange={(e) => setRefNo(e.target.value)}
                        placeholder="Cheque / Transaction ref"
                      />
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Paid Amount</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        slotProps={{ htmlInput: { step: "0.01" } }}
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        sx={{ "& input": { fontWeight: 600 } }}
                      />
                    </Box>
                    <Box>
                      <Typography component="label" sx={fieldLabelSx}>Remarks</Typography>
                      <TextField
                        multiline
                        rows={2}
                        fullWidth
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Optional remarks..."
                      />
                    </Box>
                  </Stack>
                </Box>
              </Card>

              {/* ── RIGHT PANEL: Selected invoices + Save ────────────────────── */}
              <Card sx={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0, flexDirection: "column", overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Invoices for Payment</Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                    {paymentItems.length} invoice{paymentItems.length !== 1 ? "s" : ""} selected
                  </Typography>
                </Box>

                <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Supplier</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Inv. No</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>Invoice Amt</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>Tax</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>Discount</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>Paid</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>Balance</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>Total Payable</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentItems.map((row, idx) => (
                        <TableRow key={`${row.invoice_type}-${row.id}`} hover>
                          <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{row.supplier_name}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{row.invoice_no}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(row.total)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(row.tax)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "warning.main" }}>{fmt(row.discount)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "success.main" }}>{fmt(row.paid)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "error.main" }}>{fmt(row.balance)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(row.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Summary + Save bar */}
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}
                >
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      Total Payable: <Box component="span" sx={{ color: "error.main" }}>{fmt(totalSelectedPayable)}</Box>
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      Paying: <Box component="span" sx={{ color: "primary.main" }}>{fmt(Number(paidAmountInput || 0))}</Box>
                      {Number(paidAmountInput || 0) < totalSelectedPayable && (
                        <Box component="span" sx={{ ml: 1, fontSize: 10, color: "warning.main", fontWeight: 400 }}>
                          (Partial payment — status will remain pending)
                        </Box>
                      )}
                    </Typography>
                  </Stack>
                  <Button variant="contained" color="primary" size="large" onClick={handleSavePayment} disabled={saving}>
                    {saving ? "Saving..." : "Save Payment"}
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default SupplierPayment;
