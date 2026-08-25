import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter, Plus, LayoutGrid } from "lucide-react";
import api from "../../api/axios";
import { SkeletonTransList } from "../components/SkeletonCards";

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

const mapStatus = (bill) => (bill.payment_status || bill.status || "unpaid").toLowerCase();

/**
 * Purchase Bills list screen - merges the two real purchase-bill sources
 * this ERP has (Direct Purchase entries and Invoices from the Transport
 * Entry -> Invoice -> Inventory Entry flow), since a bill can land in
 * either one depending on which workflow a store uses.
 */
export default function PurchaseScreen({ onNavigate }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [bills, setBills] = useState([]);
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

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 30, search: search || undefined, ...dateParams };
      const [directRes, invoiceRes] = await Promise.allSettled([
        api.get("/direct-purchases", { params }),
        api.get("/invoices", { params }),
      ]);

      const extract = (res) => {
        if (res.status !== "fulfilled") return [];
        const data = res.value.data?.data;
        return Array.isArray(data) ? data : data?.data || data?.items || data?.results || [];
      };

      const directList = extract(directRes).map((b) => ({ ...b, _source: "direct" }));
      const invoiceList = extract(invoiceRes).map((b) => ({ ...b, _source: "invoice" }));

      const merged = [...directList, ...invoiceList].sort((a, b) => {
        const da = new Date(a.purchase_date || a.invoice_date || a.created_at || 0);
        const db = new Date(b.purchase_date || b.invoice_date || b.created_at || 0);
        return db - da;
      });

      setBills(merged);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [search, dateParams]);

  useEffect(() => {
    loadBills();

    const handleNetworkRestored = () => {
      loadBills();
    };

    window.addEventListener("vx-network-restored", handleNetworkRestored);
    window.addEventListener("vx-pull-refresh", handleNetworkRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleNetworkRestored);
      window.removeEventListener("vx-pull-refresh", handleNetworkRestored);
    };
  }, [loadBills]);

  // Real payment_status values are UNPAID/PARTIAL/PAID on both sources -
  // there's no "draft" workflow state for either kind of purchase bill.
  const filtered = bills.filter((b) => {
    const status = mapStatus(b);
    if (filter === "Paid" && status !== "paid") return false;
    if (filter === "Unpaid" && status === "paid") return false;
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
            placeholder="Search bills..."
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
          onClick={() => onNavigate && onNavigate("purchase_summary")}
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
        {["All", "Paid", "Unpaid"].map((t) => (
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

      {/* Bills List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : filtered.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No purchase bills found</p>
        </div>
      ) : (
        <div>
          {filtered.map((bill) => {
            const id = bill.invoice_no || bill.purchase_no || `BILL-${bill.id}`;
            const supplier = bill.supplier_name || bill.supplier?.name || "Supplier";
            const date = formatDate(bill.purchase_date || bill.invoice_date || bill.created_at);
            const amount = bill.total_amount || bill.grand_total || 0;
            const status = mapStatus(bill);

            return (
              <div key={`${bill._source}-${bill.id || id}`} className="vx-trans-card">
                <div className="vx-trans-left">
                  <span className="vx-trans-id">{id}</span>
                  <span className="vx-trans-meta">{supplier}</span>
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
        title="Create Purchase Bill"
        aria-label="Create Purchase Bill"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
