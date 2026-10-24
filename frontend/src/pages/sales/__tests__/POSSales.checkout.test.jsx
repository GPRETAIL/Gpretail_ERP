import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import POSSales from "../POSSales";
import api from "../../../api/axios";
const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("../../../context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("../../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../../../hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
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
  api.post.mockResolvedValue({ data: { data: { id: 9, bill_no: "261024-0001", store_id: 1, grand_total: 100, paid_amount: 100, items: [{ id: 1, product: { name: "Coffee beans" }, quantity: 1, selling_price: 100, subtotal: 100 }] } } });
});
it("returns focus to scanning, focuses checkout cash and releases entry while printing is still pending", async () => {
  render(<MemoryRouter><POSSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(barcode).toHaveFocus());
  fireEvent.change(barcode, { target: { value: "COFFEE" } });
  fireEvent.keyDown(barcode, { key: "Enter" });
  await screen.findByText("Coffee beans");
  await waitFor(() => expect(barcode).toHaveFocus());
  const masterRequests = api.get.mock.calls.filter(([url]) => ["/customers", "/products", "/pos-sales/stock-products"].includes(url)).length;
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  const cash = await screen.findByRole("spinbutton", { name: "Cash received" });
  await waitFor(() => expect(cash).toHaveFocus());
  fireEvent.change(cash, { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Print", exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/pos-sales", expect.any(Object)));
  await waitFor(() => expect(barcode).toHaveFocus());
  expect(screen.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  expect(api.get.mock.calls.filter(([url]) => ["/customers", "/products", "/pos-sales/stock-products"].includes(url))).toHaveLength(masterRequests);
  await waitFor(() => expect(mocks.print).toHaveBeenCalledOnce());
});

it("keeps the next scan intact and prevents checkout before the current lookup completes", async () => {
  const originalGet = api.get.getMockImplementation();
  let finishScan;
  api.get.mockImplementation((url, options) => url === "/pos-sales/barcode-lookup" ? new Promise(done => { finishScan = done; }) : originalGet(url, options));
  render(<MemoryRouter><POSSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(barcode).toHaveFocus());
  fireEvent.change(barcode, { target: { value: "COFFEE" } });
  fireEvent.keyDown(barcode, { key: "Enter" });
  await waitFor(() => expect(barcode).toHaveValue(""));
  expect(screen.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  fireEvent.change(barcode, { target: { value: "NEXT-SCAN" } });
  finishScan({ data: { data: { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 20, selling_price: 100 } } });
  await screen.findByText("Coffee beans");
  expect(barcode).toHaveValue("NEXT-SCAN");
  fireEvent.change(barcode, { target: { value: "0" } });
  fireEvent.keyDown(barcode, { key: "Enter" });
  await waitFor(() => expect(screen.getByRole("spinbutton", { name: "Cash received" })).toHaveFocus());
});
