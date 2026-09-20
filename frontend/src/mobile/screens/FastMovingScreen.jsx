import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";
import { SkeletonTransList } from "../components/SkeletonCards";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Fast Moving Products - real data from /dashboard/overview's
 * tables.fastMovingSection (top sellers by quantity for the current month).
 */
export default function FastMovingScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const fmt = (d) => d.toISOString().slice(0, 10);
      const res = await api.get("/dashboard/overview", {
        params: { from: fmt(from), to: fmt(now), timezoneOffset: new Date().getTimezoneOffset() },
      });
      setRows(res.data?.data?.tables?.fastMovingSection?.rows || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      {loading ? (
        <SkeletonTransList count={5} />
      ) : rows.length === 0 ? (
        <Box className="vx-card text-center py-8">
          <Typography sx={{ fontSize: 14, color: "#94a3b8" }}>No product sales this month</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {rows.map((item, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5,
                borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)",
                boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: 1 }}>
                <Box
                  component="span"
                  sx={{
                    width: 28, height: 28, borderRadius: "8px", bgcolor: "#e0e7ff", color: "#4338ca",
                    fontWeight: 900, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", m: 0, lineHeight: 1.2 }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: "#64748b", m: 0, mt: 0.25 }}>
                    Sold: <Box component="strong" sx={{ color: "#059669" }}>{Number(item.saleQty).toLocaleString("en-IN")} Pcs</Box>
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: "right", pl: 1, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: "#0f172a", m: 0 }}>{money(item.value)}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
