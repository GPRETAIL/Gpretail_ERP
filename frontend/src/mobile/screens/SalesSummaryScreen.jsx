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

// Every breakdown here reads from data this app already computes correctly
// elsewhere (the same /dashboard/overview aggregation the Dashboard screen
// uses for Settlement/Location/Company, and the same raw /sales-reports
// dataset the desktop SalesReports.jsx page fetches once and slices client-
// side into its ~15 tabs) rather than inventing a second, parallel
// computation that could quietly drift from what those already show.
const BREAKDOWN_TYPES = [
  { id: "settlement", label: "Settlement Details (Method & Location)" },
  { id: "location", label: "Location Summary" },
  { id: "company", label: "Company Summary" },
  { id: "date", label: "Date Summary" },
  { id: "bill", label: "Bill Summary" },
  { id: "gst_bill", label: "GST Bill Summary" },
  { id: "bill_tax", label: "Bill / Tax Summary" },
  { id: "bill_detail", label: "Bill Detail" },
  { id: "discount", label: "Discount Bills Summary" },
];

const SETTLEMENT_DOT_COLOR = {
  emerald: "#10b981",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#94a3b8",
};

export default function SalesSummaryScreen() {
  const today = useMemo(() => new Date(), []);
  const monthAgo = useMemo(() => new Date(new Date().setDate(today.getDate() - 30)), [today]);

  const [breakdownType, setBreakdownType] = useState("settlement");
  const [showPicker, setShowPicker] = useState(false);
  const [fromDate, setFromDate] = useState(formatYmd(monthAgo));
  const [toDate, setToDate] = useState(formatYmd(today));
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [rawSales, setRawSales] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, salesRes] = await Promise.allSettled([
        api.get("/dashboard/overview", {
          params: { from: fromDate, to: toDate, timezoneOffset: new Date().getTimezoneOffset() },
        }),
        api.get("/sales-reports", {
          params: { all: true, start_date: fromDate, end_date: toDate },
        }),
      ]);
      setOverview(overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : null);
      const salesData = salesRes.status === "fulfilled" ? salesRes.value.data?.data : [];
      setRawSales(Array.isArray(salesData) ? salesData : []);
    } catch {
      setOverview(null);
      setRawSales([]);
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
      {/* Breakdown Type Picker */}
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

      {/* Date Range */}
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
        <BreakdownView type={breakdownType} overview={overview} rawSales={rawSales} />
      )}
    </Box>
  );
}

function BreakdownView({ type, overview, rawSales }) {
  if (type === "settlement") return <SettlementView overview={overview} />;
  if (type === "location") return <LocationView overview={overview} labelKey="location" title="Location" />;
  if (type === "company") return <LocationView overview={overview} labelKey="company" title="Company" />;
  if (type === "date") return <DateSummaryView rawSales={rawSales} />;
  if (type === "bill") return <BillListView rawSales={rawSales} mode="bill" />;
  if (type === "gst_bill") return <BillListView rawSales={rawSales} mode="gst" />;
  if (type === "bill_tax") return <BillListView rawSales={rawSales} mode="tax" />;
  if (type === "bill_detail") return <BillDetailView rawSales={rawSales} />;
  if (type === "discount") return <BillListView rawSales={rawSales} mode="discount" />;
  return null;
}

function EmptyState({ message }) {
  return (
    <Box className="vx-card text-center py-8">
      <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>{message}</Typography>
    </Box>
  );
}

// Settlement Details (Method & Location) - reads tables.settlementDetails,
// the same real per-store-column payment-method breakdown the Dashboard's
// Settlement Details card and the desktop SettlementDetailsTable both use.
function SettlementView({ overview }) {
  const table = overview?.tables?.settlementDetails;
  const columns = table?.columns || [];
  const rows = table?.rows || [];

  if (!rows.length) return <EmptyState message="No settlements in this range" />;

  return (
    <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" sx={{ width: "100%", fontSize: 11, minWidth: 420, borderCollapse: "collapse" }}>
          <Box component="thead">
            <Box component="tr" sx={{ textAlign: "left", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 9.5 }}>
              <Box component="th" sx={{ pb: 1, pr: 1 }}>Method</Box>
              {columns.map((c) => (
                <Box component="th" key={c.key} sx={{ pb: 1, px: 1, textAlign: "right" }}>{c.label}</Box>
              ))}
              <Box component="th" sx={{ pb: 1, pl: 1, textAlign: "right" }}>Total</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map((row) => (
              <Box component="tr" key={row.key} sx={{ borderTop: "1px solid #f1f5f9" }}>
                <Box component="td" sx={{ py: 1, pr: 1, fontWeight: 700, color: "#334155" }}>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: SETTLEMENT_DOT_COLOR[row.color] || "#94a3b8" }} />
                    {row.label}
                  </Box>
                </Box>
                {columns.map((c) => (
                  <Box component="td" key={c.key} sx={{ py: 1, px: 1, textAlign: "right", fontWeight: 600, color: "#475569" }}>
                    {money(row.values?.[c.key])}
                  </Box>
                ))}
                <Box component="td" sx={{ py: 1, pl: 1, textAlign: "right", fontWeight: 900, color: "#0f172a" }}>{money(row.total)}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      {table?.grandTotal != null && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1.25, mt: 1, borderTop: "1px solid #e2e8f0" }}>
          <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase" }}>Grand Total</Typography>
          <Typography component="span" sx={{ fontSize: 13, fontWeight: 900, color: "#4f46e5" }}>{money(table.grandTotal)}</Typography>
        </Box>
      )}
    </Box>
  );
}

// Location/Company Summary - reads tables.dailySalesSummary, the same
// per-store rows (company, location, count, quantity, value) the desktop
// DailySalesSummaryTable already shows.
function LocationView({ overview, labelKey, title }) {
  const table = overview?.tables?.dailySalesSummary;
  const rows = table?.rows || [];

  if (!rows.length) return <EmptyState message="No sales in this range" />;

  return (
    <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {rows.map((row, idx) => (
          <Box key={idx} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #f1f5f9" }}>
            <Box>
              <Typography component="p" sx={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", m: 0 }}>{row[labelKey] || row.company}</Typography>
              <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, m: 0, mt: 0.25 }}>
                {row.count} bills · {Number(row.quantity).toLocaleString("en-IN")} pcs
              </Typography>
            </Box>
            <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{money(row.value)}</Typography>
          </Box>
        ))}
        {table?.totals && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1, mt: 0.5, borderTop: "1px solid #e2e8f0" }}>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase" }}>Total</Typography>
            <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 900, color: "#4f46e5" }}>{money(table.totals.value)}</Typography>
          </Box>
        )}
      </Box>
      <Typography component="p" sx={{ fontSize: 9, color: "#94a3b8", mt: 1 }}>{title} breakdown across {rows.length} {rows.length === 1 ? "store" : "stores"}</Typography>
    </Box>
  );
}

// Date Summary - grouped by calendar day from the raw sales list, since no
// backend aggregate respects an arbitrary custom date range the way this
// picker's From/To does (the dashboard's own daily chart is hardcoded to
// "last 10 days" regardless of what range is selected here).
function DateSummaryView({ rawSales }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const sale of rawSales) {
      const dateKey = String(sale.sale_date || "").slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey, count: 0, amount: 0 });
      const bucket = map.get(dateKey);
      bucket.count += 1;
      bucket.amount += Number(sale.grand_total || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [rawSales]);

  if (!grouped.length) return <EmptyState message="No sales in this range" />;

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

// Bill Summary / GST Bill Summary / Bill-Tax Summary / Discount Bills -
// all the same underlying bill list, showing different columns per the
// selected mode (matches how desktop's SalesReports.jsx filters the same
// BILL_SUMMARY_COLUMNS set per tab rather than fetching separately per tab).
function BillListView({ rawSales, mode }) {
  const rows = useMemo(() => {
    if (mode === "discount") {
      return rawSales.filter((s) => Number(s.discount_amount || 0) > 0);
    }
    return rawSales;
  }, [rawSales, mode]);

  if (!rows.length) {
    return <EmptyState message={mode === "discount" ? "No discounted bills in this range" : "No bills in this range"} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {rows.map((sale) => (
        <Box key={sale.id} sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{sale.invoice_no}</Typography>
            <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 900, color: "#0f172a" }}>{money(sale.grand_total)}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
            <Typography component="span" sx={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
              {sale.customer?.name || "Walk-in"} · {formatDate(sale.sale_date)}
            </Typography>
          </Box>

          {mode === "gst" && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, pt: 0.75, borderTop: "1px solid #f1f5f9", fontSize: 9.5, fontWeight: 600, color: "#64748b" }}>
              <Box component="span">Taxable: {money(sale.subtotal)}</Box>
              <Box component="span">GST: {money(sale.tax_amount)}</Box>
            </Box>
          )}

          {mode === "tax" && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, pt: 0.75, borderTop: "1px solid #f1f5f9", fontSize: 9.5, fontWeight: 600, color: "#64748b" }}>
              <Box component="span">CGST: {money(Number(sale.tax_amount || 0) / 2)}</Box>
              <Box component="span">SGST: {money(Number(sale.tax_amount || 0) / 2)}</Box>
            </Box>
          )}

          {mode === "discount" && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, pt: 0.75, borderTop: "1px solid #f1f5f9", fontSize: 9.5, fontWeight: 600, color: "#e11d48" }}>
              <Box component="span">Discount Given</Box>
              <Box component="span">-{money(sale.discount_amount)}</Box>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

// Bill Detail - one row per product line across every bill in the range,
// flattened from the same eager-loaded items.product relation the raw
// sales list already carries.
function BillDetailView({ rawSales }) {
  const rows = useMemo(() => {
    const flat = [];
    for (const sale of rawSales) {
      for (const item of sale.items || []) {
        flat.push({
          saleId: sale.id,
          invoiceNo: sale.invoice_no,
          date: sale.sale_date,
          productName: item.product?.name || item.product_name || "Item",
          quantity: item.quantity,
          sellingPrice: item.selling_price,
          subtotal: item.subtotal,
        });
      }
    }
    return flat;
  }, [rawSales]);

  if (!rows.length) return <EmptyState message="No bill items in this range" />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {rows.map((row, idx) => (
        <Box key={idx} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="p" sx={{ fontSize: 11, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", m: 0 }}>{row.productName}</Typography>
            <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, m: 0, mt: 0.25 }}>
              {row.invoiceNo} · {row.quantity} × {money(row.sellingPrice)}
            </Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 900, color: "#0f172a", pl: 1, flexShrink: 0 }}>{money(row.subtotal)}</Typography>
        </Box>
      ))}
    </Box>
  );
}
