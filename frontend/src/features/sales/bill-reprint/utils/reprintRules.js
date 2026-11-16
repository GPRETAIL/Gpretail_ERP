/** The approval a cashier asks for before reprinting an earlier day's bill (ApprovalDialog's requirement). */
export const reprintApprovalRequirement = (row, reason = "") => ({
  action: "bill_reprint",
  details: { doc_type: row.type, doc_label: row.type_label, bill_no: row.number, bill_date: row.business_date, amount: row.amount, reason },
});

/** A readable message from a print or log failure (validation errors first, e.g. a missing reason). */
export const reprintErrorMessage = (err) => {
  const data = err?.response?.data;
  const first = data?.errors && Object.values(data.errors).flat()[0];
  return first || data?.message || err?.message || "Could not reprint.";
};

export const LAST_BILL_REASON = "Last bill reprinted at the counter";

/**
 * A one-click reprint from another screen (POS "Last Bill", Dealer Receipt's Print): the same reprint as Sales > Bill
 * Reprint (store format, DUPLICATE mark, logged). A repeat reprint is logged with the given reason; an earlier day's
 * bill is sent to Bill Reprint for a supervisor's approval. print: useBillReprint().print.
 */
export const quickReprint = async ({ api, print, type, id, reason }) => {
  const row = (await api.get(`/bill-reprints/${type}/${id}`)).data?.data;
  if (!row) throw new Error("Document not found.");
  if (row.approval_required) throw new Error("This document is from an earlier day. Reprint it from Sales > Bill Reprint with a supervisor's approval.");
  return print(row, { reason: row.reason_required ? reason : "" });
};

/** POS "Last Bill": latestPosDocument is { type: "sale" | "return", id }. */
export const reprintLastBill = ({ api, print, document }) => quickReprint({
  api, print, type: document?.type === "return" ? "pos_return" : "pos_sale", id: document?.id, reason: LAST_BILL_REASON,
});
