import React, { useState, useEffect, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";
import { SkeletonKpiGrid } from "../components/SkeletonCards";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const DONUT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ef4444", "#ec4899"];

/**
 * Inventory Summary screen — fetches real data from GET /warehouse/dashboard.
 */
export default function InventoryScreen({ onNavigate, onSelectProduct }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, prodRes] = await Promise.all([
        api.get("/warehouse/dashboard"),
        api.get("/products", { params: { limit: 10 } }),
      ]);
      setData(invRes.data?.data || invRes.data || {});
      const prodData = prodRes.data?.data;
      const prodList = Array.isArray(prodData)
        ? prodData
        : prodData?.data || prodData?.items || [];
      setProducts(prodList);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();

    const handleNetworkRestored = () => {
      loadInventory();
    };

    window.addEventListener("vx-network-restored", handleNetworkRestored);
    window.addEventListener("vx-pull-refresh", handleNetworkRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleNetworkRestored);
      window.removeEventListener("vx-pull-refresh", handleNetworkRestored);
    };
  }, [loadInventory]);

  // Extract metrics from the real /warehouse/dashboard response shape:
  // { summary: {total_products, low_stock_count, out_of_stock_count, total_retail_value},
  //   valuation: {by_category: [{category_name, qty, cost_value, retail_value}]} }
  const totalProducts = data?.summary?.total_products ?? 0;
  const lowStock = data?.summary?.low_stock_count ?? 0;
  const outOfStock = data?.summary?.out_of_stock_count ?? 0;
  const totalSellingPrice = data?.summary?.total_retail_value ?? 0;
  const totalPurchasePrice = data?.summary?.total_cost_value ?? 0;
  const margin = totalSellingPrice - totalPurchasePrice;

  // Category breakdown for donut chart
  const categories = data?.valuation?.by_category || [];
  const totalCatValue = categories.reduce((s, c) => s + Number(c.retail_value || 0), 0) || 1;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 4 Summary Cards */}
      {loading ? (
        <SkeletonKpiGrid />
      ) : (
        <Box className="vx-kpis-grid">
          <Box className="vx-kpi-card">
            <Box component="span" className="vx-kpi-label">Total Products</Box>
            <Box component="span" className="vx-kpi-val">{Number(totalProducts).toLocaleString("en-IN")}</Box>
          </Box>
          <Box className="vx-kpi-card">
            <Box component="span" className="vx-kpi-label">Low Stock</Box>
            <Box component="span" className="vx-kpi-val text-amber-600">{Number(lowStock).toLocaleString("en-IN")}</Box>
          </Box>
          <Box className="vx-kpi-card">
            <Box component="span" className="vx-kpi-label">Out of Stock</Box>
            <Box component="span" className="vx-kpi-val text-rose-600">{Number(outOfStock).toLocaleString("en-IN")}</Box>
          </Box>
          <Box className="vx-kpi-card">
            <Box component="span" className="vx-kpi-label">Total Selling Price</Box>
            <Box component="span" className="vx-kpi-val text-xs sm:text-base">{money(totalSellingPrice)}</Box>
          </Box>
        </Box>
      )}

      {/* Purchase Price & Margin */}
      {!loading && (
        <Box className="vx-kpis-grid" style={{ marginTop: "-4px" }}>
          <Box className="vx-kpi-card">
            <Box component="span" className="vx-kpi-label">Total Purchase Price</Box>
            <Box component="span" className="vx-kpi-val text-xs sm:text-base">{money(totalPurchasePrice)}</Box>
          </Box>
          <Box className="vx-kpi-card">
            <Box component="span" className="vx-kpi-label">Margin</Box>
            <Box component="span" className={`vx-kpi-val text-xs sm:text-base ${margin < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {money(margin)}
            </Box>
          </Box>
        </Box>
      )}

      {/* Stock by Category Donut Chart */}
      {categories.length > 0 && (
        <Box className="vx-card">
          <Typography component="h3" className="vx-card-title" sx={{ mb: 2 }}>Stock by Category</Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 2 }}>
            <DonutChart categories={categories} totalValue={totalCatValue} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, fontSize: 12 }}>
              {categories.slice(0, 4).map((cat, i) => {
                const pct = Math.round(((cat.retail_value || 0) / totalCatValue) * 100);
                return (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      component="span"
                      sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <Box component="span" sx={{ color: "#475569" }}>{cat.category_name || `Cat ${i + 1}`}</Box>
                    <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700, ml: "auto" }}>{pct}%</Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {/* Fallback static donut if no categories from API */}
      {categories.length === 0 && !loading && (
        <Box className="vx-card">
          <Typography component="h3" className="vx-card-title" sx={{ mb: 2 }}>Stock by Category</Typography>
          <Typography component="p" sx={{ fontSize: 12, textAlign: "center", color: "#94a3b8", py: 2 }}>
            Category breakdown not available
          </Typography>
        </Box>
      )}

      {/* Featured Products */}
      {products.slice(0, 5).map((p) => (
        <Box
          component="button"
          key={p.id}
          type="button"
          onClick={() => onSelectProduct && onSelectProduct(p)}
          className="vx-card"
          sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.75, transition: "background-color 0.15s", textAlign: "left", "&:hover": { bgcolor: "#f8fafc" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
              {(p.name || "P").charAt(0).toUpperCase()}
            </Box>
            <Box>
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", m: 0 }}>
                {p.name}
              </Typography>
              <Typography component="p" sx={{ fontSize: 11, color: "#94a3b8", m: 0 }}>
                {p.code || p.sku || ""}{p.category?.name ? ` · ${p.category.name}` : ""}
              </Typography>
            </Box>
          </Box>
          <ChevronRight size={18} style={{ color: "#94a3b8" }} />
        </Box>
      ))}
    </Box>
  );
}

/** SVG Donut Chart from real category data */
function DonutChart({ categories, totalValue }) {
  const R = 38;
  const C = 2 * Math.PI * R; // ≈ 238.76
  let offset = 0;

  return (
    <Box sx={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        {categories.slice(0, 6).map((cat, i) => {
          const pct = (cat.retail_value || 0) / totalValue;
          const dash = pct * C;
          const thisOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="18"
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={-thisOffset}
            />
          );
        })}
      </svg>
    </Box>
  );
}
