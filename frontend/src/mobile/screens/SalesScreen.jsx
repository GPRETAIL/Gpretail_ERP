import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, Plus } from "lucide-react";
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

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/pos-sales", {
        params: { page: 1, limit: 30, search: search || undefined },
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
  }, [search]);

  useEffect(() => {
    loadSales();

    const handleNetworkRestored = () => {
      loadSales();
    };

    window.addEventListener("vx-network-restored", handleNetworkRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleNetworkRestored);
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
    <div>
      {/* Search & Filter */}
      <div className="vx-search-row">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="vx-filter-btn" aria-label="Filter">
          <Filter size={17} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="vx-filter-tabs">
        {["All", "Paid", "Credit"].map((t) => (
          <button
            key={t}
            type="button"
            className={`vx-filter-pill ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : filtered.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No invoices found</p>
        </div>
      ) : (
        <div>
          {filtered.map((inv) => {
            const id = inv.invoice_no || `INV-${inv.id}`;
            const customer = inv.customer?.name || "Customer";
            const date = formatDate(inv.sale_date || inv.created_at);
            const amount = inv.grand_total || 0;
            const status = mapStatus(inv);

            return (
              <div key={inv.id || id} className="vx-trans-card">
                <div className="vx-trans-left">
                  <span className="vx-trans-id">{id}</span>
                  <span className="vx-trans-meta">{customer}</span>
                  <span className="vx-trans-meta text-[10px]">{date}</span>
                </div>
                <div className="vx-trans-right">
                  <span className="vx-trans-amount">{money(amount)}</span>
                  <span className={`vx-pill-badge ${status}`}>{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        className="vx-fab-btn"
        onClick={() => onNavigate("create_invoice")}
        title="Create Invoice"
        aria-label="Create Invoice"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
