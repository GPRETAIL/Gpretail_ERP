import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-toastify", () => ({ toast: mocks.toast }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: (selector) => selector({ auth: { user: { id: 5, name: "Anbu", role: "cashier", store_id: 1, counter_id: 3 } } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ queuePrintHtml: vi.fn() }) }));
vi.mock("@/shared/api/realtimeClient", () => ({ listen: vi.fn(() => () => {}), personalChannel: vi.fn(() => "user.5") }));
vi.mock("@/features/sales/pos/hooks/useBillingDate", () => ({ default: () => ({ state: null, saving: false, change: vi.fn() }) }));
vi.mock("@/features/sales/pos/components/BillingDateBanner", () => ({ default: () => null }));
// Sales Customisation: Touch Sales opens the payment dialog at Save.
vi.mock("@/features/sales/customisation/utils/salesReceiptCustomisation", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, loadSalesReceiptCustomization: () => ({ ...actual.loadSalesReceiptCustomization("default"), paymentDialogPages: ["touch_sales"] }) };
});
import TouchSales from "@/features/sales/pos/TouchSales";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const LABELS = [
  // Two labels of the same variant: one tile.
  { id: 11, product_id: 2, variant_id: 1, barcode: "SHIRT-1", product_name: "Cotton Shirt", qty: "4", selling_price: "0.00", final_price: "1000.00", mrp: "1200.00" },
  { id: 12, product_id: 2, variant_id: 1, barcode: "SHIRT-2", product_name: "Cotton Shirt", qty: "4", selling_price: "1000.00", mrp: "1200.00" },
  { id: 13, product_id: 3, variant_id: 2, barcode: "SAREE", product_name: "Silk Saree", qty: "0", selling_price: "5000.00" },
];
const QUOTE = { enabled: true, balance: 300, point_value: 1, min_points: 10, max_percent: 50, max_points: 300, otp_required: true, verify: true, channels: [], expiring: [] };

beforeEach(() => {
  [mocks.get, mocks.post, mocks.toast.success, mocks.toast.error].forEach((m) => m.mockReset());
  mocks.get.mockImplementation(async (url) => ({ data: { data:
    url === "/barcodes/physical-stock" ? LABELS
      : url === "/customers" ? [{ id: 9, name: "Meena", phone: "9876543210" }]
        : url === "/touch-sales/next-bill-no" ? { bill_no: "261118-0001" }
          : url === "/loyalty-redeem/quote" ? QUOTE
            : url === "/configurations/card_types" ? [{ id: 4, name: "Visa" }]
            : [] } }));
});
afterEach(cleanup);

it("with the payment dialog ticked, Save asks how it is paid and sends the cash + card split", async () => {
  mocks.post.mockResolvedValue({ data: { data: { id: 1, bill_no: "261118-0001" } } });
  render(<MemoryRouter><TransferActivityProvider><TouchSales /></TransferActivityProvider></MemoryRouter>);
  const search = await screen.findByPlaceholderText(/Search product, barcode/);
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/barcodes/physical-stock", { params: { all: true } }));
  fireEvent.change(search, { target: { value: "s" } });
  fireEvent.click((await screen.findAllByRole("button", { name: "Add To Cart" }))[0]);

  fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
  expect(await screen.findByText("POS Payment")).toBeInTheDocument();
  expect(mocks.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Cash received"), { target: { value: "400" } });
  const cardInputs = screen.getAllByRole("spinbutton");
  fireEvent.change(cardInputs[1], { target: { value: "600" } });
  await screen.findByRole("option", { name: "Visa" });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } }); // card type (native select)
  fireEvent.click(screen.getAllByRole("button", { name: "Save" }).at(-1));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/pos-sales", expect.objectContaining({
    cashAmount: 400, cardAmount: 600, cardTypeId: "4", upiAmount: 0,
  })));
});
