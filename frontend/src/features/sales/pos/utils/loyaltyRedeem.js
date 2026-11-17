/** ₹ value of redeeming `points` at `pointValue` ₹ per point, to the paisa. */
export const loyaltyRedeemAmount = (points, pointValue) => Math.round(Math.max(0, Number(points) || 0) * Number(pointValue || 0) * 100) / 100;

/** A readable message from a loyalty API error (validation errors first). */
export const loyaltyErrorMessage = (err) => {
  const data = err?.response?.data;
  const first = data?.errors && Object.values(data.errors).flat()[0];
  return first || data?.message || "Could not complete the loyalty step.";
};

/** The checkout payload part for redeemed points, or nothing when none are applied. */
export const loyaltyRedeemPayload = (value) => (value?.points > 0
  ? { loyaltyRedeem: { points: value.points, ...(value.otpToken ? { otpToken: value.otpToken } : {}) } }
  : {});
