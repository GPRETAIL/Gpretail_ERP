import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Bell, Box, ChevronRight, ClipboardList, FileBarChart, Home, Menu,
  MoreHorizontal, Package, Plus, Search, Settings, ShoppingCart, Store, Users,
  Wallet, X, RefreshCw, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { useSelector } from "react-redux";
import { mobileApi, loadMobilePage } from "./mobileApi";
import "./workspace.css";

const modules = [
  ["sales", "Sales", ShoppingCart], ["purchase", "Purchase", ClipboardList],
  ["inventory", "Inventory", Box], ["products", "Products", Package],
  ["customers", "Customers", Users], ["suppliers", "Suppliers", Store],
  ["expenses", "Expenses", Wallet], ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
];

const titles = Object.fromEntries(modules.map(([key, label]) => [key, label]));
titles.dashboard = "Dashboard";

function Skeleton({ className = "" }) { return <div className={`vx-skeleton ${className}`} />; }
function PageLoading() { return <div className="vx-loading-grid"><Skeleton/><Skeleton/><Skeleton className="wide"/><Skeleton className="wide"/></div>; }
function ErrorState({ message, retry }) { return <div className="vx-state"><AlertCircle size={22}/><strong>{message}</strong><button onClick={retry}><RefreshCw size={16}/> Retry</button></div>; }
function EmptyState({ title, text, action }) { return <div className="vx-empty"><Box size={28}/><h3>{title}</h3><p>{text}</p>{action && <button onClick={action}><Plus size={16}/> Add New</button>}</div>; }
function money(v) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0)); }

export default function MobileWorkspace() {
  const authUser = useSelector((state) => state.auth.user);
  const [page, setPage] = useState("dashboard");
  const [menu, setMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const userName = authUser?.name || authUser?.username || "Admin";

  const loaders = useMemo(() => ({
    dashboard: mobileApi.dashboard,
    sales: mobileApi.sales,
    purchase: mobileApi.purchases,
    inventory: mobileApi.inventory,
    products: mobileApi.products,
    customers: mobileApi.customers,
    suppliers: mobileApi.suppliers,
    expenses: mobileApi.expenses,
    reports: mobileApi.reports,
    settings: async () => ({ settings: true }),
  }), []);

  const load = async (target = page) => {
    const loader = loaders[target];
    setLoading(true); setError(null);
    const result = await loadMobilePage(loader, { page: 1, per_page: 20 });
    setData(result.data); setError(result.error); setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const navigate = (target) => { setPage(target); setMenu(false); window.scrollTo({ top: 0 }); };
  const install = async () => { if (!installPrompt) return; await installPrompt.prompt(); setInstallPrompt(null); };

  return <div className="vx-workspace">
    <header className="vx-ws-topbar">
      <button className="vx-ws-icon mobile-only" onClick={() => setMenu(true)} aria-label="Menu"><Menu size={20}/></button>
      <div className="vx-ws-brand"><span>V</span><strong>Vynerix ERP</strong></div>
      <div className="vx-spacer"/>
      {installPrompt && <button className="vx-install" onClick={install}>Install App</button>}
      <button className="vx-ws-icon" aria-label="Notifications"><Bell size={19}/></button>
      <div className="vx-avatar">{userName.slice(0,1).toUpperCase()}</div>
      <div className="vx-user desktop-only"><b>{userName}</b><small>Admin</small></div>
    </header>

    <div className="vx-ws-shell">
      <aside className={`vx-ws-sidebar ${menu ? "open" : ""}`}>
        <div className="vx-ws-space"><small>Workspace</small><b>GP Retails</b><button className="vx-ws-icon mobile-only" onClick={() => setMenu(false)}><X size={18}/></button></div>
        <nav>
          <button className={page === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")}><Home size={18}/>Dashboard</button>
          {modules.map(([key, label, Icon]) => <button key={key} className={page === key ? "active" : ""} onClick={() => navigate(key)}><Icon size={18}/>{label}</button>)}
        </nav>
      </aside>

      <main className="vx-ws-main">
        <div className="vx-ws-pagehead"><div><small>Today</small><h1>{titles[page]}</h1></div><button onClick={() => load(page)} aria-label="Refresh"><RefreshCw size={18}/></button></div>
        {loading && <PageLoading/>}
        {!loading && error && <ErrorState message={error} retry={() => load(page)}/>} 
        {!loading && !error && page === "dashboard" && <Dashboard data={data} userName={userName} navigate={navigate}/>} 
        {!loading && !error && ["sales","purchase","products","customers","suppliers","expenses"].includes(page) && <EntityPage type={page} data={data} navigate={navigate}/>} 
        {!loading && !error && page === "inventory" && <Inventory data={data}/>} 
        {!loading && !error && page === "reports" && <Reports data={data}/>} 
        {!loading && !error && page === "settings" && <SettingsPage/>}
      </main>
    </div>

    <nav className="vx-bottom mobile-only">
      {[["dashboard","Home",Home],["sales","Sales",ShoppingCart],["purchase","Purchase",ClipboardList],["inventory","Stock",Package],["more","More",MoreHorizontal]].map(([key,label,Icon]) => <button key={key} className={(key === page || (key === "more" && page !== "dashboard" && !["sales","purchase","inventory"].includes(page))) ? "active" : ""} onClick={() => key === "more" ? setMenu(true) : navigate(key)}><Icon size={19}/><span>{label}</span></button>)}
    </nav>
  </div>;
}

function Dashboard({ data, userName, navigate }) {
  const d = data || {};
  return <div className="vx-stack">
    <section className="vx-hero"><div><small>Good morning</small><h2>Hello, {userName}</h2><p>Business overview for your active store.</p></div><div className="vx-hero-date">Today</div></section>
    <section className="vx-kpis">
      <Kpi label="Sales Today" value={money(d.sales_today ?? d.salesToday)} trend={d.sales_growth ?? d.salesGrowth} up/>
      <Kpi label="Purchase Today" value={money(d.purchase_today ?? d.purchaseToday)} trend={d.purchase_growth ?? d.purchaseGrowth}/>
      <Kpi label="Receivables" value={money(d.receivables)} />
      <Kpi label="Payables" value={money(d.payables)} />
    </section>
    <section className="vx-card"><Header title="Sales Overview" sub="Last 7 days"/><div className="vx-chart"><svg viewBox="0 0 700 220" preserveAspectRatio="none"><polyline points="10,170 100,140 190,150 280,90 370,120 460,100 550,45 680,65" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg></div></section>
    <section><Header title="Quick Modules" action="View all"/><div className="vx-module-grid">{modules.slice(0,6).map(([key,label,Icon]) => <button key={key} onClick={() => navigate(key)}><span><Icon size={21}/></span><b>{label}</b></button>)}</div></section>
    <section className="vx-card"><Header title="Recent Activity" sub="Latest transactions"/><div className="vx-activity">{(d.recent_activity || d.recentActivity || []).slice(0,5).map((x,i)=><Activity key={x.id || i} item={x}/>)}</div>{!(d.recent_activity || d.recentActivity)?.length && <EmptyState title="No recent activity" text="Transactions will appear here as your store operates."/>}</section>
  </div>;
}

function Kpi({ label,value,trend,up }) { return <div className="vx-kpi"><span>{label}</span><b>{value}</b>{trend !== undefined && trend !== null && <small className={up ? "positive" : "negative"}>{up ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {trend}%</small>}</div>; }
function Header({ title,sub,action }) { return <div className="vx-section-head"><div><h3>{title}</h3>{sub && <small>{sub}</small>}</div>{action && <button>{action}<ChevronRight size={14}/></button>}</div>; }
function Activity({ item }) { return <div className="vx-activity-row"><span className="vx-dot"/><div><b>{item.title || item.type || "Transaction"}</b><small>{item.date || item.created_at || "Today"}</small></div><strong>{item.amount ? money(item.amount) : ""}</strong></div>; }

function EntityPage({ type, data, navigate }) {
  const [q,setQ] = useState("");
  const rows = Array.isArray(data) ? data : (data?.items || data?.data || []);
  const filtered = rows.filter((x) => JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  const labels = { sales:"Sales Invoices", purchase:"Purchase Bills", products:"Products", customers:"Customers", suppliers:"Suppliers", expenses:"Expenses" };
  return <div className="vx-stack"><section className="vx-card"><div className="vx-search-row"><div className="vx-search"><Search size={16}/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={`Search ${labels[type].toLowerCase()}...`}/></div><button className="vx-primary"><Plus size={16}/> New</button></div><div className="vx-rows">{filtered.map((x,i)=><div className="vx-data-row" key={x.id || x.uuid || i}><div><b>{x.invoice_number || x.bill_number || x.code || x.name || x.customer_name || x.supplier_name || `${type} ${i+1}`}</b><small>{x.date || x.created_at || x.phone || x.gstin || ""}</small></div><strong>{x.total ? money(x.total) : x.amount ? money(x.amount) : x.quantity ?? ""}</strong></div>)}</div>{!filtered.length && <EmptyState title={`No ${labels[type].toLowerCase()}`} text="No records match the current search." action={()=>navigate(type)}/>}</section></div>;
}
function Inventory({ data }) { const d=data||{}; const cards=[["Total Products",d.total_products ?? d.totalProducts ?? 0],["Low Stock",d.low_stock ?? d.lowStock ?? 0],["Out of Stock",d.out_of_stock ?? d.outOfStock ?? 0],["Stock Value",money(d.stock_value ?? d.stockValue ?? 0)]]; return <div className="vx-stack"><section className="vx-kpis">{cards.map(([a,b])=><div className="vx-kpi" key={a}><span>{a}</span><b>{b}</b></div>)}</section><section className="vx-card"><Header title="Stock Alerts" sub="Needs attention"/>{(d.alerts || []).map((x,i)=><Activity key={i} item={{title:x.name||x.title||"Stock Alert", amount:x.quantity, date:x.message}}/>)}{!(d.alerts||[]).length&&<EmptyState title="Stock is healthy" text="No inventory alerts reported by the backend."/>}</section></div>; }
function Reports({ data }) { return <div className="vx-stack"><section className="vx-card"><Header title="Business Reports" sub="Live ERP reporting"/>{["Sales Report","Purchase Report","Stock Report","GST Report","Profit & Loss","Receivables"].map((x,i)=><button className="vx-report" key={x}><span><FileBarChart size={18}/></span><div><b>{x}</b><small>Open report and filters</small></div><ChevronRight size={18}/></button>)}</section><section className="vx-card"><pre className="vx-report-json">{JSON.stringify(data || {}, null, 2)}</pre></section></div>; }
function SettingsPage(){ return <div className="vx-stack"><section className="vx-card">{["Business Profile","Users","Roles & Permissions","Store & Counter","Notifications","PWA & Offline","Theme","Backup & Restore","About"].map(x=><button className="vx-report" key={x}><span><Settings size={18}/></span><div><b>{x}</b><small>Manage {x.toLowerCase()}</small></div><ChevronRight size={18}/></button>)}</section></div>; }
