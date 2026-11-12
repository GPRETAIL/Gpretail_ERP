import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PosSales from "@/features/sales/pos/PosSales";
import LegacyPos from "@/features/sales/pos/LegacyPos";
import api from "@/shared/api/apiClient";
import { handleEnterKeyNavigation } from "@/shared/utils/enterToNextField";

// The app layout moves focus to the next field on Enter (MainLayout: data-enter-scope + onKeyDownCapture).
// A POS barcode box handles Enter itself (scan, or a shortcut), so the layout must leave its focus alone:
// otherwise POS Old jumps to CANCEL (F4) and POS Sales opens the product picker over the Discount pop-up.

const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

const beans = { id: 1, barcode: "COFFEE", productName: "Coffee beans", qty: 20, price: 200, mrp: 200, tax: 0 };

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "1");
  // jsdom lays nothing out, so the layout helper would see every field as hidden and do nothing.
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{ width: 10, height: 10 }]);
  api.get.mockImplementation(async url => ({ data: { data:
    url === "/sales-customization" ? { posPaymentDialogVisible: true, saleSaveAs: "paid_settled", printMode: "direct" } :
    url === "/companies/1" ? { name: "Coffee" } :
    url === "/pos-sales/next-bill-no" ? { billNo: "261024-0001" } :
    url === "/pos-old-sales/next-bill-no" ? { billNo: "OLD-0001" } :
    url === "/pos-sales/stock-products" ? [beans] :
    url === "/pos-sales/barcode-lookup" ? { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 20, selling_price: 100 } : []
  } }));
});
afterEach(() => vi.restoreAllMocks());

const inLayout = (screenElement) =>
  render(
    <MemoryRouter>
      <main data-enter-scope="true" onKeyDownCapture={handleEnterKeyNavigation}>{screenElement}</main>
    </MemoryRouter>
  );
const pressEnter = (input, value) => {
  input.focus();
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
};

it("POS Old: a scan keeps focus in the barcode box, and D opens Discount", async () => {
  inLayout(<LegacyPos />);
  const barcode = screen.getByPlaceholderText("Barcode_Product_Name");
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/stock-products", expect.anything()));
  await waitFor(() => {
    pressEnter(barcode, "COFFEE");
    expect(screen.getAllByText("Coffee beans").length).toBeGreaterThan(0);
  });
  expect(barcode).toHaveFocus();
  pressEnter(barcode, "D");
  expect(await screen.findByText("Sale Discount")).toBeInTheDocument();
});

it("POS Sales: D opens Discount without also opening the product picker", async () => {
  inLayout(<PosSales />);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(barcode).toHaveFocus());
  pressEnter(barcode, "COFFEE");
  await screen.findByText("Coffee beans");
  await waitFor(() => expect(barcode).toHaveFocus());
  pressEnter(barcode, "D");
  expect(await screen.findByText("Sale Discount")).toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Search product, code or barcode")).not.toBeInTheDocument();
});
