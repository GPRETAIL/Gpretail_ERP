import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import { toast } from "react-toastify";

// ─── Left panel fields (static, matches backend FIELD_CONFIG keys) ─────────
const ANALYZER_FIELDS = [
  { key: "agent", label: "AGENT" },
  { key: "barcode", label: "BARCODE" },
  { key: "barcode_group", label: "BARCODE GROUP" },
  { key: "barcoded_on", label: "BARCODED ON" },
  { key: "brand", label: "BRAND" },
  { key: "colour", label: "COLOUR" },
  { key: "company", label: "COMPANY" },
  { key: "dealer_rate", label: "DEALER RATE" },
  { key: "dealer_rate_range", label: "DEALER RATE RANGE" },
  { key: "design", label: "DESIGN" },
  { key: "discount_rate", label: "DISCOUNT RATE" },
  { key: "discount_rate_range", label: "DISCOUNT RATE RANGE" },
  { key: "fit", label: "FIT" },
  { key: "gln_no", label: "GLN NO" },
  { key: "hsn_code", label: "HSN CODE" },
  { key: "invoice_date", label: "INVOICE DATE" },
  { key: "invoice_no", label: "INVOICE NO" },
  { key: "item", label: "ITEM" },
  { key: "job_worker", label: "JOB WORKER" },
  { key: "lr_entry_no", label: "LR ENTRY NO" },
  { key: "material", label: "MATERIAL" },
  { key: "pattern", label: "PATTERN" },
  { key: "price_tag", label: "PRICE TAG" },
  { key: "product", label: "PRODUCT" },
  { key: "product_code", label: "PRODUCT CODE" },
  { key: "product_group", label: "PRODUCT GROUP" },
  { key: "purchase_date", label: "PURCHASE DATE" },
  { key: "purchase_month", label: "PURCHASE MONTH" },
  { key: "purchase_rate", label: "PURCHASE RATE" },
  { key: "purchase_rate_range", label: "PURCHASE RATE RANGE" },
  { key: "purchase_tax", label: "PURCHASE TAX" },
  { key: "purchase_year", label: "PURCHASE YEAR" },
  { key: "retail_margin_range", label: "RETAIL MARGIN RANGE" },
  { key: "sale_margin_range", label: "SALE MARGIN RANGE" },
  { key: "sale_rate", label: "SALE RATE" },
  { key: "sale_rate_range", label: "SALE RATE RANGE" },
  { key: "sales_tax", label: "SALES TAX" },
  { key: "section", label: "SECTION" },
  { key: "shelf_age_range", label: "SHELF AGE RANGE" },
  { key: "size", label: "SIZE" },
  { key: "sleeve", label: "SLEEVE" },
  { key: "source_supplier", label: "SOURCE SUPPLIER" },
  { key: "stock_age_range", label: "STOCK AGE RANGE" },
  { key: "stock_location", label: "STOCK LOCATION" },
  { key: "style", label: "STYLE" },
  { key: "supplier", label: "SUPPLIER" },
  { key: "supplier_city", label: "SUPPLIER CITY" },
  { key: "tax_percentage", label: "TAX PERCENTAGE" },
  { key: "type", label: "TYPE" },
];

const TABLE_COLUMNS = [
  { key: "description", label: "Description", align: "left", width: "22%" },
  { key: "qty", label: "Qty", align: "right", width: "10%" },
  { key: "cost_price", label: "Cost Price", align: "right", width: "14%" },
  { key: "sale_price", label: "Sale Price", align: "right", width: "14%" },
  { key: "margin_perc", label: "Margin %", align: "right", width: "14%" },
  { key: "markup_perc", label: "Mark Up %", align: "right", width: "13%" },
  { key: "markdown_perc", label: "Mark DN %", align: "right", width: "13%" },
];

const FILTER_DEFAULT = { value: "", operator: "contains" };
const INPUT_FREE_OPERATORS = new Set(["blank", "not_blank"]);

const fmt = (val) => {
  const n = Number(val);
  if (isNaN(n)) return val ?? "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtInt = (val) => {
  const n = Number(val);
  if (isNaN(n)) return val ?? "";
  return n.toLocaleString("en-IN");
};
const isEffectivelyBlank = (value) => {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  if (text === "") return true;
  return text === "--" || text === "-";
};

// ─── Column filter logic ───────────────────────────────────────────────────
function passesFilter(value, filter) {
  if (!filter) return true;
  const { operator, value: q } = filter;
  const v = String(value ?? "").toLowerCase().trim();
  const query = String(q ?? "").toLowerCase().trim();

  if (operator === "blank") return isEffectivelyBlank(value);
  if (operator === "not_blank") return !isEffectivelyBlank(value);
  if (query === "") return true;

  switch (operator) {
    case "contains": return v.includes(query);
    case "not_contains": return !v.includes(query);
    case "equal": return v === query;
    case "not_equal": return v !== query;
    case "begins_with": return v.startsWith(query);
    case "ends_with": return v.endsWith(query);
    default: return true;
  }
}

const OPERATORS = [
  { value: "contains", label: "Contain" },
  { value: "not_contains", label: "Does not contain" },
  { value: "equal", label: "Equal" },
  { value: "not_equal", label: "Does not equal" },
  { value: "begins_with", label: "Begins with" },
  { value: "ends_with", label: "Ends With" },
  { value: "blank", label: "Blank" },
  { value: "not_blank", label: "Not Blank" },
];

const StockAnalyzer = () => {
  const navigate = useNavigate();
  const [activeField, setActiveField] = useState("brand");
  const [storeFilter, setStoreFilter] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);
  const [filterPopupPos, setFilterPopupPos] = useState({ top: 0, left: 0 });
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const filterPopupRef = useRef(null);

  // Fetch data when active field changes
  const fetchData = useCallback(async (field) => {
    setLoading(true);
    try {
      const res = await api.get("/stock-analyzer", {
        params: { groupBy: field, ...(storeFilter ? { company_id: storeFilter } : {}) },
      });
      setData(res.data?.data || []);
      setTotals(res.data?.totals || null);
      setColumnFilters({});
      setSortKey(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stock analysis");
      setData([]);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }, [storeFilter]);

  useEffect(() => {
    fetchData(activeField);
  }, [activeField, storeFilter, fetchData]);

  // Close filter popup on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(e.target)) {
        setOpenFilterCol(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFieldClick = (key) => {
    setActiveField(key);
  };

  // Filter left-panel fields
  const visibleFields = useMemo(() => {
    if (!fieldSearch.trim()) return ANALYZER_FIELDS;
    const q = fieldSearch.toLowerCase().trim();
    return ANALYZER_FIELDS.filter((f) => f.label.toLowerCase().includes(q));
  }, [fieldSearch]);

  // Apply column filters + sort
  const filteredData = useMemo(() => {
    let rows = data.filter((row) => {
      for (const col of TABLE_COLUMNS) {
        const filter = columnFilters[col.key] || FILTER_DEFAULT;
        if (!passesFilter(row[col.key], filter)) return false;
      }
      return true;
    });

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const an = Number(av);
        const bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) {
          return sortDir === "asc" ? an - bn : bn - an;
        }
        return sortDir === "asc"
          ? String(av ?? "").localeCompare(String(bv ?? ""))
          : String(bv ?? "").localeCompare(String(av ?? ""));
      });
    }

    return rows;
  }, [data, columnFilters, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const updateColumnFilter = (key, updates) => {
    setColumnFilters((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || FILTER_DEFAULT), ...updates },
    }));
  };

  const toggleFilterPopup = (colKey, triggerElement) => {
    setOpenFilterCol((prev) => {
      if (prev === colKey) return null;

      const rect = triggerElement.getBoundingClientRect();
      const popupWidth = 224;
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - popupWidth - viewportPadding
      );
      const top = rect.bottom + 6;
      setFilterPopupPos({ top, left });
      return colKey;
    });
  };

  const activeLabel = ANALYZER_FIELDS.find((f) => f.key === activeField)?.label || activeField;
  const handleBackClick = () => navigate("/analytical");

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleBackClick}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label="Back to analytical"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={handleBackClick}
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Analytical
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>360° Stock Analyzer</span>
          </h1>
        </div>
      </div>

      <div className="p-4">
        <div className="flex h-full gap-4 -mt-2">
          {/* ─── LEFT PANEL: Field selector ──────────────────────────────────── */}
          <div className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <div className="mb-2">
                <StoreFilterSelect value={storeFilter} onChange={setStoreFilter} />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Analysis Fields
              </h3>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md
                    bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {visibleFields.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFieldClick(f.key)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors
                    ${
                      activeField === f.key
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── RIGHT PANEL: Data table ─────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  360° Stock Analyzer
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Grouped by: <span className="font-medium text-indigo-600 dark:text-indigo-400">{activeLabel}</span>
                  {" "}— {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => fetchData(activeField)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                  bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400
                  hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto relative" style={{ maxHeight: "calc(100vh - 260px)" }}>
              <table className="w-full text-xs table-fixed">
            <colgroup>
              {TABLE_COLUMNS.map((col) => (
                <col key={col.key} style={{ width: col.width }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-700/80">
                {TABLE_COLUMNS.map((col) => {
                  const filter = columnFilters[col.key] || FILTER_DEFAULT;
                  const hasFilter = filter.operator === "blank" || filter.operator === "not_blank" || String(filter.value || "").trim() !== "";

                  return (
                    <th
                      key={col.key}
                      className={`relative px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 whitespace-nowrap
                        ${col.align === "right" ? "text-right" : "text-left"}`}
                    >
                      <div
                        className={`grid grid-cols-[1fr_auto] items-center gap-1 ${
                          col.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        <button
                          onClick={() => handleSort(col.key)}
                          className={`flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 ${
                            col.align === "right" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {col.key === "description" ? activeLabel : col.label}
                          {sortKey === col.key && (
                            <span className="text-indigo-500">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </button>
                        <button
                          onClick={(e) => toggleFilterPopup(col.key, e.currentTarget)}
                          className={`ml-auto p-0.5 rounded transition-colors
                            ${hasFilter ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                        >
                          <FunnelIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Filter popup */}
                      {openFilterCol === col.key && (
                        <div
                          ref={filterPopupRef}
                          className="fixed z-[120] w-56 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-2"
                          style={{ top: `${filterPopupPos.top}px`, left: `${filterPopupPos.left}px` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                              {col.key === "description" ? activeLabel : col.label}
                            </span>
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              onClick={() => setOpenFilterCol(null)}
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex flex-col gap-2">
                            <select
                              value={filter.operator}
                              onChange={(e) => updateColumnFilter(col.key, { operator: e.target.value })}
                              className="block w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-[11px] bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            >
                              {OPERATORS.map((op) => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>
                            {!INPUT_FREE_OPERATORS.has(filter.operator) && (
                              <input
                                type="text"
                                value={filter.value}
                                onChange={(e) => updateColumnFilter(col.key, { value: e.target.value })}
                                placeholder="Enter filter value"
                                className="block w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-[11px] bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400"
                                autoFocus
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateColumnFilter(col.key, FILTER_DEFAULT);
                              setOpenFilterCol(null);
                            }}
                            className="mt-2 text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {TABLE_COLUMNS.map((col) => (
                      <td key={col.key} className="px-3 py-2.5">
                        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    No data found for <b>{activeLabel}</b>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">
                      {row.description ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmtInt(row.qty)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmt(row.cost_price)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {fmt(row.sale_price)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${
                      Number(row.margin_perc) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {fmt(row.margin_perc)}%
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${
                      Number(row.markup_perc) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {fmt(row.markup_perc)}%
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${
                      Number(row.markdown_perc) >= 0 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {fmt(row.markdown_perc)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals row */}
            {!loading && filteredData.length > 0 && totals && (
              <tfoot>
                <tr className="bg-gray-100 dark:bg-gray-700/60 border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                  <td className="px-3 py-2.5 text-gray-800 dark:text-gray-100">TOTAL</td>
                  <td className="px-3 py-2.5 text-right text-gray-800 dark:text-gray-100 tabular-nums">
                    {fmtInt(totals.qty)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-800 dark:text-gray-100 tabular-nums">
                    {fmt(totals.cost_price)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-800 dark:text-gray-100 tabular-nums">
                    {fmt(totals.sale_price)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-green-700 dark:text-green-400 tabular-nums">
                    {fmt(totals.margin_perc)}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-green-700 dark:text-green-400 tabular-nums">
                    {fmt(totals.markup_perc)}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-orange-700 dark:text-orange-400 tabular-nums">
                    {fmt(totals.markdown_perc)}%
                  </td>
                </tr>
              </tfoot>
            )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAnalyzer;
