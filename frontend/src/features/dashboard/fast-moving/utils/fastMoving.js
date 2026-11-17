const pad = (n) => String(n).padStart(2, "0");
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The last 30 days, ending today. */
export const defaultRange = (now = new Date()) => {
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { from: iso(from), to: iso(now) };
};

/** Dashboard "View all": opens the page for the dashboard's own date range when it has one. */
export const fastMovingPath = (from, to) => {
  const params = new URLSearchParams();
  if (from) params.set("from", String(from).slice(0, 10));
  if (to) params.set("to", String(to).slice(0, 10));
  const query = params.toString();
  return `/dashboard/fast-moving${query ? `?${query}` : ""}`;
};

export const qty = (value) => (value === null || value === undefined ? "-"
  : Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 }));

export const shortDate = (value) => (value
  ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

export const MOVEMENT_TONES = { Fast: "success", Medium: "info", Slow: "warning" };

/** Top-line numbers for the period: products, units sold, and how many are fast-moving. */
export const fastMovingSummary = (rows) => ({
  products: rows.length,
  sold: rows.reduce((sum, row) => sum + Number(row.net_sold || 0), 0),
  fast: rows.filter((row) => row.movement === "Fast").length,
  slow: rows.filter((row) => row.movement === "Slow").length,
});
