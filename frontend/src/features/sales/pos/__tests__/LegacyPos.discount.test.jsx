import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import LegacyPos from "@/features/sales/pos/LegacyPos";
import api from "@/shared/api/apiClient";

// POS Old: the Sale Discount pop-up (barcode shortcut D) on the bill lines. POS Old shows money with one decimal.

const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

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
const discountPanel = () => screen.getByText("Sale Discount").closest(".MuiStack-root").parentElement;

it("opens with D, lists the bill lines, and applies a percentage to the ticked lines", async () => {
  render(<MemoryRouter><LegacyPos /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/stock-products", expect.anything()));
  await waitFor(() => { scan("COFFEE"); expect(screen.getAllByText("Coffee beans").length).toBeGreaterThan(0); });
  scan("D");
  expect(await screen.findByText("Sale Discount")).toBeInTheDocument();
  let panel = discountPanel();
  expect(within(panel).getByText(/current POS Old bill/)).toBeInTheDocument();
  expect(within(panel).getByText("Product")).toBeInTheDocument();
  expect(within(panel).getByText("Dis %")).toBeInTheDocument();
  expect(within(panel).getByText("Dis AMT")).toBeInTheDocument();
  const row = within(panel).getByText("COFFEE").closest("tr");
  expect(within(row).getByText("Coffee beans")).toBeInTheDocument();

  const percent = within(panel).getByText("Discount %").parentElement.querySelector("input");
  expect(percent).toHaveFocus();
  fireEvent.change(percent, { target: { value: "10" } });
  expect(within(panel).getByRole("button", { name: /^Apply \(/ })).toHaveTextContent("Apply (20.0)");
  fireEvent.click(within(panel).getByRole("button", { name: /^Apply \(/ }));
  await waitFor(() => expect(screen.queryByText("Sale Discount")).not.toBeInTheDocument());

  scan("D");
  await screen.findByText("Sale Discount");
  panel = discountPanel();
  expect(within(panel).getByText("20.0 @ 10%")).toBeInTheDocument();
  fireEvent.click(within(panel).getByRole("button", { name: "Close discount dialog" }));
  expect(screen.queryByText("Sale Discount")).not.toBeInTheDocument();
});
