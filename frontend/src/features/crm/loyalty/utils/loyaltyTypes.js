/** Ledger row types that add points; the rest take points away. */
export const POINTS_IN = ["EARN", "BONUS", "RESTORE", "ADJUST_IN"];

export const TYPE_LABELS = {
  EARN: "Earned", BONUS: "Bonus", RESTORE: "Given back (bill cancelled)", ADJUST_IN: "Added by hand",
  REDEEM: "Redeemed", REVERSAL: "Taken back (bill cancelled)", RETURN: "Taken back (goods returned)", EXPIRE: "Expired", ADJUST_OUT: "Removed by hand",
  ADJUSTMENT: "Adjustment",
};

/** "+10" / "−40" for a ledger row (points are stored as a positive size; the type says which way). */
export const signedPoints = (row) => {
  const points = Math.abs(Number(row?.points) || 0);
  return POINTS_IN.includes(row?.type) ? `+${points}` : `−${points}`;
};

export const DEFAULT_SETTINGS = { enabled: true, spend_per_point: 100, redeem_value: 1, min_points: 100, max_percent: 50, expiry_months: 12, otp_required: true };

export const BONUS_TYPES = [
  { value: "birthday", label: "Customer's birthday month" },
  { value: "anniversary", label: "Customer's anniversary month" },
  { value: "first_purchase", label: "Customer's first purchase" },
  { value: "date_range", label: "Between two dates (offer week)" },
  { value: "min_bill", label: "Bill above an amount" },
];

const dateText = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");

/** "Birthday month: points ×2" / "Bill above ₹4,000: +20 points" */
export const describeBonusRule = (rule) => {
  const when = BONUS_TYPES.find((t) => t.value === rule.type)?.label || rule.type;
  const reward = rule.points ? `+${rule.points} points` : `points ×${Number(rule.multiplier || 1)}`;
  const bill = rule.min_bill && Number(rule.min_bill) > 0 ? ` (bills from ₹${Number(rule.min_bill).toLocaleString("en-IN")})` : "";
  const dates = rule.starts_on || rule.ends_on ? `, ${dateText(rule.starts_on) || "…"} to ${dateText(rule.ends_on) || "…"}` : "";
  return `${when}: ${reward}${bill}${dates}`;
};

/** The API body for a bonus rule form (only the chosen reward is sent). */
export const bonusRulePayload = (form) => ({
  name: form.name.trim(), type: form.type, is_active: Boolean(form.is_active),
  multiplier: form.reward === "multiplier" ? Number(form.multiplier) : null,
  points: form.reward === "points" ? Number(form.points) : null,
  min_bill: form.min_bill === "" || form.min_bill == null ? null : Number(form.min_bill),
  starts_on: form.starts_on || null, ends_on: form.ends_on || null,
});

export const loyaltyApiError = (err) => {
  const data = err?.response?.data;
  return (data?.errors && Object.values(data.errors).flat()[0]) || data?.message || "Something went wrong.";
};
