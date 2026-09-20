import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Package, Users, FileText, Store } from "lucide-react";
import { Box, Typography } from "@mui/material";
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
    <Box sx={{ position: "fixed", inset: 0, zIndex: 85, bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1, bgcolor: "#f1f5f9", borderRadius: "16px", px: 1.5, py: 1.25 }}>
          <Search size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <Box
            component="input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, invoices, suppliers..."
            sx={{ flex: 1, minWidth: 0, bgcolor: "transparent", fontSize: 12, fontWeight: 700, color: "#1e293b", outline: "none" }}
          />
        </Box>
        <Box component="button" type="button" onClick={onClose} sx={{ p: 1, color: "#64748b", flexShrink: 0 }} aria-label="Close search">
          <X size={20} />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
        {!hasQuery ? (
          <Typography component="p" sx={{ textAlign: "center", fontSize: 12, color: "#94a3b8", py: 5 }}>Type at least 2 characters to search</Typography>
        ) : loading ? (
          <Typography component="p" sx={{ textAlign: "center", fontSize: 12, color: "#94a3b8", py: 5 }}>Searching...</Typography>
        ) : totalResults === 0 ? (
          <Typography component="p" sx={{ textAlign: "center", fontSize: 12, color: "#94a3b8", py: 5 }}>No results for &quot;{query}&quot;</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {results.products.length > 0 && (
              <ResultSection title="Products" icon={Package} onSeeAll={() => goTo("inventory")}>
                {results.products.map((p) => (
                  <Box
                    key={p.id}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #f1f5f9" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</Typography>
                      <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8" }}>{p.code || p.sku}</Typography>
                    </Box>
                    <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#4f46e5", flexShrink: 0, ml: 1 }}>
                      {money(p.selling_price)}
                    </Typography>
                  </Box>
                ))}
              </ResultSection>
            )}

            {results.customers.length > 0 && (
              <ResultSection title="Customers" icon={Users} onSeeAll={() => goTo("customers")}>
                {results.customers.map((c) => (
                  <Box
                    key={c.id}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #f1f5f9" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</Typography>
                      <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8" }}>{c.phone || c.email || "—"}</Typography>
                    </Box>
                  </Box>
                ))}
              </ResultSection>
            )}

            {results.sales.length > 0 && (
              <ResultSection title="Invoices" icon={FileText} onSeeAll={() => goTo("sales")}>
                {results.sales.map((s) => (
                  <Box
                    key={s.id}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #f1f5f9" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.invoice_no}</Typography>
                      <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.customer?.name || "Walking customer"}</Typography>
                    </Box>
                    <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", flexShrink: 0, ml: 1 }}>{money(s.grand_total)}</Typography>
                  </Box>
                ))}
              </ResultSection>
            )}

            {results.suppliers.length > 0 && (
              <ResultSection title="Suppliers" icon={Store} onSeeAll={() => goTo("suppliers")}>
                {results.suppliers.map((s) => (
                  <Box
                    key={s.id}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #f1f5f9" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</Typography>
                      <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8" }}>{s.phone || s.gstin || "—"}</Typography>
                    </Box>
                  </Box>
                ))}
              </ResultSection>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function ResultSection({ title, icon: Icon, onSeeAll, children }) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75, px: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Icon size={13} style={{ color: "#4f46e5" }} />
          <Typography component="h4" sx={{ fontSize: 10, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</Typography>
        </Box>
        <Box component="button" type="button" onClick={onSeeAll} sx={{ fontSize: 10, fontWeight: 700, color: "#4f46e5" }}>
          See All
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>{children}</Box>
    </Box>
  );
}
