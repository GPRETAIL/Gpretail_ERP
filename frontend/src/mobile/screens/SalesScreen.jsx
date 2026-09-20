import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter, Plus, LayoutGrid } from "lucide-react";
import { Box, Typography } from "@mui/material";
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
    window.addEventListener("vx-pull-refresh", handleNetworkRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleNetworkRestored);
      window.removeEventListener("vx-pull-refresh", handleNetworkRestored);
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
    <Box>
      {/* Search & Filter */}
      <Box className="vx-search-row relative">
        <Box className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <Box
            component="input"
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        <Box
          component="button"
          type="button"
          className={`vx-filter-btn ${dateRange !== "all" ? "!bg-indigo-600 !text-white" : ""}`}
          aria-label="Filter by date"
          onClick={() => setShowDateFilter((v) => !v)}
        >
          <Filter size={17} />
        </Box>
        <Box
          component="button"
          type="button"
          className="vx-filter-btn"
          aria-label="Summary Layouts"
          title="Summary Layouts"
          onClick={() => onNavigate && onNavigate("sales_summary")}
        >
          <LayoutGrid size={17} />
        </Box>

        {showDateFilter && (
          <Box sx={{ position: "absolute", right: 0, top: "100%", mt: 0.75, zIndex: 30, bgcolor: "#fff", border: "1px solid #e2e8f0", boxShadow: 8, borderRadius: "16px", p: 0.75, display: "flex", flexDirection: "column", gap: 0.25, minWidth: 140 }}>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <Box
                component="button"
                key={opt.id}
                type="button"
                onClick={() => {
                  setDateRange(opt.id);
                  setShowDateFilter(false);
                }}
                sx={{
                  px: 1.5, py: 1, textAlign: "left", fontSize: 11.5, fontWeight: 700, borderRadius: "12px", transition: "all 0.15s",
                  bgcolor: dateRange === opt.id ? "#eef2ff" : "transparent",
                  color: dateRange === opt.id ? "#4f46e5" : "#475569",
                  "&:hover": dateRange === opt.id ? {} : { bgcolor: "#f8fafc" },
                }}
              >
                {opt.label}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Filter Tabs */}
      <Box className="vx-filter-tabs">
        {["All", "Paid", "Credit"].map((t) => (
          <Box
            component="button"
            key={t}
            type="button"
            className={`vx-filter-pill ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </Box>
        ))}
      </Box>

      {/* Invoices List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : filtered.length === 0 ? (
        <Box className="vx-card" sx={{ textAlign: "center" }}>
          <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>No invoices found</Typography>
        </Box>
      ) : (
        <Box>
          {filtered.map((inv) => {
            const id = inv.invoice_no || `INV-${inv.id}`;
            const customer = inv.customer?.name || "Customer";
            const date = formatDate(inv.sale_date || inv.created_at);
            const amount = inv.grand_total || 0;
            const status = mapStatus(inv);

            return (
              <Box key={inv.id || id} className="vx-trans-card">
                <Box className="vx-trans-left">
                  <Box component="span" className="vx-trans-id">{id}</Box>
                  <Box component="span" className="vx-trans-meta">{customer}</Box>
                  <Box component="span" className="vx-trans-meta">{date}</Box>
                </Box>
                <Box className="vx-trans-right">
                  <Box component="span" className="vx-trans-amount">{money(amount)}</Box>
                  <Box component="span" className={`vx-pill-badge ${status}`}>{status}</Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* FAB */}
      <Box
        component="button"
        type="button"
        className="vx-fab-btn"
        onClick={() => onNavigate("create_invoice")}
        title="Create Invoice"
        aria-label="Create Invoice"
      >
        <Plus size={26} />
      </Box>
    </Box>
  );
}
