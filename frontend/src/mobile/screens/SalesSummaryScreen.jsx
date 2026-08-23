import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import api from "../../api/axios";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Every breakdown here reads from data this app already computes correctly
// elsewhere (the same /dashboard/overview aggregation the Dashboard screen
// uses for Settlement/Location/Company, and the same raw /sales-reports
// dataset the desktop SalesReports.jsx page fetches once and slices client-
// side into its ~15 tabs) rather than inventing a second, parallel
// computation that could quietly drift from what those already show.
const BREAKDOWN_TYPES = [
  { id: "settlement", label: "Settlement Details (Method & Location)" },
  { id: "location", label: "Location Summary" },
  { id: "company", label: "Company Summary" },
  { id: "date", label: "Date Summary" },
  { id: "bill", label: "Bill Summary" },
  { id: "gst_bill", label: "GST Bill Summary" },
  { id: "bill_tax", label: "Bill / Tax Summary" },
  { id: "bill_detail", label: "Bill Detail" },
  { id: "discount", label: "Discount Bills Summary" },
];

const SETTLEMENT_DOT_CLASS = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

export default function SalesSummaryScreen() {
  const today = useMemo(() => new Date(), []);
  const monthAgo = useMemo(() => new Date(new Date().setDate(today.getDate() - 30)), [today]);

  const [breakdownType, setBreakdownType] = useState("settlement");
  const [showPicker, setShowPicker] = useState(false);
  const [fromDate, setFromDate] = useState(formatYmd(monthAgo));
  const [toDate, setToDate] = useState(formatYmd(today));
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [rawSales, setRawSales] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, salesRes] = await Promise.allSettled([
        api.get("/dashboard/overview", {
          params: { from: fromDate, to: toDate, timezoneOffset: new Date().getTimezoneOffset() },
        }),
        api.get("/sales-reports", {
          params: { all: true, start_date: fromDate, end_date: toDate },
        }),
      ]);
      setOverview(overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : null);
      const salesData = salesRes.status === "fulfilled" ? salesRes.value.data?.data : [];
      setRawSales(Array.isArray(salesData) ? salesData : []);
    } catch {
      setOverview(null);
      setRawSales([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const activeLabel = BREAKDOWN_TYPES.find((b) => b.id === breakdownType)?.label;

  return (
    <div className="space-y-3">
      {/* Breakdown Type Picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
        >
          <span className="text-[12px] font-black text-slate-900">{activeLabel}</span>
          <ChevronDown size={16} className="text-slate-400 shrink-0" />
        </button>

        {showPicker && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 max-h-[300px] overflow-y-auto">
            {BREAKDOWN_TYPES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBreakdownType(b.id);
                  setShowPicker(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-[11.5px] font-bold rounded-xl transition-all ${
                  breakdownType === b.id ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="flex-1 p-2.5 rounded-xl bg-white border border-slate-200/80 text-[11.5px] font-bold text-slate-700"
        />
        <span className="text-[10px] text-slate-400 font-bold">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="flex-1 p-2.5 rounded-xl bg-white border border-slate-200/80 text-[11.5px] font-bold text-slate-700"
        />
      </div>

      {loading ? (
        <div className="vx-card text-center py-10">
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      ) : (
        <BreakdownView type={breakdownType} overview={overview} rawSales={rawSales} />
      )}
    </div>
  );
}

function BreakdownView({ type, overview, rawSales }) {
  if (type === "settlement") return <SettlementView overview={overview} />;
  if (type === "location") return <LocationView overview={overview} labelKey="location" title="Location" />;
  if (type === "company") return <LocationView overview={overview} labelKey="company" title="Company" />;
  if (type === "date") return <DateSummaryView rawSales={rawSales} />;
  if (type === "bill") return <BillListView rawSales={rawSales} mode="bill" />;
  if (type === "gst_bill") return <BillListView rawSales={rawSales} mode="gst" />;
  if (type === "bill_tax") return <BillListView rawSales={rawSales} mode="tax" />;
  if (type === "bill_detail") return <BillDetailView rawSales={rawSales} />;
  if (type === "discount") return <BillListView rawSales={rawSales} mode="discount" />;
  return null;
}

function EmptyState({ message }) {
  return (
    <div className="vx-card text-center py-8">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

// Settlement Details (Method & Location) - reads tables.settlementDetails,
// the same real per-store-column payment-method breakdown the Dashboard's
// Settlement Details card and the desktop SettlementDetailsTable both use.
function SettlementView({ overview }) {
  const table = overview?.tables?.settlementDetails;
  const columns = table?.columns || [];
  const rows = table?.rows || [];

  if (!rows.length) return <EmptyState message="No settlements in this range" />;

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] min-w-[420px]">
          <thead>
            <tr className="text-left text-slate-400 font-bold uppercase text-[9.5px]">
              <th className="pb-2 pr-2">Method</th>
              {columns.map((c) => (
                <th key={c.key} className="pb-2 px-2 text-right">{c.label}</th>
              ))}
              <th className="pb-2 pl-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-100">
                <td className="py-2 pr-2 font-bold text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${SETTLEMENT_DOT_CLASS[row.color] || "bg-slate-400"}`} />
                    {row.label}
                  </span>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="py-2 px-2 text-right font-semibold text-slate-600">
                    {money(row.values?.[c.key])}
                  </td>
                ))}
                <td className="py-2 pl-2 text-right font-black text-slate-900">{money(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table?.grandTotal != null && (
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200">
          <span className="text-[11px] font-black text-slate-900 uppercase">Grand Total</span>
          <span className="text-[13px] font-black text-indigo-600">{money(table.grandTotal)}</span>
        </div>
      )}
    </div>
  );
}

// Location/Company Summary - reads tables.dailySalesSummary, the same
// per-store rows (company, location, count, quantity, value) the desktop
// DailySalesSummaryTable already shows.
function LocationView({ overview, labelKey, title }) {
  const table = overview?.tables?.dailySalesSummary;
  const rows = table?.rows || [];

  if (!rows.length) return <EmptyState message="No sales in this range" />;

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      <div className="space-y-1.5">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-[11.5px] font-bold text-slate-900 m-0">{row[labelKey] || row.company}</p>
              <p className="text-[9.5px] text-slate-500 font-semibold m-0 mt-0.5">
                {row.count} bills · {Number(row.quantity).toLocaleString("en-IN")} pcs
              </p>
            </div>
            <span className="text-[12px] font-black text-slate-900">{money(row.value)}</span>
          </div>
        ))}
        {table?.totals && (
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-900 uppercase">Total</span>
            <span className="text-[12.5px] font-black text-indigo-600">{money(table.totals.value)}</span>
          </div>
        )}
      </div>
      <p className="text-[9px] text-slate-400 mt-2">{title} breakdown across {rows.length} {rows.length === 1 ? "store" : "stores"}</p>
    </div>
  );
}

// Date Summary - grouped by calendar day from the raw sales list, since no
// backend aggregate respects an arbitrary custom date range the way this
// picker's From/To does (the dashboard's own daily chart is hardcoded to
// "last 10 days" regardless of what range is selected here).
function DateSummaryView({ rawSales }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const sale of rawSales) {
      const dateKey = String(sale.sale_date || "").slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey, count: 0, amount: 0 });
      const bucket = map.get(dateKey);
      bucket.count += 1;
      bucket.amount += Number(sale.grand_total || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [rawSales]);

  if (!grouped.length) return <EmptyState message="No sales in this range" />;

  return (
    <div className="space-y-1.5">
      {grouped.map((row) => (
        <div key={row.date} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div>
            <p className="text-[12px] font-bold text-slate-900 m-0">{formatDate(row.date)}</p>
            <p className="text-[9.5px] text-slate-500 font-semibold m-0 mt-0.5">{row.count} bills</p>
          </div>
          <span className="text-[12.5px] font-black text-slate-900">{money(row.amount)}</span>
        </div>
      ))}
    </div>
  );
}

// Bill Summary / GST Bill Summary / Bill-Tax Summary / Discount Bills -
// all the same underlying bill list, showing different columns per the
// selected mode (matches how desktop's SalesReports.jsx filters the same
// BILL_SUMMARY_COLUMNS set per tab rather than fetching separately per tab).
function BillListView({ rawSales, mode }) {
  const rows = useMemo(() => {
    if (mode === "discount") {
      return rawSales.filter((s) => Number(s.discount_amount || 0) > 0);
    }
    return rawSales;
  }, [rawSales, mode]);

  if (!rows.length) {
    return <EmptyState message={mode === "discount" ? "No discounted bills in this range" : "No bills in this range"} />;
  }

  return (
    <div className="space-y-1.5">
      {rows.map((sale) => (
        <div key={sale.id} className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-black text-slate-900">{sale.invoice_no}</span>
            <span className="text-[12.5px] font-black text-slate-900">{money(sale.grand_total)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-500 font-semibold">
              {sale.customer?.name || "Walk-in"} · {formatDate(sale.sale_date)}
            </span>
          </div>

          {mode === "gst" && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-semibold text-slate-500">
              <span>Taxable: {money(sale.subtotal)}</span>
              <span>GST: {money(sale.tax_amount)}</span>
            </div>
          )}

          {mode === "tax" && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-semibold text-slate-500">
              <span>CGST: {money(Number(sale.tax_amount || 0) / 2)}</span>
              <span>SGST: {money(Number(sale.tax_amount || 0) / 2)}</span>
            </div>
          )}

          {mode === "discount" && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-semibold text-rose-600">
              <span>Discount Given</span>
              <span>-{money(sale.discount_amount)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Bill Detail - one row per product line across every bill in the range,
// flattened from the same eager-loaded items.product relation the raw
// sales list already carries.
function BillDetailView({ rawSales }) {
  const rows = useMemo(() => {
    const flat = [];
    for (const sale of rawSales) {
      for (const item of sale.items || []) {
        flat.push({
          saleId: sale.id,
          invoiceNo: sale.invoice_no,
          date: sale.sale_date,
          productName: item.product?.name || item.product_name || "Item",
          quantity: item.quantity,
          sellingPrice: item.selling_price,
          subtotal: item.subtotal,
        });
      }
    }
    return flat;
  }, [rawSales]);

  if (!rows.length) return <EmptyState message="No bill items in this range" />;

  return (
    <div className="space-y-1.5">
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-900 truncate m-0">{row.productName}</p>
            <p className="text-[9.5px] text-slate-500 font-semibold m-0 mt-0.5">
              {row.invoiceNo} · {row.quantity} × {money(row.sellingPrice)}
            </p>
          </div>
          <span className="text-[11.5px] font-black text-slate-900 pl-2 shrink-0">{money(row.subtotal)}</span>
        </div>
      ))}
    </div>
  );
}
