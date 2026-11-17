/** Supplier payment modes (the server's SupplierPaymentWriter::MODES). Cash posts to Cash in Hand, the rest to the bank. */
export const SUPPLIER_PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer (NEFT/RTGS/IMPS)" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
];

export const BILL_TYPE_LABELS = { invoice: "Invoice", direct: "Direct Purchase", opening: "Opening bill" };
export const BILL_TYPE_TONES = { invoice: "info", direct: "warning", opening: "default" };

export const billKey = (bill) => `${bill.invoice_type}-${bill.id}`;

const cents = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** Bills oldest first (by bill date, then number), the order a payment is split in. */
export const oldestFirst = (bills) => [...bills].sort((a, b) => String(a.invoice_date || "").localeCompare(String(b.invoice_date || ""))
  || String(a.invoice_no || "").localeCompare(String(b.invoice_no || "")));

/** Splits an amount across bills oldest first, each up to its balance: { [billKey]: "1200.00" | "" }. */
export const allocateSupplierPayment = (bills, amount) => {
  let left = cents(amount);
  return Object.fromEntries(oldestFirst(bills).map((bill) => {
    const part = Math.max(0, Math.min(left, cents(bill.balance)));
    left = cents(left - part);
    return [billKey(bill), part > 0 ? part.toFixed(2) : ""];
  }));
};

/** All the selected bills must be one supplier's: returns that supplier id, or null when they are mixed. */
export const singleSupplier = (bills) => {
  const ids = [...new Set(bills.map((bill) => String(bill.supplier_id ?? "")))];
  return ids.length === 1 && ids[0] !== "" ? Number(ids[0]) : null;
};

/** The save body: the payment, and its split over the bills (empty parts dropped). */
export const supplierPaymentPayload = ({ bills, allocations, amount, mode, date, referenceNo, chequeDate, notes }) => ({
  supplier_id: singleSupplier(bills),
  amount: cents(amount),
  payment_mode: mode,
  payment_date: date || null,
  reference_no: referenceNo?.trim() || null,
  cheque_date: mode === "CHEQUE" ? chequeDate || null : null,
  notes: notes?.trim() || null,
  allocations: oldestFirst(bills)
    .map((bill) => ({ invoice_type: bill.invoice_type, id: bill.id, amount: cents(allocations[billKey(bill)]) }))
    .filter((row) => row.amount > 0),
});

/** Sum of the split, and whether it is more than the amount paid. */
export const allocationTotals = (allocations, amount) => {
  const allocated = cents(Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0));
  return { allocated, advance: cents(Math.max(0, cents(amount) - allocated)), over: allocated > cents(amount) + 0.001 };
};
