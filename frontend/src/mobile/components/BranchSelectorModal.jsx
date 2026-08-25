import React, { useState, useEffect } from "react";
import { X, Check, Store } from "lucide-react";
import api from "../../api/axios";

/**
 * Store switcher for users assigned to (or able to see) more than one
 * store - mirrors desktop's Navbar "Switch Store" dialog, minus its
 * "All Stores" unrestricted-view option: mobile screens aren't built to
 * handle a real cross-store "no scope" mode the way desktop's reporting
 * pages are (each mobile screen scopes to one active store), so this only
 * offers picking a single specific store to make active, matching what
 * PosSaleController/DashboardController etc. already expect.
 *
 * Saves to the same `activeStoreId` localStorage key desktop's Navbar
 * already writes and every mobile request already reads (see
 * api/axios.js's request interceptor), then reloads so every screen picks
 * up the new scope at once rather than trying to live-refresh each one.
 */
export default function BranchSelectorModal({ isOpen, onClose }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem("activeStoreId") || "");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelectedId(localStorage.getItem("activeStoreId") || "");
    api
      .get("/companies", { params: { limit: 500 } })
      .then((res) => {
        const list = (res.data?.data || []).map((c) => ({
          id: String(c.id),
          name: c.name || c.code || `Store ${c.id}`,
        }));
        setStores(list);
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (selectedId) {
      localStorage.setItem("activeStoreId", selectedId);
    } else {
      localStorage.removeItem("activeStoreId");
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[86] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-black text-slate-900">Switch Store</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-500" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
          {loading ? (
            <p className="text-center text-xs text-slate-400 py-8">Loading stores...</p>
          ) : stores.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">No stores found</p>
          ) : (
            stores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  selectedId === s.id ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store size={14} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">{s.name}</span>
                </div>
                {selectedId === s.id && <Check size={16} className="text-indigo-600 shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !selectedId}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
          >
            Switch Store
          </button>
        </div>
      </div>
    </div>
  );
}
