/** What the Gift Voucher screen shows and prints. Inline styles only, so the slip prints as drawn. */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateText = (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

export const PAYMENT_CHOICES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
];

/** How long a new voucher lasts: the store's setting, or a number of days for this one. */
export const VALID_DAY_CHOICES = [
  { value: "", label: "Store setting" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
  { value: "0", label: "Never expires" },
];

export const STATE_LABELS = { ACTIVE: "Active", USED: "Used", EXPIRED: "Expired", CANCELLED: "Cancelled" };
export const STATE_COLORS = { ACTIVE: "success", USED: "default", EXPIRED: "warning", CANCELLED: "default" };

export const paymentLabel = (mode) => PAYMENT_CHOICES.find((choice) => choice.value === mode)?.label || "";

/** The request body for selling a voucher; blank fields are left out so the server's defaults apply. */
export const sellPayload = (form) => {
  const body = { amount: Number(form.amount), payment_mode: form.payment_mode };
  if (form.payment_mode !== "CASH" && String(form.payment_reference || "").trim()) body.payment_reference = form.payment_reference.trim();
  if (String(form.buyer_name || "").trim()) body.buyer_name = form.buyer_name.trim();
  if (String(form.buyer_phone || "").trim()) body.buyer_phone = form.buyer_phone.trim();
  if (form.valid_days !== "" && form.valid_days != null) body.valid_days = Number(form.valid_days);
  return body;
};

/** The first thing wrong with the sell form, in plain words; null when it can be saved. */
export const sellProblem = (form) => {
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount < 1) return "Enter the voucher amount (at least ₹1).";
  if (!PAYMENT_CHOICES.some((choice) => choice.value === form.payment_mode)) return "Choose how the customer paid.";
  return null;
};

/** The reason the server gave, or a plain fallback. */
export const voucherErrorMessage = (err, fallback) => {
  const body = err?.response?.data;
  return body?.errors ? Object.values(body.errors).flat()[0] : body?.message || fallback;
};

/** A small slip for the customer: the number to quote at the counter, the value and the last day. */
export const buildVoucherSlipHtml = (voucher, companyInfo = {}) => {
  const store = [companyInfo.storeName, companyInfo.storeAddress, companyInfo.storePhone ? `Phone ${companyInfo.storePhone}` : "", companyInfo.storeGstNo ? `GSTIN ${companyInfo.storeGstNo}` : ""]
    .filter(Boolean).map((line, index) => (index === 0 ? `<div style="font-size:15px;font-weight:700">${esc(line)}</div>` : `<div style="font-size:11px">${esc(line)}</div>`)).join("");
  const valid = voucher.expires_on ? `Valid until ${esc(dateText(voucher.expires_on))}` : "No expiry date";
  const buyer = voucher.buyer_name ? `<div style="font-size:12px;margin-top:6px">For ${esc(voucher.buyer_name)}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Gift voucher ${esc(voucher.display_number)}</title>
<style>@page{size:80mm auto;margin:3mm}body{margin:0;font-family:Tahoma,Arial,sans-serif;color:#000}</style></head>
<body><div style="width:72mm;margin:0 auto;text-align:center;padding:4px 0">
${store}
<div style="border-top:1px dashed #000;border-bottom:1px dashed #000;margin:8px 0;padding:8px 0">
<div style="font-size:13px;letter-spacing:2px;font-weight:700">GIFT VOUCHER</div>
<div style="font-size:26px;font-weight:700;margin:6px 0">&#8377;${esc(money(voucher.original_amount))}</div>
<div style="font-size:13px">Voucher no.</div>
<div style="font-size:20px;font-weight:700;letter-spacing:1px">${esc(voucher.display_number)}</div>
${buyer}
</div>
<div style="font-size:12px;font-weight:700">${valid}</div>
<div style="font-size:11px;margin-top:6px">Give this number at the counter to pay a bill with this voucher. It can be used in parts until the date above.</div>
</div></body></html>`;
};
