import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
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
    return () => {
      window.removeEventListener("vx-network-restored", handleNetworkRestored);
    };
  }, [loadInventory]);

  // Extract metrics from warehouse dashboard data
  const totalProducts = data?.inventory?.totalProducts ?? data?.totalProducts ?? data?.metrics?.totalProducts ?? 0;
  const lowStock = data?.inventory?.lowStockCount ?? data?.lowStockCount ?? data?.alerts?.lowStockCount ?? 0;
  const outOfStock = data?.inventory?.outOfStockCount ?? data?.outOfStockCount ?? data?.alerts?.outOfStockCount ?? 0;
  const totalValue = data?.inventory?.totalStockValue ?? data?.totalStockValue ?? data?.metrics?.totalStockValue ?? 0;

  // Category breakdown for donut chart
  const categories = data?.inventory?.categoryBreakdown || data?.categoryBreakdown || [];
  const totalCatValue = categories.reduce((s, c) => s + (c.value || c.count || 0), 0) || 1;

  return (
    <div className="space-y-4">
      {/* 4 Summary Cards */}
      {loading ? (
        <SkeletonKpiGrid />
      ) : (
        <div className="vx-kpis-grid">
          <div className="vx-kpi-card">
            <span className="vx-kpi-label">Total Products</span>
            <span className="vx-kpi-val">{Number(totalProducts).toLocaleString("en-IN")}</span>
          </div>
          <div className="vx-kpi-card">
            <span className="vx-kpi-label">Low Stock</span>
            <span className="vx-kpi-val text-amber-600">{Number(lowStock).toLocaleString("en-IN")}</span>
          </div>
          <div className="vx-kpi-card">
            <span className="vx-kpi-label">Out of Stock</span>
            <span className="vx-kpi-val text-rose-600">{Number(outOfStock).toLocaleString("en-IN")}</span>
          </div>
          <div className="vx-kpi-card">
            <span className="vx-kpi-label">Total Value</span>
            <span className="vx-kpi-val text-xs sm:text-base">{money(totalValue)}</span>
          </div>
        </div>
      )}

      {/* Stock by Category Donut Chart */}
      {categories.length > 0 && (
        <div className="vx-card">
          <h3 className="vx-card-title mb-4">Stock by Category</h3>
          <div className="flex items-center justify-around gap-4">
            <DonutChart categories={categories} totalValue={totalCatValue} />
            <div className="space-y-2 text-xs">
              {categories.slice(0, 4).map((cat, i) => {
                const pct = Math.round(((cat.value || cat.count || 0) / totalCatValue) * 100);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="text-slate-600">{cat.name || cat.category || `Cat ${i + 1}`}</span>
                    <strong className="text-slate-900 font-bold ml-auto">{pct}%</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fallback static donut if no categories from API */}
      {categories.length === 0 && !loading && (
        <div className="vx-card">
          <h3 className="vx-card-title mb-4">Stock by Category</h3>
          <p className="text-xs text-center text-slate-400 py-4">
            Category breakdown not available
          </p>
        </div>
      )}

      {/* Featured Products */}
      {products.slice(0, 5).map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectProduct && onSelectProduct(p)}
          className="w-full vx-card flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              {(p.productName || p.name || "P").charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 m-0">
                {p.productName || p.name}
              </h4>
              <p className="text-[11px] text-slate-400 m-0">
                {p.productCode || p.sku || ""}{p.categoryName ? ` · ${p.categoryName}` : ""}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      ))}
    </div>
  );
}

/** SVG Donut Chart from real category data */
function DonutChart({ categories, totalValue }) {
  const R = 38;
  const C = 2 * Math.PI * R; // ≈ 238.76
  let offset = 0;

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        {categories.slice(0, 6).map((cat, i) => {
          const pct = (cat.value || cat.count || 0) / totalValue;
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
    </div>
  );
}
