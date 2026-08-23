import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter, Plus, LayoutGrid } from "lucide-react";
import api from "../../api/axios";
import { SkeletonTransList } from "../components/SkeletonCards";

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DATE_RANGE_OPTIONS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const mapStatus = (sale) => {
  if (sale.status) return sale.status.toLowerCase();
  if (sale.paymentStatus) return sale.paymentStatus.toLowerCase();
  return "paid";
};

// Every POS sale's `status` is always "COMPLETED" (there's no draft/sent
// workflow for a POS bill - it's created and completed in one step), so
// filter tabs built around that field could never match anything. The one
// real, data-backed distinction on a sale is how it was paid.
const isCreditSale = (sale) => sale.payment_mode === "CREDIT" || sale.is_credit === true;

/**
 * Sales Invoices list screen — fetches real data from GET /pos-sales.
 */
export default function SalesScreen({ onNavigate }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [showDateFilter, setShowDateFilter] = useState(false);

  const dateParams = useMemo(() => {
    if (dateRange === "all") return {};
    const now = new Date();
    let from = new Date();
    if (dateRange === "today") {
      from = now;
    } else if (dateRange === "week") {
      from = new Date(new Date().setDate(now.getDate() - 7));
    } else if (dateRange === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { from: formatYmd(from), to: formatYmd(new Date()) };
  }, [dateRange]);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/pos-sales", {
        params: { page: 1, limit: 30, search: search || undefined, ...dateParams },
      });
      const data = res.data?.data;
      const list = Array.isArray(data)
        ? data
        : data?.data || data?.items || data?.results || [];
      setSales(list);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [search, dateParams]);

  useEffect(() => {
    loadSales();

    const handleNetworkRestored = () => {
      loadSales();
    };

    window.addEventListener("vx-network-restored", handleNetworkRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleNetworkRestored);
    };
  }, [loadSales]);

  // Client-side filter - based on how the sale was actually paid, since
  // every sale's `status` is always COMPLETED (no draft/sent workflow
  // exists for a POS bill) and could never distinguish anything.
  const filtered = sales.filter((s) => {
    if (filter === "Paid" && isCreditSale(s)) return false;
    if (filter === "Credit" && !isCreditSale(s)) return false;
    return true;
  });

  return (
    <div>
      {/* Search & Filter */}
      <div className="vx-search-row relative">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`vx-filter-btn ${dateRange !== "all" ? "!bg-indigo-600 !text-white" : ""}`}
          aria-label="Filter by date"
          onClick={() => setShowDateFilter((v) => !v)}
        >
          <Filter size={17} />
        </button>
        <button
          type="button"
          className="vx-filter-btn"
          aria-label="Summary Layouts"
          title="Summary Layouts"
          onClick={() => onNavigate && onNavigate("sales_summary")}
        >
          <LayoutGrid size={17} />
        </button>

        {showDateFilter && (
          <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 flex flex-col gap-0.5 min-w-[140px]">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setDateRange(opt.id);
                  setShowDateFilter(false);
                }}
                className={`px-3 py-2 text-left text-[11.5px] font-bold rounded-xl transition-all ${
                  dateRange === opt.id ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="vx-filter-tabs">
        {["All", "Paid", "Credit"].map((t) => (
          <button
            key={t}
            type="button"
            className={`vx-filter-pill ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : filtered.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No invoices found</p>
        </div>
      ) : (
        <div>
          {filtered.map((inv) => {
            const id = inv.invoice_no || `INV-${inv.id}`;
            const customer = inv.customer?.name || "Customer";
            const date = formatDate(inv.sale_date || inv.created_at);
            const amount = inv.grand_total || 0;
            const status = mapStatus(inv);

            return (
              <div key={inv.id || id} className="vx-trans-card">
                <div className="vx-trans-left">
                  <span className="vx-trans-id">{id}</span>
                  <span className="vx-trans-meta">{customer}</span>
                  <span className="vx-trans-meta text-[10px]">{date}</span>
                </div>
                <div className="vx-trans-right">
                  <span className="vx-trans-amount">{money(amount)}</span>
                  <span className={`vx-pill-badge ${status}`}>{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        className="vx-fab-btn"
        onClick={() => onNavigate("create_invoice")}
        title="Create Invoice"
        aria-label="Create Invoice"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
