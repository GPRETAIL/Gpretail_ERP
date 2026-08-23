import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
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
    <div className="vx-workspace">
      {/* 1. Splash Screen on Launch */}
      {splashVisible && (
        <div className="vx-splash">
          <div className="vx-splash-logo-box">
            <svg viewBox="0 0 100 100" className="w-12 h-12 fill-white">
              <path d="M20 20 L40 20 L50 65 L60 20 L80 20 L58 85 L42 85 Z" />
            </svg>
          </div>
          <h1 className="vx-splash-title">Vynerix</h1>
          <h2 className="vx-splash-title -mt-2">ERP</h2>
          <p className="vx-splash-sub">Smart. Secure. Simplified.</p>
          <div className="vx-splash-bar-wrap">
            <div className="vx-splash-bar" />
          </div>
        </div>
      )}

      {/* 2. Top Header Bar */}
      <header className="vx-ws-topbar">
        {page === "dashboard" || page === "modules" ? (
          <button
            type="button"
            className="vx-ws-icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        ) : (
          <button
            type="button"
            className="vx-ws-icon"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="vx-page-title-center flex-1 text-center font-bold text-base text-slate-900">
          {getHeaderTitle()}
        </div>

        <button
          type="button"
          className="vx-ws-icon relative"
          onClick={triggerInstall}
          title="Install Mobile App"
          aria-label="Install App"
        >
          <Bell size={19} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600" />
        </button>
      </header>

      {/* 3. Main Workspace Shell */}
      <div className="vx-ws-shell">
        {/* Mobile Slide-over Drawer / Desktop Sidebar */}
        <aside className={`vx-ws-sidebar ${menuOpen ? "open" : ""}`}>
          <div className="vx-ws-space">
            <div>
              <small className="text-slate-400 text-xs font-semibold">Workspace</small>
              <h3 className="text-slate-900 font-extrabold text-base m-0">Vynerix ERP</h3>
            </div>
            <button
              type="button"
              className="vx-ws-icon mobile-only"
              onClick={() => setMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav>
            <button
              type="button"
              className={page === "dashboard" ? "active" : ""}
              onClick={() => navigateTo("dashboard")}
            >
              <Home size={18} /> Dashboard
            </button>
            <button
              type="button"
              className={page === "modules" ? "active" : ""}
              onClick={() => navigateTo("modules")}
            >
              <Layers size={18} /> All Modules
            </button>
            <button
              type="button"
              className={page === "sales" ? "active" : ""}
              onClick={() => navigateTo("sales")}
            >
              <ShoppingCart size={18} /> Sales
            </button>
            <button
              type="button"
              className={page === "purchase" ? "active" : ""}
              onClick={() => navigateTo("purchase")}
            >
              <ClipboardList size={18} /> Purchase
            </button>
            <button
              type="button"
              className={page === "inventory" ? "active" : ""}
              onClick={() => navigateTo("inventory")}
            >
              <Box size={18} /> Inventory
            </button>
            <button
              type="button"
              className={page === "reports" ? "active" : ""}
              onClick={() => navigateTo("reports")}
            >
              <BarChart3 size={18} /> Reports
            </button>
            <button
              type="button"
              className={page === "settings" ? "active" : ""}
              onClick={() => navigateTo("settings")}
            >
              <Settings size={18} /> Settings
            </button>

            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
            <button
              type="button"
              className="text-indigo-600 font-bold"
              onClick={triggerInstall}
            >
              <Download size={18} /> Install Mobile App
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
            >
              <Home size={16} /> Desktop View
            </a>
          </nav>
        </aside>

        {/* 4. Active Screen Router */}
        <main className="vx-ws-main">
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
        </main>
      </div>

      {/* 5. Mobile Bottom Tab Navigation */}
      <nav className="vx-bottom">
        <button
          type="button"
          className={page === "dashboard" ? "active" : ""}
          onClick={() => navigateTo("dashboard")}
        >
          <Home size={20} />
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          className={page === "sales" || page === "create_invoice" ? "active" : ""}
          onClick={() => navigateTo("sales")}
        >
          <ShoppingCart size={20} />
          <span>Sales</span>
        </button>
        <button
          type="button"
          className={page === "purchase" ? "active" : ""}
          onClick={() => navigateTo("purchase")}
        >
          <ClipboardList size={20} />
          <span>Purchase</span>
        </button>
        <button
          type="button"
          className={page === "inventory" || page === "product_details" ? "active" : ""}
          onClick={() => navigateTo("inventory")}
        >
          <Package size={20} />
          <span>Inventory</span>
        </button>
        <button
          type="button"
          className={page === "modules" || page === "reports" || page === "settings" ? "active" : ""}
          onClick={() => navigateTo("modules")}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Transaction Modal fallback */}
      {modal && (
        <EnterpriseTransactionModal
          type={modal.type}
          record={modal.record}
          onClose={() => setModal(null)}
          onSaved={() => loadData()}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Screen 1: Dashboard
// -------------------------------------------------------------
function DashboardScreen({ userName, data, onNavigate }) {
  return (
    <div className="space-y-4">
      {/* Hello User Greeting */}
      <div className="vx-user-greeting">
        <div className="vx-greeting-left">
          <div className="vx-greeting-avatar">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="vx-greeting-text">
            <h2>Hello, {userName}</h2>
            <p>Super Admin</p>
          </div>
        </div>
      </div>

      {/* Date Pill Selector */}
      <div>
        <div className="vx-date-pill">
          <span>📅</span>
          <span>19 Aug - 19 Aug 2025</span>
          <span className="text-slate-400 text-xs">▼</span>
        </div>
      </div>

      {/* 2x2 KPI Cards */}
      <div className="vx-kpis-grid">
        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Sales Today</span>
          <span className="vx-kpi-val">₹ 28,450</span>
          <span className="vx-kpi-badge positive">
            <TrendingUp size={13} /> +12.5%
          </span>
        </div>

        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Purchase Today</span>
          <span className="vx-kpi-val">₹ 18,750</span>
          <span className="vx-kpi-badge negative">
            <TrendingDown size={13} /> -4.3%
          </span>
        </div>

        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Receivables</span>
          <span className="vx-kpi-val">₹ 1,25,000</span>
          <span className="vx-kpi-badge info">
            <TrendingUp size={13} /> Active
          </span>
        </div>

        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Payables</span>
          <span className="vx-kpi-val">₹ 75,400</span>
          <span className="vx-kpi-badge purple">
            <TrendingDown size={13} /> Due
          </span>
        </div>
      </div>

      {/* Sales Overview Chart Card */}
      <div className="vx-card">
        <div className="vx-card-header">
          <h3 className="vx-card-title">Sales Overview</h3>
          <select className="vx-select-sm" defaultValue="week">
            <option value="week">This Week ▾</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* SVG Sparkline / Line Chart */}
        <div className="vx-chart-box">
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
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Screen 2: Modules Grid & Recent Activity
// -------------------------------------------------------------
function ModulesScreen({ onNavigate }) {
  const moduleTiles = [
    { key: "sales", name: "Sales", icon: ShoppingCart, bg: "bg-indigo-600" },
    { key: "purchase", name: "Purchase", icon: ClipboardList, bg: "bg-sky-500" },
    { key: "inventory", name: "Inventory", icon: Box, bg: "bg-amber-500" },
    { key: "inventory", name: "Products", icon: Package, bg: "bg-emerald-500" },
    { key: "dashboard", name: "Customers", icon: Users, bg: "bg-blue-500" },
    { key: "dashboard", name: "Suppliers", icon: Store, bg: "bg-cyan-600" },
    { key: "dashboard", name: "Expenses", icon: Wallet, bg: "bg-orange-500" },
    { key: "reports", name: "Reports", icon: BarChart3, bg: "bg-slate-600" },
    { key: "settings", name: "Settings", icon: Settings, bg: "bg-slate-500" },
  ];

  return (
    <div className="space-y-4">
      {/* 3x3 Grid */}
      <div className="vx-modules-grid">
        {moduleTiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <button
              key={i}
              type="button"
              className="vx-module-tile"
              onClick={() => onNavigate(tile.key)}
            >
              <div className={`vx-module-icon-box ${tile.bg}`}>
                <Icon size={22} />
              </div>
              <span className="vx-module-name">{tile.name}</span>
            </button>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="vx-card">
        <h3 className="vx-card-title mb-3">Recent Activities</h3>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between py-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 m-0">Sales Invoice INV-000123</h4>
              <p className="text-[11px] text-slate-400 m-0">19 Aug 2025</p>
            </div>
            <strong className="text-xs font-extrabold text-slate-900">₹ 8,450</strong>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 m-0">Purchase Bill BILL-000123</h4>
              <p className="text-[11px] text-slate-400 m-0">19 Aug 2025</p>
            </div>
            <strong className="text-xs font-extrabold text-slate-900">₹ 5,600</strong>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 m-0">Payment Received</h4>
              <p className="text-[11px] text-slate-400 m-0">18 Aug 2025</p>
            </div>
            <strong className="text-xs font-extrabold text-slate-900">₹ 10,000</strong>
          </div>
        </div>
      </div>
    </div>
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
    <div>
      {/* Search & Filter */}
      <div className="vx-search-row">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="vx-filter-btn" aria-label="Filter">
          <Filter size={17} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="vx-filter-tabs">
        {["All", "Draft", "Sent", "Paid"].map((t) => (
          <button
            key={t}
            type="button"
            className={`vx-filter-pill ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      <div>
        {filtered.map((inv) => (
          <div key={inv.id} className="vx-trans-card">
            <div className="vx-trans-left">
              <span className="vx-trans-id">{inv.id}</span>
              <span className="vx-trans-meta">{inv.customer}</span>
              <span className="vx-trans-meta text-[10px]">{inv.date}</span>
            </div>
            <div className="vx-trans-right">
              <span className="vx-trans-amount">{money(inv.amount)}</span>
              <span className={`vx-pill-badge ${inv.status}`}>{inv.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button (+) */}
      <button
        type="button"
        className="vx-fab-btn"
        onClick={onAdd}
        title="Create Invoice"
        aria-label="Create Invoice"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// Screen 4: Create Invoice Form
// -------------------------------------------------------------
function CreateInvoiceScreen({ onBack }) {
  return (
    <div className="space-y-4 pb-12">
      {/* Customer Selection */}
      <div className="vx-card">
        <label className="text-xs font-semibold text-slate-700 block mb-1">Customer</label>
        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none font-medium">
          <option>Select Customer ▾</option>
          <option>Walking Customer</option>
          <option>Sri Balaji Textiles</option>
        </select>
      </div>

      {/* Invoice Details */}
      <div className="vx-card space-y-2.5">
        <h4 className="text-xs font-bold text-slate-900 m-0">Invoice Details</h4>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Invoice Number</span>
          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded">INV-000124</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Invoice Date</span>
          <span className="font-medium text-slate-800">19 Aug 2025</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Due Date</span>
          <span className="font-medium text-slate-800">02 Sep 2025</span>
        </div>
      </div>

      {/* Items Section */}
      <div className="vx-card">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-900 m-0">Items</h4>
          <button type="button" className="text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs mb-3">
          <div>
            <span className="font-bold text-slate-900 block">1. Product Name</span>
            <small className="text-slate-400">HSN: 1234 · 2 PCS x ₹ 500.00</small>
          </div>
          <strong className="text-slate-900 font-extrabold">₹ 1,000.00</strong>
        </div>

        {/* Totals Summary */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>₹ 1,000.00</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>CGST (9%)</span>
            <span>₹ 90.00</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>SGST (9%)</span>
            <span>₹ 90.00</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
            <span>Total</span>
            <span>₹ 1,180.00</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 active:scale-98 transition-all"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-98 transition-all"
        >
          Save & Send
        </button>
      </div>
    </div>
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
    <div>
      <div className="vx-search-row">
        <div className="vx-search-input-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="vx-filter-btn" aria-label="Filter">
          <Filter size={17} />
        </button>
      </div>

      <div className="vx-filter-tabs">
        {["All", "Draft", "Paid"].map((t) => (
          <button
            key={t}
            type="button"
            className={`vx-filter-pill ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {bills.map((bill) => (
          <div key={bill.id} className="vx-trans-card">
            <div className="vx-trans-left">
              <span className="vx-trans-id">{bill.id}</span>
              <span className="vx-trans-meta">{bill.supplier}</span>
              <span className="vx-trans-meta text-[10px]">{bill.date}</span>
            </div>
            <div className="vx-trans-right">
              <span className="vx-trans-amount">{money(bill.amount)}</span>
              <span className={`vx-pill-badge ${bill.status}`}>{bill.status}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="vx-fab-btn"
        onClick={onAdd}
        title="Create Purchase Bill"
        aria-label="Create Purchase Bill"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// Screen 6: Inventory Summary
// -------------------------------------------------------------
function InventorySummaryScreen({ onSelectProduct }) {
  return (
    <div className="space-y-4">
      {/* 4 Summary Cards */}
      <div className="vx-kpis-grid">
        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Total Products</span>
          <span className="vx-kpi-val">1,245</span>
        </div>

        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Low Stock</span>
          <span className="vx-kpi-val text-amber-600">32</span>
        </div>

        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Out of Stock</span>
          <span className="vx-kpi-val text-rose-600">8</span>
        </div>

        <div className="vx-kpi-card">
          <span className="vx-kpi-label">Total Value</span>
          <span className="vx-kpi-val text-xs sm:text-base">₹ 45,80,000</span>
        </div>
      </div>

      {/* Stock by Category Donut Chart Card */}
      <div className="vx-card">
        <h3 className="vx-card-title mb-4">Stock by Category</h3>
        <div className="flex items-center justify-around gap-4">
          {/* SVG Donut Chart */}
          <div className="relative w-32 h-32 shrink-0">
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
          </div>

          {/* Legend */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600">Electronics</span>
              <strong className="text-slate-900 font-bold ml-auto">40%</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Fashion</span>
              <strong className="text-slate-900 font-bold ml-auto">25%</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600">Home & Kitchen</span>
              <strong className="text-slate-900 font-bold ml-auto">20%</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-slate-600">Others</span>
              <strong className="text-slate-900 font-bold ml-auto">15%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Item Button */}
      <button
        type="button"
        onClick={() => onSelectProduct({ name: "Sports Shoes", code: "SP001", price: 1999, cost: 1250, stock: 120, minStock: 20, hsn: "6404", category: "Footwear" })}
        className="w-full vx-card flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            👟
          </div>
          <div className="text-left">
            <h4 className="text-xs font-bold text-slate-900 m-0">Sports Shoes</h4>
            <p className="text-[11px] text-slate-400 m-0">SP001 · Footwear</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-400" />
      </button>
    </div>
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
    <div className="space-y-4 pb-12">
      {/* Product Image Card */}
      <div className="vx-card text-center p-6 flex flex-col items-center">
        <div className="w-32 h-32 rounded-2xl bg-slate-100 flex items-center justify-center text-5xl mb-3 shadow-inner">
          👟
        </div>
        <h3 className="text-base font-extrabold text-slate-900 m-0">{p.name}</h3>
        <p className="text-xs text-slate-400 font-mono mt-1">{p.code}</p>
      </div>

      {/* Attributes List Card */}
      <div className="vx-card divide-y divide-slate-100 text-xs">
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">Selling Price</span>
          <strong className="text-slate-900 font-bold">{money(p.price)}</strong>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">Cost Price</span>
          <strong className="text-slate-900 font-bold">{money(p.cost)}</strong>
        </div>
        <div className="flex justify-between py-2.5 items-center">
          <span className="text-slate-500">Stock</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {p.stock} PCS
          </span>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">Min. Stock Level</span>
          <span className="font-medium text-slate-800">{p.minStock} PCS</span>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">HSN Code</span>
          <span className="font-mono text-slate-800">{p.hsn}</span>
        </div>
        <div className="flex justify-between py-2.5">
          <span className="text-slate-500">Category</span>
          <span className="font-medium text-slate-800">{p.category}</span>
        </div>
      </div>

      {/* Bottom CTA Button */}
      <button
        type="button"
        onClick={onBack}
        className="w-full py-3.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-98 transition-all"
      >
        Edit Product
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// Screen 8: Reports Screen
// -------------------------------------------------------------
function ReportsScreen({ onSelectReport }) {
  const reportsList = [
    { title: "Sales Report", sub: "View sales reports", icon: BarChart3, bg: "bg-emerald-500" },
    { title: "Purchase Report", sub: "View purchase reports", icon: ClipboardList, bg: "bg-rose-500" },
    { title: "Stock Report", sub: "View stock reports", icon: Box, bg: "bg-blue-500" },
    { title: "Profit & Loss", sub: "View profit & loss reports", icon: TrendingUp, bg: "bg-indigo-500" },
    { title: "GST Report", sub: "View GST reports", icon: FileText, bg: "bg-purple-500" },
    { title: "Receivables Report", sub: "View receivables reports", icon: Wallet, bg: "bg-cyan-500" },
  ];

  return (
    <div className="space-y-2">
      {reportsList.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="vx-menu-row"
            onClick={onSelectReport}
          >
            <div className="vx-menu-row-left">
              <div className={`vx-menu-icon-box ${item.bg}`}>
                <Icon size={20} />
              </div>
              <div className="vx-menu-row-text">
                <h4>{item.title}</h4>
                <p>{item.sub}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------
// Screen 9: Settings Screen
// -------------------------------------------------------------
function SettingsScreen({ onLogout, onTriggerPwa }) {
  return (
    <div className="space-y-4 pb-12">
      <div>
        <small className="text-slate-400 font-bold uppercase text-[11px] px-1 mb-2 block">
          General
        </small>
        <div className="space-y-2">
          <div className="vx-menu-row">
            <div className="vx-menu-row-left">
              <User size={18} className="text-slate-500" />
              <div className="vx-menu-row-text">
                <h4>Business Profile</h4>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>

          <div className="vx-menu-row">
            <div className="vx-menu-row-left">
              <Users size={18} className="text-slate-500" />
              <div className="vx-menu-row-text">
                <h4>Users</h4>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>

          <div className="vx-menu-row">
            <div className="vx-menu-row-left">
              <ShieldCheck size={18} className="text-slate-500" />
              <div className="vx-menu-row-text">
                <h4>Roles & Permissions</h4>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>

          <div className="vx-menu-row">
            <div className="vx-menu-row-left">
              <Settings size={18} className="text-slate-500" />
              <div className="vx-menu-row-text">
                <h4>Preferences</h4>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>
        </div>
      </div>

      <div>
        <small className="text-slate-400 font-bold uppercase text-[11px] px-1 mb-2 block">
          Other
        </small>
        <div className="space-y-2">
          <div className="vx-menu-row">
            <div className="vx-menu-row-left">
              <RefreshCw size={18} className="text-slate-500" />
              <div className="vx-menu-row-text">
                <h4>Backup & Restore</h4>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>

          <div className="vx-menu-row" onClick={onTriggerPwa}>
            <div className="vx-menu-row-left">
              <Smartphone size={18} className="text-indigo-600" />
              <div className="vx-menu-row-text">
                <h4 className="text-indigo-600 font-bold">PWA / Mobile App Settings</h4>
                <p>Install or configure home screen app</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-indigo-500" />
          </div>

          <div className="vx-menu-row">
            <div className="vx-menu-row-left">
              <Sparkles size={18} className="text-slate-500" />
              <div className="vx-menu-row-text">
                <h4>About Vynerix ERP</h4>
                <p>v2.4.0 (Enterprise PWA)</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 active:scale-98 transition-all"
      >
        <LogOut size={16} /> Logout
      </button>
    </div>
  );
}
