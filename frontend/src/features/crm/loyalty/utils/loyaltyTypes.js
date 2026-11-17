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
