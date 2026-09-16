import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import FilterableDataTable from "../../components/FilterableDataTable";
import { toast } from "react-toastify";

// ─── Left panel fields (matches backend FIELD_CONFIG keys) ─────────────────
const COMPARER_FIELDS = [
  { key: "agent", label: "AGENT" },
  { key: "barcode", label: "BARCODE" },
  { key: "barcode_group", label: "BARCODE GROUP" },
  { key: "barcoded_on", label: "BARCODED ON" },
  { key: "brand", label: "BRAND" },
  { key: "colour", label: "COLOUR" },
  { key: "company", label: "COMPANY" },
  { key: "customer", label: "CUSTOMER" },
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
  { key: "sale_date", label: "SALE DATE" },
  { key: "sale_margin_range", label: "SALE MARGIN RANGE" },
  { key: "sale_month", label: "SALE MONTH" },
  { key: "sale_rate", label: "SALE RATE" },
  { key: "sale_rate_range", label: "SALE RATE RANGE" },
  { key: "sale_type", label: "SALE TYPE" },
  { key: "sale_year", label: "SALE YEAR" },
  { key: "sales_tax", label: "SALES TAX" },
  { key: "section", label: "SECTION" },
  { key: "size", label: "SIZE" },
  { key: "sleeve", label: "SLEEVE" },
  { key: "source_supplier", label: "SOURCE SUPPLIER" },
  { key: "stock_location", label: "STOCK LOCATION" },
  { key: "style", label: "STYLE" },
  { key: "supplier", label: "SUPPLIER" },
  { key: "supplier_city", label: "SUPPLIER CITY" },
  { key: "tax_percentage", label: "TAX PERCENTAGE" },
  { key: "type", label: "TYPE" },
];

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

const numericCell = (val, extraClass = "") => (
  <span className={`block text-right tabular-nums ${extraClass}`}>{val}</span>
);

const percentCell = (val) => {
  const n = Number(val);
  const cls = n >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  return numericCell(`${fmt(val)}%`, `font-medium ${cls}`);
};

const SalesComparer = () => {
  const navigate = useNavigate();
  const [activeField, setActiveField] = useState("brand");
  const [saleFromDate, setSaleFromDate] = useState("");
  const [saleToDate, setSaleToDate] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (field) => {
    setLoading(true);
    try {
      const params = {
        groupBy: field,
        ...(saleFromDate ? { saleFromDate } : {}),
        ...(saleToDate ? { saleToDate } : {}),
        ...(storeFilter ? { company_id: storeFilter } : {}),
      };
      const res = await api.get("/sales-comparer", { params });
      setData(res.data?.data || []);
      setTotals(res.data?.totals || null);
      setNotice(res.data?.notice || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load sales comparison");
      setData([]);
      setTotals(null);
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }, [saleFromDate, saleToDate, storeFilter]);

  useEffect(() => {
    fetchData(activeField);
  }, [activeField, saleFromDate, saleToDate, storeFilter, fetchData]);

  const handleFieldClick = (key) => setActiveField(key);

  const visibleFields = useMemo(() => {
    if (!fieldSearch.trim()) return COMPARER_FIELDS;
    const q = fieldSearch.toLowerCase().trim();
    return COMPARER_FIELDS.filter((f) => f.label.toLowerCase().includes(q));
  }, [fieldSearch]);

  const activeLabel = COMPARER_FIELDS.find((f) => f.key === activeField)?.label || activeField;
  const handleBackClick = () => navigate("/analytical");

  const columns = useMemo(() => [
    { key: "description", label: activeLabel },
    { key: "qty_sold", label: "Qty Sold", render: (v) => numericCell(fmtInt(v)) },
    { key: "qty_returned", label: "Returned", render: (v) => numericCell(fmtInt(v), "text-red-600 dark:text-red-400") },
    { key: "net_qty", label: "Net Qty", render: (v) => numericCell(fmtInt(v), "font-medium") },
    { key: "net_amount", label: "Sale Amt", render: (v) => numericCell(fmt(v)) },
    { key: "net_cost", label: "Cost Amt", render: (v) => numericCell(fmt(v)) },
    { key: "total_discount", label: "Discount", render: (v) => numericCell(fmt(v), "text-orange-600 dark:text-orange-400") },
    { key: "margin_perc", label: "Margin %", render: (v) => percentCell(v) },
    { key: "markup_perc", label: "Mark Up %", render: (v) => percentCell(v) },
  ], [activeLabel]);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
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
            <span>Sales Comparer</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 p-4">
        {/* ─── LEFT PANEL: Field selector ──────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Sale Date Range
            </h3>
            <div className="space-y-2">
              <StoreFilterSelect value={storeFilter} onChange={setStoreFilter} />
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={saleFromDate}
                  onChange={(e) => setSaleFromDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md
                    bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                    focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={saleToDate}
                  onChange={(e) => setSaleToDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md
                    bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                    focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Comparison Fields
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
          <div className="flex-1 min-h-0 overflow-y-auto py-1">
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

        {/* ─── RIGHT PANEL: Grid ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm px-3 pt-3 pb-0.5">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-base font-bold">Sales Comparer</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Grouped by: <span className="font-medium text-indigo-600 dark:text-indigo-400">{activeLabel}</span>
                {saleFromDate || saleToDate ? (
                  <span>
                    {" "}• Sale Range: <span className="font-medium text-indigo-600 dark:text-indigo-400">{saleFromDate || "Any"}</span>
                    {" "}to <span className="font-medium text-indigo-600 dark:text-indigo-400">{saleToDate || "Any"}</span>
                  </span>
                ) : null}
                {" "}— {data.length} record{data.length !== 1 ? "s" : ""}
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

          {totals && !notice && (
            <div className="mb-1.5 flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-md font-semibold text-gray-700 dark:text-gray-200">
              <span>TOTAL</span>
              <span>Qty Sold: {fmtInt(totals.qty_sold)}</span>
              <span className="text-red-700 dark:text-red-400">Returned: {fmtInt(totals.qty_returned)}</span>
              <span>Net Qty: {fmtInt(totals.net_qty)}</span>
              <span>Sale Amt: {fmt(totals.net_amount)}</span>
              <span>Cost Amt: {fmt(totals.net_cost)}</span>
              <span className="text-orange-700 dark:text-orange-400">Discount: {fmt(totals.total_discount)}</span>
              <span className="text-green-700 dark:text-green-400">Margin: {fmt(totals.margin_perc)}%</span>
              <span className="text-green-700 dark:text-green-400">Mark Up: {fmt(totals.markup_perc)}%</span>
            </div>
          )}

          <FilterableDataTable
            rows={data}
            columns={columns}
            rowKey="description"
            loading={loading}
            searchPlaceholder={`Search in ${activeLabel.toLowerCase()}...`}
            emptyText={notice || `No data found for ${activeLabel}`}
            tablePreferenceKey="analytical.sales-comparer"
            onExportRows={async () => data}
            exportFileName="sales-comparer"
            onRefresh={() => fetchData(activeField)}
            refreshDisabled={loading}
            paginationMode="client"
            enableVirtualization
            enableColumnResize
            fillHeight
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default SalesComparer;
