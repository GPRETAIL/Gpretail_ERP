import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { allocateSupplierPayment, allocationTotals, supplierPaymentPayload } from "@/features/finance/utils/supplierPayments";
import { changedRows, draftTotals } from "@/features/finance/opening-balance/utils/openingBalance";

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, put: mocks.put, post: mocks.post, delete: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/shared/components/UploadImportButton", () => ({ default: () => <button type="button">Import</button> }));
import OpeningBalance from "@/features/finance/opening-balance/OpeningBalance";

const LEDGERS = { rows: [
  { id: 1, name: "Cash in Hand", group_name: "Cash-in-Hand", opening_balance: 0, bills: 0 },
  { id: 2, name: "Capital Account", group_name: "Capital Account", opening_balance: 0, bills: 0 },
  { id: 3, name: "Ravi Mills", group_name: "Sundry Creditors", opening_balance: -6500, bills: 2, party_type: "supplier" },
], total_debit: 0, total_credit: 6500, difference: -6500 };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.get.mockImplementation(async (url) => ({ data: { data: url === "/opening-balances/ledgers" ? LEDGERS : [] } }));
});
afterEach(cleanup);

it("ledger grid: totals follow the edits and only changed ledgers are saved", async () => {
  mocks.put.mockResolvedValue({ data: { message: "Opening balances saved." } });
  render(<MemoryRouter><OpeningBalance /></MemoryRouter>);

  const cash = await screen.findByLabelText("Cash in Hand debit");
  expect(screen.getByText(/from 2 opening bills/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Ravi Mills credit")).toBeNull(); // Set from its bills, not typed here.
  fireEvent.change(cash, { target: { value: "25000" } });
  fireEvent.change(screen.getByLabelText("Capital Account credit"), { target: { value: "18500" } });
  expect(screen.getByText("Openings are balanced.")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save (2)" }));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/opening-balances/ledgers", { rows: [{ id: 1, opening_balance: 25000 }, { id: 2, opening_balance: -18500 }] }));
});

it("supplier bills tab: adds an opening bill for a supplier", async () => {
  mocks.get.mockImplementation(async (url) => ({ data: { data: url === "/suppliers" ? [{ id: 7, name: "Ravi Mills", phone: "9000000001" }] : [] } }));
  mocks.post.mockResolvedValue({ data: { message: "Opening bill added." } });
  render(<MemoryRouter><OpeningBalance /></MemoryRouter>);
  fireEvent.click(screen.getByRole("tab", { name: "Supplier bills" }));
  fireEvent.click(await screen.findByRole("button", { name: "Add bill" }));

  const dialog = screen.getByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText(/Supplier/));
  fireEvent.click(await screen.findByRole("option", { name: /Ravi Mills/ }));
  fireEvent.change(within(dialog).getByLabelText(/Bill No/), { target: { value: "OLD-1" } });
  fireEvent.change(within(dialog).getByLabelText(/Bill Date/), { target: { value: "2026-03-20" } });
  fireEvent.change(within(dialog).getByLabelText(/Amount due/), { target: { value: "5000" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/opening-balances/bills", {
    party_type: "supplier", party_id: 7, bill_no: "OLD-1", bill_date: "2026-03-20", due_date: null, amount: 5000, notes: null,
  }));
});

it("opening grid helpers", () => {
  const rows = [{ id: 1, opening_balance: 100 }, { id: 2, opening_balance: -40 }];
  expect(draftTotals(rows, { 2: { debit: "", credit: "100" } })).toEqual({ debit: 100, credit: 100, difference: 0 });
  expect(changedRows(rows, { 1: { debit: "100.00", credit: "" }, 2: { debit: "", credit: "100" } })).toEqual([{ id: 2, opening_balance: -100 }]);
});

it("supplier payment: split oldest first, the rest stays as an advance, one supplier per payment", () => {
  const bills = [
    { invoice_type: "invoice", id: 4, invoice_no: "PI-2", invoice_date: "2026-10-30", balance: 2000, supplier_id: 7 },
    { invoice_type: "opening", id: 1, invoice_no: "OLD-1", invoice_date: "2026-03-20", balance: 1000, supplier_id: 7 },
  ];
  const allocations = allocateSupplierPayment(bills, 2500);
  expect(allocations).toEqual({ "opening-1": "1000.00", "invoice-4": "1500.00" });
  expect(allocationTotals({ "opening-1": "1000", "invoice-4": "" }, 2500)).toEqual({ allocated: 1000, advance: 1500, over: false });
  expect(supplierPaymentPayload({ bills, allocations, amount: 2500, mode: "CHEQUE", date: "2026-11-18", referenceNo: " 004512 ", chequeDate: "2026-11-20", notes: "" })).toEqual({
    supplier_id: 7, amount: 2500, payment_mode: "CHEQUE", payment_date: "2026-11-18", reference_no: "004512", cheque_date: "2026-11-20", notes: null,
    allocations: [{ invoice_type: "opening", id: 1, amount: 1000 }, { invoice_type: "invoice", id: 4, amount: 1500 }],
  });
  expect(supplierPaymentPayload({ bills: [...bills, { ...bills[0], id: 9, supplier_id: 8 }], allocations: {}, amount: 1, mode: "CASH" }).supplier_id).toBeNull();
});
