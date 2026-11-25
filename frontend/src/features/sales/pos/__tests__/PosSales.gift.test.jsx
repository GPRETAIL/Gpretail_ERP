import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import PosSales from "@/features/sales/pos/PosSales";
import api from "@/shared/api/apiClient";
import { buildSimplePosSaleReceiptData } from "@/features/printing/utils/posSaleReceiptPrinter";

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
    url === "/pos-sales/barcode-lookup" ? { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 20, selling_price: 100 } : []
  } }));
  api.post.mockResolvedValue({ data: { data: { id: 9, bill_no: "261024-0001", store_id: 1, grand_total: 100, paid_amount: 100, items: [] } } });
});

const scan = async (box, text) => {
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: "Enter" });
  await waitFor(() => expect(box).toHaveValue(""));
};

it("a gift line goes free, a later scan of the same item is a new paid line, and the request says which is the gift", async () => {
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/stock-products"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  await scan(barcode, "COFFEE");
  await screen.findByText("Coffee beans");

  fireEvent.click(screen.getByRole("button", { name: "Give Coffee beans as a gift" }));
  expect(await screen.findByText("Gift (free)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove gift from Coffee beans" })).toHaveAttribute("aria-pressed", "true");

  await scan(barcode, "COFFEE");
  await waitFor(() => expect(screen.getAllByText("Coffee beans")).toHaveLength(2)); // not added to the gift line

  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  const cash = await screen.findByRole("spinbutton", { name: "Cash received" });
  fireEvent.change(cash, { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Print", exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());

  const items = api.post.mock.calls[0][1].items;
  expect(items[0]).toMatchObject({ qty: 1, price: 0, discount: 0, isGift: true, mrp: 100 });
  expect(items[1]).toMatchObject({ qty: 1, price: 100 });
  expect(items[1]).not.toHaveProperty("isGift");
});

it("switching Gift off charges the item's price again", async () => {
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/stock-products"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  await scan(barcode, "COFFEE");
  await screen.findByText("Coffee beans");
  fireEvent.click(screen.getByRole("button", { name: "Give Coffee beans as a gift" }));
  await screen.findByText("Gift (free)");
  fireEvent.click(screen.getByRole("button", { name: "Remove gift from Coffee beans" }));
  await waitFor(() => expect(screen.queryByText("Gift (free)")).not.toBeInTheDocument());
  expect((await screen.findAllByText(/100\.00/)).length).toBeGreaterThan(0);
});

it("marks a gift item on the printed bill, also when the bill is printed again later", async () => {
  const doc = { bill_no: "261125-0001", store_id: 1, grand_total: 100, paid_amount: 100, sale_date: "2026-11-25T10:00:00Z",
    items: [{ product: { name: "Coffee beans" }, quantity: 1, selling_price: 100, subtotal: 100 }, { product: { name: "Sample cup" }, quantity: 1, selling_price: 0, subtotal: 0, is_gift: true }] };
  const data = await buildSimplePosSaleReceiptData(doc, { authUser: { name: "Cashier" }, customerName: "Meena", receiptCustomization: {}, companyInfo: { storeName: "Coffee 1" } });
  expect(data.items.map((item) => item.name)).toEqual(["Coffee beans", "Sample cup (Gift)"]);
});
