import React, { useState, useEffect, useCallback } from "react";
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
    <div>
      {loading ? (
        <SkeletonTransList count={5} />
      ) : rows.length === 0 ? (
        <div className="vx-card text-center py-8">
          <p className="text-sm text-slate-400">No product sales this month</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-black text-[11px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-slate-900 truncate m-0 leading-tight">
                    {item.name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 m-0 mt-0.5">
                    Sold: <strong className="text-emerald-600">{Number(item.saleQty).toLocaleString("en-IN")} Pcs</strong>
                  </p>
                </div>
              </div>
              <div className="text-right pl-2 shrink-0">
                <p className="text-[12.5px] font-black text-slate-900 m-0">{money(item.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
