export const APPROVAL_REASONS = {
  damaged_item: "Damaged / defective item",
  price_match: "Price match",
  loyal_customer: "Loyal customer",
  bulk_purchase: "Bulk purchase",
  manager_discretion: "Manager discretion",
  wrong_item: "Wrong item sold",
  customer_complaint: "Customer complaint",
  item_missing: "Item missing / not available",
  bill_lost: "Customer lost the bill / needs a copy",
  otp_not_received: "Customer did not get the OTP / has no phone",
  other: "Other",
};

/** True when an API error is the server asking for a supervisor/manager approval (HTTP 428). */
export const isApprovalRequired = (error) => error?.response?.status === 428 && error?.response?.data?.code === "APPROVAL_REQUIRED";

/**
 * Each approval action has its own single-use token, since one bill can need two (an over-limit discount and an
 * over-limit credit). tokens: { pos_discount, pos_credit } collected so far; returns the save payload with them.
 */
export const withApprovalTokens = (payload, tokens = {}) => ({
  ...payload,
  ...(tokens.pos_discount ? { approvalToken: tokens.pos_discount } : {}),
  ...(tokens.pos_credit ? { creditApprovalToken: tokens.pos_credit } : {}),
  // Loyalty points redeemed without the customer's OTP: the supervisor's token goes with the redemption.
  ...(tokens.loyalty_redeem && payload?.loyaltyRedeem ? { loyaltyRedeem: { ...payload.loyaltyRedeem, approvalToken: tokens.loyalty_redeem } } : {}),
});

/** The dialog's input: { action, details } from the APPROVAL_REQUIRED response. */
export const approvalRequirementFrom = (error) => {
  const data = error?.response?.data || {};
  return { action: data.action, details: data.details || {}, message: data.message };
};
