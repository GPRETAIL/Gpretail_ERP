import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Package, Users, FileText, Store } from "lucide-react";
import api from "../../api/axios";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const EMPTY_RESULTS = { products: [], customers: [], sales: [], suppliers: [] };

/**
 * Full-screen search across the real, already-wired search endpoints:
 * products, customers, pos-sales (invoices), suppliers. Expenses was in
 * the original feature list but there's no Expense model/endpoint
 * anywhere in this backend yet (frontend/src/mobile/mobileApi.js already
 * has a stub `/expenses` call that 404s) - left out rather than shipping
 * a search category that can never return results.
 *
 * Row taps are informational only for now; "See All" jumps to that
 * category's list screen. None of Customers/Invoices/Suppliers has a
 * per-item detail screen to jump to yet (only Products does, via
 * InventoryScreen's product-tap flow), so keeping every category
 * consistent (list-level navigation only) beats wiring just one.
 */
export default function GlobalSearchModal({ onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    setLoading(true);
    try {
      const [productsRes, customersRes, salesRes, suppliersRes] = await Promise.allSettled([
        api.get("/products", { params: { search: q, limit: 5 } }),
        api.get("/customers", { params: { search: q, limit: 5 } }),
        api.get("/pos-sales", { params: { search: q, limit: 5 } }),
        api.get("/suppliers", { params: { search: q, limit: 5 } }),
      ]);

      const extract = (res) => {
        if (res.status !== "fulfilled") return [];
        const data = res.value.data?.data;
        return Array.isArray(data) ? data : data?.data || [];
      };

      setResults({
        products: extract(productsRes),
        customers: extract(customersRes),
        sales: extract(salesRes),
        suppliers: extract(suppliersRes),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const totalResults =
    results.products.length + results.customers.length + results.sales.length + results.suppliers.length;
  const hasQuery = query.trim().length >= 2;

  const goTo = (page) => {
    onClose();
    onNavigate(page);
  };

  return (
    <div className="fixed inset-0 z-[85] bg-white flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b border-slate-100 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-2.5">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, invoices, suppliers..."
            className="flex-1 min-w-0 bg-transparent text-xs font-bold text-slate-800 outline-none"
          />
        </div>
        <button type="button" onClick={onClose} className="p-2 text-slate-500 shrink-0" aria-label="Close search">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!hasQuery ? (
          <p className="text-center text-xs text-slate-400 py-10">Type at least 2 characters to search</p>
        ) : loading ? (
          <p className="text-center text-xs text-slate-400 py-10">Searching...</p>
        ) : totalResults === 0 ? (
          <p className="text-center text-xs text-slate-400 py-10">No results for &quot;{query}&quot;</p>
        ) : (
          <div className="space-y-4">
            {results.products.length > 0 && (
              <ResultSection title="Products" icon={Package} onSeeAll={() => goTo("inventory")}>
                {results.products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.code || p.sku}</p>
                    </div>
                    <span className="text-xs font-black text-indigo-600 shrink-0 ml-2">
                      {money(p.selling_price)}
                    </span>
                  </div>
                ))}
              </ResultSection>
            )}

            {results.customers.length > 0 && (
              <ResultSection title="Customers" icon={Users} onSeeAll={() => goTo("customers")}>
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.phone || c.email || "—"}</p>
                    </div>
                  </div>
                ))}
              </ResultSection>
            )}

            {results.sales.length > 0 && (
              <ResultSection title="Invoices" icon={FileText} onSeeAll={() => goTo("sales")}>
                {results.sales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{s.invoice_no}</p>
                      <p className="text-[10px] text-slate-400 truncate">{s.customer?.name || "Walking customer"}</p>
                    </div>
                    <span className="text-xs font-black text-slate-900 shrink-0 ml-2">{money(s.grand_total)}</span>
                  </div>
                ))}
              </ResultSection>
            )}

            {results.suppliers.length > 0 && (
              <ResultSection title="Suppliers" icon={Store} onSeeAll={() => goTo("suppliers")}>
                {results.suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{s.phone || s.gstin || "—"}</p>
                    </div>
                  </div>
                ))}
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultSection({ title, icon: Icon, onSeeAll, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className="text-indigo-600" />
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{title}</h4>
        </div>
        <button type="button" onClick={onSeeAll} className="text-[10px] font-bold text-indigo-600">
          See All
        </button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
