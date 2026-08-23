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

// Adapted from the Sales Summary Layouts set: "Settlement by mode" doesn't
// apply the same way to purchase bills (they're not paid via customer-
// facing tender modes), so Supplier Summary replaces it as the natural
// purchase-side grouping. Every other type mirrors Sales directly.
const BREAKDOWN_TYPES = [
  { id: "supplier", label: "Supplier Summary" },
  { id: "date", label: "Date Summary" },
  { id: "bill", label: "Bill Summary" },
  { id: "gst_bill", label: "GST Bill Summary" },
  { id: "bill_tax", label: "Bill / Tax Summary" },
  { id: "bill_detail", label: "Bill Detail" },
  { id: "discount", label: "Discount Bills Summary" },
];

export default function PurchaseSummaryScreen() {
  const today = useMemo(() => new Date(), []);
  const monthAgo = useMemo(() => new Date(new Date().setDate(today.getDate() - 30)), [today]);

  const [breakdownType, setBreakdownType] = useState("supplier");
  const [showPicker, setShowPicker] = useState(false);
  const [fromDate, setFromDate] = useState(formatYmd(monthAgo));
  const [toDate, setToDate] = useState(formatYmd(today));
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { all: true, from: fromDate, to: toDate };
      const [directRes, invoiceRes] = await Promise.allSettled([
        api.get("/direct-purchases", { params }),
        api.get("/invoices", { params }),
      ]);

      const extract = (res) => {
        if (res.status !== "fulfilled") return [];
        const data = res.value.data?.data;
        return Array.isArray(data) ? data : data?.data || [];
      };

      const directList = extract(directRes).map((b) => ({ ...b, _source: "direct" }));
      const invoiceList = extract(invoiceRes).map((b) => ({ ...b, _source: "invoice" }));
      setBills([...directList, ...invoiceList]);
    } catch {
      setBills([]);
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
        <BreakdownView type={breakdownType} bills={bills} />
      )}
    </div>
  );
}

function BreakdownView({ type, bills }) {
  if (type === "supplier") return <SupplierView bills={bills} />;
  if (type === "date") return <DateSummaryView bills={bills} />;
  if (type === "bill") return <BillListView bills={bills} mode="bill" />;
  if (type === "gst_bill") return <BillListView bills={bills} mode="gst" />;
  if (type === "bill_tax") return <BillListView bills={bills} mode="tax" />;
  if (type === "bill_detail") return <BillDetailView bills={bills} />;
  if (type === "discount") return <BillListView bills={bills} mode="discount" />;
  return null;
}

function EmptyState({ message }) {
  return (
    <div className="vx-card text-center py-8">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

const billAmount = (b) => Number(b.total_amount ?? b.grand_total ?? 0);
const billDate = (b) => b.purchase_date || b.invoice_date || b.created_at;
const billNo = (b) => b.invoice_no || b.purchase_no || `BILL-${b.id}`;
const billSupplier = (b) => b.supplier_name || b.supplier?.name || "Unknown Supplier";

// Supplier Summary - purchase-side equivalent of Sales Summary's Location/
// Company Summary, grouping the same merged Direct Purchase + Invoice data
// PurchaseScreen already fetches by supplier instead of by store.
function SupplierView({ bills }) {
  const rows = useMemo(() => {
    const map = new Map();
    for (const b of bills) {
      const key = billSupplier(b);
      if (!map.has(key)) map.set(key, { supplier: key, count: 0, amount: 0 });
      const bucket = map.get(key);
      bucket.count += 1;
      bucket.amount += billAmount(b);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [bills]);

  if (!rows.length) return <EmptyState message="No purchases in this range" />;

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.supplier} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-[11.5px] font-bold text-slate-900 m-0">{row.supplier}</p>
              <p className="text-[9.5px] text-slate-500 font-semibold m-0 mt-0.5">{row.count} bills</p>
            </div>
            <span className="text-[12px] font-black text-slate-900">{money(row.amount)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200">
          <span className="text-[11px] font-black text-slate-900 uppercase">Total</span>
          <span className="text-[12.5px] font-black text-indigo-600">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}

function DateSummaryView({ bills }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const b of bills) {
      const dateKey = String(billDate(b) || "").slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey, count: 0, amount: 0 });
      const bucket = map.get(dateKey);
      bucket.count += 1;
      bucket.amount += billAmount(b);
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [bills]);

  if (!grouped.length) return <EmptyState message="No purchases in this range" />;

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

function BillListView({ bills, mode }) {
  const rows = useMemo(() => {
    if (mode === "discount") return bills.filter((b) => Number(b.discount_amount || 0) > 0);
    return bills;
  }, [bills, mode]);

  if (!rows.length) {
    return <EmptyState message={mode === "discount" ? "No discounted bills in this range" : "No bills in this range"} />;
  }

  return (
    <div className="space-y-1.5">
      {rows.map((b) => (
        <div key={`${b._source}-${b.id}`} className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-black text-slate-900">{billNo(b)}</span>
            <span className="text-[12.5px] font-black text-slate-900">{money(billAmount(b))}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-500 font-semibold">
              {billSupplier(b)} · {formatDate(billDate(b))}
            </span>
          </div>

          {mode === "gst" && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-semibold text-slate-500">
              <span>Taxable: {money(billAmount(b) - Number(b.tax_amount || 0))}</span>
              <span>GST: {money(b.tax_amount)}</span>
            </div>
          )}

          {mode === "tax" && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-semibold text-slate-500">
              <span>CGST: {money(Number(b.tax_amount || 0) / 2)}</span>
              <span>SGST: {money(Number(b.tax_amount || 0) / 2)}</span>
            </div>
          )}

          {mode === "discount" && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-semibold text-rose-600">
              <span>Discount</span>
              <span>-{money(b.discount_amount)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Direct Purchase and Invoice items use different field names for the same
// concepts (cost_price vs rate, product_name vs product.name) since they're
// two separate tables, so both are read defensively here.
function BillDetailView({ bills }) {
  const rows = useMemo(() => {
    const flat = [];
    for (const b of bills) {
      for (const item of b.items || []) {
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const rate = Number(item.cost_price ?? item.rate ?? 0);
        flat.push({
          key: `${b._source}-${b.id}-${item.id}`,
          billNo: billNo(b),
          productName: item.product?.name || item.product_name || "Item",
          qty,
          rate,
          lineTotal: item.total != null ? Number(item.total) : qty * rate,
        });
      }
    }
    return flat;
  }, [bills]);

  if (!rows.length) return <EmptyState message="No bill items in this range" />;

  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-900 truncate m-0">{row.productName}</p>
            <p className="text-[9.5px] text-slate-500 font-semibold m-0 mt-0.5">
              {row.billNo} · {row.qty} × {money(row.rate)}
            </p>
          </div>
          <span className="text-[11.5px] font-black text-slate-900 pl-2 shrink-0">{money(row.lineTotal)}</span>
        </div>
      ))}
    </div>
  );
}
