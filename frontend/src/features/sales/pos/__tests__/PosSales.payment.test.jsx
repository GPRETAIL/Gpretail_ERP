import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import PosSales from "@/features/sales/pos/PosSales";
import api from "@/shared/api/apiClient";
import { toast } from "react-toastify";

// The POS Payment pop-up: totals, change, split card + UPI payments, and Cancel.

const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "1");
  mocks.print.mockReturnValue(new Promise(() => {}));
  api.get.mockImplementation(async url => ({ data: { data:
    url === "/sales-customization" ? { posPaymentDialogVisible: true, saleSaveAs: "paid_settled", printMode: "direct" } :
    url === "/companies/1" ? { name: "Coffee" } :
    url === "/pos-sales/next-bill-no" ? { billNo: "261024-0001" } :
    url === "/configurations/card_types" ? [{ id: 3, name: "Visa" }] :
    url === "/configurations/upi_provider" ? [{ id: 4, name: "GPay" }] :
    url === "/pos-sales/barcode-lookup" ? { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 20, selling_price: 100 } : []
  } }));
  api.post.mockResolvedValue({ data: { data: { id: 9, bill_no: "261024-0001", store_id: 1, grand_total: 100, paid_amount: 100, items: [] } } });
});

const openPayment = async () => {
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(barcode).toHaveFocus());
  fireEvent.change(barcode, { target: { value: "COFFEE" } });
  fireEvent.keyDown(barcode, { key: "Enter" });
  await screen.findByText("Coffee beans");
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await screen.findByText("POS Payment");
  return paymentPanel();
};
// The pop-up panel: the parent of its title bar.
const paymentPanel = () => screen.getByText("POS Payment").closest(".MuiStack-root").parentElement;
const amountFor = (dialog, label) => within(dialog).getByText(label).nextSibling.textContent;
const fieldUnder = (dialog, label) => within(dialog).getByText(label).parentElement.querySelector("input, select");

it("shows the bill totals and the change for cash received", async () => {
  const dialog = await openPayment();
  expect(amountFor(dialog, "Bill(s) Amount")).toBe("100.00");
  expect(amountFor(dialog, "Net Amount")).toBe("100.00");
  expect(amountFor(dialog, "Balance")).toBe("100.00");
  expect(within(dialog).queryByText("Change")).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Cash received" }), { target: { value: "150" } });
  expect(amountFor(dialog, "Received")).toBe("150.00");
  expect(amountFor(dialog, "Change")).toBe("50.00");
});

it("saves a split card + UPI payment with the chosen card type and UPI provider", async () => {
  const dialog = await openPayment();
  fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Cash received" }), { target: { value: "0" } });
  fireEvent.change(fieldUnder(dialog, "Card Amount"), { target: { value: "60" } });
  fireEvent.change(fieldUnder(dialog, "Card Type"), { target: { value: "3" } });
  fireEvent.change(fieldUnder(dialog, "UPI Amount"), { target: { value: "40" } });
  fireEvent.change(fieldUnder(dialog, "UPI Provider"), { target: { value: "4" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/pos-sales", expect.objectContaining({
    cardAmount: 60, cardTypeId: "3", upiAmount: 40, upiProviderId: "4",
  }), expect.anything()));
  expect(mocks.print).not.toHaveBeenCalled();
});

it("asks for the card type before saving a card payment", async () => {
  const dialog = await openPayment();
  fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Cash received" }), { target: { value: "0" } });
  fireEvent.change(fieldUnder(dialog, "Card Amount"), { target: { value: "100" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Please select card type"));
  expect(api.post).not.toHaveBeenCalled();
});

it("Cancel and the X close it without saving, and the bill stays", async () => {
  let dialog = await openPayment();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByText("POS Payment")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await screen.findByText("POS Payment");
  dialog = paymentPanel();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close payment dialog" }));
  expect(screen.queryByText("POS Payment")).not.toBeInTheDocument();
  expect(screen.getByText("Coffee beans")).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
