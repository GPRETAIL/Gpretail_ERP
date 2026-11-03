// The payslip as printed (web and mobile share it) and as a WhatsApp message.

export const rupees = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const monthLabel = (month) => (month ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "");
const days = (value) => { const n = Number(value) || 0; return Number.isInteger(n) ? String(n) : n.toFixed(1); };
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** A printable payslip (A4 half page): store, employee, days, earnings beside deductions, net pay. */
export function payslipHtml(slip) {
  const s = slip.snapshot || {};
  const earnings = slip.earnings || [];
  const deductions = slip.deductions || [];
  const rows = Array.from({ length: Math.max(earnings.length, deductions.length, 1) }, (_, i) => {
    const e = earnings[i];
    const d = deductions[i];
    return `<tr><td>${e ? escapeHtml(e.name) : ""}</td><td class="n">${e ? rupees(e.amount) : ""}</td><td>${d ? escapeHtml(d.name) : ""}</td><td class="n">${d ? rupees(d.amount) : ""}</td></tr>`;
  }).join("");
  const meta = [
    ["Employee", `${s.name || ""}${s.code ? ` (${s.code})` : ""}`], ["Designation", s.designation || "-"],
    ["Days in month", days(slip.days_in_month)], ["Payable days", days(slip.payable_days)],
    ["Loss of pay days", days(slip.lop_days)], ["Bank account", s.bank_account_no ? `${s.bank_account_no}${s.bank_ifsc ? ` · ${s.bank_ifsc}` : ""}` : "-"],
    ["PF UAN", s.pf_uan || "-"], ["ESI no", s.esi_no || "-"],
  ];
  const metaRows = [];
  for (let i = 0; i < meta.length; i += 2) {
    metaRows.push(`<tr>${meta.slice(i, i + 2).map(([k, v]) => `<td class="k">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td>`).join("")}</tr>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${escapeHtml(s.name || "")} ${escapeHtml(slip.month || "")}</title><style>
body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}h1{font-size:17px;margin:0}h2{font-size:14px;margin:10px 0 4px}
.store{color:#444;margin-top:2px}table{border-collapse:collapse;width:100%}.meta td{padding:3px 8px 3px 0}.meta .k{color:#555;width:18%}
.pay{margin-top:12px}.pay th,.pay td{border:1px solid #999;padding:5px 7px;text-align:left}.pay th{background:#f2f2f2}.n{text-align:right}
.net{margin-top:12px;font-size:15px;font-weight:bold;border:2px solid #111;padding:8px 10px;display:flex;justify-content:space-between}
.foot{margin-top:28px;color:#666;font-size:11px}
</style></head><body>
<h1>${escapeHtml(slip.store?.name || "")}</h1><div class="store">${escapeHtml(slip.store?.address || "")}</div>
<h2>Payslip for ${escapeHtml(slip.month_label || monthLabel(slip.month))}${slip.held ? " (salary on hold)" : ""}</h2>
<table class="meta">${metaRows.join("")}</table>
<table class="pay"><thead><tr><th>Earnings</th><th class="n">Amount (₹)</th><th>Deductions</th><th class="n">Amount (₹)</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><th>Gross earnings</th><th class="n">${rupees(slip.gross_earned)}</th><th>Total deductions</th><th class="n">${rupees(slip.total_deductions)}</th></tr></tfoot></table>
<div class="net"><span>Net pay</span><span>₹ ${rupees(slip.net_pay)}</span></div>
<div class="foot">Employer contributions (not deducted from pay): PF ₹${rupees(slip.employer_pf)} · ESI ₹${rupees(slip.employer_esi)}.${slip.paid_on ? ` Paid on ${escapeHtml(slip.paid_on)}.` : ""} This is a computer-generated payslip.</div>
</body></html>`;
}

/** A WhatsApp message with the payslip summary; the sender picks the chat (or the employee's number when known). */
export function payslipWhatsAppUrl(slip, phoneNumber = "") {
  const digits = String(phoneNumber || "").replace(/\D/g, "").replace(/^0+/, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const s = slip.snapshot || {};
  const text = [
    `Payslip – ${slip.month_label || monthLabel(slip.month)}`,
    `${s.name || ""}${s.code ? ` (${s.code})` : ""}${slip.store?.name ? ` · ${slip.store.name}` : ""}`,
    `Payable days: ${days(slip.payable_days)} of ${days(slip.days_in_month)}`,
    "",
    ...(slip.earnings || []).map((line) => `${line.name}: ₹${rupees(line.amount)}`),
    `Gross: ₹${rupees(slip.gross_earned)}`,
    ...(slip.deductions || []).map((line) => `${line.name}: −₹${rupees(line.amount)}`),
    "",
    `Net pay: ₹${rupees(slip.net_pay)}`,
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
