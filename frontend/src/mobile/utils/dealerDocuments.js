/**
 * Dealer statement / invoice / receipt as A4 HTML (turned into a PDF to share on WhatsApp) and the messages that go
 * with them. Plain HTML with inline styles: the PDF renderer (features/printing/utils/htmlToPdf.js) draws it as is.
 */
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const shortDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
export const daysSince = (d, today = new Date()) => (d ? Math.max(0, Math.floor((today - new Date(`${String(d).slice(0, 10)}T00:00:00`)) / 86400000)) : 0);

export const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#111;width:760px;padding:24px;font-size:13px">${body}</body></html>`;
export const header = (store, title, sub) => `<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a8a;padding-bottom:10px;margin-bottom:14px">
<div><div style="font-size:20px;font-weight:700">${esc(store.name)}</div>${store.contact ? `<div style="color:#555">${esc(store.contact)}</div>` : ""}</div>
<div style="text-align:right"><div style="font-size:16px;font-weight:700;color:#1e3a8a">${esc(title)}</div><div style="color:#555">${esc(sub)}</div></div></div>`;
export const table = (head, rows) => `<table style="width:100%;border-collapse:collapse;margin-top:8px"><thead><tr>${head.map(([h, align]) =>
  `<th style="text-align:${align || "left"};background:#eef2ff;padding:6px;border-bottom:1px solid #c7d2fe">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
export const td = (v, align = "left", bold = false) => `<td style="padding:6px;border-bottom:1px solid #eee;text-align:${align};${bold ? "font-weight:700" : ""}">${v}</td>`;
export const payBlock = (store) => (store.upiId ? `<div style="margin-top:16px;padding:10px;border:1px dashed #94a3b8;border-radius:6px">Pay by UPI: <b>${esc(store.upiId)}</b></div>` : "");

/** A dealer's open invoices and what is due on each. */
export const statementHtml = ({ store, dealer, invoices }) => {
  const due = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);
  const rows = invoices.map((i) => `<tr>${td(esc(i.bill_no))}${td(esc(shortDate(i.invoice_date)))}${td(rupees(i.total), "right")}${td(rupees(Number(i.paid_now || 0) + Number(i.received || 0) + Number(i.returned || 0)), "right")}${td(rupees(i.balance), "right", true)}${td(`${daysSince(i.invoice_date)} days`, "right")}</tr>`);
  return page(`Statement ${dealer.customer_name}`, `${header(store, "Statement of dues", `As on ${shortDate(new Date().toISOString())}`)}
<div style="margin-bottom:8px">To: <b>${esc(dealer.customer_name)}</b>${dealer.phone ? ` · ${esc(dealer.phone)}` : ""}</div>
${table([["Invoice"], ["Date"], ["Amount", "right"], ["Paid / returned", "right"], ["Due", "right"], ["Pending", "right"]], rows)}
<div style="text-align:right;font-size:16px;margin-top:12px">Total due: <b>${rupees(due)}</b></div>${payBlock(store)}
<div style="margin-top:20px;color:#555">Please arrange the payment at the earliest. Thank you for your business.</div>`);
};

export const reminderMessage = ({ store, dealer, invoices }) => {
  const due = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);
  const oldest = invoices.reduce((o, i) => (!o || i.invoice_date < o ? i.invoice_date : o), null);
  return `Dear ${dealer.customer_name}, ${rupees(due)} is pending on ${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`
    + (oldest ? ` (oldest ${shortDate(oldest)}, ${daysSince(oldest)} days)` : "")
    + `. Please arrange the payment.${store.upiId ? ` UPI: ${store.upiId}.` : ""} The statement is attached. – ${store.name}`;
};

/** One dealer invoice with its items, payments and balance. */
export const invoiceHtml = ({ store, invoice }) => {
  const rows = (invoice.items || []).map((it, n) => `<tr>${td(n + 1)}${td(esc(it.product_name || "-"))}${td(Number(it.quantity), "right")}${td(rupees(it.price), "right")}${td(rupees(it.discount), "right")}${td(rupees(it.tax_amount), "right")}${td(rupees(it.total), "right", true)}</tr>`);
  const payments = (invoice.payments || []).map((p) => `${esc(p.mode)} ${rupees(p.amount)}${p.reference_no ? ` (${esc(p.reference_no)})` : ""}`).join(", ");
  return page(`Invoice ${invoice.bill_no}`, `${header(store, "Tax Invoice", `${invoice.bill_no} · ${shortDate(invoice.sale_at || invoice.invoice_date)}`)}
<div style="margin-bottom:8px">Bill to: <b>${esc(invoice.customer_name || invoice.customer?.name || "")}</b></div>
${table([["#"], ["Item"], ["Qty", "right"], ["Rate", "right"], ["Discount", "right"], ["Tax", "right"], ["Amount", "right"]], rows)}
<table style="margin-left:auto;margin-top:12px;font-size:14px">
<tr><td style="padding:3px 12px">Invoice total</td><td style="text-align:right"><b>${rupees(invoice.amount ?? invoice.grand_total)}</b></td></tr>
<tr><td style="padding:3px 12px">Paid</td><td style="text-align:right">${rupees(invoice.paid_amount)}</td></tr>
${Number(invoice.returned) > 0 ? `<tr><td style="padding:3px 12px">Returned</td><td style="text-align:right">${rupees(invoice.returned)}</td></tr>` : ""}
<tr><td style="padding:3px 12px">Balance due</td><td style="text-align:right"><b>${rupees(invoice.balance)}</b></td></tr></table>
${payments ? `<div style="margin-top:8px;color:#555">Payments: ${payments}</div>` : ""}${Number(invoice.balance) > 0 ? payBlock(store) : ""}`);
};

export const invoiceMessage = ({ store, invoice }) => `Dear ${invoice.customer_name || "Customer"}, please find invoice ${invoice.bill_no} for ${rupees(invoice.amount ?? invoice.grand_total)}`
  + (Number(invoice.balance) > 0 ? `; ${rupees(invoice.balance)} is due.` : " (paid in full).") + ` – ${store.name}`;

/** A payment received from a dealer, for the dealer. */
export const receiptHtml = ({ store, receipt }) => {
  const rows = (receipt.allocations || []).map((a) => `<tr>${td(esc(a.bill_no))}${td(rupees(a.amount), "right")}</tr>`);
  return page(`Receipt ${receipt.bill_no}`, `${header(store, "Payment receipt", `${receipt.bill_no} · ${shortDate(receipt.receipt_date)}`)}
<div>Received from <b>${esc(receipt.customer_name)}</b> the sum of <b>${rupees(receipt.amount)}</b> by ${esc(receipt.mode)}${receipt.reference_no ? ` (${esc(receipt.reference_no)})` : ""}.</div>
${table([["Against invoice"], ["Amount", "right"]], rows)}`);
};

/** WhatsApp chat link with a message (no file: used where the phone cannot share files). */
export const whatsappLink = (phone, text) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const number = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};
