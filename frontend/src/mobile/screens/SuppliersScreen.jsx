import React, { useState, useEffect, useCallback } from "react";
import { Search, Phone, Wallet } from "lucide-react";
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
    <div>
      {/* Search & Supplier Dues shortcut */}
      <div className="vx-search-row">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="vx-filter-btn"
          aria-label="Supplier Dues"
          title="Supplier Dues"
          onClick={() => onNavigate && onNavigate("supplier_dues")}
        >
          <Wallet size={17} />
        </button>
      </div>

      {/* Suppliers List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : suppliers.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No suppliers found</p>
        </div>
      ) : (
        <div>
          {suppliers.map((s) => {
            const dues = Number(s.current_balance || 0);
            return (
              <div key={s.id} className="vx-trans-card">
                <div className="vx-trans-left">
                  <span className="vx-trans-id">{s.name}</span>
                  {s.company_name && s.company_name !== s.name && (
                    <span className="vx-trans-meta">{s.company_name}</span>
                  )}
                  <span className="vx-trans-meta text-[10px]">
                    {[s.city, s.gstin].filter(Boolean).join(" · ") || "—"}
                  </span>
                </div>
                <div className="vx-trans-right">
                  {dues > 0 && (
                    <span className="vx-trans-amount text-amber-700">{money(dues)} due</span>
                  )}
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-indigo-600"
                    >
                      <Phone size={11} /> {s.phone}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
