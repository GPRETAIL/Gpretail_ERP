import { money, voucherErrorMessage, STATE_COLORS, STATE_LABELS } from "@/features/crm/giftvoucher/utils/voucherSlip";

export { money, voucherErrorMessage, STATE_COLORS, STATE_LABELS };

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dateText = (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

/** How long a coupon given by hand lasts: the store's rule, or a number of days for this one. */
export const VALID_DAY_CHOICES = [
  { value: "", label: "Store rule" },
  { value: "7", label: "7 days" },
  { value: "15", label: "15 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "0", label: "Never expires" },
];

export const SOURCE_LABELS = { BILL: "Earned on a bill", MANUAL: "Given by hand" };

/** The request body for giving a coupon; blank fields are left out so the store's rule applies. */
export const issuePayload = (form) => {
  const body = { amount: Number(form.amount), reason: String(form.reason || "").trim() };
  if (String(form.buyer_name || "").trim()) body.buyer_name = form.buyer_name.trim();
  if (String(form.buyer_phone || "").trim()) body.buyer_phone = form.buyer_phone.trim();
  if (form.valid_days !== "" && form.valid_days != null) body.valid_days = Number(form.valid_days);
  if (form.min_bill_amount !== "" && form.min_bill_amount != null) body.min_bill_amount = Number(form.min_bill_amount);
  return body;
};

/** The first thing wrong with the form, in plain words; null when it can be saved. */
export const issueProblem = (form) => {
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount < 1) return "Enter the coupon value (at least ₹1).";
  if (!String(form.reason || "").trim()) return "Say why the coupon is given.";
  return null;
};

/** A small slip for the customer: the number to show on a later bill, the value, the last day and the smallest bill. */
export const buildCouponSlipHtml = (coupon, companyInfo = {}) => {
  const store = [companyInfo.storeName, companyInfo.storeAddress, companyInfo.storePhone ? `Phone ${companyInfo.storePhone}` : ""]
    .filter(Boolean).map((line, index) => (index === 0 ? `<div style="font-size:15px;font-weight:700">${esc(line)}</div>` : `<div style="font-size:11px">${esc(line)}</div>`)).join("");
  const valid = coupon.expires_on ? `Valid until ${esc(dateText(coupon.expires_on))}` : "No expiry date";
  const minimum = Number(coupon.min_bill_amount) > 0 ? `<div style="font-size:11px">Use on a bill of &#8377;${esc(money(coupon.min_bill_amount))} or more.</div>` : "";
  const buyer = coupon.buyer_name ? `<div style="font-size:12px;margin-top:6px">For ${esc(coupon.buyer_name)}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Coupon ${esc(coupon.display_number)}</title>
<style>@page{size:80mm auto;margin:3mm}body{margin:0;font-family:Tahoma,Arial,sans-serif;color:#000}</style></head>
<body><div style="width:72mm;margin:0 auto;text-align:center;padding:4px 0">
${store}
<div style="border-top:1px dashed #000;border-bottom:1px dashed #000;margin:8px 0;padding:8px 0">
<div style="font-size:13px;letter-spacing:2px;font-weight:700">COUPON</div>
<div style="font-size:26px;font-weight:700;margin:6px 0">&#8377;${esc(money(coupon.amount))}</div>
<div style="font-size:13px">Coupon no.</div>
<div style="font-size:20px;font-weight:700;letter-spacing:1px">${esc(coupon.display_number)}</div>
${buyer}
</div>
<div style="font-size:12px;font-weight:700">${valid}</div>
${minimum}
<div style="font-size:11px;margin-top:6px">Show this number on a bill to take its value off. A coupon is used once, in full.</div>
</div></body></html>`;
};
