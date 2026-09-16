import React, { useState, useEffect, useCallback } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import StoreFilterSelect from "../../components/StoreFilterSelect";
import PivotTable from "../../components/PivotTable";
import { toast } from "react-toastify";

const selectClass =
  "w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md " +
  "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 " +
  "focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1";

const ROW_BY_OPTIONS = [
  { value: "product", label: "Product (rows) × Supplier (columns)" },
  { value: "supplier", label: "Supplier (rows) × Product (columns)" },
];
const MEASURE_OPTIONS = [
  { value: "amount", label: "Purchase Amount" },
  { value: "qty", label: "Quantity" },
];

const SupplierProductAnalyzer = () => {
  const navigate = useNavigate();
  const [rowBy, setRowBy] = useState("product");
  const [measure, setMeasure] = useState("amount");
  const [storeFilter, setStoreFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pivot, setPivot] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/supplier-product-analytics", {
        params: {
          row_by: rowBy,
          measure,
          ...(storeFilter ? { company_id: storeFilter } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        },
      });
      if (res.data?.success) {
        setPivot(res.data);
      } else {
        toast.error(res.data?.message || "Failed to load supplier/product analytics");
        setPivot(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load supplier/product analytics");
      setPivot(null);
    } finally {
      setLoading(false);
    }
  }, [rowBy, measure, storeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBackClick = () => navigate("/analytical");
  const rowLabel = rowBy === "product" ? "Product" : "Supplier";
  const measureLabel = MEASURE_OPTIONS.find((m) => m.value === measure)?.label || measure;

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button onClick={handleBackClick} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" aria-label="Back to analytical">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button type="button" onClick={handleBackClick} className="text-blue-600 hover:text-blue-700 hover:underline">
              Analytical
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>360° Purchase Analyzer</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 p-4">
        {/* ─── LEFT PANEL: Pivot controls ───────────────────────────────── */}
        <div className="w-64 flex-shrink-0 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm px-3 py-2.5 space-y-3 overflow-y-auto">
          <div>
            <label className={labelClass}>Store</label>
            <StoreFilterSelect value={storeFilter} onChange={setStoreFilter} />
          </div>
          <div>
            <label className={labelClass}>View</label>
            <select className={selectClass} value={rowBy} onChange={(e) => setRowBy(e.target.value)}>
              {ROW_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Measure</label>
            <select className={selectClass} value={measure} onChange={(e) => setMeasure(e.target.value)}>
              {MEASURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Purchase From</label>
            <input type="date" className={selectClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Purchase To</label>
            <input type="date" className={selectClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed pt-2 border-t border-gray-100 dark:border-gray-700">
            Sourced from Direct Purchases + Purchase Invoices. GRNs are not included to avoid
            double-counting the same receipt.
          </p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
              bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400
              hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ─── RIGHT PANEL: Pivot grid ──────────────────────────────────── */}
        <PivotTable
          title="Supplier × Product Purchase Summary"
          rowLabel={rowLabel}
          measureLabel={measureLabel}
          rows={pivot?.rows || []}
          columns={pivot?.columns || []}
          cells={pivot?.cells || {}}
          rowTotals={pivot?.rowTotals || {}}
          colTotals={pivot?.colTotals || {}}
          grandTotal={pivot?.grandTotal || 0}
          loading={loading}
          exportFileName="supplier-product-analytics"
        />
      </div>
    </div>
  );
};

export default SupplierProductAnalyzer;
