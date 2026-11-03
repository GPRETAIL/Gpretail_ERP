// Shared by Store > Purchase Order (register and editor).

export const PO_STATUS = {
  DRAFT: { label: "Draft", color: "default" },
  APPROVED: { label: "Approved", color: "primary" },
  CLOSED: { label: "Closed", color: "success" },
  CANCELLED: { label: "Cancelled", color: "error" },
};
export const PO_FILTERS = [["DRAFT", "Draft"], ["APPROVED", "Approved"], ["CLOSED", "Closed"], ["CANCELLED", "Cancelled"], ["", "All"]];

export const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const qty = (value) => (value == null ? "-" : Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
export const day = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-");
export const lineLabel = (line) => [line.product?.name || line.product_name || "Item", line.variant?.size?.name && `Size ${line.variant.size.name}`, line.variant?.design_no && `Design ${line.variant.design_no}`].filter(Boolean).join(" · ");
/** Approved and some goods already in (Direct Purchase received against it), but not all. */
export const isPartReceived = (order) => order?.status === "APPROVED" && Number(order?.received_qty ?? (order?.items || []).reduce((sum, line) => sum + Number(line.received_qty || 0), 0)) > 0;
export const statusLabel = (order) => (isPartReceived(order) ? "Part received" : PO_STATUS[order?.status]?.label || order?.status);
export const statusColor = (order) => (isPartReceived(order) ? "warning" : PO_STATUS[order?.status]?.color || "default");

/**
 * A WhatsApp chat with the supplier, the order typed in; the buyer reviews and sends it themselves. Indian
 * 10-digit numbers get the 91 country code; with no number WhatsApp asks whom to send it to.
 */
export function purchaseOrderWhatsAppUrl(order, storeName) {
  const digits = String(order?.supplier?.phone || "").replace(/\D/g, "").replace(/^0+/, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const lines = (order?.items || []).map((line, index) => `${index + 1}. ${lineLabel(line)}${line.product?.code ? ` (${line.product.code})` : ""} - ${qty(line.quantity)} @ ₹${money(line.unit_cost)}`);
  const text = [
    `Purchase Order ${order?.po_no || ""}${storeName ? ` from ${storeName}` : ""}`,
    `Date: ${day(order?.po_date)}${order?.expected_date ? ` · Expected by ${day(order.expected_date)}` : ""}`,
    "",
    ...lines,
    "",
    `Total: ${qty(order?.total_qty)} pcs · ₹${money(order?.total_amount)}`,
    ...(order?.notes ? [`Notes: ${order.notes}`] : []),
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** Printable purchase order for the supplier. */
export function purchaseOrderHtml(order, storeName) {
  const rows = (order.items || []).map((line, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(lineLabel(line))}</td><td>${escapeHtml(line.product?.code || "")}</td><td class="n">${qty(line.quantity)}</td><td class="n">${money(line.unit_cost)}</td><td class="n">${money(line.amount)}</td></tr>`).join("");
  const supplier = order.supplier || {};
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(order.po_no)}</title><style>
body{font-family:Arial,sans-serif;font-size:12px;margin:24px}h1{font-size:18px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin-top:12px}
th,td{border:1px solid #999;padding:4px 6px;text-align:left}.n{text-align:right}.meta td{border:none;padding:2px 8px 2px 0}.sign{display:flex;justify-content:space-between;margin-top:48px}
</style></head><body><h1>Purchase Order</h1><div>${escapeHtml(storeName || "")}</div><table class="meta">
<tr><td><b>PO no</b></td><td>${escapeHtml(order.po_no)}</td><td><b>Date</b></td><td>${escapeHtml(day(order.po_date))}</td></tr>
<tr><td><b>Supplier</b></td><td>${escapeHtml(supplier.name || "")}${supplier.gstin ? ` (GSTIN ${escapeHtml(supplier.gstin)})` : ""}</td><td><b>Expected by</b></td><td>${escapeHtml(day(order.expected_date))}</td></tr>
<tr><td><b>Status</b></td><td>${escapeHtml(PO_STATUS[order.status]?.label || order.status)}</td><td><b>Notes</b></td><td>${escapeHtml(order.notes || "")}</td></tr></table>
<table><thead><tr><th>#</th><th>Item</th><th>Code</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><th colspan="3">Total</th><th class="n">${qty(order.total_qty)}</th><th></th><th class="n">${money(order.total_amount)}</th></tr></tfoot></table>
<div class="sign"><div>Prepared by: ${escapeHtml(order.creator?.name || "")}</div><div>Approved by: ${escapeHtml(order.approver?.name || "________________")}</div></div></body></html>`;
}
