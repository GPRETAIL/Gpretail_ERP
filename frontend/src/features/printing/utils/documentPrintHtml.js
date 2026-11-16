/**
 * A4 print layout for the sales documents that have no receipt template of their own: dealer invoices (tax
 * invoice), dealer returns (credit note), dealer receipts (payment receipt) and customer orders. Store header from
 * /companies/{id} (receiptCompanyInfo.js), customer from the document's customer (phone, gstin, address), and a GST
 * summary worked out from each line's tax amount. Inline styles only, so the PDF renderer draws it as printed.
 */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const money = (v) => num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (v) => (Number.isInteger(num(v)) ? String(num(v)) : num(v).toFixed(3));
const dateText = (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

export const DOCUMENT_TITLES = {
  dealer_invoice: "Tax Invoice",
  dealer_return: "Credit Note",
  dealer_receipt: "Payment Receipt",
  customer_order: "Customer Order",
};

/** One line's taxable value, GST rate and amount; the rate comes from tax ÷ taxable (lines store no rate). */
export const documentLine = (item = {}) => {
  const quantity = num(item.quantity ?? item.qty);
  const price = num(item.price);
  const discount = Math.max(0, num(item.discount));
  const tax = round2(item.tax_amount);
  const total = item.total != null ? round2(item.total) : round2(quantity * price - discount + tax);
  const taxable = round2(total - tax);
  const rate = taxable > 0 ? Math.round((tax / taxable) * 1000) / 10 : 0;
  return {
    name: String(item.product_name || item.product?.name || "-").trim(),
    detail: [item.brand_name, item.style_name, item.size_name, item.colour_name, item.design_no].filter(Boolean).join(" / "),
    hsn: item.product?.hsn_code || "",
    quantity, price, discount, taxable, rate, tax, total,
  };
};

/** GST by rate: taxable value and tax, split half CGST / half SGST (dealer sales here are within the state). */
export const gstSummary = (lines) => Object.values(lines.reduce((acc, line) => {
  if (line.tax <= 0) return acc;
  const key = String(line.rate);
  acc[key] ??= { rate: line.rate, taxable: 0, tax: 0 };
  acc[key].taxable = round2(acc[key].taxable + line.taxable);
  acc[key].tax = round2(acc[key].tax + line.tax);
  return acc;
}, {})).sort((a, b) => a.rate - b.rate);

const th = (text, align = "left") => `<th style="text-align:${align};padding:5px 6px;border:1px solid #9ca3af;background:#f3f4f6;font-size:11px">${esc(text)}</th>`;
const td = (value, align = "left", bold = false) => `<td style="text-align:${align};padding:4px 6px;border:1px solid #d1d5db;font-size:11px;${bold ? "font-weight:700;" : ""}">${value}</td>`;
const totalRow = (label, value, bold = false) => `<tr><td style="padding:3px 10px;${bold ? "font-weight:700;" : ""}">${esc(label)}</td><td style="padding:3px 0;text-align:right;${bold ? "font-weight:700;font-size:14px;" : ""}">₹${money(value)}</td></tr>`;

const header = (company, title, number, date) => `
<div style="display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px">
  <div>
    <div style="font-size:19px;font-weight:700">${esc(company.storeName)}</div>
    ${company.storeAddress ? `<div style="font-size:11px;white-space:pre-line">${esc(company.storeAddress)}</div>` : ""}
    ${company.storePhone ? `<div style="font-size:11px">Phone: ${esc(company.storePhone)}</div>` : ""}
    ${company.storeGstNo ? `<div style="font-size:11px">GSTIN: <b>${esc(company.storeGstNo)}</b></div>` : ""}
  </div>
  <div style="text-align:right">
    <div style="font-size:17px;font-weight:700;letter-spacing:0.5px">${esc(title)}</div>
    <div style="font-size:12px">No: <b>${esc(number)}</b></div>
    <div style="font-size:12px">Date: <b>${esc(dateText(date))}</b></div>
  </div>
</div>`;

const party = (label, doc, extra = "") => {
  const c = doc.customer || {};
  const name = doc.customer_name || c.name || "";
  return `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:10px;font-size:12px">
  <div><div style="color:#4b5563">${esc(label)}</div><div style="font-weight:700;font-size:13px">${esc(c.billing_name || name)}</div>
    ${c.address ? `<div style="white-space:pre-line">${esc([c.address, c.city, c.pincode].filter(Boolean).join(", "))}</div>` : ""}
    ${c.phone ? `<div>Phone: ${esc(c.phone)}</div>` : ""}${c.gstin ? `<div>GSTIN: <b>${esc(c.gstin)}</b></div>` : ""}</div>
  <div style="text-align:right">${extra}</div></div>`;
};

const itemsTable = (lines) => `<table style="width:100%;border-collapse:collapse">
<thead><tr>${th("#", "right")}${th("Item")}${th("HSN")}${th("Qty", "right")}${th("Rate", "right")}${th("Disc", "right")}${th("Taxable", "right")}${th("GST %", "right")}${th("GST", "right")}${th("Amount", "right")}</tr></thead>
<tbody>${lines.map((l, i) => `<tr>${td(i + 1, "right")}${td(`${esc(l.name)}${l.detail ? `<div style="color:#6b7280;font-size:10px">${esc(l.detail)}</div>` : ""}`)}${td(esc(l.hsn))}${td(qty(l.quantity), "right")}${td(money(l.price), "right")}${td(l.discount ? money(l.discount) : "", "right")}${td(money(l.taxable), "right")}${td(l.rate ? `${l.rate}%` : "", "right")}${td(money(l.tax), "right")}${td(money(l.total), "right", true)}</tr>`).join("")
  || `<tr>${td("No items", "center")}</tr>`}</tbody></table>`;

const gstTable = (rows) => (rows.length ? `<table style="border-collapse:collapse;margin-top:10px">
<thead><tr>${th("GST %", "right")}${th("Taxable", "right")}${th("CGST", "right")}${th("SGST", "right")}${th("Total tax", "right")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${td(`${r.rate}%`, "right")}${td(money(r.taxable), "right")}${td(money(r.tax / 2), "right")}${td(money(r.tax / 2), "right")}${td(money(r.tax), "right")}</tr>`).join("")}</tbody></table>` : "");

const signature = (company) => `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:36px;font-size:11px">
<div style="color:#4b5563">This is a computer-generated document.</div>
<div style="text-align:center"><div style="font-weight:700">For ${esc(company.storeName)}</div><div style="margin-top:34px;border-top:1px solid #111;padding-top:2px">Authorised Signatory</div></div></div>`;

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>@page{size:A4;margin:12mm}body{margin:0}</style></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:0 auto;padding:8px">${body}</body></html>`;

const goodsDocument = (type, doc, company) => {
  const lines = (doc.items || []).map(documentLine);
  const number = type === "dealer_return" ? doc.return_no : type === "customer_order" ? doc.order_no : doc.bill_no || doc.invoice_no;
  const date = type === "dealer_return" ? doc.return_date : type === "customer_order" ? doc.order_date : doc.invoice_date || doc.sale_at;
  const subtotal = round2(lines.reduce((s, l) => s + l.taxable, 0));
  const tax = round2(lines.reduce((s, l) => s + l.tax, 0));
  const extra = type === "dealer_return" && doc.dealer_invoice?.invoice_no
    ? `<div>Against invoice: <b>${esc(doc.dealer_invoice.bill_no || doc.dealer_invoice.invoice_no)}</b></div>`
    : type === "customer_order" && doc.delivery_date ? `<div>Delivery by: <b>${esc(dateText(doc.delivery_date))}</b></div>` : "";

  const totals = [totalRow("Taxable value", subtotal), totalRow("GST", tax)];
  if (num(doc.other_charges)) totals.push(totalRow("Other charges", doc.other_charges));
  if (type === "customer_order") {
    if (num(doc.discount_amount)) totals.push(totalRow("Discount", -num(doc.discount_amount)));
    totals.push(totalRow("Order total", doc.net_amount ?? doc.total_amount, true), totalRow("Advance paid", doc.advance_paid), totalRow("Balance due", doc.balance_due, true));
  } else {
    totals.push(totalRow(type === "dealer_return" ? "Credit total" : "Invoice total", doc.grand_total ?? doc.amount, true));
    if (type === "dealer_invoice") {
      totals.push(totalRow("Paid", doc.paid_amount));
      if (num(doc.returned)) totals.push(totalRow("Returned", doc.returned));
      totals.push(totalRow("Balance due", doc.balance, true));
    }
  }
  const payments = type === "dealer_invoice" ? (doc.payments || []).map((p) => `${esc(p.mode)} ₹${money(p.amount)}${p.reference_no ? ` (${esc(p.reference_no)})` : ""}`).join(", ") : "";

  return page(`${DOCUMENT_TITLES[type]} ${number}`, `${header(company, DOCUMENT_TITLES[type], number, date)}
${party(type === "dealer_return" ? "Credit to" : "Bill to", doc, extra)}
${itemsTable(lines)}
<div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
  <div>${gstTable(gstSummary(lines))}${payments ? `<div style="margin-top:8px;font-size:11px">Payments: ${payments}</div>` : ""}
  ${doc.remarks || doc.notes ? `<div style="margin-top:8px;font-size:11px">Note: ${esc(doc.remarks || doc.notes)}</div>` : ""}</div>
  <table style="margin-top:10px;font-size:12px">${totals.join("")}</table>
</div>${signature(company)}`);
};

const receiptDocument = (doc, company) => {
  const rows = (doc.allocations || []).map((a) => `<tr>${td(esc(a.bill_no))}${td(money(a.amount), "right")}</tr>`).join("");
  return page(`Receipt ${doc.bill_no}`, `${header(company, DOCUMENT_TITLES.dealer_receipt, doc.bill_no || doc.receipt_no, doc.receipt_date)}
${party("Received from", doc)}
<div style="font-size:13px;margin:6px 0 10px">Received with thanks the sum of <b>₹${money(doc.amount)}</b> by <b>${esc(doc.mode)}</b>${doc.reference_no ? ` (Ref ${esc(doc.reference_no)}${doc.cheque_date ? `, dated ${esc(dateText(doc.cheque_date))}` : ""})` : ""}.</div>
${rows ? `<table style="border-collapse:collapse;min-width:320px"><thead><tr>${th("Against invoice")}${th("Amount", "right")}</tr></thead><tbody>${rows}</tbody></table>` : ""}
${String(doc.status).toUpperCase() === "CANCELLED" ? `<div style="margin-top:10px;font-weight:700">CANCELLED</div>` : ""}
${doc.notes ? `<div style="margin-top:8px;font-size:11px">Note: ${esc(doc.notes)}</div>` : ""}${signature(company)}`);
};

/** The A4 HTML for a dealer invoice / dealer return / dealer receipt / customer order. */
export const buildDocumentPrintHtml = (type, doc, { companyInfo } = {}) => {
  const company = { storeName: "", storeAddress: "", storePhone: "", storeGstNo: "", ...(companyInfo || {}) };
  if (type === "dealer_receipt") return receiptDocument(doc || {}, company);
  if (!DOCUMENT_TITLES[type]) throw new Error(`No print layout for ${type}`);
  return goodsDocument(type, doc || {}, company);
};
