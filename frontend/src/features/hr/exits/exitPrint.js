// Printable exit documents: the full and final settlement statement, and the relieving and experience letters.
import { rupees } from "../payroll/payslipPrint";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const longDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");
const days = (value) => { const n = Number(value) || 0; return Number.isInteger(n) ? String(n) : n.toFixed(1); };

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
body{font-family:Arial,sans-serif;font-size:12.5px;margin:32px;color:#111;line-height:1.5}h1{font-size:18px;margin:0}h2{font-size:15px;margin:18px 0 8px}
.store{color:#444}table{border-collapse:collapse;width:100%}.meta td{padding:3px 8px 3px 0}.meta .k{color:#555;width:20%}
.pay{margin-top:12px}.pay th,.pay td{border:1px solid #999;padding:5px 7px;text-align:left}.pay th{background:#f2f2f2}.n{text-align:right}
.net{margin-top:12px;font-size:15px;font-weight:bold;border:2px solid #111;padding:8px 10px;display:flex;justify-content:space-between}
.notes{margin-top:10px;color:#444;font-size:11.5px}.sign{margin-top:56px;display:flex;justify-content:space-between}.letter p{margin:0 0 12px}
</style></head><body>${body}</body></html>`;

const header = (store) => `<h1>${escapeHtml(store?.name || "")}</h1><div class="store">${escapeHtml(store?.address || "")}${store?.phone ? ` · ${escapeHtml(store.phone)}` : ""}</div>`;

/** The full and final settlement statement, signed by HR and the employee. */
export function settlementHtml(fnf) {
  const s = fnf.summary || {};
  const earnings = fnf.earnings || [];
  const deductions = fnf.deductions || [];
  const rows = Array.from({ length: Math.max(earnings.length, deductions.length, 1) }, (_, i) => {
    const e = earnings[i];
    const d = deductions[i];
    return `<tr><td>${e ? escapeHtml(e.name) : ""}</td><td class="n">${e ? rupees(e.amount) : ""}</td><td>${d ? escapeHtml(d.name) : ""}</td><td class="n">${d ? rupees(d.amount) : ""}</td></tr>`;
  }).join("");
  const meta = [
    ["Employee", `${fnf.employee_name || ""}${fnf.employee_code ? ` (${fnf.employee_code})` : ""}`], ["Designation", fnf.designation || "-"],
    ["Date of joining", longDate(fnf.joining_date) || "-"], ["Last working day", longDate(fnf.last_working_day)],
    ["Service", s.service || "-"], ["Days paid in last month", `${days(s.payable_days)} of ${days(s.days_in_month)}`],
    ["Bank account", fnf.bank?.account_no ? `${fnf.bank.account_no}${fnf.bank.ifsc ? ` · ${fnf.bank.ifsc}` : ""}` : "-"], ["Status", fnf.status],
  ];
  const metaRows = [];
  for (let i = 0; i < meta.length; i += 2) metaRows.push(`<tr>${meta.slice(i, i + 2).map(([k, v]) => `<td class="k">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td>`).join("")}</tr>`);
  const notes = [
    (s.leave || []).filter((l) => l.days > 0).map((l) => `${escapeHtml(l.name)}: ${days(l.days)} day(s) at ₹${rupees(s.day_rate)}`).join(", "),
    s.gratuity_amount > 0 ? `Gratuity: ₹${rupees(s.gratuity_wage)} Basic × 15/26 × ${s.gratuity_years} year(s)` : s.gratuity_note ? `Gratuity: ${escapeHtml(s.gratuity_note)}` : "",
    s.notice_short_days > 0 ? `Notice: ${s.notice_short_days} of ${s.notice_days} day(s) not served${s.notice_waived ? " (waived)" : ""}` : "",
    s.loan_left > 0 ? `Advance/loan balance still owed after this settlement: ₹${rupees(s.loan_left)}` : "",
  ].filter(Boolean);
  return page(`Full and final settlement ${fnf.employee_name || ""}`, `${header(fnf.store)}
<h2>Full and final settlement</h2>
<table class="meta">${metaRows.join("")}</table>
<table class="pay"><thead><tr><th>Earnings</th><th class="n">Amount (₹)</th><th>Deductions</th><th class="n">Amount (₹)</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><th>Total earnings</th><th class="n">${rupees(fnf.gross)}</th><th>Total deductions</th><th class="n">${rupees(fnf.total_deductions)}</th></tr></tfoot></table>
<div class="net"><span>Net payable</span><span>₹ ${rupees(fnf.net)}</span></div>
${notes.length ? `<div class="notes">${notes.join("<br>")}</div>` : ""}
${fnf.paid_on ? `<div class="notes">Paid on ${escapeHtml(longDate(fnf.paid_on))} by ${fnf.pay_mode === "CASH" ? "cash" : "bank transfer"}.</div>` : ""}
<p class="notes">I have received the above amount in full and final settlement of all my dues, and have no further claim on the company.</p>
<div class="sign"><span>For ${escapeHtml(fnf.store?.name || "the company")}</span><span>Employee's signature</span></div>`);
}

const letter = (title, store, body) => page(title, `${header(store)}<div class="letter"><p style="margin-top:18px;text-align:right">Date: ${longDate(new Date().toLocaleDateString("en-CA"))}</p>${body}
<div class="sign"><span>For ${escapeHtml(store?.name || "the company")}<br><br>Authorised signatory</span></div></div>`);

const who = (sep) => `${escapeHtml(sep.employee_name || "")}${sep.employee_code ? ` (Employee code ${escapeHtml(sep.employee_code)})` : ""}`;

/** Relieving letter: confirms the resignation was accepted and the employee was relieved. */
export function relievingLetterHtml(sep, store) {
  const designation = sep.employee?.designation?.name;
  return letter(`Relieving letter ${sep.employee_name || ""}`, store, `
<h2>Relieving letter</h2>
<p>To ${who(sep)},</p>
<p>${sep.type === "RESIGNATION" ? `This is to confirm that your resignation dated ${longDate(sep.applied_on)} has been accepted and you` : "This is to confirm that you"} have been relieved from your duties${designation ? ` as ${escapeHtml(designation)}` : ""} at ${escapeHtml(store?.name || "the company")} at the close of working hours on ${longDate(sep.last_working_day)}.</p>
<p>We thank you for your contribution and wish you the very best for the future.</p>`);
}

/** Experience certificate: period of service and designation. */
export function experienceLetterHtml(sep, store) {
  const designation = sep.employee?.designation?.name;
  return letter(`Experience certificate ${sep.employee_name || ""}`, store, `
<h2>To whom it may concern</h2>
<p>This is to certify that ${who(sep)} worked with ${escapeHtml(store?.name || "us")}${designation ? ` as ${escapeHtml(designation)}` : ""} from ${longDate(sep.employee?.joining_date?.slice?.(0, 10) || sep.employee?.joining_date) || "their date of joining"} to ${longDate(sep.last_working_day)}.</p>
<p>During this period we found their work and conduct satisfactory. We wish them success in their future endeavours.</p>`);
}
