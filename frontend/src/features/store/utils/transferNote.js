// Shared by Store > Transfer Goods / Stock Inward and Warehouse > Stock Outward.

export const STATUS = {
  DISPATCHED: { label: "In transit", color: "warning" },
  RECEIVED: { label: "Received", color: "success" },
  CANCELLED: { label: "Cancelled", color: "default" },
};
export const FILTERS = [["DISPATCHED", "In transit"], ["RECEIVED", "Received"], ["CANCELLED", "Cancelled"], ["", "All"]];
export const qty = (value) => (value == null ? "-" : Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
export const day = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-");
export const describeLine = (line) => [line.product_name, line.size && `Size ${line.size}`, line.design_no && `Design ${line.design_no}`].filter(Boolean).join(" · ");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** Printable transfer note: what left the sending store, and what arrived if already received. */
export function transferNoteHtml(transfer) {
  const received = Boolean(transfer.received_at);
  const rows = (transfer.items || []).map((line, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(describeLine(line))}</td><td>${escapeHtml(line.product_code || "")}</td><td class="n">${qty(line.quantity)}</td>${received ? `<td class="n">${qty(line.received_qty)}</td><td class="n">${qty(line.damaged_qty)}</td><td class="n">${qty(line.shortage_qty)}</td>` : ""}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(transfer.outward_no)}</title><style>
body{font-family:Arial,sans-serif;font-size:12px;margin:24px}h1{font-size:18px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin-top:12px}
th,td{border:1px solid #999;padding:4px 6px;text-align:left}.n{text-align:right}.meta td{border:none;padding:2px 8px 2px 0}.sign{display:flex;justify-content:space-between;margin-top:48px}
</style></head><body><h1>Stock Transfer Note</h1><table class="meta">
<tr><td><b>Transfer no</b></td><td>${escapeHtml(transfer.outward_no)}</td><td><b>Date</b></td><td>${escapeHtml(day(transfer.outward_date))}</td></tr>
<tr><td><b>From</b></td><td>${escapeHtml(transfer.source_store?.name)}</td><td><b>To</b></td><td>${escapeHtml(transfer.target_store?.name)}</td></tr>
<tr><td><b>Status</b></td><td>${escapeHtml(STATUS[transfer.status]?.label || transfer.status)}</td><td><b>Notes</b></td><td>${escapeHtml(transfer.notes || "")}</td></tr></table>
<table><thead><tr><th>#</th><th>Item</th><th>Code</th><th class="n">Sent</th>${received ? '<th class="n">Received</th><th class="n">Damaged</th><th class="n">Short</th>' : ""}</tr></thead><tbody>${rows}</tbody>
<tfoot><tr><th colspan="3">Total</th><th class="n">${qty(transfer.total_qty)}</th>${received ? `<th class="n">${qty(transfer.received_total)}</th><th class="n">${qty(transfer.damaged_total)}</th><th class="n">${qty(transfer.shortage_qty)}</th>` : ""}</tr></tfoot></table>
<div class="sign"><div>Dispatched by: ${escapeHtml(transfer.creator?.name || "")}</div><div>Received by: ${escapeHtml(transfer.receiver?.name || "________________")}</div></div></body></html>`;
}
