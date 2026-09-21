import React, { useState, useEffect, useCallback } from "react";
import { Search, Check, X } from "lucide-react";
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

/**
 * Pending Sales Approvals (consignment / approval-basis sales) - real data
 * from GET /sales-on-approval, with accept/reject actions. Replaces the
 * static "Approvals Center - next phase" placeholder, which also crashed
 * on tap (referenced an unimported AlertTriangle icon).
 */
export default function ApprovalsScreen() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales-on-approval", {
        params: { status: "PENDING", limit: 50, search: search || undefined },
      });
      const data = res.data?.data;
      setRows(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (id, action) => {
    setActingId(id);
    try {
      await api.post(`/sales-on-approval/${id}/${action}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Leave the row in place so the user can retry
    } finally {
      setActingId(null);
    }
  };

  return (
    <Box>
      <Box className="vx-search-row">
        <Box className="vx-search-input-wrap">
          <Search size={16} color="#94a3b8" />
          <Box
            component="input"
            type="text"
            placeholder="Search approval # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
      </Box>

      {loading ? (
        <SkeletonTransList count={4} />
      ) : rows.length === 0 ? (
        <Box className="vx-card" sx={{ textAlign: "center" }}>
          <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>No pending approvals</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {rows.map((row) => (
            <Box key={row.id} className="vx-trans-card" sx={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <Box className="vx-trans-left">
                  <Box component="span" className="vx-trans-id">{row.approval_no}</Box>
                  <Box component="span" className="vx-trans-meta">{row.customer?.name || "Walking customer"}</Box>
                  <Box component="span" className="vx-trans-meta">
                    {formatDate(row.approval_date)}
                    {row.valid_until ? ` · Valid till ${formatDate(row.valid_until)}` : ""}
                  </Box>
                </Box>
                <Box className="vx-trans-right">
                  <Box component="span" className="vx-trans-amount">{money(row.total_amount)}</Box>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pt: 0.5, borderTop: "1px solid #f1f5f9" }}>
                <Box
                  component="button"
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => handleAction(row.id, "reject")}
                  sx={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1,
                    borderRadius: "12px", bgcolor: "#fff1f2", color: "#e11d48", fontSize: 12, fontWeight: 700,
                    transition: "all 0.15s", "&:active": { transform: "scale(0.95)" }, "&:disabled": { opacity: 0.5 },
                  }}
                >
                  <X size={14} /> Reject
                </Box>
                <Box
                  component="button"
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => handleAction(row.id, "accept")}
                  sx={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1,
                    borderRadius: "12px", bgcolor: "#059669", color: "#fff", fontSize: 12, fontWeight: 700,
                    transition: "all 0.15s", "&:active": { transform: "scale(0.95)" }, "&:disabled": { opacity: 0.5 },
                  }}
                >
                  <Check size={14} /> {actingId === row.id ? "Saving..." : "Accept"}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
