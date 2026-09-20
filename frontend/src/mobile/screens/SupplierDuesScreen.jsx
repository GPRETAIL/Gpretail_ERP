import React, { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";
import { SkeletonTransList } from "../components/SkeletonCards";

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

// No due_date/payment-terms field exists on a purchase bill, only the
// invoice/purchase date - so this shows days outstanding since that date
// rather than a fabricated "days remaining" that would imply a due date.
const daysOutstandingColors = (days) => {
  const d = Number(days || 0);
  if (d > 30) return { bg: "#fff1f2", text: "#be123c" };
  if (d > 15) return { bg: "#fffbeb", text: "#b45309" };
  return { bg: "#f1f5f9", text: "#475569" };
};

/**
 * Supplier Pending Dues list - real data from GET /supplier-payments/pending,
 * merging both Direct Purchase and Invoice bills the same way that endpoint
 * already does server-side.
 */
export default function SupplierDuesScreen() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [totalPayable, setTotalPayable] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/supplier-payments/pending", {
        params: { limit: 100, search: search || undefined },
      });
      setRows(res.data?.data || []);
      setTotalPayable(res.data?.totalPayable ?? 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Box className="vx-search-row">
        <Box className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <Box
            component="input"
            type="text"
            placeholder="Search supplier or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
      </Box>

      {!loading && rows.length > 0 && (
        <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fffbeb", border: "1px solid rgba(253,230,138,0.7)", mb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Payable
          </Typography>
          <Typography component="span" sx={{ fontSize: 15, fontWeight: 900, color: "#92400e" }}>{money(totalPayable)}</Typography>
        </Box>
      )}

      {loading ? (
        <SkeletonTransList count={4} />
      ) : rows.length === 0 ? (
        <Box className="vx-card" sx={{ textAlign: "center" }}>
          <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>No pending supplier dues</Typography>
        </Box>
      ) : (
        <Box>
          {rows.map((row) => {
            const colors = daysOutstandingColors(row.days);
            return (
              <Box key={`${row.invoice_type}-${row.id}`} className="vx-trans-card">
                <Box className="vx-trans-left">
                  <Box component="span" className="vx-trans-id">{row.invoice_no}</Box>
                  <Box component="span" className="vx-trans-meta">{row.supplier_name}</Box>
                  <Box component="span" className="vx-trans-meta">{formatDate(row.invoice_date)}</Box>
                </Box>
                <Box className="vx-trans-right">
                  <Typography component="span" sx={{ fontSize: 9.5, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: "6px", mb: 0.5, bgcolor: colors.bg, color: colors.text }}>
                    {row.days}d outstanding
                  </Typography>
                  <Box component="span" className="vx-trans-amount">{money(row.balance_due)}</Box>
                  <Typography component="span" sx={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600 }}>
                    of {money(row.total_amount)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
