import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Plus,
  ChevronRight,
  AlertTriangle,
  FileText,
  RotateCcw,
  Undo2,
  Wallet,
  Sparkles,
  Users,
  RefreshCw,
  Search,
  ChevronDown,
} from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";
import { setCachedData, getCachedData, getSyncQueue } from "../offline/db";
import useDashboardRealtime from "../../hooks/useDashboardRealtime";
import BranchSelectorModal from "../components/BranchSelectorModal";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// There's no due_date/payment-terms field anywhere on a purchase bill (only
// the invoice/purchase date itself), so "days remaining" can't be shown
// honestly - it would imply a due date that was never set. This shows how
// long the bill has been outstanding instead, color-coded for urgency.
const daysOutstandingColor = (days) => {
  const d = Number(days || 0);
  if (d > 30) return "#e11d48";
  if (d > 15) return "#d97706";
  return "#64748b";
};

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DashboardScreen({ onNavigate, onOpenSearch, onOpenSyncCenter, authUser }) {
  const [dateRange, setDateRange] = useState("today"); // 'today' | 'yesterday' | 'week' | 'month'
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [, setSummaryData] = useState(null);
  const [attentionData, setAttentionData] = useState(null);
  const [supplierDues, setSupplierDues] = useState(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [overrideStoreName, setOverrideStoreName] = useState(null);

  // Same gate desktop's Navbar "Switch Store" uses, so the pill only
  // becomes tappable for users who actually have somewhere else to switch
  // to (a super admin, or someone explicitly assigned to more than one
  // store) - a single-store clerk just sees their store name, same as
  // before.
  const isSuperAdmin = String(authUser?.role || "").toLowerCase() === "super_admin";
  const hasMultipleStores = Array.isArray(authUser?.company_ids) && authUser.company_ids.length > 1;
  const canSwitchStore = isSuperAdmin || hasMultipleStores;

  const activeStoreId =
    typeof window !== "undefined" ? localStorage.getItem("activeStoreId") : null;

  // The pill used to hardcode "Main Retail Branch" regardless of which
  // store was actually active - resolves the real name instead: the
  // switched-to store's name when an override is set (and differs from
  // the user's own store), otherwise the user's own store name from their
  // login response (already present, no extra fetch needed for the
  // common no-override case).
  useEffect(() => {
    if (!activeStoreId || String(authUser?.company_id) === String(activeStoreId)) {
      setOverrideStoreName(null);
      return;
    }
    api
      .get(`/companies/${activeStoreId}`)
      .then((res) => setOverrideStoreName(res.data?.data?.name || null))
      .catch(() => setOverrideStoreName(null));
  }, [activeStoreId, authUser?.company_id]);

  const branchLabel = overrideStoreName || authUser?.company_name || "My Store";
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Compute date range dates
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (dateRange === "today") {
      from = now;
      to = now;
    } else if (dateRange === "yesterday") {
      from = new Date(now.setDate(now.getDate() - 1));
      to = from;
    } else if (dateRange === "week") {
      from = new Date(now.setDate(now.getDate() - 7));
      to = new Date();
    } else if (dateRange === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date();
    }

    return { fromDate: formatYmd(from), toDate: formatYmd(to) };
  }, [dateRange]);

  const loadDashboardData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [overviewRes, summaryRes, purchasesRes, attentionRes, duesRes] = await Promise.allSettled([
        api.get("/dashboard/overview", {
          params: {
            from: fromDate,
            to: toDate,
            timezoneOffset: new Date().getTimezoneOffset(),
          },
        }),
        api.get("/dashboard/summary"),
        api.get("/direct-purchases", { params: { limit: 10 } }),
        api.get("/dashboard/attention-summary"),
        api.get("/supplier-payments/pending", { params: { limit: 5 } }),
      ]);

      const ov = overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : null;
      const sm = summaryRes.status === "fulfilled" ? summaryRes.value.data?.data : null;
      const pc = purchasesRes.status === "fulfilled" ? purchasesRes.value.data?.data : null;
      const att = attentionRes.status === "fulfilled" ? attentionRes.value.data?.data : null;
      const dues = duesRes.status === "fulfilled"
        ? {
            totalPayable: duesRes.value.data?.totalPayable,
            count: duesRes.value.data?.total,
            rows: duesRes.value.data?.data || [],
          }
        : null;

      const combined = {
        overview: ov,
        summary: sm,
        purchases: Array.isArray(pc) ? pc : pc?.data || [],
        attention: att,
        dues,
      };

      setOverviewData(ov);
      setSummaryData(sm);
      setAttentionData(att);
      setSupplierDues(dues);

      // Cache locally in IndexedDB for offline viewing
      setCachedData(`dashboard_${dateRange}`, combined);
    } catch {
      // Fallback to IndexedDB cached data
      const cached = await getCachedData(`dashboard_${dateRange}`);
      if (cached) {
        setOverviewData(cached.overview);
        setSummaryData(cached.summary);
        setAttentionData(cached.attention);
        setSupplierDues(cached.dues);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fromDate, toDate, dateRange]);

  useEffect(() => {
    loadDashboardData();

    const handleRestored = () => loadDashboardData();
    window.addEventListener("vx-network-restored", handleRestored);
    window.addEventListener("vx-pull-refresh", handleRestored);
    return () => {
      window.removeEventListener("vx-network-restored", handleRestored);
      window.removeEventListener("vx-pull-refresh", handleRestored);
    };
  }, [loadDashboardData]);

  // Unsynced offline changes (drafts/mutations still waiting in the local
  // IndexedDB queue) surfaced as a Needs Attention item, so a store that's
  // been offline doesn't silently sit on unsaved sales/purchases.
  useEffect(() => {
    const refreshPendingSync = () => {
      getSyncQueue().then((queue) => setPendingSyncCount(queue.length));
    };
    refreshPendingSync();

    window.addEventListener("vx-sync-queue-updated", refreshPendingSync);
    window.addEventListener("vx-sync-completed", refreshPendingSync);
    return () => {
      window.removeEventListener("vx-sync-queue-updated", refreshPendingSync);
      window.removeEventListener("vx-sync-completed", refreshPendingSync);
    };
  }, []);

  // Same 30s visibility-aware polling the desktop Dashboard uses (no backend
  // WebSocket exists for this data, see useDashboardRealtime.js) -- kept the
  // KPI cards, alerts, and fast-moving list in sync with new sales/purchases
  // without the user needing to switch tabs and back to force a refetch.
  useDashboardRealtime({
    enabled: true,
    onUpdate: loadDashboardData,
  });

  // Extract core metrics from the real /dashboard/overview response shape.
  const metrics = overviewData?.metrics || {};
  const tables = overviewData?.tables || {};

  const hasBillsData = metrics.totalBills != null;
  const totalBillsAmount = Number(metrics.totalBills?.amount ?? 0);
  const totalBillsCount = Number(metrics.totalBills?.count ?? 0);
  const unsettledCount = Number(metrics.totalBills?.unsettledCount ?? 0);
  const billsTrend = metrics.totalBills?.trend?.changePercent ?? null;
  const billsTrendDirection = metrics.totalBills?.trend?.direction ?? null;

  const hasStockData = metrics.stockValue != null;
  const totalStockVal = Number(metrics.stockValue?.amount ?? 0);
  const stockTrend = metrics.stockValue?.trend?.changePercent ?? null;
  const stockTrendDirection = metrics.stockValue?.trend?.direction ?? null;

  const hasReturnsData = metrics.returns != null;
  const returnsAmount = Number(metrics.returns?.amount ?? 0);
  const returnsCount = Number(metrics.returns?.count ?? 0);
  const returnsTrend = metrics.returns?.trend?.changePercent ?? null;
  const returnsTrendDirection = metrics.returns?.trend?.direction ?? null;

  const hasPurchasesData = metrics.purchases != null;
  const purchasesAmount = Number(metrics.purchases?.amount ?? 0);
  const purchasesCount = Number(metrics.purchases?.count ?? 0);
  const purchasesTrend = metrics.purchases?.trend?.changePercent ?? null;
  const purchasesTrendDirection = metrics.purchases?.trend?.direction ?? null;

  const hasPurchaseReturnsData = metrics.purchaseReturns != null;
  const purchaseReturnsAmount = Number(metrics.purchaseReturns?.amount ?? 0);
  const purchaseReturnsCount = Number(metrics.purchaseReturns?.count ?? 0);
  const purchaseReturnsTrend = metrics.purchaseReturns?.trend?.changePercent ?? null;
  const purchaseReturnsTrendDirection = metrics.purchaseReturns?.trend?.direction ?? null;

  const hasEmployeeData = metrics.employees != null;
  const employeesPresent = Number(metrics.employees?.present ?? 0);
  const employeesTotal = Number(metrics.employees?.total ?? 0);

  const hasDuesData = supplierDues != null;
  const duesAmount = Number(supplierDues?.totalPayable ?? 0);
  const duesCount = Number(supplierDues?.count ?? 0);
  const duesRows = supplierDues?.rows || [];

  const fastMovingRows = tables.fastMovingSection?.rows || [];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75, pb: 4 }}>
      {/* ─── 0. Global Search Entry ─── */}
      {onOpenSearch && (
        <Box
          component="button"
          type="button"
          onClick={onOpenSearch}
          sx={{
            width: "100%", display: "flex", alignItems: "center", gap: 1, bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)",
            px: 1.75, py: 1.25, borderRadius: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", textAlign: "left", transition: "all 0.15s",
            "&:active": { transform: "scale(0.98)" },
          }}
        >
          <Search size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
            Search products, customers, invoices...
          </Typography>
        </Box>
      )}

      {/* ─── 1. Store Header & Date Filter Strip (Zoho / Quanto style) ─── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, pt: 0.5 }}>
        {canSwitchStore ? (
          <Box
            component="button"
            type="button"
            onClick={() => setBranchModalOpen(true)}
            sx={{ display: "flex", alignItems: "center", gap: 0.75, bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", px: 1.25, py: 0.75, borderRadius: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", transition: "all 0.15s", "&:active": { transform: "scale(0.95)" } }}
          >
            <Box component="span" className="animate-pulse" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", flexShrink: 0 }} />
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
              {branchLabel}
            </Typography>
            <ChevronDown size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", px: 1.25, py: 0.75, borderRadius: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
            <Box component="span" className="animate-pulse" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", flexShrink: 0 }} />
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
              {branchLabel}
            </Typography>
          </Box>
        )}

        {/* Date Filter Pills */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, bgcolor: "rgba(226,232,240,0.7)", p: 0.5, borderRadius: "16px" }}>
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Y'day" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
          ].map((tab) => (
            <Box
              component="button"
              key={tab.id}
              type="button"
              onClick={() => setDateRange(tab.id)}
              sx={{
                px: 1, py: 0.25, fontSize: 10.5, fontWeight: 700, borderRadius: "12px", transition: "all 0.15s",
                bgcolor: dateRange === tab.id ? "#fff" : "transparent",
                color: dateRange === tab.id ? "#4f46e5" : "#475569",
                boxShadow: dateRange === tab.id ? 1 : "none",
              }}
            >
              {tab.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ─── 2. 1-Tap Quick Action Bar (Vyapar / Khatabook / GOFRUGAL) ─── */}
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
        <Box
          component="button"
          type="button"
          onClick={() => onNavigate("create_invoice")}
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 1, borderRadius: "16px",
            bgcolor: "#4f46e5", color: "#fff", boxShadow: "0 4px 6px -1px rgba(79,70,229,0.2)", transition: "all 0.15s", textAlign: "center",
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          <Plus size={16} style={{ marginBottom: 2 }} />
          <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.25 }}>New Sale</Typography>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => onNavigate("purchase")}
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 1, borderRadius: "16px",
            bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.9)", color: "#1e293b", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", transition: "all 0.15s", textAlign: "center",
            "&:hover": { bgcolor: "#f8fafc" }, "&:active": { transform: "scale(0.95)" },
          }}
        >
          <ShoppingBag size={16} style={{ marginBottom: 2, color: "#4f46e5" }} />
          <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.25 }}>Purchase</Typography>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => onNavigate("inventory")}
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 1, borderRadius: "16px",
            bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.9)", color: "#1e293b", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", transition: "all 0.15s", textAlign: "center",
            "&:hover": { bgcolor: "#f8fafc" }, "&:active": { transform: "scale(0.95)" },
          }}
        >
          <Package size={16} style={{ marginBottom: 2, color: "#9333ea" }} />
          <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.25 }}>Stock</Typography>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => onNavigate("reports")}
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 1, borderRadius: "16px",
            bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.9)", color: "#1e293b", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", transition: "all 0.15s", textAlign: "center",
            "&:hover": { bgcolor: "#f8fafc" }, "&:active": { transform: "scale(0.95)" },
          }}
        >
          <FileText size={16} style={{ marginBottom: 2, color: "#059669" }} />
          <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.25 }}>Reports</Typography>
        </Box>
      </Box>

      {/* ─── Needs Attention (Actionable alerts) ─── */}
      <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <AlertTriangle size={15} className="animate-pulse" style={{ color: "#f59e0b" }} />
            <Typography component="h4" sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", m: 0 }}>
              Needs Attention
            </Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8" }}>Action Required</Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Item 1: Low Stock Products */}
          <Box
            onClick={() => onNavigate("inventory")}
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "rgba(254,242,242,0.5)", border: "1px solid rgba(254,226,226,0.8)", cursor: "pointer", transition: "all 0.15s", "&:active": { transform: "scale(0.98)" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444" }} />
              <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                {attentionData?.low_stock ?? 0} Products Low Stock
              </Typography>
            </Box>
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          </Box>

          {/* Item 2: Pending Approvals */}
          <Box
            onClick={() => onNavigate("approvals")}
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "rgba(239,246,255,0.5)", border: "1px solid rgba(219,234,254,0.8)", cursor: "pointer", transition: "all 0.15s", "&:active": { transform: "scale(0.98)" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#3b82f6" }} />
              <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                {attentionData?.pending_approvals ?? 0} Pending Approvals
              </Typography>
            </Box>
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          </Box>

          {/* Item 3: Purchase Bills Due */}
          <Box
            onClick={() => onNavigate("purchase")}
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "rgba(255,251,235,0.5)", border: "1px solid rgba(254,243,199,0.8)", cursor: "pointer", transition: "all 0.15s", "&:active": { transform: "scale(0.98)" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
              <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                {attentionData?.overdue_payables ?? 0} Purchase Bills Due
              </Typography>
            </Box>
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          </Box>

          {/* Item 4: Employees on Leave */}
          <Box
            onClick={() => onNavigate("attendance")}
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "rgba(245,243,255,0.5)", border: "1px solid rgba(237,233,254,0.8)", cursor: "pointer", transition: "all 0.15s", "&:active": { transform: "scale(0.98)" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#8b5cf6" }} />
              <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                {attentionData?.employees_on_leave ?? 0} Employees on Leave
              </Typography>
            </Box>
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          </Box>

          {/* Item 5: Unsynced Offline Changes - only shown when there's something
              actually waiting, since most sessions never queue anything.
              Opens the Sync Center to inspect/retry/discard queued items. */}
          {pendingSyncCount > 0 && (
            <Box
              onClick={() => onOpenSyncCenter && onOpenSyncCenter()}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px",
                bgcolor: "rgba(236,254,255,0.5)", border: "1px solid rgba(207,250,254,0.8)",
                cursor: onOpenSyncCenter ? "pointer" : "default",
                transition: onOpenSyncCenter ? "all 0.15s" : "none",
                "&:active": onOpenSyncCenter ? { transform: "scale(0.98)" } : {},
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <RefreshCw size={11} style={{ color: "#0891b2", flexShrink: 0 }} />
                <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                  {pendingSyncCount} Unsynced Change{pendingSyncCount === 1 ? "" : "s"} Waiting to Sync
                </Typography>
              </Box>
              {onOpenSyncCenter && <ChevronRight size={14} style={{ color: "#94a3b8" }} />}
            </Box>
          )}
        </Box>
      </Box>

      {/* ─── 3. Primary KPI Cards ─── */}
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>

        {/* CARD 1: Sales Today */}
        <Box
          onClick={() => onNavigate("sales")}
          sx={{
            p: 1.5, borderRadius: "16px", backgroundImage: "linear-gradient(to bottom right, rgba(16,185,129,0.1), #fff, #fff)",
            border: "1px solid rgba(167,243,208,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", justifyContent: "space-between", "&:active": { transform: "scale(0.98)" },
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#047857" }}>
                Sales Today
              </Typography>
              <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "#d1fae5", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={12} />
              </Box>
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.375 }}>
              {hasBillsData ? money(totalBillsAmount) : "—"}
            </Typography>
          </Box>

          {/* Sub-Quantities */}
          <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px solid rgba(209,250,229,0.7)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 9.5, color: "#475569", fontWeight: 600 }}>
            <Box component="span">{totalBillsCount} Bills ({unsettledCount} unsettled)</Box>
            {billsTrend != null && (
              <Box component="span" sx={{ fontWeight: 700, color: billsTrendDirection === "down" ? "#e11d48" : "#059669" }}>
                {billsTrendDirection === "down" ? "↓" : "↑"}
                {billsTrend}%
              </Box>
            )}
          </Box>
        </Box>

        {/* CARD 2: Purchase Today */}
        <Box
          onClick={() => onNavigate("purchase")}
          sx={{
            p: 1.5, borderRadius: "16px", backgroundImage: "linear-gradient(to bottom right, rgba(59,130,246,0.1), #fff, #fff)",
            border: "1px solid rgba(191,219,254,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", justifyContent: "space-between", "&:active": { transform: "scale(0.98)" },
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#1d4ed8" }}>
                Purchase Today
              </Typography>
              <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingBag size={12} />
              </Box>
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.375 }}>
              {hasPurchasesData ? money(purchasesAmount) : "—"}
            </Typography>
          </Box>

          <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px solid rgba(219,234,254,0.7)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 9.5, color: "#475569", fontWeight: 600 }}>
            <Box component="span">{purchasesCount} Bills</Box>
            {purchasesTrend != null && (
              <Box component="span" sx={{ fontWeight: 700, color: purchasesTrendDirection === "down" ? "#e11d48" : "#059669" }}>
                {purchasesTrendDirection === "down" ? "↓" : "↑"}
                {purchasesTrend}%
              </Box>
            )}
          </Box>
        </Box>

        {/* CARD 3: Returns */}
        <Box
          onClick={() => onNavigate("returns")}
          sx={{
            p: 1.5, borderRadius: "16px", backgroundImage: "linear-gradient(to bottom right, rgba(244,63,94,0.1), #fff, #fff)",
            border: "1px solid rgba(254,205,211,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", justifyContent: "space-between", "&:active": { transform: "scale(0.98)" },
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#be123c" }}>
                Returns
              </Typography>
              <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "#ffe4e6", color: "#be123c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RotateCcw size={12} />
              </Box>
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.375 }}>
              {hasReturnsData ? money(returnsAmount) : "—"}
            </Typography>
          </Box>

          <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px solid rgba(255,228,230,0.7)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 9.5, color: "#475569", fontWeight: 600 }}>
            <Box component="span">{returnsCount} Returns</Box>
            {returnsTrend != null && (
              <Box component="span" sx={{ fontWeight: 700, color: returnsTrendDirection === "down" ? "#059669" : "#e11d48" }}>
                {returnsTrendDirection === "down" ? "↓" : "↑"}
                {returnsTrend}%
              </Box>
            )}
          </Box>
        </Box>

        {/* CARD 4: Purchase Return */}
        <Box
          onClick={() => onNavigate("purchase")}
          sx={{
            p: 1.5, borderRadius: "16px", backgroundImage: "linear-gradient(to bottom right, rgba(249,115,22,0.1), #fff, #fff)",
            border: "1px solid rgba(254,215,170,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", justifyContent: "space-between", "&:active": { transform: "scale(0.98)" },
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#c2410c" }}>
                Purchase Return
              </Typography>
              <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "#ffedd5", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Undo2 size={12} />
              </Box>
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.375 }}>
              {hasPurchaseReturnsData ? money(purchaseReturnsAmount) : "—"}
            </Typography>
          </Box>

          <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px solid rgba(255,237,213,0.7)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 9.5, color: "#475569", fontWeight: 600 }}>
            <Box component="span">{purchaseReturnsCount} Returns</Box>
            {purchaseReturnsTrend != null && (
              <Box component="span" sx={{ fontWeight: 700, color: purchaseReturnsTrendDirection === "down" ? "#059669" : "#e11d48" }}>
                {purchaseReturnsTrendDirection === "down" ? "↓" : "↑"}
                {purchaseReturnsTrend}%
              </Box>
            )}
          </Box>
        </Box>

        {/* CARD 5: Stock value */}
        <Box
          onClick={() => onNavigate("inventory")}
          sx={{
            p: 1.5, borderRadius: "16px", backgroundImage: "linear-gradient(to bottom right, rgba(168,85,247,0.1), #fff, #fff)",
            border: "1px solid rgba(233,213,255,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)", cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", justifyContent: "space-between", "&:active": { transform: "scale(0.98)" },
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#7e22ce" }}>
                Stock value
              </Typography>
              <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "#f3e8ff", color: "#7e22ce", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={12} />
              </Box>
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.375 }}>
              {hasStockData ? money(totalStockVal) : "—"}
            </Typography>
          </Box>

          <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px solid rgba(243,232,255,0.7)", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 9.5, color: "#475569", fontWeight: 600 }}>
            {stockTrend != null && (
              <Box component="span" sx={{ fontWeight: 700, color: stockTrendDirection === "down" ? "#e11d48" : "#059669" }}>
                {stockTrendDirection === "down" ? "↓" : "↑"}
                {stockTrend}%
              </Box>
            )}
          </Box>
        </Box>

        {/* CARD 6: Employees (Present / Total) */}
        <Box
          sx={{
            p: 1.5, borderRadius: "16px", backgroundImage: "linear-gradient(to bottom right, rgba(6,182,212,0.1), #fff, #fff)",
            border: "1px solid rgba(165,243,252,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0e7490" }}>
                Employees
              </Typography>
              <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "#cffafe", color: "#0e7490", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={12} />
              </Box>
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.375 }}>
              {hasEmployeeData ? `${employeesPresent}/${employeesTotal}` : "—"}
            </Typography>
          </Box>

          <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px solid rgba(207,250,254,0.7)", fontSize: 9.5, color: "#475569", fontWeight: 600 }}>
            Present / total
          </Box>
        </Box>
      </Box>

      {/* ─── Supplier Pending Dues (real data: GET /supplier-payments/pending) ─── */}
      <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <Box
          onClick={() => onNavigate("supplier_dues")}
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.15s", "&:active": { transform: "scale(0.98)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Wallet size={16} />
            </Box>
            <Box>
              <Typography component="h4" sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", m: 0 }}>
                Supplier Dues
              </Typography>
              <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", fontWeight: 600, m: 0, mt: 0.25 }}>
                {hasDuesData ? `${duesCount} bill${duesCount === 1 ? "" : "s"} pending` : "—"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography component="span" sx={{ fontSize: 13, fontWeight: 900, color: "#b45309" }}>
              {hasDuesData ? money(duesAmount) : "—"}
            </Typography>
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          </Box>
        </Box>

        {duesRows.length > 0 && (
          <Box sx={{ mt: 1.25, pt: 1.25, borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, fontSize: 9, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <Box component="span" sx={{ flex: 1 }}>Supplier Name</Box>
              <Box component="span" sx={{ flexShrink: 0, textAlign: "center", minWidth: "56px" }}>Overdue Days</Box>
              <Box component="span" sx={{ flexShrink: 0, textAlign: "right", minWidth: "60px" }}>Value</Box>
            </Box>
            {duesRows.slice(0, 5).map((row) => (
              <Box
                key={`${row.invoice_type}-${row.id}`}
                onClick={() => onNavigate("supplier_dues")}
                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, cursor: "pointer", gap: 1 }}
              >
                <Box component="span" sx={{ fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {row.supplier_name} · {row.invoice_no}
                </Box>
                <Box
                  component="span"
                  sx={{ fontWeight: 700, flexShrink: 0, textAlign: "center", minWidth: "56px", color: daysOutstandingColor(row.days) }}
                >
                  {row.days}d
                </Box>
                <Box component="span" sx={{ fontWeight: 900, color: "#b45309", flexShrink: 0, textAlign: "right", minWidth: "60px" }}>
                  {money(row.balance_due)}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ─── Fast Moving Products (real data: tables.fastMovingSection) ─── */}
      <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <Box
          onClick={() => onNavigate("fast_moving")}
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25, cursor: "pointer", transition: "all 0.15s", "&:active": { transform: "scale(0.98)" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Sparkles size={15} style={{ color: "#f59e0b" }} />
            <Typography component="h4" sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", m: 0 }}>
              Fast Moving Products
            </Typography>
          </Box>
          <ChevronRight size={14} style={{ color: "#94a3b8" }} />
        </Box>

        {fastMovingRows.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {fastMovingRows.slice(0, 5).map((item, idx) => (
              <Box
                key={idx}
                onClick={() => onNavigate("fast_moving")}
                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #f1f5f9", cursor: "pointer" }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                  <Box component="span" sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "#e0e7ff", color: "#4338ca", fontWeight: 900, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {idx + 1}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography component="p" sx={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", m: 0, lineHeight: 1.25 }}>
                      {item.name}
                    </Typography>
                    <Typography component="p" sx={{ fontSize: 9.5, fontWeight: 600, color: "#64748b", m: 0, mt: 0.25 }}>
                      Sold: <Box component="strong" sx={{ color: "#059669" }}>{Number(item.saleQty).toLocaleString("en-IN")} Pcs</Box>
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right", pl: 1, flexShrink: 0 }}>
                  <Typography component="p" sx={{ fontSize: 11.5, fontWeight: 900, color: "#0f172a", m: 0 }}>{money(item.value)}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography component="p" sx={{ fontSize: 10.5, textAlign: "center", color: "#94a3b8", py: 1.5 }}>No product sales in this range</Typography>
        )}
      </Box>

      <BranchSelectorModal isOpen={branchModalOpen} onClose={() => setBranchModalOpen(false)} />
    </Box>
  );
}
