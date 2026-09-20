import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Box as BoxIcon,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileBarChart,
  FileText,
  Filter,
  Home,
  Layers,
  LogOut,
  Menu,
  MoreVertical,
  Package,
  Plus,
  PlusSquare,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Box, Typography } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate as useAppNavigate } from "react-router-dom";
import { mobileApi } from "./mobileApi";
import { logoutUser } from "../features/authSlice";
import EnterpriseTransactionModal from "./EnterpriseTransactionModal";
import "./workspace.css";
import "./transaction.css";

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

export default function EnterpriseMobileWorkspace() {
  const authUser = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const appNavigate = useAppNavigate();

  // Navigation State
  const [page, setPage] = useState("dashboard");
  const [history, setHistory] = useState(["dashboard"]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filter States
  const [salesFilter, setSalesFilter] = useState("All");
  const [purchaseFilter, setPurchaseFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const userName = authUser?.name || authUser?.username || "Admin";

  // Splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  const navigateTo = (target) => {
    setHistory((prev) => [...prev, target]);
    setPage(target);
    setMenuOpen(false);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevPage = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setPage(prevPage);
    } else {
      setPage("dashboard");
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (page === "dashboard") result = await mobileApi.dashboard({});
      else if (page === "sales") result = await mobileApi.sales({ page: 1, limit: 30 });
      else if (page === "purchase") result = await mobileApi.purchases({ page: 1, limit: 30 });
      else if (page === "inventory") result = await mobileApi.inventory({});
      else if (page === "products") result = await mobileApi.products({ page: 1, limit: 30 });
      else if (page === "customers") result = await mobileApi.customers({ page: 1, limit: 30 });
      else if (page === "suppliers") result = await mobileApi.suppliers({ page: 1, limit: 30 });
      else if (page === "expenses") result = await mobileApi.expenses({ page: 1, limit: 30 });
      else if (page === "reports") result = await mobileApi.reports({});
      else result = {};
      setData(result);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const triggerInstall = () => {
    window.dispatchEvent(new CustomEvent("pwa-show-install-prompt"));
  };

  // Determine Title & Header View
  const getHeaderTitle = () => {
    switch (page) {
      case "dashboard":
        return "Dashboard";
      case "modules":
        return "Modules";
      case "sales":
        return "Sales Invoices";
      case "create_invoice":
        return "Create Invoice";
      case "purchase":
        return "Purchase Bills";
      case "inventory":
        return "Inventory Summary";
      case "product_details":
        return "Product Details";
      case "reports":
        return "Reports";
      case "settings":
        return "Settings";
      default:
        return "Vynerix ERP";
    }
  };

  return (
    <Box className="vx-workspace">
      {/* 1. Splash Screen on Launch */}
      {splashVisible && (
        <Box className="vx-splash">
          <Box className="vx-splash-logo-box">
            <svg viewBox="0 0 100 100" className="w-12 h-12 fill-white">
              <path d="M20 20 L40 20 L50 65 L60 20 L80 20 L58 85 L42 85 Z" />
            </svg>
          </Box>
          <Typography component="h1" className="vx-splash-title">Vynerix</Typography>
          <Typography component="h2" className="vx-splash-title -mt-2">ERP</Typography>
          <Typography component="p" className="vx-splash-sub">Smart. Secure. Simplified.</Typography>
          <Box className="vx-splash-bar-wrap">
            <Box className="vx-splash-bar" />
          </Box>
        </Box>
      )}

      {/* 2. Top Header Bar */}
      <Box component="header" className="vx-ws-topbar">
        {page === "dashboard" || page === "modules" ? (
          <Box
            component="button"
            type="button"
            className="vx-ws-icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </Box>
        ) : (
          <Box
            component="button"
            type="button"
            className="vx-ws-icon"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Box>
        )}

        <Box className="vx-page-title-center flex-1 text-center font-bold text-base text-slate-900">
          {getHeaderTitle()}
        </Box>

        <Box
          component="button"
          type="button"
          className="vx-ws-icon relative"
          onClick={triggerInstall}
          title="Install Mobile App"
          aria-label="Install App"
        >
          <Bell size={19} />
          <Box component="span" sx={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", bgcolor: "#4f46e5" }} />
        </Box>
      </Box>

      {/* 3. Main Workspace Shell */}
      <Box className="vx-ws-shell">
        {/* Mobile Slide-over Drawer / Desktop Sidebar */}
        <Box component="aside" className={`vx-ws-sidebar ${menuOpen ? "open" : ""}`}>
          <Box className="vx-ws-space">
            <Box>
              <Typography component="small" sx={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Workspace</Typography>
              <Typography component="h3" sx={{ color: "#0f172a", fontWeight: 800, fontSize: 16, m: 0 }}>Vynerix ERP</Typography>
            </Box>
            <Box
              component="button"
              type="button"
              className="vx-ws-icon mobile-only"
              onClick={() => setMenuOpen(false)}
            >
              <X size={18} />
            </Box>
          </Box>
          <Box component="nav">
            <Box
              component="button"
              type="button"
              className={page === "dashboard" ? "active" : ""}
              onClick={() => navigateTo("dashboard")}
            >
              <Home size={18} /> Dashboard
            </Box>
            <Box
              component="button"
              type="button"
              className={page === "modules" ? "active" : ""}
              onClick={() => navigateTo("modules")}
            >
              <Layers size={18} /> All Modules
            </Box>
            <Box
              component="button"
              type="button"
              className={page === "sales" ? "active" : ""}
              onClick={() => navigateTo("sales")}
            >
              <ShoppingCart size={18} /> Sales
            </Box>
            <Box
              component="button"
              type="button"
              className={page === "purchase" ? "active" : ""}
              onClick={() => navigateTo("purchase")}
            >
              <ClipboardList size={18} /> Purchase
            </Box>
            <Box
              component="button"
              type="button"
              className={page === "inventory" ? "active" : ""}
              onClick={() => navigateTo("inventory")}
            >
              <BoxIcon size={18} /> Inventory
            </Box>
            <Box
              component="button"
              type="button"
              className={page === "reports" ? "active" : ""}
              onClick={() => navigateTo("reports")}
            >
              <BarChart3 size={18} /> Reports
            </Box>
            <Box
              component="button"
              type="button"
              className={page === "settings" ? "active" : ""}
              onClick={() => navigateTo("settings")}
            >
              <Settings size={18} /> Settings
            </Box>

            <Box sx={{ my: 1, borderTop: "1px solid #f1f5f9" }} />
            <Box
              component="button"
              type="button"
              sx={{ color: "#4f46e5", fontWeight: 700 }}
              onClick={triggerInstall}
            >
              <Download size={18} /> Install Mobile App
            </Box>
            <Box
              component="a"
              href="/dashboard"
              sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, fontSize: 12, color: "#64748b", borderRadius: "8px", transition: "color 0.15s", "&:hover": { color: "#0f172a" } }}
            >
              <Home size={16} /> Desktop View
            </Box>
          </Box>
        </Box>

        {/* 4. Active Screen Router */}
        <Box component="main" className="vx-ws-main">
          {page === "dashboard" && (
            <DashboardScreen
              userName={userName}
              data={data}
              onNavigate={navigateTo}
            />
          )}

          {page === "modules" && (
            <ModulesScreen onNavigate={navigateTo} />
          )}

          {page === "sales" && (
            <SalesInvoicesScreen
              filter={salesFilter}
              setFilter={setSalesFilter}
              search={searchQuery}
              setSearch={setSearchQuery}
              onAdd={() => navigateTo("create_invoice")}
            />
          )}

          {page === "create_invoice" && (
            <CreateInvoiceScreen onBack={goBack} />
          )}

          {page === "purchase" && (
            <PurchaseBillsScreen
              filter={purchaseFilter}
              setFilter={setPurchaseFilter}
              search={searchQuery}
              setSearch={setSearchQuery}
              onAdd={() => setModal({ type: "purchase", record: null })}
            />
          )}

          {page === "inventory" && (
            <InventorySummaryScreen onSelectProduct={(p) => { setSelectedProduct(p); navigateTo("product_details"); }} />
          )}

          {page === "product_details" && (
            <ProductDetailsScreen product={selectedProduct} onBack={goBack} />
          )}

          {page === "reports" && (
            <ReportsScreen onSelectReport={() => navigateTo("dashboard")} />
          )}

          {page === "settings" && (
            <SettingsScreen
              onLogout={() => {
                dispatch(logoutUser());
                appNavigate("/login");
              }}
              onTriggerPwa={triggerInstall}
            />
          )}
        </Box>
      </Box>

      {/* 5. Mobile Bottom Tab Navigation */}
      <Box component="nav" className="vx-bottom">
        <Box
          component="button"
          type="button"
          className={page === "dashboard" ? "active" : ""}
          onClick={() => navigateTo("dashboard")}
        >
          <Home size={20} />
          <Box component="span">Dashboard</Box>
        </Box>
        <Box
          component="button"
          type="button"
          className={page === "sales" || page === "create_invoice" ? "active" : ""}
          onClick={() => navigateTo("sales")}
        >
          <ShoppingCart size={20} />
          <Box component="span">Sales</Box>
        </Box>
        <Box
          component="button"
          type="button"
          className={page === "purchase" ? "active" : ""}
          onClick={() => navigateTo("purchase")}
        >
          <ClipboardList size={20} />
          <Box component="span">Purchase</Box>
        </Box>
        <Box
          component="button"
          type="button"
          className={page === "inventory" || page === "product_details" ? "active" : ""}
          onClick={() => navigateTo("inventory")}
        >
          <Package size={20} />
          <Box component="span">Inventory</Box>
        </Box>
        <Box
          component="button"
          type="button"
          className={page === "modules" || page === "reports" || page === "settings" ? "active" : ""}
          onClick={() => navigateTo("modules")}
        >
          <Menu size={20} />
          <Box component="span">More</Box>
        </Box>
      </Box>

      {/* Transaction Modal fallback */}
      {modal && (
        <EnterpriseTransactionModal
          type={modal.type}
          record={modal.record}
          onClose={() => setModal(null)}
          onSaved={() => loadData()}
        />
      )}
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 1: Dashboard
// -------------------------------------------------------------
function DashboardScreen({ userName, data, onNavigate }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Hello User Greeting */}
      <Box className="vx-user-greeting">
        <Box className="vx-greeting-left">
          <Box className="vx-greeting-avatar">
            {userName.slice(0, 1).toUpperCase()}
          </Box>
          <Box className="vx-greeting-text">
            <Typography component="h2">Hello, {userName}</Typography>
            <Typography component="p">Super Admin</Typography>
          </Box>
        </Box>
      </Box>

      {/* Date Pill Selector */}
      <Box>
        <Box className="vx-date-pill">
          <Box component="span">📅</Box>
          <Box component="span">19 Aug - 19 Aug 2025</Box>
          <Typography component="span" sx={{ color: "#94a3b8", fontSize: 12 }}>▼</Typography>
        </Box>
      </Box>

      {/* 2x2 KPI Cards */}
      <Box className="vx-kpis-grid">
        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Sales Today</Box>
          <Box component="span" className="vx-kpi-val">₹ 28,450</Box>
          <Box component="span" className="vx-kpi-badge positive">
            <TrendingUp size={13} /> +12.5%
          </Box>
        </Box>

        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Purchase Today</Box>
          <Box component="span" className="vx-kpi-val">₹ 18,750</Box>
          <Box component="span" className="vx-kpi-badge negative">
            <TrendingDown size={13} /> -4.3%
          </Box>
        </Box>

        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Receivables</Box>
          <Box component="span" className="vx-kpi-val">₹ 1,25,000</Box>
          <Box component="span" className="vx-kpi-badge info">
            <TrendingUp size={13} /> Active
          </Box>
        </Box>

        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Payables</Box>
          <Box component="span" className="vx-kpi-val">₹ 75,400</Box>
          <Box component="span" className="vx-kpi-badge purple">
            <TrendingDown size={13} /> Due
          </Box>
        </Box>
      </Box>

      {/* Sales Overview Chart Card */}
      <Box className="vx-card">
        <Box className="vx-card-header">
          <Typography component="h3" className="vx-card-title">Sales Overview</Typography>
          <Box component="select" className="vx-select-sm" defaultValue="week">
            <option value="week">This Week ▾</option>
            <option value="month">This Month</option>
          </Box>
        </Box>

        {/* SVG Sparkline / Line Chart */}
        <Box className="vx-chart-box">
          <svg viewBox="0 0 650 180" className="w-full h-full">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Grid horizontal lines */}
            <line x1="40" y1="30" x2="620" y2="30" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="40" y1="80" x2="620" y2="80" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="40" y1="130" x2="620" y2="130" stroke="#f1f5f9" strokeWidth="1" />

            {/* Y axis text */}
            <text x="5" y="35" fontSize="10" fill="#94a3b8">30K</text>
            <text x="5" y="85" fontSize="10" fill="#94a3b8">20K</text>
            <text x="5" y="135" fontSize="10" fill="#94a3b8">10K</text>

            {/* Filled area */}
            <polygon
              points="60,140 140,120 220,130 300,70 380,100 460,80 540,30 620,50 620,150 60,150"
              fill="url(#chartGrad)"
            />

            {/* Polyline curve */}
            <polyline
              points="60,140 140,120 220,130 300,70 380,100 460,80 540,30 620,50"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots */}
            {[
              [60, 140],
              [140, 120],
              [220, 130],
              [300, 70],
              [380, 100],
              [460, 80],
              [540, 30],
              [620, 50],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="4.5"
                fill="#ffffff"
                stroke="#4f46e5"
                strokeWidth="2.5"
              />
            ))}

            {/* X axis labels */}
            <text x="50" y="170" fontSize="10" fill="#94a3b8">13 Aug</text>
            <text x="130" y="170" fontSize="10" fill="#94a3b8">14 Aug</text>
            <text x="210" y="170" fontSize="10" fill="#94a3b8">15 Aug</text>
            <text x="290" y="170" fontSize="10" fill="#94a3b8">16 Aug</text>
            <text x="370" y="170" fontSize="10" fill="#94a3b8">17 Aug</text>
            <text x="450" y="170" fontSize="10" fill="#94a3b8">18 Aug</text>
            <text x="530" y="170" fontSize="10" fill="#94a3b8">19 Aug</text>
          </svg>
        </Box>
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 2: Modules Grid & Recent Activity
// -------------------------------------------------------------
function ModulesScreen({ onNavigate }) {
  const moduleTiles = [
    { key: "sales", name: "Sales", icon: ShoppingCart, bg: "bg-indigo-600" },
    { key: "purchase", name: "Purchase", icon: ClipboardList, bg: "bg-sky-500" },
    { key: "inventory", name: "Inventory", icon: BoxIcon, bg: "bg-amber-500" },
    { key: "inventory", name: "Products", icon: Package, bg: "bg-emerald-500" },
    { key: "dashboard", name: "Customers", icon: Users, bg: "bg-blue-500" },
    { key: "dashboard", name: "Suppliers", icon: Store, bg: "bg-cyan-600" },
    { key: "dashboard", name: "Expenses", icon: Wallet, bg: "bg-orange-500" },
    { key: "reports", name: "Reports", icon: BarChart3, bg: "bg-slate-600" },
    { key: "settings", name: "Settings", icon: Settings, bg: "bg-slate-500" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 3x3 Grid */}
      <Box className="vx-modules-grid">
        {moduleTiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <Box
              component="button"
              key={i}
              type="button"
              className="vx-module-tile"
              onClick={() => onNavigate(tile.key)}
            >
              <Box className={`vx-module-icon-box ${tile.bg}`}>
                <Icon size={22} />
              </Box>
              <Box component="span" className="vx-module-name">{tile.name}</Box>
            </Box>
          );
        })}
      </Box>

      {/* Recent Activities */}
      <Box className="vx-card">
        <Typography component="h3" className="vx-card-title" sx={{ mb: 1.5 }}>Recent Activities</Typography>
        <Box sx={{ "& > *:not(:first-of-type)": { borderTop: "1px solid #f1f5f9" } }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.25 }}>
            <Box>
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", m: 0 }}>Sales Invoice INV-000123</Typography>
              <Typography component="p" sx={{ fontSize: 11, color: "#94a3b8", m: 0 }}>19 Aug 2025</Typography>
            </Box>
            <Box component="strong" sx={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>₹ 8,450</Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.25 }}>
            <Box>
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", m: 0 }}>Purchase Bill BILL-000123</Typography>
              <Typography component="p" sx={{ fontSize: 11, color: "#94a3b8", m: 0 }}>19 Aug 2025</Typography>
            </Box>
            <Box component="strong" sx={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>₹ 5,600</Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.25 }}>
            <Box>
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", m: 0 }}>Payment Received</Typography>
              <Typography component="p" sx={{ fontSize: 11, color: "#94a3b8", m: 0 }}>18 Aug 2025</Typography>
            </Box>
            <Box component="strong" sx={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>₹ 10,000</Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 3: Sales Invoices List
// -------------------------------------------------------------
function SalesInvoicesScreen({ filter, setFilter, search, setSearch, onAdd }) {
  const invoices = [
    { id: "INV-000123", customer: "Customer Name", date: "19 Aug 2025", amount: 8450, status: "paid" },
    { id: "INV-000122", customer: "Customer Name", date: "19 Aug 2025", amount: 12850, status: "sent" },
    { id: "INV-000121", customer: "Customer Name", date: "18 Aug 2025", amount: 5240, status: "draft" },
    { id: "INV-000120", customer: "Customer Name", date: "18 Aug 2025", amount: 15600, status: "paid" },
  ];

  const filtered = invoices.filter((inv) => {
    if (filter === "Draft" && inv.status !== "draft") return false;
    if (filter === "Sent" && inv.status !== "sent") return false;
    if (filter === "Paid" && inv.status !== "paid") return false;
    if (search && !inv.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Box>
      {/* Search & Filter */}
      <Box className="vx-search-row">
        <Box className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <Box
            component="input"
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        <Box component="button" type="button" className="vx-filter-btn" aria-label="Filter">
          <Filter size={17} />
        </Box>
      </Box>

      {/* Filter Tabs */}
      <Box className="vx-filter-tabs">
        {["All", "Draft", "Sent", "Paid"].map((t) => (
          <Box
            component="button"
            key={t}
            type="button"
            className={`vx-filter-pill ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </Box>
        ))}
      </Box>

      {/* Invoices List */}
      <Box>
        {filtered.map((inv) => (
          <Box key={inv.id} className="vx-trans-card">
            <Box className="vx-trans-left">
              <Box component="span" className="vx-trans-id">{inv.id}</Box>
              <Box component="span" className="vx-trans-meta">{inv.customer}</Box>
              <Box component="span" className="vx-trans-meta text-[10px]">{inv.date}</Box>
            </Box>
            <Box className="vx-trans-right">
              <Box component="span" className="vx-trans-amount">{money(inv.amount)}</Box>
              <Box component="span" className={`vx-pill-badge ${inv.status}`}>{inv.status}</Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Floating Action Button (+) */}
      <Box
        component="button"
        type="button"
        className="vx-fab-btn"
        onClick={onAdd}
        title="Create Invoice"
        aria-label="Create Invoice"
      >
        <Plus size={26} />
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 4: Create Invoice Form
// -------------------------------------------------------------
function CreateInvoiceScreen({ onBack }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 6 }}>
      {/* Customer Selection */}
      <Box className="vx-card">
        <Typography component="label" sx={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", mb: 0.5 }}>Customer</Typography>
        <Box component="select" sx={{ width: "100%", bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", p: 1.25, fontSize: 12, color: "#1e293b", outline: "none", fontWeight: 500 }}>
          <option>Select Customer ▾</option>
          <option>Walking Customer</option>
          <option>Sri Balaji Textiles</option>
        </Box>
      </Box>

      {/* Invoice Details */}
      <Box className="vx-card" sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", m: 0 }}>Invoice Details</Typography>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Invoice Number</Box>
          <Box component="span" sx={{ fontWeight: 600, color: "#1e293b", bgcolor: "#f1f5f9", px: 1, py: 0.5, borderRadius: "4px" }}>INV-000124</Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Invoice Date</Box>
          <Box component="span" sx={{ fontWeight: 500, color: "#1e293b" }}>19 Aug 2025</Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Due Date</Box>
          <Box component="span" sx={{ fontWeight: 500, color: "#1e293b" }}>02 Sep 2025</Box>
        </Box>
      </Box>

      {/* Items Section */}
      <Box className="vx-card">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", m: 0 }}>Items</Typography>
          <Box component="button" type="button" sx={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", display: "flex", alignItems: "center", gap: 0.5 }}>
            <Plus size={14} /> Add Item
          </Box>
        </Box>

        <Box sx={{ bgcolor: "#f8fafc", borderRadius: "12px", p: 1.5, border: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, mb: 1.5 }}>
          <Box>
            <Box component="span" sx={{ fontWeight: 700, color: "#0f172a", display: "block" }}>1. Product Name</Box>
            <Box component="small" sx={{ color: "#94a3b8" }}>HSN: 1234 · 2 PCS x ₹ 500.00</Box>
          </Box>
          <Box component="strong" sx={{ color: "#0f172a", fontWeight: 800 }}>₹ 1,000.00</Box>
        </Box>

        {/* Totals Summary */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, pt: 1, borderTop: "1px solid #f1f5f9", fontSize: 12 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
            <Box component="span">Subtotal</Box>
            <Box component="span">₹ 1,000.00</Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
            <Box component="span">CGST (9%)</Box>
            <Box component="span">₹ 90.00</Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
            <Box component="span">SGST (9%)</Box>
            <Box component="span">₹ 90.00</Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#0f172a", pt: 0.5, borderTop: "1px solid #e2e8f0" }}>
            <Box component="span">Total</Box>
            <Box component="span">₹ 1,180.00</Box>
          </Box>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
        <Box
          component="button"
          type="button"
          onClick={onBack}
          sx={{
            flex: 1, py: 1.5, borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 700, color: "#334155",
            bgcolor: "#fff", transition: "all 0.15s", "&:hover": { bgcolor: "#f8fafc" }, "&:active": { transform: "scale(0.98)" },
          }}
        >
          Save Draft
        </Box>
        <Box
          component="button"
          type="button"
          onClick={onBack}
          sx={{
            flex: 1, py: 1.5, borderRadius: "12px", bgcolor: "#4f46e5", fontSize: 12, fontWeight: 700, color: "#fff",
            boxShadow: "0 10px 15px -3px rgba(99,102,241,0.3)", transition: "all 0.15s",
            "&:hover": { bgcolor: "#4338ca" }, "&:active": { transform: "scale(0.98)" },
          }}
        >
          Save & Send
        </Box>
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 5: Purchase Bills List
// -------------------------------------------------------------
function PurchaseBillsScreen({ filter, setFilter, search, setSearch, onAdd }) {
  const bills = [
    { id: "BILL-000123", supplier: "Supplier Name", date: "19 Aug 2025", amount: 5600, status: "paid" },
    { id: "BILL-000122", supplier: "Supplier Name", date: "19 Aug 2025", amount: 8900, status: "paid" },
    { id: "BILL-000121", supplier: "Supplier Name", date: "18 Aug 2025", amount: 2450, status: "draft" },
    { id: "BILL-000120", supplier: "Supplier Name", date: "18 Aug 2025", amount: 12300, status: "paid" },
  ];

  return (
    <Box>
      <Box className="vx-search-row">
        <Box className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <Box
            component="input"
            type="text"
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        <Box component="button" type="button" className="vx-filter-btn" aria-label="Filter">
          <Filter size={17} />
        </Box>
      </Box>

      <Box className="vx-filter-tabs">
        {["All", "Draft", "Paid"].map((t) => (
          <Box
            component="button"
            key={t}
            type="button"
            className={`vx-filter-pill ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </Box>
        ))}
      </Box>

      <Box>
        {bills.map((bill) => (
          <Box key={bill.id} className="vx-trans-card">
            <Box className="vx-trans-left">
              <Box component="span" className="vx-trans-id">{bill.id}</Box>
              <Box component="span" className="vx-trans-meta">{bill.supplier}</Box>
              <Box component="span" className="vx-trans-meta text-[10px]">{bill.date}</Box>
            </Box>
            <Box className="vx-trans-right">
              <Box component="span" className="vx-trans-amount">{money(bill.amount)}</Box>
              <Box component="span" className={`vx-pill-badge ${bill.status}`}>{bill.status}</Box>
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        component="button"
        type="button"
        className="vx-fab-btn"
        onClick={onAdd}
        title="Create Purchase Bill"
        aria-label="Create Purchase Bill"
      >
        <Plus size={26} />
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 6: Inventory Summary
// -------------------------------------------------------------
function InventorySummaryScreen({ onSelectProduct }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 4 Summary Cards */}
      <Box className="vx-kpis-grid">
        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Total Products</Box>
          <Box component="span" className="vx-kpi-val">1,245</Box>
        </Box>

        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Low Stock</Box>
          <Box component="span" className="vx-kpi-val text-amber-600">32</Box>
        </Box>

        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Out of Stock</Box>
          <Box component="span" className="vx-kpi-val text-rose-600">8</Box>
        </Box>

        <Box className="vx-kpi-card">
          <Box component="span" className="vx-kpi-label">Total Value</Box>
          <Box component="span" className="vx-kpi-val text-xs sm:text-base">₹ 45,80,000</Box>
        </Box>
      </Box>

      {/* Stock by Category Donut Chart Card */}
      <Box className="vx-card">
        <Typography component="h3" className="vx-card-title" sx={{ mb: 2 }}>Stock by Category</Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 2 }}>
          {/* SVG Donut Chart */}
          <Box sx={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="18" />
              {/* Electronics 40% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="18"
                strokeDasharray="95.5 238.7"
                strokeDashoffset="0"
              />
              {/* Fashion 25% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeDasharray="59.7 238.7"
                strokeDashoffset="-95.5"
              />
              {/* Home & Kitchen 20% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="18"
                strokeDasharray="47.7 238.7"
                strokeDashoffset="-155.2"
              />
              {/* Others 15% */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#6366f1"
                strokeWidth="18"
                strokeDasharray="35.8 238.7"
                strokeDashoffset="-202.9"
              />
            </svg>
          </Box>

          {/* Legend */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, fontSize: 12 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#3b82f6" }} />
              <Box component="span" sx={{ color: "#475569" }}>Electronics</Box>
              <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700, ml: "auto" }}>40%</Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#10b981" }} />
              <Box component="span" sx={{ color: "#475569" }}>Fashion</Box>
              <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700, ml: "auto" }}>25%</Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f59e0b" }} />
              <Box component="span" sx={{ color: "#475569" }}>Home & Kitchen</Box>
              <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700, ml: "auto" }}>20%</Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#6366f1" }} />
              <Box component="span" sx={{ color: "#475569" }}>Others</Box>
              <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700, ml: "auto" }}>15%</Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Featured Item Button */}
      <Box
        component="button"
        type="button"
        onClick={() => onSelectProduct({ name: "Sports Shoes", code: "SP001", price: 1999, cost: 1250, stock: 120, minStock: 20, hsn: "6404", category: "Footwear" })}
        className="vx-card"
        sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.75, transition: "background-color 0.15s", "&:hover": { bgcolor: "#f8fafc" } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
            👟
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", m: 0 }}>Sports Shoes</Typography>
            <Typography component="p" sx={{ fontSize: 11, color: "#94a3b8", m: 0 }}>SP001 · Footwear</Typography>
          </Box>
        </Box>
        <ChevronRight size={18} style={{ color: "#94a3b8" }} />
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 7: Product Details
// -------------------------------------------------------------
function ProductDetailsScreen({ product, onBack }) {
  const p = product || {
    name: "Sports Shoes",
    code: "SP001",
    price: 1999,
    cost: 1250,
    stock: 120,
    minStock: 20,
    hsn: "6404",
    category: "Footwear",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 6 }}>
      {/* Product Image Card */}
      <Box className="vx-card text-center p-6 flex flex-col items-center">
        <Box sx={{ width: 128, height: 128, borderRadius: "16px", bgcolor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, mb: 1.5, boxShadow: "inset 0 2px 4px 0 rgba(0,0,0,0.06)" }}>
          👟
        </Box>
        <Typography component="h3" sx={{ fontSize: 16, fontWeight: 800, color: "#0f172a", m: 0 }}>{p.name}</Typography>
        <Typography component="p" sx={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", mt: 0.5 }}>{p.code}</Typography>
      </Box>

      {/* Attributes List Card */}
      <Box className="vx-card divide-y divide-slate-100 text-xs">
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Selling Price</Box>
          <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700 }}>{money(p.price)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Cost Price</Box>
          <Box component="strong" sx={{ color: "#0f172a", fontWeight: 700 }}>{money(p.cost)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.25 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Stock</Box>
          <Box component="span" sx={{ fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
            {p.stock} PCS
          </Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Min. Stock Level</Box>
          <Box component="span" sx={{ fontWeight: 500, color: "#1e293b" }}>{p.minStock} PCS</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Box component="span" sx={{ color: "#64748b" }}>HSN Code</Box>
          <Box component="span" sx={{ fontFamily: "monospace", color: "#1e293b" }}>{p.hsn}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.25 }}>
          <Box component="span" sx={{ color: "#64748b" }}>Category</Box>
          <Box component="span" sx={{ fontWeight: 500, color: "#1e293b" }}>{p.category}</Box>
        </Box>
      </Box>

      {/* Bottom CTA Button */}
      <Box
        component="button"
        type="button"
        onClick={onBack}
        sx={{
          width: "100%", py: 1.75, borderRadius: "12px", bgcolor: "#4f46e5", fontSize: 12, fontWeight: 700, color: "#fff",
          boxShadow: "0 10px 15px -3px rgba(99,102,241,0.3)", transition: "all 0.15s",
          "&:hover": { bgcolor: "#4338ca" }, "&:active": { transform: "scale(0.98)" },
        }}
      >
        Edit Product
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 8: Reports Screen
// -------------------------------------------------------------
function ReportsScreen({ onSelectReport }) {
  const reportsList = [
    { title: "Sales Report", sub: "View sales reports", icon: BarChart3, bg: "bg-emerald-500" },
    { title: "Purchase Report", sub: "View purchase reports", icon: ClipboardList, bg: "bg-rose-500" },
    { title: "Stock Report", sub: "View stock reports", icon: BoxIcon, bg: "bg-blue-500" },
    { title: "Profit & Loss", sub: "View profit & loss reports", icon: TrendingUp, bg: "bg-indigo-500" },
    { title: "GST Report", sub: "View GST reports", icon: FileText, bg: "bg-purple-500" },
    { title: "Receivables Report", sub: "View receivables reports", icon: Wallet, bg: "bg-cyan-500" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {reportsList.map((item, i) => {
        const Icon = item.icon;
        return (
          <Box
            key={i}
            className="vx-menu-row"
            onClick={onSelectReport}
          >
            <Box className="vx-menu-row-left">
              <Box className={`vx-menu-icon-box ${item.bg}`}>
                <Icon size={20} />
              </Box>
              <Box className="vx-menu-row-text">
                <Typography component="h4">{item.title}</Typography>
                <Typography component="p">{item.sub}</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#94a3b8" }} />
          </Box>
        );
      })}
    </Box>
  );
}

// -------------------------------------------------------------
// Screen 9: Settings Screen
// -------------------------------------------------------------
function SettingsScreen({ onLogout, onTriggerPwa }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 6 }}>
      <Box>
        <Typography component="small" sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 11, px: 0.5, mb: 1, display: "block" }}>
          General
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box className="vx-menu-row">
            <Box className="vx-menu-row-left">
              <User size={18} style={{ color: "#64748b" }} />
              <Box className="vx-menu-row-text">
                <Typography component="h4">Business Profile</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#94a3b8" }} />
          </Box>

          <Box className="vx-menu-row">
            <Box className="vx-menu-row-left">
              <Users size={18} style={{ color: "#64748b" }} />
              <Box className="vx-menu-row-text">
                <Typography component="h4">Users</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#94a3b8" }} />
          </Box>

          <Box className="vx-menu-row">
            <Box className="vx-menu-row-left">
              <ShieldCheck size={18} style={{ color: "#64748b" }} />
              <Box className="vx-menu-row-text">
                <Typography component="h4">Roles & Permissions</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#94a3b8" }} />
          </Box>

          <Box className="vx-menu-row">
            <Box className="vx-menu-row-left">
              <Settings size={18} style={{ color: "#64748b" }} />
              <Box className="vx-menu-row-text">
                <Typography component="h4">Preferences</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#94a3b8" }} />
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography component="small" sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 11, px: 0.5, mb: 1, display: "block" }}>
          Other
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box className="vx-menu-row">
            <Box className="vx-menu-row-left">
              <RefreshCw size={18} style={{ color: "#64748b" }} />
              <Box className="vx-menu-row-text">
                <Typography component="h4">Backup & Restore</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#94a3b8" }} />
          </Box>

          <Box className="vx-menu-row" onClick={onTriggerPwa}>
            <Box className="vx-menu-row-left">
              <Smartphone size={18} style={{ color: "#4f46e5" }} />
              <Box className="vx-menu-row-text">
                <Typography component="h4" sx={{ color: "#4f46e5", fontWeight: 700 }}>PWA / Mobile App Settings</Typography>
                <Typography component="p">Install or configure home screen app</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#6366f1" }} />
          </Box>

          <Box className="vx-menu-row">
            <Box className="vx-menu-row-left">
              <Sparkles size={18} style={{ color: "#64748b" }} />
              <Box className="vx-menu-row-text">
                <Typography component="h4">About Vynerix ERP</Typography>
                <Typography component="p">v2.4.0 (Enterprise PWA)</Typography>
              </Box>
            </Box>
            <ChevronRight size={18} style={{ color: "#94a3b8" }} />
          </Box>
        </Box>
      </Box>

      {/* Logout Button */}
      <Box
        component="button"
        type="button"
        onClick={onLogout}
        sx={{
          width: "100%", py: 1.5, borderRadius: "12px", border: "1px solid #fecdd3", bgcolor: "#fff1f2", color: "#e11d48",
          fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
          transition: "all 0.15s", "&:hover": { bgcolor: "#ffe4e6" }, "&:active": { transform: "scale(0.98)" },
        }}
      >
        <LogOut size={16} /> Logout
      </Box>
    </Box>
  );
}
