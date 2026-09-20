import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BarChart3, Bell, Box as BoxIcon, ChevronLeft, ChevronRight, ClipboardList, FileBarChart, Home, Menu, MoreHorizontal, Package, Plus, Search, Settings, ShoppingCart, Sparkles, Store, Users, Wallet, X } from "lucide-react";
import { Box, Typography } from "@mui/material";
import "./mobile.css";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "sales", label: "Sales", icon: ShoppingCart },
  { key: "purchase", label: "Purchase", icon: ClipboardList },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "more", label: "More", icon: MoreHorizontal },
];
const modules = [
  ["sales", "Sales", ShoppingCart], ["purchase", "Purchase", ClipboardList], ["inventory", "Inventory", BoxIcon],
  ["products", "Products", Package], ["customers", "Customers", Users], ["suppliers", "Suppliers", Store],
  ["expenses", "Expenses", Wallet], ["reports", "Reports", BarChart3], ["settings", "Settings", Settings],
];
const salesRows = [["INV-000123", "Customer Name", "₹ 8,450", "Paid"], ["INV-000122", "Customer Name", "₹ 12,850", "Sent"], ["INV-000121", "Customer Name", "₹ 5,240", "Draft"], ["INV-000120", "Customer Name", "₹ 15,600", "Paid"]];
const purchaseRows = [["BILL-000123", "Supplier Name", "₹ 5,600", "Paid"], ["BILL-000122", "Supplier Name", "₹ 8,900", "Paid"], ["BILL-000121", "Supplier Name", "₹ 2,450", "Draft"], ["BILL-000120", "Supplier Name", "₹ 12,300", "Paid"]];
const inventoryCards = [["Total Products", "1,245", ""], ["Low Stock", "32", "danger"], ["Out of Stock", "8", "danger"], ["Total Value", "₹ 45,80,000", ""]];
const reports = [["Sales Report", "View sales reports", FileBarChart, "green"], ["Purchase Report", "View purchase reports", ClipboardList, "rose"], ["Stock Report", "View stock reports", Package, "blue"], ["Profit & Loss", "View profit & loss", BarChart3, "violet"], ["GST Report", "View GST reports", FileBarChart, "indigo"], ["Receivables Report", "View receivables", Wallet, "cyan"]];
const pageTitles = { dashboard: "Dashboard", sales: "Sales Invoices", purchase: "Purchase Bills", inventory: "Inventory Summary", products: "Product Details", customers: "Customers", suppliers: "Suppliers", expenses: "Expenses", reports: "Reports", settings: "Settings" };

function formatNow() { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()); }

export default function MobileApp() {
  const authUser = useSelector((state) => state.auth.user);
  const [page, setPage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const userName = authUser?.name || authUser?.username || "Admin";
  const role = authUser?.role || "Super Admin";

  useEffect(() => {
    const handler = (event) => { event.preventDefault(); setInstallEvent(event); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const navigate = (target) => {
    if (target === "more") { setMobileMenuOpen(true); return; }
    setPage(target); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const install = async () => { if (!installEvent) return; await installEvent.prompt(); setInstallEvent(null); };
  const currentTitle = pageTitles[page] || "Vynerix ERP";

  return <Box className="vx-mobile-app">
    <Box component="header" className="vx-mobile-topbar">
      <Box component="button" className="vx-icon-btn vx-mobile-only" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></Box>
      <Box className="vx-brand-lockup"><Box className="vx-brand-mark">V</Box><Box component="span">Vynerix ERP</Box></Box><Box className="vx-topbar-spacer" />
      <Box component="button" className="vx-icon-btn" aria-label="Notifications"><Bell size={19} /></Box><Box className="vx-avatar">{userName.charAt(0).toUpperCase()}</Box>
      <Box className="vx-user-meta vx-desktop-only"><Box component="strong">{userName}</Box><Box component="span">{role}</Box></Box>
    </Box>
    <Box className="vx-app-body">
      <Box component="aside" className={`vx-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <Box className="vx-sidebar-head"><Box><Box component="small">Workspace</Box><Box component="strong">Vynerix</Box></Box><Box component="button" className="vx-icon-btn vx-mobile-only" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={20} /></Box></Box>
        <Box component="nav" className="vx-side-nav">{modules.map(([key, label, Icon]) => <Box component="button" key={key} className={`vx-side-link ${page === key ? "active" : ""}`} onClick={() => navigate(key)}><Icon size={18} /><Box component="span">{label}</Box></Box>)}</Box>
        <Box className="vx-install-card"><Sparkles size={18} /><Box><Box component="strong">Install Vynerix ERP</Box><Box component="span">Use it like a mobile app</Box></Box>{installEvent && <Box component="button" onClick={install}>Install</Box>}</Box>
      </Box>
      <Box component="main" className="vx-main">
        <Box className="vx-mobile-pagebar">{page !== "dashboard" && <Box component="button" className="vx-icon-btn" onClick={() => navigate("dashboard")} aria-label="Back"><ChevronLeft size={18} /></Box>}<Box><Box component="small">{formatNow()}</Box><Typography component="h1">{currentTitle}</Typography></Box>{page !== "dashboard" && <Box component="button" className="vx-icon-btn" onClick={() => navigate("dashboard")} aria-label="Dashboard"><Home size={18} /></Box>}</Box>
        {page === "dashboard" && <Dashboard userName={userName} onNavigate={navigate} />}
        {page === "sales" && <ListPage title="Sales Invoices" rows={salesRows} cta="Create Invoice" onCreate={() => setShowCreateInvoice(true)} />}
        {page === "purchase" && <ListPage title="Purchase Bills" rows={purchaseRows} cta="New Purchase" onCreate={() => navigate("purchase")} />}
        {page === "inventory" && <InventoryPage />}{page === "products" && <ProductPage />}
        {page === "customers" && <SimplePage title="Customers" icon={Users} description="Customers, balances, loyalty and contact history." />}
        {page === "suppliers" && <SimplePage title="Suppliers" icon={Store} description="Suppliers, GSTIN, purchase history and payables." />}
        {page === "expenses" && <SimplePage title="Expenses" icon={Wallet} description="Petty cash and business expense tracking." />}
        {page === "reports" && <ReportsPage />}{page === "settings" && <SettingsPage />}
      </Box>
    </Box>
    <Box component="nav" className="vx-bottom-nav">{navItems.map(({ key, label, icon: Icon }) => <Box component="button" key={key} className={page === key || (key === "more" && ["products", "customers", "suppliers", "expenses", "reports", "settings"].includes(page)) ? "active" : ""} onClick={() => key === "more" ? setMobileMenuOpen(true) : navigate(key)}><Icon size={19} /><Box component="span">{label}</Box></Box>)}</Box>
    {showCreateInvoice && <CreateInvoice onClose={() => setShowCreateInvoice(false)} />}
  </Box>;
}

function Dashboard({ userName, onNavigate }) { return <Box className="vx-page-grid">
  <Box component="section" className="vx-hero-card"><Box><Box component="small">Good morning</Box><Typography component="h2">Hello, {userName}</Typography><Typography component="p">Everything you need for today's business.</Typography></Box><Box className="vx-date-pill">19 Aug · 19 Aug 2025 <ChevronRight size={14} /></Box></Box>
  <Box component="section" className="vx-kpi-grid"><Kpi label="Sales Today" value="₹ 28,450" trend="+12.9%" tone="green" /><Kpi label="Purchase Today" value="₹ 18,750" trend="-4.3%" tone="red" /><Kpi label="Receivables" value="₹ 1,25,000" tone="indigo" /><Kpi label="Payables" value="₹ 75,400" tone="violet" /></Box>
  <Box component="section" className="vx-card"><Box className="vx-section-head"><Box><Typography component="h3">Sales Overview</Typography><Box component="span">This week</Box></Box><Box component="button" className="vx-filter-btn">This Week <ChevronRight size={14} /></Box></Box><Box className="vx-chart"><Box className="vx-axis"><Box component="span">30K</Box><Box component="span">20K</Box><Box component="span">10K</Box><Box component="span">0</Box></Box><svg viewBox="0 0 520 180" role="img" aria-label="Sales overview"><polyline points="20,140 90,115 160,120 230,75 300,95 370,85 450,35" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><line x1="0" y1="160" x2="510" y2="160" stroke="currentColor" opacity=".15" /><g fill="currentColor"><circle cx="20" cy="140" r="5"/><circle cx="90" cy="115" r="5"/><circle cx="160" cy="120" r="5"/><circle cx="230" cy="75" r="5"/><circle cx="300" cy="95" r="5"/><circle cx="370" cy="85" r="5"/><circle cx="450" cy="35" r="5"/></g></svg></Box></Box>
  <Box component="section"><Box className="vx-section-title"><Typography component="h3">Quick Modules</Typography><Box component="button" onClick={() => onNavigate("more")}>View all</Box></Box><Box className="vx-module-grid">{modules.slice(0, 6).map(([key, label, Icon]) => <Box component="button" key={key} className="vx-module-card" onClick={() => onNavigate(key)}><Box component="span" className="vx-module-icon"><Icon size={22} /></Box><Box component="strong">{label}</Box></Box>)}</Box></Box>
  <Box component="section" className="vx-card"><Box className="vx-section-head"><Box><Typography component="h3">Recent Activities</Typography><Box component="span">Latest transactions</Box></Box></Box><Box className="vx-activity-list"><Activity title="Sales Invoice INV-000123" amount="₹ 8,450" meta="19 Aug 2025" /><Activity title="Purchase Bill BILL-000123" amount="₹ 5,600" meta="19 Aug 2025" /><Activity title="Payment Received" amount="₹ 10,000" meta="19 Aug 2025" /></Box></Box>
</Box>; }
function Kpi({ label, value, trend, tone }) { return <Box className={`vx-kpi vx-${tone}`}><Box component="span">{label}</Box><Box component="strong">{value}</Box>{trend && <Box component="small">{trend}</Box>}</Box>; }
function Activity({ title, amount, meta }) { return <Box className="vx-activity"><Box><Box component="strong">{title}</Box><Box component="span">{meta}</Box></Box><Box component="strong">{amount}</Box></Box>; }
function ListPage({ title, rows, cta, onCreate }) { const [query,setQuery]=useState(""); const filtered=rows.filter(r=>r.join(" ").toLowerCase().includes(query.toLowerCase())); return <Box className="vx-page-grid"><Box component="section" className="vx-card"><Box className="vx-toolbar"><Box className="vx-search"><Search size={17}/><Box component="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`}/></Box><Box component="button" className="vx-filter-btn">Filter</Box></Box><Box className="vx-tabs"><Box component="button" className="active">All</Box><Box component="button">Draft</Box><Box component="button">Sent</Box><Box component="button">Paid</Box></Box><Box className="vx-list">{filtered.map(([no,party,amount,status])=><Box className="vx-list-row" key={no}><Box><Box component="strong">{no}</Box><Box component="span">{party}</Box><Box component="small">19 Aug 2025</Box></Box><Box className="vx-row-right"><Box component="strong">{amount}</Box><Box component="span" className={`vx-status ${status.toLowerCase()}`}>{status}</Box></Box></Box>)}</Box></Box><Box component="button" className="vx-fab" onClick={onCreate} aria-label={cta}><Plus size={23}/></Box></Box>; }
function InventoryPage(){return <Box className="vx-page-grid"><Box component="section" className="vx-kpi-grid inventory">{inventoryCards.map(([label,value,tone])=><Box key={label} className={`vx-kpi vx-card ${tone?`vx-${tone}`:""}`}><Box component="span">{label}</Box><Box component="strong">{value}</Box></Box>)}</Box><Box component="section" className="vx-card"><Box className="vx-section-head"><Box><Typography component="h3">Stock by Category</Typography><Box component="span">Current inventory value</Box></Box></Box><Box className="vx-donut"><Box className="vx-donut-ring"><Box className="vx-donut-hole">1,245<Box component="small">Products</Box></Box></Box><Box className="vx-legend"><Box component="span"><Box component="i"/> Electronics <Box component="b">40%</Box></Box><Box component="span"><Box component="i"/> Fashion <Box component="b">25%</Box></Box><Box component="span"><Box component="i"/> Home & Kitchen <Box component="b">20%</Box></Box><Box component="span"><Box component="i"/> Others <Box component="b">15%</Box></Box></Box></Box></Box></Box>;}
function ProductPage(){return <Box className="vx-page-grid"><Box component="section" className="vx-card vx-product-card"><Box className="vx-product-image">👟</Box><Box><Box component="small">SP001</Box><Typography component="h2">Sports Shoes</Typography><Box className="vx-detail-grid"><Field label="Selling Price" value="₹ 1,999.00"/><Field label="Cost Price" value="₹ 1,250.00"/><Field label="Stock" value="120 PCS"/><Field label="Min. Stock Level" value="20 PCS"/><Field label="HSN Code" value="6404"/><Field label="Category" value="Footwear"/></Box><Box component="button" className="vx-primary-btn">Edit Product</Box></Box></Box></Box>;}
function ReportsPage(){return <Box className="vx-page-grid"><Box component="section" className="vx-list-card">{reports.map(([title,desc,Icon,tone])=><Box component="button" className="vx-report-row" key={title}><Box component="span" className={`vx-report-icon ${tone}`}><Icon size={20}/></Box><Box component="span"><Box component="strong">{title}</Box><Box component="small">{desc}</Box></Box><ChevronRight size={18}/></Box>)}</Box></Box>;}
function SettingsPage(){const settings=["Business Profile","Users","Roles & Permissions","Preferences","Backup & Restore","PWA Settings","About Vynerix ERP"];return <Box className="vx-page-grid"><Box component="section" className="vx-list-card">{settings.map(name=><Box component="button" className="vx-report-row" key={name}><Box component="span" className="vx-setting-icon"><Settings size={18}/></Box><Box component="span"><Box component="strong">{name}</Box><Box component="small">Manage {name.toLowerCase()}</Box></Box><ChevronRight size={18}/></Box>)}<Box component="button" className="vx-report-row danger"><Box component="span" className="vx-setting-icon"><X size={18}/></Box><Box component="span"><Box component="strong">Logout</Box><Box component="small">Sign out of this device</Box></Box></Box></Box></Box>;}
function SimplePage({title,icon:Icon,description}){return <Box className="vx-page-grid"><Box component="section" className="vx-empty-state vx-card"><Box className="vx-empty-icon"><Icon size={28}/></Box><Typography component="h2">{title}</Typography><Typography component="p">{description}</Typography><Box component="button" className="vx-primary-btn">Open {title}</Box></Box></Box>;}
function Field({label,value}){return <Box><Box component="small">{label}</Box><Box component="strong">{value}</Box></Box>;}
function CreateInvoice({onClose}){const [saved,setSaved]=useState(false);return <Box className="vx-modal-backdrop" role="dialog" aria-modal="true"><Box component="section" className="vx-modal"><Box component="header"><Box component="button" className="vx-icon-btn" onClick={onClose}><ChevronLeft size={18}/></Box><Box><Box component="small">Sales</Box><Typography component="h2">Create Invoice</Typography></Box><Box component="button" className="vx-icon-btn" onClick={onClose}><X size={18}/></Box></Box><Box className="vx-form"><Box component="label">Customer<Box component="select"><option>Select Customer</option><option>Customer Name</option></Box></Box><Box className="vx-form-grid"><Box component="label">Invoice Number<Box component="input" defaultValue="INV-000124"/></Box><Box component="label">Invoice Date<Box component="input" type="date" defaultValue="2025-08-19"/></Box><Box component="label">Due Date<Box component="input" type="date" defaultValue="2025-09-02"/></Box></Box><Box className="vx-form-section"><Box className="vx-section-title"><Typography component="h3">Items</Typography><Box component="button"><Plus size={14}/> Add Item</Box></Box><Box className="vx-inline-item"><Box><Box component="strong">Product Name</Box><Box component="small">HSN: 1234 · 2 PCS × ₹ 500.00</Box></Box><Box component="strong">₹ 1,000.00</Box></Box></Box><Box className="vx-totals"><Box component="span">Subtotal <Box component="b">₹ 1,000.00</Box></Box><Box component="span">CGST (9%) <Box component="b">₹ 90.00</Box></Box><Box component="span">SGST (9%) <Box component="b">₹ 90.00</Box></Box><Box component="strong">Total <Box component="b">₹ 1,180.00</Box></Box></Box></Box><Box component="footer"><Box component="button" className="vx-secondary-btn" onClick={()=>setSaved(true)}>{saved?"Saved":"Save Draft"}</Box><Box component="button" className="vx-primary-btn" onClick={onClose}>Save & Send</Box></Box></Box></Box>;}
