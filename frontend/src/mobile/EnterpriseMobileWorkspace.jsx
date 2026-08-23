import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, BarChart3, Bell, Box, ChevronRight, ClipboardList, FileBarChart, Home,
  Loader2, Menu, Package, Plus, RefreshCw, Search, Settings, ShoppingCart, Store,
  Users, Wallet, X
} from "lucide-react";
import { useSelector } from "react-redux";
import { mobileApi } from "./mobileApi";
import EnterpriseTransactionModal from "./EnterpriseTransactionModal";
import "./workspace.css";
import "./transaction.css";

const modules = [
  ["dashboard", "Dashboard", Home], ["sales", "Sales", ShoppingCart], ["purchase", "Purchase", ClipboardList],
  ["inventory", "Inventory", Box], ["products", "Products", Package], ["customers", "Customers", Users],
  ["suppliers", "Suppliers", Store], ["expenses", "Expenses", Wallet], ["reports", "Reports", BarChart3], ["settings", "Settings", Settings],
];
const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));

export default function EnterpriseMobileWorkspace() {
  const authUser = useSelector((state) => state.auth.user);
  const [page, setPage] = useState("dashboard");
  const [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);

  const userName = authUser?.name || authUser?.username || "Admin";
  const title = modules.find(([key]) => key === page)?.[1] || "Dashboard";

  const load = async () => {
    setLoading(true); setError(null);
    try {
      let result;
      if (page === "dashboard") result = await mobileApi.dashboard({});
      else if (page === "sales") result = await mobileApi.sales({ page: 1, limit: 20 });
      else if (page === "purchase") result = await mobileApi.purchases({ page: 1, limit: 20 });
      else if (page === "inventory") result = await mobileApi.inventoryEntries({ page: 1, limit: 20 });
      else if (page === "products") result = await mobileApi.products({ page: 1, limit: 20 });
      else if (page === "customers") result = await mobileApi.customers({ page: 1, limit: 20 });
      else if (page === "suppliers") result = await mobileApi.suppliers({ page: 1, limit: 20 });
      else if (page === "expenses") result = await mobileApi.expenses({ page: 1, limit: 20 });
      else if (page === "reports") result = await mobileApi.reports({});
      else result = { settings: true };
      setData(result);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to load the page");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const navigate = (target) => { setPage(target); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const rows = useMemo(() => Array.isArray(data) ? data : (data?.items || data?.data || []), [data]);

  return <div className="vx-workspace">
    <header className="vx-ws-topbar">
      <button className="vx-ws-icon mobile-only" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20}/></button>
      <div className="vx-ws-brand"><span>V</span><strong>Vynerix ERP</strong></div><div className="vx-spacer"/>
      <button className="vx-ws-icon" aria-label="Notifications"><Bell size={19}/></button><div className="vx-avatar">{userName.slice(0,1).toUpperCase()}</div>
      <div className="vx-user desktop-only"><b>{userName}</b><small>ERP User</small></div>
    </header>
    <div className="vx-ws-shell">
      <aside className={`vx-ws-sidebar ${menu ? "open" : ""}`}>
        <div className="vx-ws-space"><small>Workspace</small><b>GP Retails</b><button className="vx-ws-icon mobile-only" onClick={() => setMenu(false)}><X size={18}/></button></div>
        <nav>{modules.map(([key,label,Icon]) => <button key={key} className={page===key ? "active" : ""} onClick={() => navigate(key)}><Icon size={18}/>{label}</button>)}</nav>
      </aside>
      <main className="vx-ws-main">
        <div className="vx-ws-pagehead"><div><small>Enterprise workspace</small><h1>{title}</h1></div><button onClick={load} aria-label="Refresh"><RefreshCw size={18}/></button></div>
        {loading && <Loading/>}
        {!loading && error && <ErrorState message={error} retry={load}/>} 
        {!loading && !error && page === "dashboard" && <Dashboard data={data} navigate={navigate}/>} 
        {!loading && !error && ["sales","purchase","inventory"].includes(page) && <TransactionList page={page} rows={rows} onRefresh={load} onOpen={(record) => setModal({ type: page, record })} onCreate={() => setModal({ type: page, record: null })}/>} 
        {!loading && !error && !["dashboard","sales","purchase","inventory"].includes(page) && <GenericList page={page} rows={rows}/>} 
      </main>
    </div>
    <nav className="vx-bottom mobile-only">
      {[["dashboard","Home",Home],["sales","Sales",ShoppingCart],["purchase","Purchase",ClipboardList],["inventory","Stock",Package],["more","More",Menu]].map(([key,label,Icon]) => <button key={key} className={key===page || (key==="more" && !["dashboard","sales","purchase","inventory"].includes(page)) ? "active" : ""} onClick={() => key==="more" ? setMenu(true) : navigate(key)}><Icon size={19}/><span>{label}</span></button>)}
    </nav>
    {modal && <EnterpriseTransactionModal type={modal.type} record={modal.record} onClose={() => setModal(null)} onSaved={() => load()}/>} 
  </div>;
}

function Loading(){return <div className="vx-loading-grid"><div className="vx-skeleton"/><div className="vx-skeleton"/><div className="vx-skeleton wide"/><div className="vx-skeleton wide"/></div>;}
function ErrorState({message,retry}){return <div className="vx-state"><AlertCircle size={22}/><strong>{message}</strong><button onClick={retry}><RefreshCw size={16}/> Retry</button></div>;}
function Header({title,sub}){return <div className="vx-section-head"><div><h3>{title}</h3>{sub&&<small>{sub}</small>}</div></div>;}

function Dashboard({data,navigate}){
  const d=data||{};
  return <div className="vx-stack">
    <section className="vx-hero"><div><small>Live business dashboard</small><h2>Operations command center</h2><p>Sales, purchase and inventory activity for the active store.</p></div><div className="vx-hero-date">Today</div></section>
    <section className="vx-kpis"><Kpi label="Sales Today" value={money(d.sales_today ?? d.salesToday)}/><Kpi label="Purchase Today" value={money(d.purchase_today ?? d.purchaseToday)}/><Kpi label="Receivables" value={money(d.receivables)}/><Kpi label="Payables" value={money(d.payables)}/></section>
    <section className="vx-card"><Header title="Quick Transactions" sub="Post business transactions without leaving the workspace"/><div className="vx-module-grid"><button onClick={()=>navigate("sales")}><span><ShoppingCart size={21}/></span><b>Sales Invoice</b></button><button onClick={()=>navigate("purchase")}><span><ClipboardList size={21}/></span><b>Purchase</b></button><button onClick={()=>navigate("inventory")}><span><Box size={21}/></span><b>Inventory</b></button></div></section>
    <section className="vx-card"><Header title="Sales Overview" sub="Live ERP dashboard data"/><div className="vx-chart"><svg viewBox="0 0 700 220" preserveAspectRatio="none"><polyline points="10,170 100,140 190,150 280,90 370,120 460,100 550,45 680,65" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg></div></section>
  </div>;
}
function Kpi({label,value}){return <div className="vx-kpi"><span>{label}</span><b>{value}</b></div>;}

function TransactionList({page,rows,onOpen,onCreate}){
  const [query,setQuery]=useState("");
  const filtered=rows.filter((r)=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
  const isSales=page==="sales"; const isPurchase=page==="purchase";
  const label=isSales?"Sales Invoices":isPurchase?"Purchase Invoices":"Inventory Operations";
  return <div className="vx-stack">
    <section className="vx-card"><div className="vx-search-row"><div className="vx-search"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`}/></div><button className="vx-primary" onClick={onCreate}><Plus size={16}/> New</button></div>
      <div className="vx-rows">{filtered.map((r,i)=><button className="vx-data-row action" key={r.id||i} onClick={()=>onOpen(r)}><div><b>{r.invoice_no||r.invoice_number||r.entry_no||`#${r.id||i+1}`}</b><small>{isSales?(r.customer?.name||r.customer_name||"Walk-in customer"):isPurchase?(r.supplier?.name||r.supplier_name||"Supplier"):(`${r.type||"Adjustment"} · ${r.entry_date||""}`)}</small></div><strong>{money(r.grand_total??r.total_amount??r.subtotal)}</strong><ChevronRight size={17}/></button>)}{!filtered.length&&<div className="vx-empty"><Box size={28}/><h3>No records</h3><p>Create the first {label.toLowerCase().replace(/s$/i,"")} for this store.</p><button onClick={onCreate}><Plus size={16}/> Add New</button></div>}</div>
    </section>
    {isSales && <div className="vx-state subtle"><Loader2 size={15}/> Posted sales are immutable by policy; corrections should use returns/reversal workflows.</div>}
  </div>;
}

function GenericList({page,rows}){const labels={products:"Products",customers:"Customers",suppliers:"Suppliers",expenses:"Expenses",reports:"Reports",settings:"Settings"};return <div className="vx-stack"><section className="vx-card"><Header title={labels[page]||page}/><div className="vx-rows">{rows.map((r,i)=><div className="vx-data-row" key={r.id||i}><div><b>{r.name||r.code||r.invoice_no||`Record ${i+1}`}</b><small>{r.phone||r.gstin||r.created_at||""}</small></div><strong>{r.amount?money(r.amount):r.quantity??""}</strong></div>)}{!rows.length&&<div className="vx-empty"><Box size={28}/><h3>No records</h3><p>No data was returned by the ERP backend.</p></div>}</div></section></div>;}
