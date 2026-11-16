import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn(), printHtml: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post, delete: mocks.del } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { store_id: 1, company_name: "Coffee 1" } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ printHtml: mocks.printHtml, jobs: [], STATUS: { QUEUED: "queued", PRINTING: "printing", DONE: "done" } }) }));
import DealerPaymentBlock from "@/features/sales/dealer/components/DealerPaymentBlock";
import DealerReceipt from "@/features/sales/dealer/DealerReceipt";
import { allocateOldestFirst, paymentsPayload } from "@/features/sales/dealer/utils/dealerPayments";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const INVOICES = [
  { id: 1, bill_no: "D261001-0001", invoice_date: "2026-10-01", total: 200, paid_now: 0, received: 0, returned: 0, balance: 200 },
  { id: 2, bill_no: "D261101-0002", invoice_date: "2026-11-01", total: 200, paid_now: 50, received: 0, returned: 0, balance: 150 },
];

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.get.mockImplementation(async (url) => ({ data: { data:
    url === "/dealer-receipts/dealers" ? [{ customer_id: 9, customer_name: "Dealer One", invoices: 2, due: 350 }]
      : url === "/dealer-receipts/open-invoices" ? INVOICES : [] } }));
  mocks.post.mockResolvedValue({ data: { data: { id: 5, bill_no: "R261116-0001", receipt_date: "2026-11-16", customer_name: "Dealer One", amount: 250, mode: "CASH", allocations: [] } } });
  vi.spyOn(window, "open").mockReturnValue(null);
});
afterEach(cleanup);

it("splits receipts oldest first and sends only real payments", () => {
  expect(allocateOldestFirst(INVOICES, 250)).toEqual({ 1: "200.00", 2: "50.00" });
  expect(allocateOldestFirst(INVOICES, 80)).toEqual({ 1: "80.00", 2: "" });
  expect(paymentsPayload([{ mode: "CASH", amount: "50" }, { mode: "UPI", amount: "" }])).toEqual([
    { mode: "CASH", amount: 50, reference_no: null, card_type_id: null, upi_provider_id: null, cheque_date: null },
  ]);
});

function Harness() {
  const [payments, setPayments] = useState([]);
  return <DealerPaymentBlock total={200} payments={payments} onChange={setPayments} />;
}

it("the invoice payment block: split across modes, the rest stays on credit", async () => {
  render(<Harness />);
  expect(screen.getByText(/whole invoice goes on the dealer's account/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add payment" }));
  fireEvent.change(screen.getByLabelText("Payment 1 amount"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Add payment" }));
  expect(screen.getByLabelText("Payment 2 amount")).toHaveValue(150); // the rest is offered
  fireEvent.change(screen.getByLabelText("Payment 2 amount"), { target: { value: "30" } });
  expect(within(screen.getByRole("status", { name: "Payment balance" })).getByText("120.00")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Payment 2 amount"), { target: { value: "300" } });
  expect(screen.getByText("More than the invoice")).toBeInTheDocument();
});

it("Dealer Receipt: pick a dealer, the amount splits oldest first, and saves with the split", async () => {
  render(<MemoryRouter><TransferActivityProvider><DealerReceipt /></TransferActivityProvider></MemoryRouter>);
  const dealer = await screen.findByLabelText("Dealer");
  fireEvent.mouseDown(dealer);
  fireEvent.click(await screen.findByText(/Dealer One — due/));
  expect(await screen.findByText("D261001-0001")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Amount received"), { target: { value: "250" } });
  expect(screen.getByLabelText("Pay now on D261001-0001")).toHaveValue(200);
  expect(screen.getByLabelText("Pay now on D261101-0002")).toHaveValue(50);
  fireEvent.click(screen.getByRole("button", { name: /Save/ }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/dealer-receipts", expect.objectContaining({
    customer_id: 9, amount: 250, mode: "CASH",
    allocations: [{ dealer_invoice_id: 1, amount: 200 }, { dealer_invoice_id: 2, amount: 50 }],
  })));
});
