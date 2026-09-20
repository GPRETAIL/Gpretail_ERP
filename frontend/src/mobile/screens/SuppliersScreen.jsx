import React, { useState, useEffect, useCallback } from "react";
import { Search, Phone, Wallet } from "lucide-react";
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
 * Suppliers directory - real data from GET /suppliers (same endpoint and
 * fields as the desktop Supplier master page). Previously the "Suppliers"
 * module tile navigated to a page value with no matching screen here, so
 * tapping it just showed a blank content area.
 */
export default function SuppliersScreen({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers", {
        params: { limit: 100, search: search || undefined },
      });
      const data = res.data?.data;
      setSuppliers(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();

    const handleRestored = () => load();
    window.addEventListener("vx-network-restored", handleRestored);
    window.addEventListener("vx-pull-refresh", handleRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleRestored);
      window.removeEventListener("vx-pull-refresh", handleRestored);
    };
  }, [load]);

  return (
    <Box>
      {/* Search & Supplier Dues shortcut */}
      <Box className="vx-search-row">
        <Box className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <Box
            component="input"
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        <Box
          component="button"
          type="button"
          className="vx-filter-btn"
          aria-label="Supplier Dues"
          title="Supplier Dues"
          onClick={() => onNavigate && onNavigate("supplier_dues")}
        >
          <Wallet size={17} />
        </Box>
      </Box>

      {/* Suppliers List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : suppliers.length === 0 ? (
        <Box className="vx-card text-center py-8">
          <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>No suppliers found</Typography>
        </Box>
      ) : (
        <Box>
          {suppliers.map((s) => {
            const dues = Number(s.current_balance || 0);
            return (
              <Box key={s.id} className="vx-trans-card">
                <Box className="vx-trans-left">
                  <Box component="span" className="vx-trans-id">{s.name}</Box>
                  {s.company_name && s.company_name !== s.name && (
                    <Box component="span" className="vx-trans-meta">{s.company_name}</Box>
                  )}
                  <Box component="span" className="vx-trans-meta text-[10px]">
                    {[s.city, s.gstin].filter(Boolean).join(" · ") || "—"}
                  </Box>
                </Box>
                <Box className="vx-trans-right">
                  {dues > 0 && (
                    <Box component="span" className="vx-trans-amount text-amber-700">{money(dues)} due</Box>
                  )}
                  {s.phone && (
                    <Box
                      component="a"
                      href={`tel:${s.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, fontSize: 10.5, fontWeight: 700, color: "#4f46e5" }}
                    >
                      <Phone size={11} /> {s.phone}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
