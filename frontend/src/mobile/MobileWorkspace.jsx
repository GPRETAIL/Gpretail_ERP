import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Bell, Box as BoxIcon, ChevronRight, ClipboardList, FileBarChart, Home, Menu,
  MoreHorizontal, Package, Plus, Search, Settings, ShoppingCart, Store, Users,
  Wallet, X, RefreshCw, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { mobileApi, loadMobilePage } from "./mobileApi";
import "./workspace.css";

const modules = [
  ["sales", "Sales", ShoppingCart], ["purchase", "Purchase", ClipboardList],
  ["inventory", "Inventory", BoxIcon], ["products", "Products", Package],
  ["customers", "Customers", Users], ["suppliers", "Suppliers", Store],
  ["expenses", "Expenses", Wallet], ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
];

const titles = Object.fromEntries(modules.map(([key, label]) => [key, label]));
titles.dashboard = "Dashboard";

function Skeleton({ className = "" }) { return <Box className={`vx-skeleton ${className}`} />; }
function PageLoading() { return <Box className="vx-loading-grid"><Skeleton/><Skeleton/><Skeleton className="wide"/><Skeleton className="wide"/></Box>; }
function ErrorState({ message, retry }) { return <Box className="vx-state"><AlertCircle size={22}/><Box component="strong">{message}</Box><Box component="button" onClick={retry}><RefreshCw size={16}/> Retry</Box></Box>; }
function EmptyState({ title, text, action }) { return <Box className="vx-empty"><BoxIcon size={28}/><Typography component="h3">{title}</Typography><Typography component="p">{text}</Typography>{action && <Box component="button" onClick={action}><Plus size={16}/> Add New</Box>}</Box>; }
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

  return <Box className="vx-workspace">
    <Box component="header" className="vx-ws-topbar">
      <Box component="button" className="vx-ws-icon mobile-only" onClick={() => setMenu(true)} aria-label="Menu"><Menu size={20}/></Box>
      <Box className="vx-ws-brand"><Box component="span">V</Box><Box component="strong">Vynerix ERP</Box></Box>
      <Box className="vx-spacer"/>
      {installPrompt && <Box component="button" className="vx-install" onClick={install}>Install App</Box>}
      <Box component="button" className="vx-ws-icon" aria-label="Notifications"><Bell size={19}/></Box>
      <Box className="vx-avatar">{userName.slice(0,1).toUpperCase()}</Box>
      <Box className="vx-user desktop-only"><Box component="b">{userName}</Box><Box component="small">Admin</Box></Box>
    </Box>

    <Box className="vx-ws-shell">
      <Box component="aside" className={`vx-ws-sidebar ${menu ? "open" : ""}`}>
        <Box className="vx-ws-space"><Box component="small">Workspace</Box><Box component="b">Vynerix</Box><Box component="button" className="vx-ws-icon mobile-only" onClick={() => setMenu(false)}><X size={18}/></Box></Box>
        <Box component="nav">
          <Box component="button" className={page === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")}><Home size={18}/>Dashboard</Box>
          {modules.map(([key, label, Icon]) => <Box component="button" key={key} className={page === key ? "active" : ""} onClick={() => navigate(key)}><Icon size={18}/>{label}</Box>)}
        </Box>
      </Box>

      <Box component="main" className="vx-ws-main">
        <Box className="vx-ws-pagehead"><Box><Box component="small">Today</Box><Typography component="h1">{titles[page]}</Typography></Box><Box component="button" onClick={() => load(page)} aria-label="Refresh"><RefreshCw size={18}/></Box></Box>
        {loading && <PageLoading/>}
        {!loading && error && <ErrorState message={error} retry={() => load(page)}/>}
        {!loading && !error && page === "dashboard" && <Dashboard data={data} userName={userName} navigate={navigate}/>}
        {!loading && !error && ["sales","purchase","products","customers","suppliers","expenses"].includes(page) && <EntityPage type={page} data={data} navigate={navigate}/>}
        {!loading && !error && page === "inventory" && <Inventory data={data}/>}
        {!loading && !error && page === "reports" && <Reports data={data}/>}
        {!loading && !error && page === "settings" && <SettingsPage/>}
      </Box>
    </Box>

    <Box component="nav" className="vx-bottom mobile-only">
      {[["dashboard","Home",Home],["sales","Sales",ShoppingCart],["purchase","Purchase",ClipboardList],["inventory","Stock",Package],["more","More",MoreHorizontal]].map(([key,label,Icon]) => <Box component="button" key={key} className={(key === page || (key === "more" && page !== "dashboard" && !["sales","purchase","inventory"].includes(page))) ? "active" : ""} onClick={() => key === "more" ? setMenu(true) : navigate(key)}><Icon size={19}/><Box component="span">{label}</Box></Box>)}
    </Box>
  </Box>;
}

function Dashboard({ data, userName, navigate }) {
  const d = data || {};
  return <Box className="vx-stack">
    <Box component="section" className="vx-hero"><Box><Box component="small">Good morning</Box><Typography component="h2">Hello, {userName}</Typography><Typography component="p">Business overview for your active store.</Typography></Box><Box className="vx-hero-date">Today</Box></Box>
    <Box component="section" className="vx-kpis">
      <Kpi label="Sales Today" value={money(d.sales_today ?? d.salesToday)} trend={d.sales_growth ?? d.salesGrowth} up/>
      <Kpi label="Purchase Today" value={money(d.purchase_today ?? d.purchaseToday)} trend={d.purchase_growth ?? d.purchaseGrowth}/>
      <Kpi label="Receivables" value={money(d.receivables)} />
      <Kpi label="Payables" value={money(d.payables)} />
    </Box>
    <Box component="section" className="vx-card"><Header title="Sales Overview" sub="Last 7 days"/><Box className="vx-chart"><svg viewBox="0 0 700 220" preserveAspectRatio="none"><polyline points="10,170 100,140 190,150 280,90 370,120 460,100 550,45 680,65" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg></Box></Box>
    <Box component="section"><Header title="Quick Modules" action="View all"/><Box className="vx-module-grid">{modules.slice(0,6).map(([key,label,Icon]) => <Box component="button" key={key} onClick={() => navigate(key)}><Box component="span"><Icon size={21}/></Box><Box component="b">{label}</Box></Box>)}</Box></Box>
    <Box component="section" className="vx-card"><Header title="Recent Activity" sub="Latest transactions"/><Box className="vx-activity">{(d.recent_activity || d.recentActivity || []).slice(0,5).map((x,i)=><Activity key={x.id || i} item={x}/>)}</Box>{!(d.recent_activity || d.recentActivity)?.length && <EmptyState title="No recent activity" text="Transactions will appear here as your store operates."/>}</Box>
  </Box>;
}

function Kpi({ label,value,trend,up }) { return <Box className="vx-kpi"><Box component="span">{label}</Box><Box component="b">{value}</Box>{trend !== undefined && trend !== null && <Box component="small" className={up ? "positive" : "negative"}>{up ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {trend}%</Box>}</Box>; }
function Header({ title,sub,action }) { return <Box className="vx-section-head"><Box><Typography component="h3">{title}</Typography>{sub && <Box component="small">{sub}</Box>}</Box>{action && <Box component="button">{action}<ChevronRight size={14}/></Box>}</Box>; }
function Activity({ item }) { return <Box className="vx-activity-row"><Box component="span" className="vx-dot"/><Box><Box component="b">{item.title || item.type || "Transaction"}</Box><Box component="small">{item.date || item.created_at || "Today"}</Box></Box><Box component="strong">{item.amount ? money(item.amount) : ""}</Box></Box>; }

function EntityPage({ type, data, navigate }) {
  const [q,setQ] = useState("");
  const rows = Array.isArray(data) ? data : (data?.items || data?.data || []);
  const filtered = rows.filter((x) => JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  const labels = { sales:"Sales Invoices", purchase:"Purchase Bills", products:"Products", customers:"Customers", suppliers:"Suppliers", expenses:"Expenses" };
  return <Box className="vx-stack"><Box component="section" className="vx-card"><Box className="vx-search-row"><Box className="vx-search"><Search size={16}/><Box component="input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder={`Search ${labels[type].toLowerCase()}...`}/></Box><Box component="button" className="vx-primary"><Plus size={16}/> New</Box></Box><Box className="vx-rows">{filtered.map((x,i)=><Box className="vx-data-row" key={x.id || x.uuid || i}><Box><Box component="b">{x.invoice_number || x.bill_number || x.code || x.name || x.customer_name || x.supplier_name || `${type} ${i+1}`}</Box><Box component="small">{x.date || x.created_at || x.phone || x.gstin || ""}</Box></Box><Box component="strong">{x.total ? money(x.total) : x.amount ? money(x.amount) : x.quantity ?? ""}</Box></Box>)}</Box>{!filtered.length && <EmptyState title={`No ${labels[type].toLowerCase()}`} text="No records match the current search." action={()=>navigate(type)}/>}</Box></Box>;
}
function Inventory({ data }) { const d=data||{}; const cards=[["Total Products",d.total_products ?? d.totalProducts ?? 0],["Low Stock",d.low_stock ?? d.lowStock ?? 0],["Out of Stock",d.out_of_stock ?? d.outOfStock ?? 0],["Stock Value",money(d.stock_value ?? d.stockValue ?? 0)]]; return <Box className="vx-stack"><Box component="section" className="vx-kpis">{cards.map(([a,b])=><Box className="vx-kpi" key={a}><Box component="span">{a}</Box><Box component="b">{b}</Box></Box>)}</Box><Box component="section" className="vx-card"><Header title="Stock Alerts" sub="Needs attention"/>{(d.alerts || []).map((x,i)=><Activity key={i} item={{title:x.name||x.title||"Stock Alert", amount:x.quantity, date:x.message}}/>)}{!(d.alerts||[]).length&&<EmptyState title="Stock is healthy" text="No inventory alerts reported by the backend."/>}</Box></Box>; }
function Reports({ data }) { return <Box className="vx-stack"><Box component="section" className="vx-card"><Header title="Business Reports" sub="Live ERP reporting"/>{["Sales Report","Purchase Report","Stock Report","GST Report","Profit & Loss","Receivables"].map((x,i)=><Box component="button" className="vx-report" key={x}><Box component="span"><FileBarChart size={18}/></Box><Box><Box component="b">{x}</Box><Box component="small">Open report and filters</Box></Box><ChevronRight size={18}/></Box>)}</Box><Box component="section" className="vx-card"><Box component="pre" className="vx-report-json">{JSON.stringify(data || {}, null, 2)}</Box></Box></Box>; }
function SettingsPage(){ return <Box className="vx-stack"><Box component="section" className="vx-card">{["Business Profile","Users","Roles & Permissions","Store & Counter","Notifications","PWA & Offline","Theme","Backup & Restore","About"].map(x=><Box component="button" className="vx-report" key={x}><Box component="span"><Settings size={18}/></Box><Box><Box component="b">{x}</Box><Box component="small">Manage {x.toLowerCase()}</Box></Box><ChevronRight size={18}/></Box>)}</Box></Box>; }
