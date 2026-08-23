import React, { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
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

// No due_date/payment-terms field exists on a purchase bill, only the
// invoice/purchase date - so this shows days outstanding since that date
// rather than a fabricated "days remaining" that would imply a due date.
const daysOutstandingClass = (days) => {
  const d = Number(days || 0);
  if (d > 30) return "bg-rose-50 text-rose-700";
  if (d > 15) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

/**
 * Supplier Pending Dues list - real data from GET /supplier-payments/pending,
 * merging both Direct Purchase and Invoice bills the same way that endpoint
 * already does server-side.
 */
export default function SupplierDuesScreen() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [totalPayable, setTotalPayable] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/supplier-payments/pending", {
        params: { limit: 100, search: search || undefined },
      });
      setRows(res.data?.data || []);
      setTotalPayable(res.data?.totalPayable ?? 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="vx-search-row">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search supplier or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70 mb-3 flex items-center justify-between">
          <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
            Total Payable
          </span>
          <span className="text-[15px] font-black text-amber-800">{money(totalPayable)}</span>
        </div>
      )}

      {loading ? (
        <SkeletonTransList count={4} />
      ) : rows.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No pending supplier dues</p>
        </div>
      ) : (
        <div>
          {rows.map((row) => (
            <div key={`${row.invoice_type}-${row.id}`} className="vx-trans-card">
              <div className="vx-trans-left">
                <span className="vx-trans-id">{row.invoice_no}</span>
                <span className="vx-trans-meta">{row.supplier_name}</span>
                <span className="vx-trans-meta text-[10px]">{formatDate(row.invoice_date)}</span>
              </div>
              <div className="vx-trans-right">
                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md mb-1 ${daysOutstandingClass(row.days)}`}>
                  {row.days}d outstanding
                </span>
                <span className="vx-trans-amount">{money(row.balance_due)}</span>
                <span className="text-[9.5px] text-slate-400 font-semibold">
                  of {money(row.total_amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
