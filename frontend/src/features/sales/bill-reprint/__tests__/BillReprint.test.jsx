import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), printHtml: vi.fn(), jobs: [], toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 5, name: "Anbu", role: "cashier", store_id: 1 } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: mocks.toast }));
vi.mock("@/shared/api/realtimeClient", () => ({ listen: vi.fn(() => () => {}), personalChannel: vi.fn(() => "user.5") }));
vi.mock("@/features/printing/utils/receiptCompanyInfo", () => ({
  fetchReceiptCompanyInfo: vi.fn().mockResolvedValue({ storeName: "Coffee 1", storeAddress: "", storePhone: "", storeGstNo: "33ABCDE1234F1Z5" }),
  requireReceiptStoreName: (info) => info.storeName,
  getReceiptCompanyId: () => 1,
}));
vi.mock("@/features/printing/context/PrintContext", () => ({
  usePrintContext: () => ({ printHtml: mocks.printHtml, jobs: mocks.jobs, STATUS: { QUEUED: "queued", PRINTING: "printing", DONE: "done", FAILED: "failed", CANCELLED: "cancelled" } }),
}));
import BillReprint from "@/features/sales/bill-reprint/BillReprint";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const ROW = { type: "dealer_invoice", type_label: "Dealer invoice", id: 7, store_id: 1, number: "D261116-0001", date: "2026-11-16", business_date: "2026-11-16",
  customer_name: "Ravi Traders", customer_phone: "9876543210", amount: 1050, status: "COMPLETED", print_count: 0, reason_required: false, approval_required: false, copy_labels: true };
const SALE = { ...ROW, type: "pos_sale", type_label: "POS bill", id: 9, number: "261116-0009", customer_name: "Walk-in Customer", amount: 300 };
const INVOICE = { id: 7, bill_no: "D261116-0001", invoice_date: "2026-11-16", grand_total: 1050, balance: 0, customer: { name: "Ravi Traders", phone: "9876543210" },
  items: [{ product_name: "Shirt", quantity: 2, price: 500, tax_amount: 50, total: 1050 }] };

let printed;
beforeEach(() => {
  [mocks.get, mocks.post, mocks.printHtml, ...Object.values(mocks.toast)].forEach((m) => m.mockReset());
  mocks.jobs.length = 0;
  printed = 0;
  mocks.get.mockImplementation(async (url) => ({ data: { data:
    url === "/bill-reprints" ? [ROW, SALE]
      : url === "/bill-reprints/dealer_invoice/7" ? { ...ROW, print_count: printed, reason_required: printed >= 1 }
        : url === "/dealer-invoices/7" ? INVOICE
          : url === "/sales-customization" ? { printMode: "direct" }
            : null } }));
  mocks.post.mockImplementation(async () => { printed += 1; return { data: { data: { id: printed, count: printed } } }; });
  // The connector finishes each job as it is queued.
  mocks.printHtml.mockImplementation(async () => {
    const id = `pj-${mocks.jobs.length + 1}`;
    mocks.jobs.push({ id, status: "done" });
    return id;
  });
});
afterEach(cleanup);

const renderPage = () => render(<MemoryRouter><TransferActivityProvider><BillReprint /></TransferActivityProvider></MemoryRouter>);

it("lists every document type and reprints one in the store format with a small DUPLICATE mark, then logs it", async () => {
  renderPage();
  expect(await screen.findByText("D261116-0001")).toBeInTheDocument();
  expect(screen.getByText("261116-0009")).toBeInTheDocument();
  expect(mocks.get).toHaveBeenCalledWith("/bill-reprints", expect.objectContaining({ params: expect.objectContaining({ from: expect.any(String), to: expect.any(String) }) }));

  fireEvent.click(screen.getByRole("button", { name: "Reprint D261116-0001" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByRole("combobox"));
  fireEvent.click(await screen.findByRole("option", { name: "Duplicate for transporter" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/bill-reprints/dealer_invoice/7/log",
    { copy_label: "Duplicate for transporter", reason: null, channel: "print" }, { storeScopeId: 1 }));
  const [html, options] = mocks.printHtml.mock.calls[0];
  expect(html).toContain("Tax Invoice");
  expect(html).toContain("DUPLICATE");
  expect(html).toContain("Reprint #1");
  expect(html).toContain("Anbu");
  expect(html).toMatch(/font-size:9\.5pt/);
  expect(options).toMatchObject({ docType: "dealer_invoice", copies: 1, companyId: 1 });
  expect(mocks.toast.success).toHaveBeenCalledWith("Reprinted D261116-0001.");
});

it("a failed print is not logged", async () => {
  mocks.printHtml.mockImplementation(async () => {
    mocks.jobs.push({ id: "pj-x", status: "failed", error: "Printer offline" });
    return "pj-x";
  });
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Reprint D261116-0001" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Print" }));
  await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Printer offline"));
  expect(mocks.post).not.toHaveBeenCalled();
});

it("asks for a reason once a bill was reprinted before", async () => {
  mocks.get.mockImplementation(async (url) => ({ data: { data: url === "/bill-reprints" ? [{ ...ROW, print_count: 1, reason_required: true }] : url === "/dealer-invoices/7" ? INVOICE : {} } }));
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Reprint D261116-0001" }));
  const dialog = await screen.findByRole("dialog");
  const printButton = within(dialog).getByRole("button", { name: "Print" });
  expect(printButton).toBeDisabled();
  const reason = within(dialog).getByLabelText(/Reason for reprint/);
  fireEvent.change(reason, { target: { value: "Customer lost it" } });
  // Enter in the reason box submits the dialog's form (the app's Enter-to-next-field handler leaves it alone).
  expect(reason.closest("form")).toHaveAttribute("data-enter-ignore", "true");
  fireEvent.submit(reason.closest("form"));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/bill-reprints/dealer_invoice/7/log", expect.objectContaining({ reason: "Customer lost it" }), { storeScopeId: 1 }));
});

it("an earlier day's bill opens the supervisor approval first", async () => {
  mocks.get.mockImplementation(async (url) => ({ data: { data: url === "/bill-reprints" ? [{ ...ROW, approval_required: true }] : {} } }));
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Reprint D261116-0001" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Ask approval & print" }));
  expect(await screen.findByText(/Reprint of Dealer invoice D261116-0001 dated 2026-11-16/)).toBeInTheDocument();
  expect(mocks.printHtml).not.toHaveBeenCalled();
});

it("bulk: prints every ticked document in one run and logs each", async () => {
  const second = { ...ROW, id: 8, number: "D261116-0002" };
  mocks.get.mockImplementation(async (url) => ({ data: { data: url === "/bill-reprints" ? [ROW, second]
    : /^\/dealer-invoices\/\d+$/.test(url) ? INVOICE : url.startsWith("/bill-reprints/") ? ROW : { printMode: "direct" } } }));
  renderPage();
  fireEvent.click(await screen.findByRole("checkbox", { name: "Select Dealer invoice D261116-0001" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Dealer invoice D261116-0002" }));
  fireEvent.click(screen.getByRole("button", { name: /Print selected \(2\)/ }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Print" }));
  await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Reprinted 2 of 2."));
  expect(mocks.printHtml).toHaveBeenCalledTimes(2);
  expect(mocks.post.mock.calls.map((c) => c[0])).toEqual(["/bill-reprints/dealer_invoice/7/log", "/bill-reprints/dealer_invoice/8/log"]);
});

it("a type button filters straight away; All types clears it", async () => {
  renderPage();
  await screen.findByText("D261116-0001");
  fireEvent.click(screen.getByRole("button", { name: "Dealer invoice" }));
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/bill-reprints", expect.objectContaining({ params: expect.objectContaining({ types: ["dealer_invoice"] }) })));
  expect(screen.getByRole("button", { name: "Dealer invoice" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "All types" }));
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith("/bill-reprints", expect.objectContaining({ params: expect.objectContaining({ types: undefined }) })));
});
