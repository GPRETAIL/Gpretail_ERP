const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** ₹ the applied gift vouchers, credit notes and coupons pay on this bill. */
export const giftCreditTotal = (list) => round2((list || []).reduce((sum, row) => sum + Number(row?.amount || 0), 0));

/** The checkout payload part for applied gift vouchers, credit notes and coupons, or nothing when none are applied. */
export const giftCreditPayload = (list) => (list?.length
  ? { vouchers: list.map((row) => ({ number: row.number, amount: row.amount })) }
  : {});

/** A readable message from a gift voucher API error (validation errors first). */
export const giftCreditErrorMessage = (err) => {
  const data = err?.response?.data;
  const first = data?.errors && Object.values(data.errors).flat()[0];
  return first || data?.message || "Could not check this code. Try again.";
};

/** "Credit note", "Gift voucher" or "Coupon" for a payment mode written on a bill, else the mode in plain words. */
export const paymentModeLabel = (mode) => {
  const text = String(mode || "").trim().replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
