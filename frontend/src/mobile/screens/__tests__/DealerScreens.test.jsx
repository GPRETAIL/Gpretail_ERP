import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), pdf: vi.fn(), share: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { store_id: 1, company_id: 1, company_name: "Coffee 1" } } }) }));
vi.mock("@/features/printing/utils/htmlToPdf", () => ({ getHtmlAsPdfBlob: mocks.pdf, downloadHtmlAsPdf: vi.fn() }));
import DealerDuesScreen from "@/mobile/screens/DealerDuesScreen";
import DealerInvoicesScreen from "@/mobile/screens/DealerInvoicesScreen";
import { reminderMessage, whatsappLink } from "@/mobile/utils/dealerDocuments";

const DEALER = { customer_id: 9, customer_name: "Ravi Traders", phone: "9876543210", invoices: 2, due: 1200, oldest: "2026-10-12" };
const INVOICES = [
  { id: 1, bill_no: "D261012-0001", invoice_date: "2026-10-12", total: 1000, paid_now: 0, received: 0, returned: 0, balance: 1000 },
  { id: 2, bill_no: "D261101-0004", invoice_date: "2026-11-01", total: 500, paid_now: 300, received: 0, returned: 0, balance: 200 },
];

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.get.mockImplementation(async (url) => ({ data: { data:
    url === "/dealer-receipts/dealers" ? [DEALER]
      : url === "/dealer-receipts/open-invoices" ? INVOICES
        : url === "/sales-customization" ? { paymentUpiId: "coffee@upi" }
          : url === "/dealer-invoices" ? [{ id: 7, bill_no: "D261116-0001", customer_name: "Ravi Traders", amount: 1000, balance: 200, payment_status: "Part paid", sale_at: "2026-11-16 10:00:00", status: "COMPLETED" }]
            : url === "/dealer-invoices/7" ? { id: 7, bill_no: "D261116-0001", customer_name: "Ravi Traders", customer: { phone: "9876543210" }, amount: 1000, paid_amount: 800, balance: 200, items: [] }
              : null } }));
  mocks.pdf.mockImplementation(async (_html, filename) => new File(["%PDF"], filename, { type: "application/pdf" }));
  mocks.share.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", { value: mocks.share, configurable: true });
  Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
});
afterEach(cleanup);

it("builds the reminder text and a WhatsApp link", () => {
  const text = reminderMessage({ store: { name: "Coffee 1", upiId: "coffee@upi" }, dealer: DEALER, invoices: INVOICES });
  expect(text).toMatch(/^Dear Ravi Traders, ₹1,200\.00 is pending on 2 invoices \(oldest 12 Oct 2026, \d+ days\)\. Please arrange the payment\. UPI: coffee@upi\./);
  expect(whatsappLink("98765 43210", "Hi")).toBe("https://wa.me/919876543210?text=Hi");
});

it("Dealer Dues: open a dealer and share the statement PDF with the reminder on WhatsApp", async () => {
  render(<DealerDuesScreen />);
  fireEvent.click(await screen.findByText("Ravi Traders"));
  expect(await screen.findByText("D261012-0001")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Send reminder" }));
  const message = screen.getByLabelText("Message");
  expect(message.value).toContain("₹1,200.00 is pending on 2 invoices");
  fireEvent.click(screen.getByRole("button", { name: "Share on WhatsApp" }));

  await waitFor(() => expect(mocks.share).toHaveBeenCalledTimes(1));
  const shared = mocks.share.mock.calls[0][0];
  expect(shared.files[0].name).toBe("Statement-Ravi-Traders.pdf");
  expect(shared.text).toContain("Ravi Traders");
  expect(mocks.pdf.mock.calls[0][0]).toContain("D261101-0004");
  expect(await screen.findByText("Reminder shared.")).toBeInTheDocument();
});

it("Dealer Dues: collect a payment as a Dealer Receipt", async () => {
  mocks.post.mockResolvedValue({ data: { data: { id: 3, bill_no: "R261117-0001", amount: 500, customer_name: "Ravi Traders", allocations: [] } } });
  render(<DealerDuesScreen />);
  fireEvent.click(await screen.findByText("Ravi Traders"));
  await screen.findByText("D261012-0001");
  fireEvent.click(screen.getByRole("button", { name: "Collect payment" }));
  fireEvent.change(screen.getByLabelText("Amount received"), { target: { value: "500" } });
  fireEvent.click(screen.getByRole("button", { name: "Save payment" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/dealer-receipts", { customer_id: 9, amount: 500, mode: "CASH", reference_no: null }));
  expect(await screen.findByRole("button", { name: /Share receipt R261117-0001/ })).toBeInTheDocument();
});

it("Dealer Invoices: share one invoice as a PDF", async () => {
  render(<DealerInvoicesScreen />);
  fireEvent.click(await screen.findByRole("button", { name: "Share D261116-0001" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledTimes(1));
  expect(mocks.share.mock.calls[0][0].files[0].name).toBe("Invoice-D261116-0001.pdf");
  expect(mocks.share.mock.calls[0][0].text).toContain("₹200.00 is due");
});
