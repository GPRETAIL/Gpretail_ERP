// Income tax: section names and help, financial years, and the Form 16 Part B print.
import { rupees } from "../payroll/payslipPrint";

export const SECTION = {
  HRA: { label: "House rent (HRA)", help: "Rent you pay for where you live. Old regime only." },
  "80C": { label: "80C investments", help: "PPF, ELSS, LIC, tuition fees, home-loan principal… up to ₹1.5 lakh including your PF." },
  "80D": { label: "80D medical insurance", help: "Health insurance premium for you, family and parents." },
  "80CCD1B": { label: "80CCD(1B) NPS", help: "Your own NPS contribution, an extra ₹50,000 over 80C." },
  "24B": { label: "Home-loan interest", help: "Interest on a loan for the house you live in, up to ₹2 lakh." },
  "80E": { label: "80E education loan interest", help: "Interest on a loan for higher studies." },
  "80G": { label: "80G donations", help: "Eligible donations (the amount that qualifies)." },
  OTHER: { label: "Other deductions", help: "Any other deduction your accountant agreed." },
  PREV_SALARY: { label: "Salary from previous employer", help: "Taxable salary from a job earlier this financial year (from their Form 16 / 12B)." },
  PREV_TDS: { label: "TDS by previous employer", help: "Income tax your previous employer deducted this year." },
  PREV_PT: { label: "Professional tax at previous employer", help: "Professional tax already paid this year." },
};

export const PROOF_STATUS = {
  NONE: { label: "No proof", color: "default" },
  SUBMITTED: { label: "Proof sent", color: "warning" },
  VERIFIED: { label: "Verified", color: "success" },
  REJECTED: { label: "Rejected", color: "error" },
};

export const REGIME_LABEL = { NEW: "New regime", OLD: "Old regime" };

/** The financial year of a date (Apr–Mar), as 2026-27. */
export const fyOf = (date = new Date()) => {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

export const fyChoices = () => {
  const current = fyOf();
  const start = Number(current.slice(0, 4));
  return [current, `${start - 1}-${String(start % 100).padStart(2, "0")}`];
};

export const quarterMonths = (fy, quarter) => {
  const start = Number(fy.slice(0, 4));
  const first = [4, 7, 10, 1][quarter - 1];
  const year = quarter === 4 ? start + 1 : start;
  return [0, 1, 2].map((i) => `${year}-${String(first + i).padStart(2, "0")}`);
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** Form 16 Part B (annexure): the salary, exemptions, deductions and tax, and the TDS deposited per quarter. */
export function form16Html(f) {
  const c = f.computation || {};
  const d = c.deductions || {};
  const e = c.exemptions || {};
  const t = c.tax || {};
  const row = (label, amount, strong = false) => `<tr${strong ? ' class="b"' : ""}><td>${escapeHtml(label)}</td><td class="n">${rupees(amount)}</td></tr>`;
  const chapter = Object.entries(d).filter(([k]) => !["standard", "professional_tax"].includes(k) && Number(d[k]) > 0);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Form 16 Part B ${escapeHtml(f.employee?.name)} ${escapeHtml(f.fy)}</title><style>
body{font-family:Arial,sans-serif;font-size:12px;margin:28px;color:#111}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:16px 0 6px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 7px;text-align:left}.n{text-align:right}.b td{font-weight:bold;background:#f4f4f4}
.meta td{border:0;padding:2px 8px 2px 0}.note{color:#555;font-size:11px;margin-top:10px}
</style></head><body>
<h1>FORM No. 16 – PART B (Annexure)</h1>
<div>Details of salary paid and tax deducted · Financial year ${escapeHtml(f.fy)} · Assessment year ${escapeHtml(f.assessment_year)}${f.complete ? "" : " · <b>ESTIMATE: the year is not finished</b>"}</div>
<table class="meta" style="margin-top:8px">
<tr><td><b>Employer</b></td><td>${escapeHtml(f.employer?.name)}, ${escapeHtml(f.employer?.address)}</td><td><b>TAN</b></td><td>${escapeHtml(f.employer?.tan || "-")}</td></tr>
<tr><td><b>Employee</b></td><td>${escapeHtml(f.employee?.name)}${f.employee?.designation ? `, ${escapeHtml(f.employee.designation)}` : ""}</td><td><b>PAN</b></td><td>${escapeHtml(f.employee?.pan || "Not given")}</td></tr>
<tr><td><b>Period</b></td><td>${escapeHtml(f.employee?.from)} to ${escapeHtml(f.employee?.to)}</td><td><b>Regime</b></td><td>${c.regime === "OLD" ? "Old (opted out of 115BAC)" : "New (section 115BAC)"}</td></tr>
</table>
<h2>Computation</h2>
<table>
${row("1. Gross salary (section 17(1)) paid by this employer", f.paid)}
${Number(c.previous_salary) > 0 ? row("   Salary from previous employer", c.previous_salary) : ""}
${row("2. Exempt under section 10: house rent allowance", e.hra || 0)}
${row("   Gratuity and leave encashment on retirement / exit", Number(e.gratuity || 0) + Number(e.leave_on_exit || 0))}
${row("3. Standard deduction (section 16(ia))", d.standard || 0)}
${row("4. Professional tax (section 16(iii))", d.professional_tax || 0)}
${chapter.map(([k, v]) => row(`5. Chapter VI-A / other: ${k}`, v)).join("")}
${row("6. Total taxable income (rounded)", c.taxable, true)}
${row("7. Tax on total income", t.slab_tax || 0)}
${row("8. Rebate under section 87A", t.rebate || 0)}
${row("9. Surcharge", t.surcharge || 0)}
${row("10. Health and education cess", t.cess || 0)}
${row("11. Tax payable", t.total || 0, true)}
${row("12. Tax deducted at source by this employer", f.tds, true)}
${Number(c.tds_deducted) > Number(f.tds) ? row("   (including previous employer's TDS as declared)", c.tds_deducted) : ""}
</table>
<h2>Tax deposited (quarter-wise)</h2>
<table><tr><th>Quarter</th><th class="n">Amount paid</th><th class="n">TDS deducted</th><th>Challans (BSR / date / serial)</th></tr>
${(f.quarters || []).map((q) => `<tr><td>Q${q.quarter}</td><td class="n">${rupees(q.paid)}</td><td class="n">${rupees(q.tds)}</td><td>${(q.challans || []).map((ch) => `${escapeHtml(ch.bsr_code)} / ${escapeHtml(ch.deposited_on)} / ${escapeHtml(ch.challan_no)}`).join("<br>") || "-"}</td></tr>`).join("")}
</table>
<div class="note">Part A of Form 16 is downloaded from TRACES. This annexure is computer-generated from the payroll; please have it checked by your accountant.</div>
</body></html>`;
}
