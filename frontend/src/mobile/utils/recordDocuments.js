import { esc, header, page, payBlock, rupees, shortDate, table, td } from "@/mobile/utils/dealerDocuments";

/**
 * Mobile record pages (sale invoice, purchase bill, supplier, return): the server's records in one plain shape, and the
 * A4 pages and WhatsApp messages made from them for the Share button. Plain HTML with inline styles, like dealerDocuments.
 */
const num = (value) => Number(value || 0);
const when = (value) => (value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");

/** A POS bill (GET /pos-sales/{id}). */
export const normalizeSale = (sale = {}) => {
  const total = num(sale.grand_total);
  const paid = num(sale.paid_amount);
  return {
    number: sale.bill_no || sale.invoice_no || `INV-${sale.id}`,
    date: sale.sale_date || sale.created_at,
    status: String(sale.status || "").toLowerCase(),
    paymentMode: sale.payment_mode || "",
    counter: sale.counter_name || "",
    storeName: sale.store?.name || "",
    customer: { name: sale.customer?.name || sale.customer_name || "Walk-in customer", phone: sale.customer?.phone || "" },
    items: (sale.items || []).map((item) => ({
      name: item.product?.name || item.product_name || "Product",
      qty: num(item.quantity),
      rate: num(item.selling_price),
      amount: num(item.subtotal),
      discount: num(item.discount),
      taxRate: num(item.tax_rate),
      tax: num(item.tax_amount),
    })),
    totals: {
      subtotal: num(sale.subtotal), discount: num(sale.discount_amount), tax: num(sale.tax_amount), roundOff: num(sale.round_off),
      total, paid, change: num(sale.change_amount), balance: sale.remaining_amount != null ? num(sale.remaining_amount) : Math.max(0, total - paid),
    },
  };
};

/**
 * A purchase bill: kind "direct" (GET /direct-purchases/{id}, items cost_price) or "invoice" (GET /invoices/{id}, items
 * rate). Both end up the same: products with quantity, cost, discount, tax and amount, then the totals and what is paid.
 */
export const normalizePurchase = (bill = {}, kind = "direct") => {
  const direct = kind === "direct";
  const total = num(direct ? bill.total_amount : bill.grand_total);
  const paid = num(bill.paid_amount);
  return {
    kind,
    number: (direct ? bill.purchase_no : bill.invoice_no) || `BILL-${bill.id}`,
    supplierBillNo: (direct ? bill.invoice_no : bill.supplier_invoice_no) || "",
    date: direct ? bill.purchase_date : bill.invoice_date,
    status: String(bill.payment_status || "unpaid").toLowerCase(),
    supplier: { id: bill.supplier?.id || bill.supplier_id || null, name: bill.supplier?.name || bill.supplier_name || "Supplier", phone: bill.supplier?.phone || "", gstin: bill.supplier?.gstin || "" },
    items: (bill.items || []).map((item) => ({
      name: item.product?.name || item.product_name || "Product",
      detail: [item.brand?.name, item.color?.name].filter(Boolean).join(" · "),
      qty: num(item.quantity),
      rate: num(direct ? item.cost_price : item.rate),
      discount: num(item.discount),
      tax: num(item.tax_amount),
      amount: num(direct ? item.total_price : item.total),
    })),
    totals: {
      subtotal: num(bill.subtotal), discount: num(bill.discount_amount), tax: num(bill.tax_amount), roundOff: num(bill.round_off),
      total, paid, balance: Math.max(0, total - paid),
    },
  };
};

/** A sales return (GET /pos-returns/{id}). */
export const normalizeReturn = (ret = {}) => ({
  number: ret.display_return_no || ret.return_no || `RR/${ret.id}`,
  date: ret.return_date || ret.created_at,
  status: String(ret.status || "completed").toLowerCase(),
  against: ret.pos_sale?.invoice_no || ret.posSale?.invoice_no || "",
  refundMode: ret.refund_mode || "",
  customer: { name: ret.customer?.name || "Walk-in customer", phone: ret.customer?.phone || "" },
  items: (ret.items || []).map((item) => ({ name: item.product?.name || item.product_name || "Product", qty: num(item.quantity), rate: num(item.refund_price), amount: num(item.subtotal) })),
  total: num(ret.total_refund),
});

const totalsTable = (rows) => `<table style="margin-left:auto;margin-top:12px;font-size:14px">${rows.filter(([, value, always]) => always || num(value) !== 0)
  .map(([label, value, , bold]) => `<tr><td style="padding:3px 12px">${esc(label)}</td><td style="text-align:right">${bold ? "<b>" : ""}${rupees(value)}${bold ? "</b>" : ""}</td></tr>`).join("")}</table>`;

/** The sale invoice as an A4 page. */
export const saleHtml = ({ store, doc }) => {
  const rows = doc.items.map((it, n) => `<tr>${td(n + 1)}${td(esc(it.name))}${td(it.qty, "right")}${td(rupees(it.rate), "right")}${td(rupees(it.discount), "right")}${td(`${rupees(it.tax)}${it.taxRate ? ` (${it.taxRate}%)` : ""}`, "right")}${td(rupees(it.amount), "right")}</tr>`);
  const t = doc.totals;
  return page(`Invoice ${doc.number}`, `${header(store, "Invoice", `${doc.number} · ${when(doc.date)}`)}
<div style="margin-bottom:8px">Bill to: <b>${esc(doc.customer.name)}</b>${doc.customer.phone ? ` · ${esc(doc.customer.phone)}` : ""}</div>
${table([["#"], ["Item"], ["Qty", "right"], ["Rate", "right"], ["Discount", "right"], ["Tax", "right"], ["Amount", "right"]], rows)}
${totalsTable([["Subtotal", t.subtotal, true], ["Discount", t.discount], ["Tax", t.tax], ["Round off", t.roundOff], ["Total", t.total, true, true], ["Received", t.paid, true], ["Balance due", t.balance, true, true]])}
${t.balance > 0 ? payBlock(store) : ""}<div style="margin-top:20px;color:#555">Thank you for shopping with us.</div>`);
};

export const saleMessage = ({ store, doc }) => `Dear ${doc.customer.name}, thank you for shopping with us. Invoice ${doc.number} for ${rupees(doc.totals.total)}`
  + (doc.totals.balance > 0 ? `; ${rupees(doc.totals.balance)} is due.${store.upiId ? ` UPI: ${store.upiId}.` : ""}` : " is paid in full.") + ` – ${store.name}`;

/** The purchase bill as an A4 page: products with quantity, cost, discount and tax, then the totals. */
export const purchaseHtml = ({ store, doc }) => {
  const rows = doc.items.map((it, n) => `<tr>${td(n + 1)}${td(`${esc(it.name)}${it.detail ? `<br><span style="color:#666;font-size:11px">${esc(it.detail)}</span>` : ""}`)}${td(it.qty, "right")}${td(rupees(it.rate), "right")}${td(rupees(it.discount), "right")}${td(rupees(it.tax), "right")}${td(rupees(it.amount), "right")}</tr>`);
  const t = doc.totals;
  return page(`Purchase ${doc.number}`, `${header(store, "Purchase bill", `${doc.number} · ${shortDate(doc.date)}`)}
<div style="margin-bottom:8px">Supplier: <b>${esc(doc.supplier.name)}</b>${doc.supplier.gstin ? ` · GSTIN ${esc(doc.supplier.gstin)}` : ""}${doc.supplierBillNo ? ` · Their bill ${esc(doc.supplierBillNo)}` : ""}</div>
${table([["#"], ["Product"], ["Qty", "right"], ["Cost", "right"], ["Discount", "right"], ["Tax", "right"], ["Amount", "right"]], rows)}
${totalsTable([["Subtotal", t.subtotal, true], ["Discount", t.discount], ["Tax", t.tax], ["Round off", t.roundOff], ["Total", t.total, true, true], ["Paid", t.paid, true], ["Balance to pay", t.balance, true, true]])}`);
};

export const purchaseMessage = ({ store, doc }) => `Purchase bill ${doc.number} from ${doc.supplier.name} dated ${shortDate(doc.date)}: ${rupees(doc.totals.total)}`
  + (doc.totals.balance > 0 ? `, ${rupees(doc.totals.balance)} still to pay.` : ", paid in full.") + ` – ${store.name}`;

/** The supplier's open bills and what is still to be paid to them, for the supplier. */
export const supplierStatementHtml = ({ store, supplier, bills }) => {
  const rows = bills.map((b) => `<tr>${td(esc(b.number))}${td(esc(shortDate(b.date)))}${td(rupees(b.totals.total), "right")}${td(rupees(b.totals.paid), "right")}${td(rupees(b.totals.balance), "right")}</tr>`);
  const due = bills.reduce((sum, b) => sum + b.totals.balance, 0);
  return page(`Statement ${supplier.name}`, `${header(store, "Statement of payables", `As on ${shortDate(new Date().toISOString())}`)}
<div style="margin-bottom:8px">Supplier: <b>${esc(supplier.name)}</b>${supplier.phone ? ` · ${esc(supplier.phone)}` : ""}</div>
${table([["Bill"], ["Date"], ["Amount", "right"], ["Paid", "right"], ["To pay", "right"]], rows)}
<div style="text-align:right;font-size:16px;margin-top:12px">Total to pay: <b>${rupees(due)}</b></div>`);
};

export const supplierMessage = ({ store, supplier, bills }) => {
  const due = bills.reduce((sum, b) => sum + b.totals.balance, 0);
  return `Dear ${supplier.name}, our account statement is attached: ${rupees(due)} is to be paid on ${bills.length} bill${bills.length === 1 ? "" : "s"}. – ${store.name}`;
};

/** The sales return as a credit note page for the customer. */
export const returnHtml = ({ store, doc }) => {
  const rows = doc.items.map((it, n) => `<tr>${td(n + 1)}${td(esc(it.name))}${td(it.qty, "right")}${td(rupees(it.rate), "right")}${td(rupees(it.amount), "right")}</tr>`);
  return page(`Return ${doc.number}`, `${header(store, "Return", `${doc.number} · ${shortDate(doc.date)}`)}
<div style="margin-bottom:8px">Customer: <b>${esc(doc.customer.name)}</b>${doc.against ? ` · Against ${esc(doc.against)}` : ""}</div>
${table([["#"], ["Item"], ["Qty", "right"], ["Refund rate", "right"], ["Amount", "right"]], rows)}
${totalsTable([["Total refund", doc.total, true, true]])}${doc.refundMode ? `<div style="margin-top:8px;color:#555">Refunded by ${esc(doc.refundMode)}</div>` : ""}`);
};

export const returnMessage = ({ store, doc }) => `Dear ${doc.customer.name}, your return ${doc.number}${doc.against ? ` against ${doc.against}` : ""} is recorded: ${rupees(doc.total)} refunded. – ${store.name}`;

/** Colour of a payment or bill status word on the record pages. */
export const STATUS_TONES = { paid: "#15803d", settled: "#15803d", completed: "#15803d", partial: "#b45309", unsettled: "#b45309", credit: "#be123c", unpaid: "#be123c", cancelled: "#64748b", returned: "#64748b" };

export { rupees, shortDate, when };
