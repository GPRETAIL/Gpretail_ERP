import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Box, Typography } from "@mui/material";
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
    <Box>
      {/* Search & Filter */}
      <Box className="vx-search-row relative">
        <Box className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <Box
            component="input"
            type="text"
            placeholder="Search returns..."
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

      {/* Returns List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : returns.length === 0 ? (
        <Box className="vx-card" sx={{ textAlign: "center" }}>
          <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>No returns found</Typography>
        </Box>
      ) : (
        <Box>
          {returns.map((ret) => {
            const id = ret.display_return_no || ret.return_no || `RR/${ret.id}`;
            const customer = ret.customer?.name || "Walk-in Customer";
            const sourceInvoice = ret.pos_sale?.invoice_no;
            const date = formatDate(ret.return_date || ret.created_at);
            const amount = ret.total_refund || 0;
            const status = String(ret.status || "completed").toLowerCase();

            return (
              <Box key={ret.id} className="vx-trans-card">
                <Box className="vx-trans-left">
                  <Box component="span" className="vx-trans-id">{id}</Box>
                  <Box component="span" className="vx-trans-meta">{customer}</Box>
                  {sourceInvoice && (
                    <Box component="span" className="vx-trans-meta">Against: {sourceInvoice}</Box>
                  )}
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
    </Box>
  );
}
