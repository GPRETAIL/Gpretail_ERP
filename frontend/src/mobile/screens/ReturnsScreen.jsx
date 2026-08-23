import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter } from "lucide-react";
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

/**
 * Return Invoices list screen - fetches real data from GET /pos-returns.
 */
export default function ReturnsScreen() {
  const [search, setSearch] = useState("");
  const [returns, setReturns] = useState([]);
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

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/pos-returns", {
        params: { page: 1, limit: 30, search: search || undefined, ...dateParams },
      });
      const data = res.data?.data;
      const list = Array.isArray(data) ? data : data?.data || data?.items || [];
      setReturns(list);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [search, dateParams]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  return (
    <div>
      {/* Search & Filter */}
      <div className="vx-search-row relative">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search returns..."
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

      {/* Returns List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : returns.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No returns found</p>
        </div>
      ) : (
        <div>
          {returns.map((ret) => {
            const id = ret.display_return_no || ret.return_no || `RR/${ret.id}`;
            const customer = ret.customer?.name || "Walk-in Customer";
            const sourceInvoice = ret.pos_sale?.invoice_no;
            const date = formatDate(ret.return_date || ret.created_at);
            const amount = ret.total_refund || 0;
            const status = String(ret.status || "completed").toLowerCase();

            return (
              <div key={ret.id} className="vx-trans-card">
                <div className="vx-trans-left">
                  <span className="vx-trans-id">{id}</span>
                  <span className="vx-trans-meta">{customer}</span>
                  {sourceInvoice && (
                    <span className="vx-trans-meta text-[10px]">Against: {sourceInvoice}</span>
                  )}
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
    </div>
  );
}
