/**
 * The mark on a reprinted bill: a small outlined "DUPLICATE" tag at the top right, with "Reprint #n · date · user"
 * (and the copy label, if one was chosen) under it in the same small size. It sits above the bill's own header in
 * the normal flow, so it never covers the store name or the bill's layout.
 */
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const COPY_LABELS = ["Original for recipient", "Duplicate for transporter", "Triplicate for supplier", "Office copy"];

const when = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

/** "Reprint #2 · 17 Nov 2026, 09:41 pm · Anbu" */
export const reprintLine = ({ count, at, user } = {}) => [count ? `Reprint #${count}` : "Reprint", when(at), user].filter(Boolean).join(" · ");

/** The stamp block; paper "a4" prints a touch larger (9.5pt) than thermal (8pt). */
export const reprintStampHtml = (stamp = {}, { paper = "thermal" } = {}) => {
  const size = paper === "a4" ? "9.5pt" : "8pt";
  const lines = [reprintLine(stamp), stamp.copyLabel].filter(Boolean).map((line) => `<div>${esc(line)}</div>`).join("");
  return `<div class="vx-reprint" style="display:flex;justify-content:flex-end;margin:0 0 2px;">`
    + `<div style="text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:${size};line-height:1.25;color:#000;">`
    + `<span style="display:inline-block;border:0.6pt solid #000;border-radius:2px;padding:0 3px;font-weight:700;letter-spacing:0.5px;">DUPLICATE</span>`
    + `${lines}</div></div>`;
};

/**
 * Puts the stamp at the top of a bill's HTML: inside the receipt / invoice box when there is one (the thermal
 * printer renders only `.receipt`, see renderPrintableHtml.js), else right after <body>, else first.
 */
export const markReprint = (html, stamp, options) => {
  const block = reprintStampHtml(stamp, options);
  const source = String(html || "");
  const open = source.match(/<div class="(?:receipt|invoice)"[^>]*>/i) || source.match(/<body[^>]*>/i);
  if (!open) return block + source;
  const at = open.index + open[0].length;
  return source.slice(0, at) + block + source.slice(at);
};
