import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Save, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import { Box, Stack, Typography, TextField, MenuItem, Button, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const makeCountKey = (denomination) => `count_${denomination}`;

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatEmployee = (row) => {
  const name = String(row?.name || "").trim() || "Unnamed";
  const code = String(row?.employee_code || "").trim();
  return code ? `${name} (${code})` : name;
};

const buildBlankCounts = () =>
  DENOMINATIONS.reduce((acc, denomination) => {
    acc[makeCountKey(denomination)] = "0";
    return acc;
  }, {});

const CashOpening = () => {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [showSearchPage, setShowSearchPage] = useState(false);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [options, setOptions] = useState({
    locations: [],
    counters: [],
    paidByEmployees: [],
    cashiers: [],
  });

  const [formData, setFormData] = useState({
    locationId: "",
    counterId: "",
    paidByEmployeeId: "",
    cashierEmployeeId: "",
    ...buildBlankCounts(),
  });

  const [searchFilters, setSearchFilters] = useState({
    search: "",
    locationId: "",
    counterId: "",
    paidByEmployeeId: "",
    cashierEmployeeId: "",
    date: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(10);
  const searchFiltersRef = useRef(searchFilters);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const res = await api.get("/cash-openings/meta");
      const payload = res.data?.data || {};

      const mapSelect = (rows, formatter = (x) => x.name) =>
        (rows || []).map((row) => ({
          value: String(row.id),
          label: formatter(row),
        }));

      setOptions({
        locations: mapSelect(payload.locations),
        counters: mapSelect(payload.counters),
        paidByEmployees: mapSelect(payload.paidByEmployees, formatEmployee),
        cashiers: mapSelect(payload.cashiers, formatEmployee),
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load cash opening options");
      setOptions({ locations: [], counters: [], paidByEmployees: [], cashiers: [] });
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    searchFiltersRef.current = searchFilters;
  }, [searchFilters]);

  const amount = useMemo(
    () =>
      DENOMINATIONS.reduce((sum, denomination) => {
        const key = makeCountKey(denomination);
        const count = Math.max(0, toInt(formData[key], 0));
        return sum + count * denomination;
      }, 0),
    [formData]
  );

  const runSearch = useCallback(async (override = null) => {
    const filters = override || searchFiltersRef.current;
    setSearching(true);
    try {
      const params = {};
      if (String(filters.search || "").trim()) params.search = String(filters.search).trim();
      if (String(filters.locationId || "").trim()) params.locationId = filters.locationId;
      if (String(filters.counterId || "").trim()) params.counterId = filters.counterId;
      if (String(filters.paidByEmployeeId || "").trim()) params.paidByEmployeeId = filters.paidByEmployeeId;
      if (String(filters.cashierEmployeeId || "").trim()) params.cashierEmployeeId = filters.cashierEmployeeId;
      if (String(filters.date || "").trim()) params.date = filters.date;

      const res = await api.get("/cash-openings", { params });
      setSearchResults(res.data?.data || []);
      setSearchPage(1);
    } catch {
      toast.error("Failed to search cash openings");
    } finally {
      setSearching(false);
    }
  }, []);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = {
      search: "",
      locationId: "",
      counterId: "",
      paidByEmployeeId: "",
      cashierEmployeeId: "",
      date: "",
    };
    setSearchFilters(empty);
    await runSearch(empty);
  };

  const handleServerSearch = useCallback(({ query }) => {
    setSearchPage(1);
    setSearchFilters((prev) => {
      const nextFilters = { ...prev, search: query };
      runSearch(nextFilters);
      return nextFilters;
    });
  }, [runSearch]);

  const handleCountChange = (key, raw) => {
    if (raw === "") {
      setFormData((prev) => ({ ...prev, [key]: "" }));
      return;
    }

    const parsed = toInt(raw, 0);
    if (parsed < 0) return;
    setFormData((prev) => ({ ...prev, [key]: String(parsed) }));
  };

  const handleSave = async () => {
    if (!formData.locationId) {
      toast.error("Location is required");
      return;
    }
    if (!formData.counterId) {
      toast.error("Counter is required");
      return;
    }
    if (!formData.paidByEmployeeId) {
      toast.error("Paid By is required");
      return;
    }
    if (!formData.cashierEmployeeId) {
      toast.error("Cashier is required");
      return;
    }

    const payload = {
      locationId: formData.locationId,
      counterId: formData.counterId,
      paidByEmployeeId: formData.paidByEmployeeId,
      cashierEmployeeId: formData.cashierEmployeeId,
      ...DENOMINATIONS.reduce((acc, denomination) => {
        const key = makeCountKey(denomination);
        acc[key] = Math.max(0, toInt(formData[key], 0));
        return acc;
      }, {}),
    };

    setSaving(true);
    try {
      await api.post("/cash-openings", payload);
      toast.success("Cash opening saved successfully");
      setFormData((prev) => ({
        locationId: prev.locationId,
        counterId: prev.counterId,
        paidByEmployeeId: prev.paidByEmployeeId,
        cashierEmployeeId: prev.cashierEmployeeId,
        ...buildBlankCounts(),
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save cash opening");
    } finally {
      setSaving(false);
    }
  };

  const cashOpeningSearchColumns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        valueGetter: (row) => row.id,
      },
      {
        key: "opening_at",
        label: "Date / Time",
        valueGetter: (row) => row.opening_at || "",
        render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        searchValue: (row) => (row.opening_at ? new Date(row.opening_at).toLocaleString() : ""),
      },
      {
        key: "location",
        label: "Location",
        valueGetter: (row) => row.location?.name || "-",
      },
      {
        key: "counter",
        label: "Counter",
        valueGetter: (row) => row.counter?.name || "-",
      },
      {
        key: "paid_by",
        label: "Paid By",
        valueGetter: (row) => formatEmployee(row.paidBy),
      },
      {
        key: "cashier",
        label: "Cashier",
        valueGetter: (row) => formatEmployee(row.cashier),
      },
      {
        key: "amount",
        label: "Amount",
        valueGetter: (row) => Number(row.amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
    ],
    []
  );

  const searchPagination = useMemo(() => {
    const total = searchResults.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(searchLimit, 1)), 1);
    return { total, totalPages };
  }, [searchResults.length, searchLimit]);

  const renderSelect = (label, name, value, optionsList, onChange) => (
    <Stack direction="row" sx={{ alignItems: "center" }}>
      <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
      <TextField
        select
        name={name}
        value={value}
        onChange={onChange}
        size="small"
        sx={{ flex: 1, ml: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
      >
        <MenuItem value="">Select {label}</MenuItem>
        {optionsList.map((row) => (
          <MenuItem key={row.value} value={row.value}>
            {row.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  const renderEntryPage = () => (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
          <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary", mb: 1.5 }}>Cash Opening Details</Typography>
          <Stack spacing={1.5} sx={{ maxWidth: 576 }}>
            {renderSelect(
              "Location",
              "locationId",
              formData.locationId,
              options.locations,
              (e) => setFormData((prev) => ({ ...prev, locationId: e.target.value }))
            )}

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Date / Time</Typography>
              <TextField
                type="text"
                value={now.toLocaleString()}
                disabled
                slotProps={{ input: { readOnly: true } }}
                size="small"
                sx={{ flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              />
            </Stack>

            {renderSelect(
              "Counter",
              "counterId",
              formData.counterId,
              options.counters,
              (e) => setFormData((prev) => ({ ...prev, counterId: e.target.value }))
            )}

            {renderSelect(
              "Paid By",
              "paidByEmployeeId",
              formData.paidByEmployeeId,
              options.paidByEmployees,
              (e) => setFormData((prev) => ({ ...prev, paidByEmployeeId: e.target.value }))
            )}

            {renderSelect(
              "Cashier",
              "cashierEmployeeId",
              formData.cashierEmployeeId,
              options.cashiers,
              (e) => setFormData((prev) => ({ ...prev, cashierEmployeeId: e.target.value }))
            )}

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Amount</Typography>
              <TextField
                type="text"
                value={formatCurrency(amount)}
                disabled
                slotProps={{ input: { readOnly: true } }}
                size="small"
                sx={{ flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, fontWeight: 600 } }}
              />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Denominations</Typography>
          </Box>
          <Box sx={{ p: 2, overflowX: "auto" }}>
            <Table sx={{ width: "100%", fontSize: 12.25 }}>
              <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "text.secondary" }}>
                <TableRow>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "left" }}>Denomination</TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "center" }}>Count</TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "right" }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {DENOMINATIONS.map((denomination) => {
                  const key = makeCountKey(denomination);
                  const count = Math.max(0, toInt(formData[key], 0));
                  const value = count * denomination;
                  return (
                    <TableRow key={denomination} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, fontWeight: 600 }}>
                        ₹{denomination.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "center" }}>
                        <TextField
                          type="number"
                          slotProps={{ htmlInput: { min: 0 } }}
                          value={formData[key]}
                          onChange={(e) => handleCountChange(key, e.target.value)}
                          size="small"
                          sx={{ width: 96, "& .MuiInputBase-input": { textAlign: "right", fontSize: 12.25, py: 0.5 } }}
                        />
                      </TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "right", fontWeight: 500 }}>
                        {formatCurrency(value)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell colSpan={2} sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, fontWeight: 600 }}>
                    Total Amount
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "right", fontWeight: 700 }}>{formatCurrency(amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Box>
    </Stack>
  );

  const renderSearchPage = () => (
    <Stack spacing={2} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
      <FilterableDataTable
        rows={searchResults}
        columns={cashOpeningSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No cash opening records found"
        searchPlaceholder="Search in cash opening fields..."
        showExport={false}
        tablePreferenceKey="sales.cash_opening.search"
        onRefresh={runSearch}
        refreshDisabled={searching}
        enableServerSearch
        onServerSearch={handleServerSearch}
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
    </Stack>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            sx={{ color: "text.secondary", minWidth: 0, p: 0.5 }}
            aria-label={showSearchPage ? "Back to cash opening entry" : "Back to sales"}
          >
            <ArrowLeft size={16} />
          </Button>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              type="button"
              onClick={() => navigate("/sales")}
              sx={{ color: "primary.main", textTransform: "none", minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}
            >
              Sales
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Cash Opening</Box>
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            onClick={handleSave}
            disabled={saving || showSearchPage || loadingMeta}
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
          >
            <Search size={16} style={{marginRight: 4}} />
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2} sx={{ p: 2, pb: 7 }}>
        {showSearchPage ? renderSearchPage() : renderEntryPage()}
        {loadingMeta && <Typography sx={{ fontSize: 10.5, color: "text.secondary", px: 0.5 }}>Loading options...</Typography>}
      </Stack>
    </Box>
  );
};

export default CashOpening;
