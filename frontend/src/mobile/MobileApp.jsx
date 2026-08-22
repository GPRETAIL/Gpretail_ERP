import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  BarChart3,
  Bell,
  Box,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Home,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import "./mobile.css";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "sales", label: "Sales", icon: ShoppingCart },
  { key: "purchase", label: "Purchase", icon: ClipboardList },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "more", label: "More", icon: MoreHorizontal },
];

const modules = [
  ["sales", "Sales", ShoppingCart],
  ["purchase", "Purchase", ClipboardList],
  ["inventory", "Inventory", Box],
  ["products", "Products", Package],
  ["customers", "Customers", Users],
  ["suppliers", "Suppliers", Store],
  ["expenses", "Expenses", Wallet],
  ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
];

const salesRows = [
  ["INV-000123", "Customer Name", "₹ 8,450", "Paid"],
  ["INV-000122", "Customer Name", "₹ 12,850", "Sent"],
  ["INV-000121", "Customer Name", "₹ 5,240", "Draft"],
  ["INV-000120", "Customer Name", "₹ 15,600", "Paid"],
];

const purchaseRows = [
  ["BILL-000123", "Supplier Name", "₹ 5,600", "Paid"],
  ["BILL-000122", "Supplier Name", "₹ 8,900", "Paid"],
  ["BILL-000121", "Supplier Name", "₹ 2,450", "Draft"],
  ["BILL-000120", "Supplier Name", "₹ 12,300", "Paid"],
];

const inventoryCards = [
  ["Total Products", "1,245", ""],
  ["Low Stock", "32", "danger"],
  ["Out of Stock", "8", "danger"],
  ["Total Value", "₹ 45,80,000", ""],
];

const reports = [
  ["Sales Report", "View sales reports", FileBarChart, "green"],
  ["Purchase Report", "View purchase reports", ClipboardList, "rose"],
  ["Stock Report", "View stock reports", Package, "blue"],
  ["Profit & Loss", "View profit & loss", BarChart3, "violet"],
  ["GST Report", "View GST reports", FileBarChart, "indigo"],
  ["Receivables Report", "View receivables", Wallet, "cyan"],
];

const pageTitles = {
  dashboard: "Dashboard",
  sales: "Sales Invoices",
  purchase: "Purchase Bills",
  inventory: "Inventory Summary",
  products: "Product Details",
  customers: "Customers",
  suppliers: "Suppliers",
  expenses: "Expenses",
  reports: "Reports",
  settings: "Settings",
};

function formatNow() {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
}

export default function MobileApp() {
  const authUser = useSelector((state) => state.auth.user);
  const [page, setPage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);

  const userName = authUser?.name || authUser?.username || "Admin";
  const role = authUser?.role || "Super Admin";

  useMemo(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const navigate = (target) => {
    setPage(target);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  const currentTitle = pageTitles[page] || "Vynerix ERP";

  return (
    <div className="vx-mobile-app">
      <header className="vx-mobile-topbar">
        <button className="vx-icon-btn vx-mobile-only" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="vx-brand-lockup">
          <div className="vx-brand-mark">V</div>
          <span>Vynerix ERP</span>
        </div>
        <div className="vx-topbar-spacer" />
        <button className="vx-icon-btn" aria-label="Notifications"><Bell size={19} /></button>
        <div className="vx-avatar">{userName.charAt(0).toUpperCase()}</div>
        <div className="vx-user-meta vx-desktop-only"><strong>{userName}</strong><span>{role}</span></div>
      </header>

      <div className="vx-app-body">
        <aside className={`vx-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
          <div className="vx-sidebar-head">
            <div>
              <small>Workspace</small>
              <strong>GP Retails</strong>
            </div>
            <button className="vx-icon-btn vx-mobile-only" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
          </div>
          <nav className="vx-side-nav">
            {navItems.map(([item]) => null)}
            {modules.map(([key, label, Icon]) => (
              <button key={key} className={`vx-side-link ${page === key ? "active" : ""}`} onClick={() => navigate(key)}>
                <Icon size={18} /><span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="vx-install-card">
            <Sparkles size={18} />
            <div><strong>Install Vynerix ERP</strong><span>Use it like a mobile app</span></div>
            {installEvent && <button onClick={install}>Install</button>}
          </div>
        </aside>

        <main className="vx-main">
          <div className="vx-mobile-pagebar">
            {page !== "dashboard" && <button className="vx-icon-btn" onClick={() => navigate("dashboard")} aria-label="Back"><ChevronLeft size={18} /></button>}
            <div><small>{formatNow()}</small><h1>{currentTitle}</h1></div>
            {page !== "dashboard" && <button className="vx-icon-btn" onClick={() => setPage("dashboard")} aria-label="Dashboard"><Home size={18} /></button>}
          </div>

          {page === "dashboard" && <Dashboard userName={userName} onNavigate={navigate} />}
          {page === "sales" && <ListPage title="Sales Invoices" rows={salesRows} cta="Create Invoice" onCreate={() => setShowCreateInvoice(true)} />}
          {page === "purchase" && <ListPage title="Purchase Bills" rows={purchaseRows} cta="New Purchase" onCreate={() => navigate("purchase") } />}
          {page === "inventory" && <InventoryPage />}
          {page === "products" && <ProductPage />}
          {page === "customers" && <SimplePage title="Customers" icon={Users} description="Customers, balances, loyalty and contact history." />}
          {page === "suppliers" && <SimplePage title="Suppliers" icon={Store} description="Suppliers, GSTIN, purchase history and payables." />}
          {page === "expenses" && <SimplePage title="Expenses" icon={Wallet} description="Petty cash and business expense tracking." />}
          {page === "reports" && <ReportsPage />}
          {page === "settings" && <SettingsPage />}
        </main>
      </div>

      <nav className="vx-bottom-nav">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button key={key} className={page === key || (key === "more" && ["products", "customers", "suppliers", "expenses", "reports", "settings"].includes(page)) ? "active" : ""} onClick={() => key === "more" ? setMobileMenuOpen(true) : navigate(key)}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {showCreateInvoice && <CreateInvoice onClose={() => setShowCreateInvoice(false)} />}
    </div>
  );
}

function Dashboard({ userName, onNavigate }) {
  return (
    <div className="vx-page-grid">
      <section className="vx-hero-card">
        <div><small>Good morning</small><h2>Hello, {userName}</h2><p>Everything you need for today's business.</p></div>
        <div className="vx-date-pill">19 Aug · 19 Aug 2025 <ChevronRight size={14} /></div>
      </section>
      <section className="vx-kpi-grid">
        <Kpi label="Sales Today" value="₹ 28,450" trend="+12.9%" tone="green" />
        <Kpi label="Purchase Today" value="₹ 18,750" trend="-4.3%" tone="red" />
        <Kpi label="Receivables" value="₹ 1,25,000" trend="" tone="indigo" />
        <Kpi label="Payables" value="₹ 75,400" trend="" tone="violet" />
      </section>
      <section className="vx-card vx-chart-card">
        <div className="vx-section-head"><div><h3>Sales Overview</h3><span>This week</span></div><button className="vx-filter-btn">This Week <ChevronRight size={14} /></button></div>
        <div className="vx-chart"><div className="vx-axis"><span>30K</span><span>20K</span><span>10K</span><span>0</span></div><svg viewBox="0 0 520 180" role="img" aria-label="Sales overview"><polyline points="20,140 90,115 160,120 230,75 300,95 370,85 450,35" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><line x1="0" y1="160" x2="510" y2="160" stroke="currentColor" opacity=".15" /><g fill="currentColor"><circle cx="20" cy="140" r="5"/><circle cx="90" cy="115" r="5"/><circle cx="160" cy="120" r="5"/><circle cx="230" cy="75" r="5"/><circle cx="300" cy="95" r="5"/><circle cx="370" cy="85" r="5"/><circle cx="450" cy="35" r="5"/></g></svg></div>
      </section>
      <section><div className="vx-section-title"><h3>Quick Modules</h3><button onClick={() => onNavigate("more")}>View all</button></div><div className="vx-module-grid">{modules.slice(0, 6).map(([key, label, Icon]) => <button key={key} className="vx-module-card" onClick={() => onNavigate(key)}><span className="vx-module-icon"><Icon size={22} /></span><strong>{label}</strong></button>)}</div></section>
      <section className="vx-card"><div className="vx-section-head"><div><h3>Recent Activities</h3><span>Latest transactions</span></div></div><div className="vx-activity-list"><Activity title="Sales Invoice INV-000123" amount="₹ 8,450" meta="19 Aug 2025" /><Activity title="Purchase Bill BILL-000123" amount="₹ 5,600" meta="19 Aug 2025" /><Activity title="Payment Received" amount="₹ 10,000" meta="19 Aug 2025" /></div></section>
    </div>
  );
}

function Kpi({ label, value, trend, tone }) {
  return <div className={`vx-kpi vx-${tone}`}><span>{label}</span><strong>{value}</strong>{trend && <small>{trend}</small>}</div>;
}

function Activity({ title, amount, meta }) {
  return <div className="vx-activity"><div><strong>{title}</strong><span>{meta}</span></div><strong>{amount}</strong></div>;
}

function ListPage({ title, rows, cta, onCreate }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="vx-page-grid"><section className="vx-card"><div className="vx-toolbar"><div className="vx-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} /></div><button className="vx-filter-btn">Filter</button></div><div className="vx-tabs"><button className="active">All</button><button>Draft</button><button>Sent</button><button>Paid</button></div><div className="vx-list">{filtered.map(([no, party, amount, status]) => <div className="vx-list-row" key={no}><div><strong>{no}</strong><span>{party}</span><small>19 Aug 2025</small></div><div className="vx-row-right"><strong>{amount}</strong><span className={`vx-status ${status.toLowerCase()}`}>{status}</span></div></div>)}</div></section><button className="vx-fab" onClick={onCreate} aria-label={cta}><Plus size={23} /></button></div>;
}

function InventoryPage() {
  return <div className="vx-page-grid"><section className="vx-kpi-grid inventory">{inventoryCards.map(([label, value, tone]) => <div key={label} className={`vx-kpi vx-card ${tone ? `vx-${tone}` : ""}`}><span>{label}</span><strong>{value}</strong></div>)}</section><section className="vx-card"><div className="vx-section-head"><div><h3>Stock by Category</h3><span>Current inventory value</span></div></div><div className="vx-donut"><div className="vx-donut-ring"><div className="vx-donut-hole">1,245<small>Products</small></div></div><div className="vx-legend"><span><i /> Electronics <b>40%</b></span><span><i /> Fashion <b>25%</b></span><span><i /> Home & Kitchen <b>20%</b></span><span><i /> Others <b>15%</b></span></div></div></section></div>;
}

function ProductPage() {
  return <div className="vx-page-grid"><section className="vx-card vx-product-card"><div className="vx-product-image">👟</div><div><small>SP001</small><h2>Sports Shoes</h2><div className="vx-detail-grid"><Field label="Selling Price" value="₹ 1,999.00" /><Field label="Cost Price" value="₹ 1,250.00" /><Field label="Stock" value="120 PCS" /><Field label="Min. Stock Level" value="20 PCS" /><Field label="HSN Code" value="6404" /><Field label="Category" value="Footwear" /></div><button className="vx-primary-btn">Edit Product</button></div></section></div>;
}

function ReportsPage() {
  return <div className="vx-page-grid"><section className="vx-list-card">{reports.map(([title, desc, Icon, tone]) => <button className="vx-report-row" key={title}><span className={`vx-report-icon ${tone}`}><Icon size={20} /></span><span><strong>{title}</strong><small>{desc}</small></span><ChevronRight size={18} /></button>)}</section></div>;
}

function SettingsPage() {
  const settings = ["Business Profile", "Users", "Roles & Permissions", "Preferences", "Backup & Restore", "PWA Settings", "About Vynerix ERP"];
  return <div className="vx-page-grid"><section className="vx-list-card">{settings.map((name) => <button className="vx-report-row" key={name}><span className="vx-setting-icon"><Settings size={18} /></span><span><strong>{name}</strong><small>Manage {name.toLowerCase()}</small></span><ChevronRight size={18} /></button>)}<button className="vx-report-row danger"><span className="vx-setting-icon"><X size={18} /></span><span><strong>Logout</strong><small>Sign out of this device</small></span></button></section></div>;
}

function SimplePage({ title, icon: Icon, description }) { return <div className="vx-page-grid"><section className="vx-empty-state vx-card"><div className="vx-empty-icon"><Icon size={28} /></div><h2>{title}</h2><p>{description}</p><button className="vx-primary-btn">Open {title}</button></section></div>; }

function Field({ label, value }) { return <div><small>{label}</small><strong>{value}</strong></div>; }

function CreateInvoice({ onClose }) {
  const [saved, setSaved] = useState(false);
  return <div className="vx-modal-backdrop" role="dialog" aria-modal="true"><section className="vx-modal"><header><button className="vx-icon-btn" onClick={onClose}><ChevronLeft size={18} /></button><div><small>Sales</small><h2>Create Invoice</h2></div><button className="vx-icon-btn" onClick={onClose}><X size={18} /></button></header><div className="vx-form"><label>Customer<select><option>Select Customer</option><option>Customer Name</option></select></label><div className="vx-form-grid"><label>Invoice Number<input defaultValue="INV-000124" /></label><label>Invoice Date<input type="date" defaultValue="2025-08-19" /></label><label>Due Date<input type="date" defaultValue="2025-09-02" /></label></div><div className="vx-form-section"><div className="vx-section-title"><h3>Items</h3><button><Plus size={14} /> Add Item</button></div><div className="vx-inline-item"><div><strong>Product Name</strong><small>HSN: 1234 · 2 PCS × ₹ 500.00</small></div><strong>₹ 1,000.00</strong></div></div><div className="vx-totals"><span>Subtotal <b>₹ 1,000.00</b></span><span>CGST (9%) <b>₹ 90.00</b></span><span>SGST (9%) <b>₹ 90.00</b></span><strong>Total <b>₹ 1,180.00</b></strong></div></div><footer><button className="vx-secondary-btn" onClick={() => setSaved(true)}>{saved ? "Saved" : "Save Draft"}</button><button className="vx-primary-btn" onClick={onClose}>Save & Send</button></footer></section></div>;
}
