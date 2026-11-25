import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import LegacyPos from "@/features/sales/pos/LegacyPos";
import api from "@/shared/api/apiClient";

// POS Old: the same quantity shortcuts as POS Sale, typed in the barcode box. POS Old shows money with one decimal.

const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: toastMock }));

const beans = { id: 1, barcode: "COFFEE", productName: "Coffee beans", qty: 20, price: 200, mrp: 200, tax: 0 };

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "1");
  api.get.mockImplementation(async url => ({ data: { data:
    url === "/pos-sales/stock-products" ? [beans] :
    url === "/pos-old-sales/next-bill-no" ? { billNo: "OLD-0001" } :
    url === "/sales-customization" ? { printMode: "direct" } : []
  } }));
});

const scan = (value) => {
  const barcode = screen.getByPlaceholderText("Barcode_Product_Name");
  fireEvent.change(barcode, { target: { value } });
  fireEvent.keyDown(barcode, { key: "Enter" });
};
const open = async () => {
  render(<MemoryRouter><LegacyPos /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/stock-products", expect.anything()));
  await waitFor(() => expect(screen.getByPlaceholderText("Barcode_Product_Name")).toBeInTheDocument());
};
const total = (text) => waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0));

it("10*CODE adds ten pieces in one go", async () => {
  await open();
  await waitFor(() => { scan("10*COFFEE"); expect(screen.getAllByText("Coffee beans").length).toBeGreaterThan(0); });
  await total("2,000.0");
});

it("10* then a scan adds ten, and the scan after that adds one", async () => {
  await open();
  scan("10*");
  expect(toastMock.info).toHaveBeenCalledWith(expect.stringContaining("10 pieces"));
  await waitFor(() => { scan("COFFEE"); expect(screen.getAllByText("Coffee beans").length).toBeGreaterThan(0); });
  await total("2,000.0");
  scan("COFFEE");
  await total("2,200.0");
});

it("*5 changes the last scanned item and *3+1 changes S.No 1", async () => {
  await open();
  await waitFor(() => { scan("COFFEE"); expect(screen.getAllByText("Coffee beans").length).toBeGreaterThan(0); });
  scan("*5");
  await total("1,000.0");
  scan("*3+1");
  await total("600.0");
  scan("*3+9");
  expect(toastMock.error).toHaveBeenCalledWith("There is no item on S.No 9.");
});

it("refuses more than the stock", async () => {
  await open();
  scan("50*COFFEE");
  await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Only 20 in stock"));
});
