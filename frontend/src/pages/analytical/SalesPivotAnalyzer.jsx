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

const DIMENSION_OPTIONS = [
  { value: "store", label: "Store" },
  { value: "month", label: "Month" },
  { value: "payment_mode", label: "Payment Mode" },
];
const MEASURE_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "qty", label: "Qty" },
  { value: "bills", label: "Bills" },
];

const SalesPivotAnalyzer = () => {
  const navigate = useNavigate();
  const [rowBy, setRowBy] = useState("store");
  const [columnBy, setColumnBy] = useState("month");
  const [measure, setMeasure] = useState("revenue");
  const [storeFilter, setStoreFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pivot, setPivot] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (rowBy === columnBy) return;
    setLoading(true);
    try {
      const res = await api.get("/sales-pivot", {
        params: {
          row_by: rowBy,
          column_by: columnBy,
          measure,
          ...(storeFilter ? { company_id: storeFilter } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        },
      });
      if (res.data?.success) {
        setPivot(res.data);
      } else {
        toast.error(res.data?.message || "Failed to load sales pivot");
        setPivot(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load sales pivot");
      setPivot(null);
    } finally {
      setLoading(false);
    }
  }, [rowBy, columnBy, measure, storeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBackClick = () => navigate("/analytical");
  const rowLabel = DIMENSION_OPTIONS.find((d) => d.value === rowBy)?.label || rowBy;
  const measureLabel = MEASURE_OPTIONS.find((m) => m.value === measure)?.label || measure;
  const sameDimension = rowBy === columnBy;

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
            <span>360° Sales Analyzer</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 p-4">
        {/* ─── LEFT PANEL: Pivot controls ───────────────────────────────── */}
        <div className="w-64 flex-shrink-0 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm px-3 py-2.5 space-y-3 overflow-y-auto">
          <div>
            <label className={labelClass}>Store Filter</label>
            <StoreFilterSelect value={storeFilter} onChange={setStoreFilter} />
          </div>
          <div>
            <label className={labelClass}>Rows</label>
            <select className={selectClass} value={rowBy} onChange={(e) => setRowBy(e.target.value)}>
              {DIMENSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Columns</label>
            <select className={selectClass} value={columnBy} onChange={(e) => setColumnBy(e.target.value)}>
              {DIMENSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {sameDimension && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">Rows and columns must differ.</p>
            )}
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
            <label className={labelClass}>Sale From</label>
            <input type="date" className={selectClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Sale To</label>
            <input type="date" className={selectClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button
            onClick={fetchData}
            disabled={loading || sameDimension}
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
          title="Sales Cross-Tab"
          rowLabel={rowLabel}
          measureLabel={measureLabel}
          rows={pivot?.rows || []}
          columns={pivot?.columns || []}
          cells={pivot?.cells || {}}
          rowTotals={pivot?.rowTotals || {}}
          colTotals={pivot?.colTotals || {}}
          grandTotal={pivot?.grandTotal || 0}
          loading={loading}
          emptyText={sameDimension ? "Pick two different dimensions for rows and columns" : undefined}
          exportFileName="sales-pivot"
        />
      </div>
    </div>
  );
};

export default SalesPivotAnalyzer;
