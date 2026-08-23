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

/**
 * Purchase Bills list screen — fetches real data from GET /direct-purchases.
 */
export default function PurchaseScreen({ onNavigate }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/direct-purchases", {
        params: { page: 1, limit: 30, search: search || undefined },
      });
      const data = res.data?.data;
      const list = Array.isArray(data)
        ? data
        : data?.data || data?.items || data?.results || [];
      setBills(list);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadBills();

    const handleNetworkRestored = () => {
      loadBills();
    };

    window.addEventListener("vx-network-restored", handleNetworkRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleNetworkRestored);
    };
  }, [loadBills]);

  const mapStatus = (bill) => {
    const s = (bill.status || bill.paymentStatus || "paid").toLowerCase();
    return s;
  };

  const filtered = bills.filter((b) => {
    const status = mapStatus(b);
    if (filter === "Draft" && status !== "draft") return false;
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
            placeholder="Search bills..."
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
        {["All", "Draft", "Paid"].map((t) => (
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

      {/* Bills List */}
      {loading ? (
        <SkeletonTransList count={4} />
      ) : filtered.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No purchase bills found</p>
        </div>
      ) : (
        <div>
          {filtered.map((bill) => {
            const id =
              bill.billNo || bill.invoiceNo || bill.purchaseNo || `BILL-${bill.id}`;
            const supplier =
              bill.supplierName || bill.supplier?.name || bill.partyName || "Supplier";
            const date = formatDate(
              bill.billDate || bill.purchaseDate || bill.date || bill.created_at
            );
            const amount =
              bill.totalAmount || bill.grandTotal || bill.netAmount || 0;
            const status = mapStatus(bill);

            return (
              <div key={bill.id || id} className="vx-trans-card">
                <div className="vx-trans-left">
                  <span className="vx-trans-id">{id}</span>
                  <span className="vx-trans-meta">{supplier}</span>
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
        title="Create Purchase Bill"
        aria-label="Create Purchase Bill"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
