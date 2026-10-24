import SaleInvoiceDetails from "../components/SaleInvoiceDetails";
import useAsyncQuery from "../../hooks/useAsyncQuery";
import { EMPTY_ARRAY } from "../../utils/emptyValues";
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

const mapStatus = sale => {
  const status = String(sale.status || "").toLowerCase();
  if (["paid", "settled", "cancelled", "returned"].includes(status)) return status;
  if (sale.is_credit || sale.payment_mode === "CREDIT") return "credit";
  return Number(sale.remaining_amount ?? Number(sale.grand_total || 0) - Number(sale.paid_amount || 0)) > 0 || status === "unsettled" ? "unsettled" : "paid";
};
const isCreditSale = sale => mapStatus(sale) === "credit";

/**
 * Sales Invoices list screen — fetches real data from GET /pos-sales.
 */
export default function SalesScreen({ onNavigate }) {
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
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

  const fetchList = useCallback(async ({ signal }) => {
      const res = await api.get("/pos-sales", { signal,
        params: { page: 1, limit: 30, search: search || undefined, ...dateParams },
      });
      const data = res.data?.data;
      const list = Array.isArray(data)
        ? data
        : data?.data || data?.items || data?.results || [];
      return list;
  }, [search, dateParams]);
  const { data: response, loading, reload: loadSales } = useAsyncQuery(fetchList);
  const sales = response || EMPTY_ARRAY;

  useEffect(() => {
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
    if (filter === "Paid" && !["paid", "settled"].includes(mapStatus(s))) return false;
    if (filter === "Credit" && !isCreditSale(s)) return false;
    if (filter === "Unsettled" && mapStatus(s) !== "unsettled") return false;
    return true;
  });

  return (
    <Box>
      {/* Search & Filter */}
      <Box className="vx-search-row" sx={{ position: "relative" }}>
        <Box className="vx-search-input-wrap">
          <Search size={16} color="#94a3b8" />
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
          className="vx-filter-btn"
          sx={dateRange !== "all" ? { bgcolor: "#4f46e5", color: "#fff" } : undefined}
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
        {["All", "Paid", "Credit", "Unsettled"].map((t) => (
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
            const id = inv.bill_no || inv.invoice_no || `INV-${inv.id}`;
            const customer = inv.customer?.name || "Customer";
            const date = formatDate(inv.sale_date || inv.created_at);
            const amount = inv.grand_total || 0;
            const status = mapStatus(inv);

            return (
              <Box component="button" type="button" key={inv.id || id} className="vx-trans-card" aria-label={`View invoice ${id}`} onClick={() => setSelectedSaleId(inv.id)} sx={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
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

      {selectedSaleId && <SaleInvoiceDetails saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />}

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
