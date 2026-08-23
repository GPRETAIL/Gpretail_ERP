import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  AlertTriangle, BarChart3, Bell, Box, ChevronLeft, ChevronRight, ClipboardList,
  FileBarChart, Home, Loader2, Menu, MoreHorizontal, Package, Plus, RefreshCw,
  Search, Settings, ShoppingCart, Sparkles, Store, Trash2, Users, Wallet, X,
} from "lucide-react";
import { mobileApi } from "./mobileApi";
import "./mobile.css";

const resources = {
  products: {
    title: "Products", endpoint: "products", icon: Package,
    fields: [
      ["name", "Product Name", "text", true],
      ["code", "Code / SKU", "text", false],
      ["barcode", "Barcode", "text", false],
      ["selling_price", "Selling Price", "number", false],
      ["cost_price", "Cost Price", "number", false],
      ["stock", "Opening Stock", "number", false],
    ],
    columns: ["name", "code", "selling_price", "stock"],
  },
  customers: {
    title: "Customers", endpoint: "customers", icon: Users,
    fields: [
      ["name", "Customer Name", "text", true],
      ["phone", "Phone", "text", false],
      ["email", "Email", "email", false],
      ["gstin", "GSTIN", "text", false],
      ["address", "Address", "text", false],
    ],
    columns: ["name", "phone", "email", "gstin"],
  },
  suppliers: {
    title: "Suppliers", endpoint: "suppliers", icon: Store,
    fields: [
      ["name", "Supplier Name", "text", true],
      ["phone", "Phone", "text", false],
      ["email", "Email", "email", false],
      ["gstin", "GSTIN", "text", false],
      ["address", "Address", "text", false],
    ],
    columns: ["name", "phone", "email", "gstin"],
  },
};

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "sales", label: "Sales", icon: ShoppingCart },
  { key: "purchase", label: "Purchase", icon: ClipboardList },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "more", label: "More", icon: MoreHorizontal },
];

const modules = [
  ["sales", "Sales", ShoppingCart], ["purchase", "Purchase", ClipboardList],
  ["inventory", "Inventory", Box], ["products", "Products", Package],
  ["customers", "Customers", Users], ["suppliers", "Suppliers", Store],
  ["expenses", "Expenses", Wallet], ["reports", "Reports", BarChart3], ["settings", "Settings", Settings],
];

const pageTitles = {
  dashboard: "Dashboard", sales: "Sales Invoices", purchase: "Purchase Bills", inventory: "Inventory",
  products: "Products", customers: "Customers", suppliers: "Suppliers", expenses: "Expenses",
  reports: "Reports", settings: "Settings",
};

const listLoaders = {
  sales: mobileApi.sales,
  purchase: mobileApi.purchases,
  products: mobileApi.products,
  customers: mobileApi.customers,
  suppliers: mobileApi.suppliers,
};

function formatDate(value) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
  catch { return String(value); }
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value ?? "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function unwrapRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function pick(obj, keys, fallback = "—") {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function PageState({ loading, error, onRetry, children }) {
  if (loading) return <section className="vx-card vx-empty-state"><Loader2 className="vx-spin" size={28} /><h2>Loading</h2><p>Fetching the latest data from Laravel…</p></section>;
  if (error) return <section className="vx-card vx-empty-state"><AlertTriangle size={28} /><h2>Unable to load</h2><p>{error}</p><button className="vx-primary-btn" onClick={onRetry}><RefreshCw size={15} /> Retry</button></section>;
  return children;
}

function CrudPage({ resourceKey, onBack }) {
  const config = resources[resourceKey];
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(unwrapRows(await listLoaders[resourceKey]({ search: query }))); }
    catch (err) { setError(err?.response?.data?.message || err?.message || "Unable to load data"); }
    finally { setLoading(false); }
  }, [resourceKey, query]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => Object.values(row || {}).some((value) => String(value ?? "").toLowerCase().includes(q)));
  }, [rows, query]);

  const openCreate = () => {
    const next = {};
    config.fields.forEach(([key]) => { next[key] = ""; });
    setForm(next); setEditing({ mode: "create" });
  };

  const openEdit = (row) => {
    const next = {};
    config.fields.forEach(([key]) => { next[key] = row?.[key] ?? ""; });
    setForm(next); setEditing({ mode: "edit", row });
  };

  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      if (editing.mode === "create") await mobileApi.create(config.endpoint, form);
      else await mobileApi.update(config.endpoint, editing.row?.id, form);
      setEditing(null); await load();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to save record");
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!row?.id || !window.confirm(`Delete this ${config.title.slice(0, -1).toLowerCase()}?`)) return;
    try { await mobileApi.remove(config.endpoint, row.id); await load(); }
    catch (err) { setError(err?.response?.data?.message || err?.message || "Unable to delete record"); }
  };

  return <div className="vx-page-grid">
    <section className="vx-card">
      <div className="vx-toolbar">
        <button className="vx-icon-btn" onClick={onBack} aria-label="Back"><ChevronLeft size={18} /></button>
        <div className="vx-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} /></div>
        <button className="vx-filter-btn" onClick={load}><RefreshCw size={14} /></button>
      </div>
    </section>
    <PageState loading={loading} error={error} onRetry={load}>
      <section className="vx-card">
        <div className="vx-section-head"><div><h3>{config.title}</h3><span>{filtered.length} records</span></div><button className="vx-primary-btn" onClick={openCreate}><Plus size={15} /> Add</button></div>
        <div className="vx-list">
          {filtered.length === 0 && <div className="vx-empty-state"><Package size={24} /><p>No records found.</p></div>}
          {filtered.map((row) => <article className="vx-list-row" key={row.id ?? JSON.stringify(row)}>
            <div>
              <strong>{pick(row, config.columns)}</strong>
              <span>{pick(row, config.columns.slice(1, 2))}</span>
              <small>{formatDate(row.created_at || row.updated_at)}</small>
            </div>
            <div className="vx-row-right">
              <strong>{resourceKey === "products" ? money(pick(row, ["selling_price", "sale_price", "price"], "")) : pick(row, ["phone", "email", "gstin"], "")}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="vx-filter-btn" onClick={() => openEdit(row)}>Edit</button>
                {row.id && <button className="vx-filter-btn" onClick={() => remove(row)} aria-label="Delete"><Trash2 size={13} /></button>}
              </div>
            </div>
          </article>)}
        </div>
      </section>
    </PageState>
    {editing && <div className="vx-modal-backdrop" role="dialog" aria-modal="true">
      <form className="vx-modal" onSubmit={save}>
        <header><button type="button" className="vx-icon-btn" onClick={() => setEditing(null)}><X size={18} /></button><div><small>{config.title}</small><h2>{editing.mode === "create" ? `New ${config.title.slice(0, -1)}` : `Edit ${config.title.slice(0, -1)}`}</h2></div></header>
        <div className="vx-form">
          {config.fields.map(([key, label, type, required]) => <label key={key}>{label}<input required={required} type={type} value={form[key] ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} /></label>)}
        </div>
        <footer><button type="button" className="vx-secondary-btn" onClick={() => setEditing(null)}>Cancel</button><button className="vx-primary-btn" disabled={saving}>{saving ? <Loader2 className="vx-spin" size={14} /> : "Save"}</button></footer>
      </form>
    </div>}
  </div>;
}

function TransactionPage({ type, onBack }) {
  const loader = listLoaders[type];
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [query, setQuery] = useState("");
  const title = type === "sales" ? "Sales Invoices" : "Purchase Bills";
  const load = useCallback(async () => { setLoading(true); setError(null); try { setRows(unwrapRows(await loader({ search: query }))); } catch (err) { setError(err?.response?.data?.message || err?.message || "Unable to load transactions"); } finally { setLoading(false); } }, [loader, query]);
  useEffect(() => { load(); }, [load]);
  return <div className="vx-page-grid">
    <section className="vx-card"><div className="vx-toolbar"><button className="vx-icon-btn" onClick={onBack}><ChevronLeft size={18} /></button><div className="vx-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} /></div><button className="vx-filter-btn" onClick={load}><RefreshCw size={14}/></button></div></section>
    <PageState loading={loading} error={error} onRetry={load}>
      <section className="vx-card"><div className="vx-section-head"><div><h3>{title}</h3><span>{rows.length} records from Laravel</span></div></div><div className="vx-list">
        {rows.length === 0 && <div className="vx-empty-state"><ClipboardList size={24}/><p>No records found.</p></div>}
        {rows.map((row, index) => <article className="vx-list-row" key={row.id ?? index}><div><strong>{pick(row,["invoice_number","invoice_no","number","bill_no","reference","id"])}</strong><span>{pick(row,["customer.name","supplier.name","customer_name","supplier_name","name"])}</span><small>{formatDate(pick(row,["invoice_date","date","created_at"]))}</small></div><div className="vx-row-right"><strong>{money(pick(row,["grand_total","total","net_amount","amount"], ""))}</strong><span className={`vx-status ${String(pick(row,["status"],"draft")).toLowerCase()}`}>{pick(row,["status"],"Draft")}</span></div></article>)}
      </div></section>
    </PageState>
  </div>;
}

function DashboardPage({ userName, onNavigate }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setData(await mobileApi.dashboard()); } catch (err) { setError(err?.response?.data?.message || err?.message || "Unable to load dashboard"); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const overview = data?.overview || data?.summary || data || {};
  const sales = pick(overview,["sales_today","today_sales","salesToday","total_sales"],0);
  const purchases = pick(overview,["purchase_today","today_purchase","purchasesToday","total_purchases"],0);
  const receivables = pick(overview,["receivables","total_receivables"],0);
  const payables = pick(overview,["payables","total_payables"],0);
  return <div className="vx-page-grid">
    <section className="vx-hero-card"><div><small>Good morning</small><h2>Hello, {userName}</h2><p>Live data from the Laravel ERP backend.</p></div><div className="vx-date-pill">{formatDate(new Date())}</div></section>
    <PageState loading={loading} error={error} onRetry={load}>
      <section className="vx-kpi-grid"><Kpi label="Sales Today" value={money(sales)} /><Kpi label="Purchase Today" value={money(purchases)} /><Kpi label="Receivables" value={money(receivables)} /><Kpi label="Payables" value={money(payables)} /></section>
      <section className="vx-card"><div className="vx-section-head"><div><h3>Quick Modules</h3><span>Open a module</span></div></div><div className="vx-module-grid">{modules.slice(0,6).map(([key,label,Icon])=><button className="vx-module-card" key={key} onClick={()=>onNavigate(key)}><span className="vx-module-icon"><Icon size={22}/></span><strong>{label}</strong></button>)}</div></section>
      <section className="vx-card"><div className="vx-section-head"><div><h3>Dashboard data</h3><span>Real-time payload from Laravel</span></div><button className="vx-filter-btn" onClick={load}><RefreshCw size={14}/></button></div><pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 10, color: "#667085" }}>{JSON.stringify(data, null, 2).slice(0, 5000)}</pre></section>
    </PageState>
  </div>;
}

function Kpi({ label, value }) { return <div className="vx-kpi"><span>{label}</span><strong>{value}</strong></div>; }

function GenericPage({ title, icon: Icon, description, onBack }) {
  return <div className="vx-page-grid"><section className="vx-card vx-empty-state"><div className="vx-empty-icon"><Icon size={28}/></div><h2>{title}</h2><p>{description}</p><button className="vx-secondary-btn" onClick={onBack}><ChevronLeft size={14}/> Back</button></section></div>;
}

export default function MobileAppV2() {
  const authUser = useSelector((state) => state.auth.user); const userName = authUser?.name || authUser?.username || "Admin";
  const [page, setPage] = useState("dashboard"); const [installEvent, setInstallEvent] = useState(null); const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const handler = (event) => { event.preventDefault(); setInstallEvent(event); }; window.addEventListener("beforeinstallprompt", handler); return () => window.removeEventListener("beforeinstallprompt", handler); }, []);
  const navigate = (target) => { if (target === "more") { setMenuOpen(true); return; } setPage(target); setMenuOpen(false); window.scrollTo({top:0,behavior:"smooth"}); };
  const currentTitle = pageTitles[page] || "Vynerix ERP";
  const back = () => navigate("dashboard");
  return <div className="vx-mobile-app">
    <header className="vx-mobile-topbar"><button className="vx-icon-btn vx-mobile-only" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><div className="vx-brand-lockup"><div className="vx-brand-mark">V</div><span>Vynerix ERP</span></div><div className="vx-topbar-spacer"/><button className="vx-icon-btn"><Bell size={19}/></button><div className="vx-avatar">{userName.charAt(0).toUpperCase()}</div></header>
    <div className="vx-app-body">
      <aside className={`vx-sidebar ${menuOpen ? "is-open" : ""}`}><div className="vx-sidebar-head"><div><small>Workspace</small><strong>GP Retails</strong></div><button className="vx-icon-btn vx-mobile-only" onClick={()=>setMenuOpen(false)}><X size={20}/></button></div><nav className="vx-side-nav">{modules.map(([key,label,Icon])=><button key={key} className={`vx-side-link ${page===key?"active":""}`} onClick={()=>navigate(key)}><Icon size={18}/><span>{label}</span></button>)}</nav><div className="vx-install-card"><Sparkles size={18}/><div><strong>Install Vynerix ERP</strong><span>Use it like a mobile app</span></div>{installEvent && <button onClick={async()=>{await installEvent.prompt();setInstallEvent(null);}}>Install</button>}</div></aside>
      <main className="vx-main"><div className="vx-mobile-pagebar">{page!=="dashboard"&&<button className="vx-icon-btn" onClick={back}><ChevronLeft size={18}/></button>}<div><small>{formatDate(new Date())}</small><h1>{currentTitle}</h1></div>{page!=="dashboard"&&<button className="vx-icon-btn" onClick={back}><Home size={18}/></button>}</div>
        {page==="dashboard"&&<DashboardPage userName={userName} onNavigate={navigate}/>} {page==="sales"&&<TransactionPage type="sales" onBack={back}/>} {page==="purchase"&&<TransactionPage type="purchase" onBack={back}/>}
        {page==="products"&&<CrudPage resourceKey="products" onBack={back}/>} {page==="customers"&&<CrudPage resourceKey="customers" onBack={back}/>} {page==="suppliers"&&<CrudPage resourceKey="suppliers" onBack={back}/>}
        {page==="inventory"&&<InventoryPage onBack={back}/>} {page==="reports"&&<GenericPage title="Reports" icon={BarChart3} description="Live report pages are connected next to the existing Laravel report endpoints." onBack={back}/>} {page==="expenses"&&<GenericPage title="Expenses" icon={Wallet} description="Expense API is not exposed in the current Laravel route set. No fake records are shown." onBack={back}/>} {page==="settings"&&<GenericPage title="Settings" icon={Settings} description="Use the existing ERP settings pages; mobile settings integration will follow the same API contracts." onBack={back}/>} 
      </main>
    </div>
    <nav className="vx-bottom-nav">{navItems.map(({key,label,icon:Icon})=><button key={key} className={page===key?"active":""} onClick={()=>navigate(key)}><Icon size={19}/><span>{label}</span></button>)}</nav>
  </div>;
}

function InventoryPage({ onBack }) {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(null);
  const load=useCallback(async()=>{setLoading(true);setError(null);try{setData(await mobileApi.inventory());}catch(err){setError(err?.response?.data?.message||err?.message||"Unable to load inventory");}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  return <div className="vx-page-grid"><section className="vx-card"><div className="vx-toolbar"><button className="vx-icon-btn" onClick={onBack}><ChevronLeft size={18}/></button><div style={{flex:1}}><strong>Inventory Dashboard</strong><div style={{fontSize:10,color:"#667085"}}>Live warehouse data</div></div><button className="vx-filter-btn" onClick={load}><RefreshCw size={14}/></button></div></section><PageState loading={loading} error={error} onRetry={load}><section className="vx-card"><h3 style={{marginTop:0}}>Current inventory payload</h3><pre style={{whiteSpace:"pre-wrap",fontSize:10,color:"#667085"}}>{JSON.stringify(data,null,2).slice(0,7000)}</pre></section></PageState></div>;
}
