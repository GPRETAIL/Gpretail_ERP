/** Card types / UPI providers from /configurations/... as select options. */
export const configOptions = (rows) => (rows || []).map((row) => ({ value: String(row.id), label: String(row.name || "").trim() }));

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Why a checkout payment cannot be saved yet, or null. totals: computePaymentTotalsFromForm(...) with the loyalty
 * amount. Card and UPI together cannot exceed what is left after cash and points; each needs its type / provider;
 * what is received must cover the bill.
 */
export const checkoutPaymentProblem = (form, totals) => {
  const { netAmount, cashAmount, cardAmount, upiAmount, loyaltyAmount = 0, receivedAmount } = totals;
  const nonCashLimit = netAmount > 0 ? Math.max(netAmount - cashAmount - loyaltyAmount, 0) : 0;
  if (netAmount > 0 && cardAmount + upiAmount > nonCashLimit + 0.005) return `Card and UPI cannot be more than the balance (${money(nonCashLimit)}).`;
  if (cardAmount > 0 && !form.cardTypeId) return "Select the card type.";
  if (upiAmount > 0 && !form.upiProviderId) return "Select the UPI provider.";
  if (netAmount > 0 && receivedAmount + 0.005 < netAmount) return `Received ₹${money(receivedAmount)} is less than the bill ₹${money(netAmount)}.`;
  return null;
};

/** The checkout payload part for a confirmed payment (POS Old adds paidCash itself). */
export const checkoutPaymentPayload = (payment) => ({
  cashAmount: payment.cashAmount, cardAmount: payment.cardAmount, cardTypeId: payment.cardTypeId,
  upiAmount: payment.upiAmount, upiProviderId: payment.upiProviderId,
});
