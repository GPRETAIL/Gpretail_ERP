const cents = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** A ledger's signed opening (+ debit) as the two grid inputs. */
export const toDrCr = (opening) => ({ debit: opening > 0 ? cents(opening).toFixed(2) : "", credit: opening < 0 ? cents(-opening).toFixed(2) : "" });

/** The grid's two inputs back to a signed opening; typing in one side clears the other. */
export const fromDrCr = ({ debit, credit }) => cents(cents(debit) - cents(credit));

/** Totals of the grid as it is being edited: drafts { [id]: {debit, credit} } over the saved rows. */
export function draftTotals(rows, drafts) {
  let debit = 0;
  let credit = 0;
  for (const row of rows) {
    const value = drafts[row.id] ? fromDrCr(drafts[row.id]) : row.opening_balance;
    if (value > 0) debit += value;
    else credit -= value;
  }
  return { debit: cents(debit), credit: cents(credit), difference: cents(debit - credit) };
}

/** Only the ledgers whose opening was changed, as the save body's rows. */
export const changedRows = (rows, drafts) => rows
  .filter((row) => drafts[row.id] && Math.abs(fromDrCr(drafts[row.id]) - row.opening_balance) >= 0.005)
  .map((row) => ({ id: row.id, opening_balance: fromDrCr(drafts[row.id]) }));

/** Excel columns for importing opening bills (UploadImportButton fieldConfig). */
export const OPENING_BILL_IMPORT = {
  aliases: {
    partytype: "party_type", type: "party_type", customerorsupplier: "party_type",
    party: "party", partyname: "party", name: "party", customer: "party", supplier: "party", phone: "party", mobile: "party",
    billno: "bill_no", invoiceno: "bill_no", billnumber: "bill_no",
    billdate: "bill_date", invoicedate: "bill_date", date: "bill_date",
    duedate: "due_date",
    amount: "amount", balance: "amount", due: "amount",
    notes: "notes", remarks: "notes",
  },
  required: ["party", "bill_no", "bill_date", "amount"],
  sampleHeaders: ["Party Type", "Party", "Bill No", "Bill Date", "Due Date", "Amount", "Notes"],
  sampleFileName: "opening_bills_sample.xlsx",
};
