import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Adapted from the Sales Summary Layouts set: "Settlement by mode" doesn't
// apply the same way to purchase bills (they're not paid via customer-
// facing tender modes), so Supplier Summary replaces it as the natural
// purchase-side grouping. Every other type mirrors Sales directly.
const BREAKDOWN_TYPES = [
  { id: "supplier", label: "Supplier Summary" },
  { id: "date", label: "Date Summary" },
  { id: "bill", label: "Bill Summary" },
  { id: "gst_bill", label: "GST Bill Summary" },
  { id: "bill_tax", label: "Bill / Tax Summary" },
  { id: "bill_detail", label: "Bill Detail" },
  { id: "discount", label: "Discount Bills Summary" },
];

export default function PurchaseSummaryScreen() {
  const today = useMemo(() => new Date(), []);
  const monthAgo = useMemo(() => new Date(new Date().setDate(today.getDate() - 30)), [today]);

  const [breakdownType, setBreakdownType] = useState("supplier");
  const [showPicker, setShowPicker] = useState(false);
  const [fromDate, setFromDate] = useState(formatYmd(monthAgo));
  const [toDate, setToDate] = useState(formatYmd(today));
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { all: true, from: fromDate, to: toDate };
      const [directRes, invoiceRes] = await Promise.allSettled([
        api.get("/direct-purchases", { params }),
        api.get("/invoices", { params }),
      ]);

      const extract = (res) => {
        if (res.status !== "fulfilled") return [];
        const data = res.value.data?.data;
        return Array.isArray(data) ? data : data?.data || [];
      };

      const directList = extract(directRes).map((b) => ({ ...b, _source: "direct" }));
      const invoiceList = extract(invoiceRes).map((b) => ({ ...b, _source: "invoice" }));
      setBills([...directList, ...invoiceList]);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const activeLabel = BREAKDOWN_TYPES.find((b) => b.id === breakdownType)?.label;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ position: "relative" }}>
        <Box
          component="button"
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}
        >
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{activeLabel}</Typography>
          <ChevronDown size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
        </Box>

        {showPicker && (
          <Box sx={{ position: "absolute", left: 0, right: 0, top: "100%", mt: 0.75, zIndex: 30, bgcolor: "#fff", border: "1px solid #e2e8f0", boxShadow: 8, borderRadius: "16px", p: 0.75, maxHeight: 300, overflowY: "auto" }}>
            {BREAKDOWN_TYPES.map((b) => (
              <Box
                component="button"
                key={b.id}
                type="button"
                onClick={() => {
                  setBreakdownType(b.id);
                  setShowPicker(false);
                }}
                sx={{
                  width: "100%", textAlign: "left", px: 1.5, py: 1.25, fontSize: 11.5, fontWeight: 700, borderRadius: "12px", transition: "all 0.15s",
                  bgcolor: breakdownType === b.id ? "#eef2ff" : "transparent",
                  color: breakdownType === b.id ? "#4f46e5" : "#475569",
                  "&:hover": breakdownType === b.id ? {} : { bgcolor: "#f8fafc" },
                }}
              >
                {b.label}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          component="input"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          sx={{ flex: 1, p: 1.25, borderRadius: "12px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", fontSize: 11.5, fontWeight: 700, color: "#334155" }}
        />
        <Typography component="span" sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>to</Typography>
        <Box
          component="input"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          sx={{ flex: 1, p: 1.25, borderRadius: "12px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", fontSize: 11.5, fontWeight: 700, color: "#334155" }}
        />
      </Box>

      {loading ? (
        <Box className="vx-card text-center py-10">
          <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>Loading…</Typography>
        </Box>
      ) : (
        <BreakdownView type={breakdownType} bills={bills} />
      )}
    </Box>
  );
}

function BreakdownView({ type, bills }) {
  if (type === "supplier") return <SupplierView bills={bills} />;
  if (type === "date") return <DateSummaryView bills={bills} />;
  if (type === "bill") return <BillListView bills={bills} mode="bill" />;
  if (type === "gst_bill") return <BillListView bills={bills} mode="gst" />;
  if (type === "bill_tax") return <BillListView bills={bills} mode="tax" />;
  if (type === "bill_detail") return <BillDetailView bills={bills} />;
  if (type === "discount") return <BillListView bills={bills} mode="discount" />;
  return null;
}

function EmptyState({ message }) {
  return (
    <Box className="vx-card text-center py-8">
      <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>{message}</Typography>
    </Box>
  );
}

const billAmount = (b) => Number(b.total_amount ?? b.grand_total ?? 0);
const billDate = (b) => b.purchase_date || b.invoice_date || b.created_at;
const billNo = (b) => b.invoice_no || b.purchase_no || `BILL-${b.id}`;
const billSupplier = (b) => b.supplier_name || b.supplier?.name || "Unknown Supplier";

// Supplier Summary - purchase-side equivalent of Sales Summary's Location/
// Company Summary, grouping the same merged Direct Purchase + Invoice data
// PurchaseScreen already fetches by supplier instead of by store.
function SupplierView({ bills }) {
  const rows = useMemo(() => {
    const map = new Map();
    for (const b of bills) {
      const key = billSupplier(b);
      if (!map.has(key)) map.set(key, { supplier: key, count: 0, amount: 0 });
      const bucket = map.get(key);
      bucket.count += 1;
      bucket.amount += billAmount(b);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [bills]);

  if (!rows.length) return <EmptyState message="No purchases in this range" />;

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {rows.map((row) => (
          <Box key={row.supplier} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #f1f5f9" }}>
            <Box>
              <Typography component="p" sx={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", m: 0 }}>{row.supplier}</Typography>
              <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, m: 0, mt: 0.25 }}>{row.count} bills</Typography>
            </Box>
            <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{money(row.amount)}</Typography>
          </Box>
        ))}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1, mt: 0.5, borderTop: "1px solid #e2e8f0" }}>
          <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase" }}>Total</Typography>
          <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 900, color: "#4f46e5" }}>{money(total)}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function DateSummaryView({ bills }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const b of bills) {
      const dateKey = String(billDate(b) || "").slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey, count: 0, amount: 0 });
      const bucket = map.get(dateKey);
      bucket.count += 1;
      bucket.amount += billAmount(b);
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [bills]);

  if (!grouped.length) return <EmptyState message="No purchases in this range" />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {grouped.map((row) => (
        <Box key={row.date} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
          <Box>
            <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", m: 0 }}>{formatDate(row.date)}</Typography>
            <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, m: 0, mt: 0.25 }}>{row.count} bills</Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 900, color: "#0f172a" }}>{money(row.amount)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function BillListView({ bills, mode }) {
  const rows = useMemo(() => {
    if (mode === "discount") return bills.filter((b) => Number(b.discount_amount || 0) > 0);
    return bills;
  }, [bills, mode]);

  if (!rows.length) {
    return <EmptyState message={mode === "discount" ? "No discounted bills in this range" : "No bills in this range"} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {rows.map((b) => (
        <Box key={`${b._source}-${b.id}`} sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{billNo(b)}</Typography>
            <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 900, color: "#0f172a" }}>{money(billAmount(b))}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
            <Typography component="span" sx={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
              {billSupplier(b)} · {formatDate(billDate(b))}
            </Typography>
          </Box>

          {mode === "gst" && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, pt: 0.75, borderTop: "1px solid #f1f5f9", fontSize: 9.5, fontWeight: 600, color: "#64748b" }}>
              <Box component="span">Taxable: {money(billAmount(b) - Number(b.tax_amount || 0))}</Box>
              <Box component="span">GST: {money(b.tax_amount)}</Box>
            </Box>
          )}

          {mode === "tax" && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, pt: 0.75, borderTop: "1px solid #f1f5f9", fontSize: 9.5, fontWeight: 600, color: "#64748b" }}>
              <Box component="span">CGST: {money(Number(b.tax_amount || 0) / 2)}</Box>
              <Box component="span">SGST: {money(Number(b.tax_amount || 0) / 2)}</Box>
            </Box>
          )}

          {mode === "discount" && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, pt: 0.75, borderTop: "1px solid #f1f5f9", fontSize: 9.5, fontWeight: 600, color: "#e11d48" }}>
              <Box component="span">Discount</Box>
              <Box component="span">-{money(b.discount_amount)}</Box>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

// Direct Purchase and Invoice items use different field names for the same
// concepts (cost_price vs rate, product_name vs product.name) since they're
// two separate tables, so both are read defensively here.
function BillDetailView({ bills }) {
  const rows = useMemo(() => {
    const flat = [];
    for (const b of bills) {
      for (const item of b.items || []) {
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const rate = Number(item.cost_price ?? item.rate ?? 0);
        flat.push({
          key: `${b._source}-${b.id}-${item.id}`,
          billNo: billNo(b),
          productName: item.product?.name || item.product_name || "Item",
          qty,
          rate,
          lineTotal: item.total != null ? Number(item.total) : qty * rate,
        });
      }
    }
    return flat;
  }, [bills]);

  if (!rows.length) return <EmptyState message="No bill items in this range" />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {rows.map((row) => (
        <Box key={row.key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="p" sx={{ fontSize: 11, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", m: 0 }}>{row.productName}</Typography>
            <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, m: 0, mt: 0.25 }}>
              {row.billNo} · {row.qty} × {money(row.rate)}
            </Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 900, color: "#0f172a", pl: 1, flexShrink: 0 }}>{money(row.lineTotal)}</Typography>
        </Box>
      ))}
    </Box>
  );
}
