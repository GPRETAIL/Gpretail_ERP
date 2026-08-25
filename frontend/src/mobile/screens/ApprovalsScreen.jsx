import React, { useState, useEffect, useCallback } from "react";
import { Search, Check, X } from "lucide-react";
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
    <div>
      <div className="vx-search-row">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search approval # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTransList count={4} />
      ) : rows.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.id} className="vx-trans-card !flex-col !items-stretch !gap-2">
              <div className="flex items-center justify-between w-full">
                <div className="vx-trans-left">
                  <span className="vx-trans-id">{row.approval_no}</span>
                  <span className="vx-trans-meta">{row.customer?.name || "Walking customer"}</span>
                  <span className="vx-trans-meta text-[10px]">
                    {formatDate(row.approval_date)}
                    {row.valid_until ? ` · Valid till ${formatDate(row.valid_until)}` : ""}
                  </span>
                </div>
                <div className="vx-trans-right">
                  <span className="vx-trans-amount">{money(row.total_amount)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full pt-1 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => handleAction(row.id, "reject")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                  <X size={14} /> Reject
                </button>
                <button
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => handleAction(row.id, "accept")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                  <Check size={14} /> {actingId === row.id ? "Saving..." : "Accept"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
