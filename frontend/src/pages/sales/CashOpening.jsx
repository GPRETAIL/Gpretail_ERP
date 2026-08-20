import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Save, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";

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
        render: (value) => <div className="text-right">{formatCurrency(value || 0)}</div>,
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
    <div className="flex items-center">
      <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-2"
      >
        <option value="">Select {label}</option>
        {optionsList.map((row) => (
          <option key={row.value} value={row.value}>
            {row.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderEntryPage = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cash Opening Details</h2>
          <div className="space-y-3 max-w-xl">
            {renderSelect(
              "Location",
              "locationId",
              formData.locationId,
              options.locations,
              (e) => setFormData((prev) => ({ ...prev, locationId: e.target.value }))
            )}

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Date / Time</label>
              <input
                type="text"
                value={now.toLocaleString()}
                disabled
                readOnly
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2"
              />
            </div>

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

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input
                type="text"
                value={formatCurrency(amount)}
                disabled
                readOnly
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Denominations</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="border dark:border-gray-700 px-3 py-2 text-left">Denomination</th>
                  <th className="border dark:border-gray-700 px-3 py-2 text-center">Count</th>
                  <th className="border dark:border-gray-700 px-3 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {DENOMINATIONS.map((denomination) => {
                  const key = makeCountKey(denomination);
                  const count = Math.max(0, toInt(formData[key], 0));
                  const value = count * denomination;
                  return (
                    <tr key={denomination} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="border dark:border-gray-700 px-3 py-2 font-semibold">
                        ₹{denomination.toLocaleString("en-IN")}
                      </td>
                      <td className="border dark:border-gray-700 px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={formData[key]}
                          onChange={(e) => handleCountChange(key, e.target.value)}
                          className="w-24 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1 text-right focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="border dark:border-gray-700 px-3 py-2 text-right font-medium">
                        {formatCurrency(value)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td className="border dark:border-gray-700 px-3 py-2 font-semibold" colSpan="2">
                    Total Amount
                  </td>
                  <td className="border dark:border-gray-700 px-3 py-2 text-right font-bold">{formatCurrency(amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchPage = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-4">
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
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label={showSearchPage ? "Back to cash opening entry" : "Back to sales"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Sales
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Cash Opening</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || showSearchPage || loadingMeta}
            className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary inline-flex items-center"
          >
            <Search className="w-4 h-4 mr-1" />
            {showSearchPage ? "Back" : "Search"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-28">
        {showSearchPage ? renderSearchPage() : renderEntryPage()}
        {loadingMeta && <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Loading options...</p>}
      </div>
    </div>
  );
};

export default CashOpening;
