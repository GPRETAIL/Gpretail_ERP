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
            : [] } }));
});
afterEach(cleanup);

it("lists in-stock products once per variant and saves through the POS checkout with the customer, cash and points", async () => {
  mocks.post.mockRejectedValueOnce({ response: { status: 428, data: { code: "APPROVAL_REQUIRED", action: "loyalty_redeem", details: { points: 100, amount: 100, customer_name: "Meena" } } } })
    .mockResolvedValue({ data: { data: { id: 1, bill_no: "261118-0001" } } });
  render(<MemoryRouter><TransferActivityProvider><TouchSales /></TransferActivityProvider></MemoryRouter>);

  const search = await screen.findByPlaceholderText(/Search product, barcode/);
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/barcodes/physical-stock", { params: { all: true } }));
  fireEvent.change(search, { target: { value: "s" } });
  const addButtons = await screen.findAllByRole("button", { name: "Add To Cart" });
  expect(addButtons).toHaveLength(1); // one shirt variant; the saree has no stock
  expect(screen.queryByText("Silk Saree")).toBeNull();
  fireEvent.click(addButtons[0]);

  fireEvent.change(screen.getByPlaceholderText("Customer mobile number"), { target: { value: "9876543210" } });
  fireEvent.change(await screen.findByLabelText("Points to redeem"), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply (supervisor approves)" }));
  expect(await screen.findByText("Cash to collect")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/pos-sales", expect.objectContaining({
    saleSaveAs: "paid_settled", customerId: 9, cashAmount: 900, loyaltyRedeem: { points: 100 },
    items: [expect.objectContaining({ productId: 2, variantId: 1, barcodeId: 11, qty: 1, price: 1000 })],
  })));
  // The checkout asks a supervisor for the points; the approval goes with the redemption.
  expect(await screen.findByText(/without their OTP needs a supervisor/)).toBeInTheDocument();
});
