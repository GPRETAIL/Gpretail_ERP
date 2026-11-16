/** Payment modes for dealer invoices and Dealer Receipts (the server's DealerInvoicePayment::MODES). */
export const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
];

export const modeLabel = (value) => PAYMENT_MODES.find((m) => m.value === value)?.label || value;

/** The payments as the API takes them (empty rows dropped). */
export const paymentsPayload = (payments) => payments.filter((p) => Number(p.amount) > 0).map((p) => ({
  mode: p.mode, amount: Number(p.amount), reference_no: p.reference_no || null,
  card_type_id: p.card_type_id || null, upi_provider_id: p.upi_provider_id || null, cheque_date: p.cheque_date || null,
}));

/** Splits an amount across invoices, oldest first (the server does the same when no split is sent). */
export const allocateOldestFirst = (invoices, amount) => {
  let left = Math.round(Number(amount || 0) * 100) / 100;
  return Object.fromEntries(invoices.map((inv) => {
    const part = Math.max(0, Math.min(left, inv.balance));
    left = Math.round((left - part) * 100) / 100;
    return [inv.id, part > 0 ? part.toFixed(2) : ""];
  }));
};
