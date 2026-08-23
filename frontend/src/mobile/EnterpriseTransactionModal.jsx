import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";
import { mobileApi } from "./mobileApi";
import "./transaction.css";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));
const today = () => new Date().toISOString().slice(0, 10);

function initialItem(kind) {
  return kind === "sales"
    ? { productId: "", variantId: null, name: "", qty: 1, price: 0, mrp: 0, discount: 0, tax: 0 }
    : kind === "purchase"
      ? { product_id: "", name: "", quantity: 1, rate: 0, discount: 0, tax_amount: 0, tax_id: null }
      : { product_id: "", name: "", quantity: 1, unit_price: 0 };
}

export default function EnterpriseTransactionModal({ type, record, onClose, onSaved }) {
  const [catalog, setCatalog] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState(() => {
    if (type === "sales") return {
      customerId: record?.customer_id || "", sale_date: record?.sale_date?.slice?.(0, 10) || today(),
      payment: record?.payment_mode || "CASH", cashAmount: Number(record?.paid_amount || 0), cardAmount: 0, upiAmount: 0,
      items: (record?.items || []).map((x) => ({ productId: x.product_id, variantId: x.variant_id, name: x.product?.name || "", qty: Number(x.quantity || 1), price: Number(x.selling_price || 0), mrp: Number(x.unit_mrp || 0), discount: Number(x.discount || 0), tax: Number(x.tax_rate || 0) })) || [initialItem("sales")],
    };
    if (type === "purchase") return {
      supplier_id: record?.supplier_id || "", invoice_no: record?.invoice_no || "", supplier_invoice_no: record?.supplier_invoice_no || "", invoice_date: record?.invoice_date || today(), status: record?.status || "APPROVED", notes: record?.notes || "",
      items: (record?.items || []).map((x) => ({ product_id: x.product_id, name: x.product?.name || "", quantity: Number(x.quantity || 1), rate: Number(x.rate || 0), discount: Number(x.discount || 0), tax_amount: Number(x.tax_amount || 0), tax_id: x.tax_id || null })) || [initialItem("purchase")],
    };
    return {
      entry_date: record?.entry_date || today(), type: record?.type || "ADJUSTMENT", status: record?.status || "COMPLETED", notes: record?.notes || "",
      items: (record?.items || []).map((x) => ({ product_id: x.product_id, name: x.product?.name || "", quantity: Number(x.quantity || 0), unit_price: Number(x.unit_price || 0) })) || [initialItem("inventory")],
    };
  });

  const title = type === "sales" ? (record ? "View Sales Invoice" : "Create Sales Invoice") : type === "purchase" ? (record ? "Edit Purchase Invoice" : "Create Purchase Invoice") : (record ? "Edit Inventory Entry" : "Inventory Operation");
  const readonly = type === "sales" && !!record;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [products, partnerList] = await Promise.all([
          mobileApi.products({ all: true, limit: 500 }),
          type === "sales" ? mobileApi.customers({ all: true, limit: 500 }) : type === "purchase" ? mobileApi.suppliers({ all: true, limit: 500 }) : Promise.resolve([]),
        ]);
        if (!active) return;
        setCatalog(Array.isArray(products) ? products : []);
        setPartners(Array.isArray(partnerList) ? partnerList : []);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e?.message || "Unable to load transaction master data");
      } finally { if (active) setLoadingMeta(false); }
    })();
    return () => { active = false; };
  }, [type]);

  const totals = useMemo(() => {
    if (type === "sales") {
      let subtotal = 0, tax = 0, discount = 0;
      form.items.forEach((i) => { const line = Number(i.qty || 0) * Number(i.price || 0); const d = Number(i.discount || 0); const taxable = Math.max(0, line - d); subtotal += taxable; discount += d; tax += taxable * Number(i.tax || 0) / 100; });
      const grand = round2(subtotal + tax); const paid = round2(Number(form.cashAmount || 0) + Number(form.cardAmount || 0) + Number(form.upiAmount || 0));
      return { subtotal: round2(subtotal), tax: round2(tax), discount: round2(discount), grand, paid, balance: round2(Math.max(0, grand - paid)), change: round2(Math.max(0, paid - grand)) };
    }
    let subtotal = 0, tax = 0, discount = 0;
    form.items.forEach((i) => { const line = Number(i.quantity || 0) * Number(type === "purchase" ? i.rate : i.unit_price); const d = Number(i.discount || 0); subtotal += Math.max(0, line - d); discount += d; tax += Number(i.tax_amount || 0); });
    return { subtotal: round2(subtotal), tax: round2(tax), discount: round2(discount), grand: round2(subtotal + tax), paid: 0, balance: 0, change: 0 };
  }, [form, type]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setItem = (index, patch) => setForm((f) => ({ ...f, items: f.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, initialItem(type)] }));
  const removeItem = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const chooseProduct = (index, id) => {
    const p = catalog.find((x) => String(x.id) === String(id));
    if (!p) return;
    if (type === "sales") setItem(index, { productId: p.id, name: p.name, price: Number(p.selling_price ?? p.price ?? 0), mrp: Number(p.mrp || 0), tax: Number(p.tax?.rate ?? p.tax_rate ?? 0), variantId: p.variant_id || null });
    else if (type === "purchase") setItem(index, { product_id: p.id, name: p.name, rate: Number(p.cost_price ?? p.purchase_price ?? 0) });
    else setItem(index, { product_id: p.id, name: p.name, unit_price: Number(p.cost_price ?? p.selling_price ?? 0) });
  };

  const validate = () => {
    if (type === "sales" && !form.customerId && form.payment === "CREDIT") return "A customer is required for credit sales.";
    if (type === "purchase" && !form.supplier_id) return "Select a supplier before posting the purchase.";
    if (!form.items.length) return "Add at least one item.";
    for (const item of form.items) {
      const id = type === "sales" ? item.productId : item.product_id;
      const qty = type === "sales" ? item.qty : item.quantity;
      if (!id) return "Every line must have a product.";
      if (Number(qty) <= 0) return "Quantities must be greater than zero.";
    }
    if (type === "sales" && totals.paid < totals.grand && form.payment !== "CREDIT") return "Payment received is less than the invoice total.";
    return null;
  };

  const submit = async () => {
    if (readonly) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError(null);
    try {
      let result;
      if (type === "sales") {
        result = await mobileApi.createSale({
          customerId: form.customerId || null,
          items: form.items.map((i) => ({ productId: i.productId, variantId: i.variantId || null, qty: Number(i.qty), price: Number(i.price), mrp: Number(i.mrp || i.price), discount: Number(i.discount || 0), tax: Number(i.tax || 0) })),
          cashAmount: form.payment === "CASH" ? Number(form.cashAmount || totals.grand) : Number(form.cashAmount || 0),
          cardAmount: form.payment === "CARD" ? Number(form.cardAmount || totals.grand) : Number(form.cardAmount || 0),
          upiAmount: form.payment === "UPI" ? Number(form.upiAmount || totals.grand) : Number(form.upiAmount || 0),
          isCredit: form.payment === "CREDIT",
        });
      } else if (type === "purchase") {
        result = record ? await mobileApi.updatePurchase(record.id, { supplier_id: form.supplier_id, invoice_date: form.invoice_date, supplier_invoice_no: form.supplier_invoice_no, status: form.status, notes: form.notes }) : await mobileApi.createPurchase({ supplier_id: form.supplier_id || null, invoice_no: form.invoice_no || undefined, invoice_date: form.invoice_date, supplier_invoice_no: form.supplier_invoice_no || null, status: form.status, notes: form.notes, items: form.items.map((i) => ({ product_id: i.product_id, quantity: Number(i.quantity), rate: Number(i.rate), discount: Number(i.discount || 0), tax_amount: Number(i.tax_amount || 0), tax_id: i.tax_id || null })) });
      } else {
        result = record ? await mobileApi.updateInventoryEntry(record.id, { entry_date: form.entry_date, status: form.status, notes: form.notes }) : await mobileApi.createInventoryEntry({ entry_date: form.entry_date, type: form.type, status: form.status, notes: form.notes, items: form.items.map((i) => ({ product_id: i.product_id, quantity: Number(i.quantity), unit_price: Number(i.unit_price || 0) })) });
      }
      setSuccess(true);
      onSaved?.(result);
      setTimeout(() => onClose(), 450);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Transaction could not be saved");
    } finally { setSaving(false); }
  };

  return <div className="vx-tx-backdrop" role="dialog" aria-modal="true"><section className="vx-tx-modal">
    <header className="vx-tx-header"><div><small>Enterprise transaction</small><h2>{title}</h2></div><button onClick={onClose} className="vx-tx-icon" aria-label="Close"><X size={18}/></button></header>
    {error && <div className="vx-tx-error"><AlertTriangle size={16}/><span>{error}</span></div>}
    {success && <div className="vx-tx-success"><CheckCircle2 size={16}/> Saved successfully</div>}
    {loadingMeta ? <div className="vx-tx-loading"><Loader2 size={20} className="spin"/> Loading master data…</div> : <>
      <div className="vx-tx-body">
        {type === "sales" && <label>Customer<select disabled={readonly} value={form.customerId} onChange={(e) => setField("customerId", e.target.value)}><option value="">Walk-in Customer</option>{partners.map((p)=><option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>)}</select></label>}
        {type === "purchase" && <div className="vx-tx-grid"><label>Supplier<select disabled={!!record} value={form.supplier_id} onChange={(e)=>setField("supplier_id",e.target.value)}><option value="">Select supplier</option>{partners.map((p)=><option key={p.id} value={p.id}>{p.name}{p.gstin ? ` · ${p.gstin}` : ""}</option>)}</select></label><label>Invoice No<input disabled={!!record} value={form.invoice_no} onChange={(e)=>setField("invoice_no",e.target.value)}/></label><label>Supplier Invoice No<input disabled={!!record} value={form.supplier_invoice_no} onChange={(e)=>setField("supplier_invoice_no",e.target.value)}/></label><label>Invoice Date<input type="date" value={form.invoice_date} onChange={(e)=>setField("invoice_date",e.target.value)}/></label></div>}
        {type === "inventory" && <div className="vx-tx-grid"><label>Date<input type="date" value={form.entry_date} onChange={(e)=>setField("entry_date",e.target.value)}/></label><label>Operation<select disabled={!!record} value={form.type} onChange={(e)=>setField("type",e.target.value)}><option value="ADJUSTMENT">Stock Adjustment</option><option value="OPENING">Opening Stock</option><option value="COUNT">Stock Count</option></select></label><label>Status<select value={form.status} onChange={(e)=>setField("status",e.target.value)}><option value="COMPLETED">Completed</option><option value="DRAFT">Draft</option></select></label></div>}
        <div className="vx-tx-items"><div className="vx-tx-section-head"><div><b>Items</b><small>Validate each quantity and price before posting</small></div>{!readonly && <button onClick={addItem}><Plus size={14}/> Add line</button>}</div>
          {form.items.map((item, index) => <div className="vx-tx-line" key={index}><select disabled={readonly} value={type === "sales" ? item.productId : item.product_id} onChange={(e)=>chooseProduct(index,e.target.value)}><option value="">Select product</option>{catalog.map((p)=><option key={p.id} value={p.id}>{p.name}{p.code ? ` · ${p.code}` : ""}</option>)}</select><input disabled={readonly} type="number" min="0.001" step="0.001" value={type === "sales" ? item.qty : item.quantity} onChange={(e)=>setItem(index,type === "sales" ? {qty:e.target.value} : {quantity:e.target.value})}/>{type === "sales" ? <><input disabled={readonly} type="number" min="0" step="0.01" value={item.price} onChange={(e)=>setItem(index,{price:e.target.value})}/><input disabled={readonly} type="number" min="0" step="0.01" value={item.discount} onChange={(e)=>setItem(index,{discount:e.target.value})}/></> : type === "purchase" ? <><input disabled={!!record} type="number" min="0" step="0.01" value={item.rate} onChange={(e)=>setItem(index,{rate:e.target.value})}/><input disabled={!!record} type="number" min="0" step="0.01" value={item.tax_amount} onChange={(e)=>setItem(index,{tax_amount:e.target.value})}/></> : <input disabled={!!record} type="number" step="0.001" value={item.unit_price} onChange={(e)=>setItem(index,{unit_price:e.target.value})}/>} {!readonly && <button className="danger" onClick={()=>removeItem(index)} disabled={form.items.length===1}><Trash2 size={15}/></button>}</div>)}
        </div>
        {type === "purchase" && <label>Notes<textarea value={form.notes} onChange={(e)=>setField("notes",e.target.value)} rows={2}/></label>}
        {type === "inventory" && <label>Notes<textarea value={form.notes} onChange={(e)=>setField("notes",e.target.value)} rows={2} placeholder="Reason / reference / count details"/></label>}
        {type === "sales" && <div className="vx-tx-grid payment"><label>Payment Mode<select disabled={readonly} value={form.payment} onChange={(e)=>setField("payment",e.target.value)}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option><option value="CREDIT">Credit</option></select></label><label>Received<input disabled={readonly} type="number" min="0" step="0.01" value={form.payment === "CASH" ? form.cashAmount : form.payment === "CARD" ? form.cardAmount : form.upiAmount} onChange={(e)=>setField(form.payment === "CASH" ? "cashAmount" : form.payment === "CARD" ? "cardAmount" : "upiAmount", e.target.value)}/></label></div>}
        <div className="vx-tx-total"><span>Subtotal <b>{money(totals.subtotal)}</b></span><span>Tax <b>{money(totals.tax)}</b></span><span>Discount <b>{money(totals.discount)}</b></span><strong>Grand Total <b>{money(totals.grand)}</b></strong>{type === "sales" && <>{totals.change > 0 && <span>Change <b>{money(totals.change)}</b></span>}{totals.balance > 0 && <span>Balance <b>{money(totals.balance)}</b></span>}</>}</div>
      </div>
      <footer className="vx-tx-footer"><button className="secondary" onClick={onClose}>Close</button>{!readonly && <button className="primary" disabled={saving || success} onClick={submit}>{saving ? <><Loader2 size={15} className="spin"/> Saving…</> : success ? "Saved" : record ? "Save Changes" : type === "sales" ? "Post Sale" : type === "purchase" ? "Post Purchase" : "Post Inventory"}</button>}</footer>
    </>}
  </section></div>;
}
