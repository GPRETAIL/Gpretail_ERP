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
  }, [loadSales]);

  // Client-side filter
  const filtered = sales.filter((s) => {
    const status = mapStatus(s);
    if (filter === "Draft" && status !== "draft") return false;
    if (filter === "Sent" && status !== "sent") return false;
    if (filter === "Paid" && status !== "paid") return false;
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
        {["All", "Draft", "Sent", "Paid"].map((t) => (
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
            const id = inv.billNo || inv.invoiceNo || inv.salesNo || `INV-${inv.id}`;
            const customer = inv.customerName || inv.customer?.name || inv.partyName || "Customer";
            const date = formatDate(inv.billDate || inv.date || inv.created_at);
            const amount = inv.totalAmount || inv.grandTotal || inv.netAmount || 0;
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
