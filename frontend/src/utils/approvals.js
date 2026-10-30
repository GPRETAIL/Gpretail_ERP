export const APPROVAL_REASONS = {
  damaged_item: "Damaged / defective item",
  price_match: "Price match",
  loyal_customer: "Loyal customer",
  bulk_purchase: "Bulk purchase",
  manager_discretion: "Manager discretion",
  wrong_item: "Wrong item sold",
  customer_complaint: "Customer complaint",
  other: "Other",
};

/** True when an API error is the server asking for a supervisor/manager approval (HTTP 428). */
export const isApprovalRequired = (error) => error?.response?.status === 428 && error?.response?.data?.code === "APPROVAL_REQUIRED";

/** The dialog's input: { action, details } from the APPROVAL_REQUIRED response. */
export const approvalRequirementFrom = (error) => {
  const data = error?.response?.data || {};
  return { action: data.action, details: data.details || {}, message: data.message };
};
