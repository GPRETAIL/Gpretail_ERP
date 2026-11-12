import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import PosSales from "@/features/sales/pos/PosSales";
import api from "@/shared/api/apiClient";

// POS bill pop-ups: Sales Man (per line), Quick Customer (barcode shortcut C) and Sale Discount (shortcut D).

const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const meena = { id: 5, name: "Meena", phone: "9876543210", gstin: "33ABCDE1234F1Z5" };

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "1");
  api.get.mockImplementation(async (url, config) => ({ data: { data:
    url === "/sales-customization" ? { posPaymentDialogVisible: true, saleSaveAs: "paid_settled", printMode: "direct" } :
    url === "/companies/1" ? { name: "Coffee" } :
    url === "/pos-sales/next-bill-no" ? { billNo: "261024-0001" } :
    url === "/pos-sales/barcode-lookup" ? { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 20, selling_price: 100 } :
    url === "/pos-sales/salesman-lookup" ? { employeeCode: config?.params?.employeeCode, name: "Ravi" } :
    url === "/customers" && config?.params?.search ? [meena] : []
  } }));
});

const renderPos = async () => {
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(barcode).toHaveFocus());
  return barcode;
};
const scan = async (barcode, value) => {
  fireEvent.change(barcode, { target: { value } });
  fireEvent.keyDown(barcode, { key: "Enter" });
};

it("Sales Man: looks up the ID typed for a line and marks the line", async () => {
  const barcode = await renderPos();
  await scan(barcode, "COFFEE");
  await screen.findByText("Coffee beans");
  fireEvent.click(screen.getByRole("button", { name: "Assign sales man" }));
  const field = screen.getByPlaceholderText("Write or scan Sales Man ID");
  expect(field).toHaveFocus();
  fireEvent.change(field, { target: { value: "E01" } });
  fireEvent.keyDown(field, { key: "Enter" });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/salesman-lookup", { params: { employeeCode: "E01" } }));
  await waitFor(() => expect(screen.queryByPlaceholderText("Write or scan Sales Man ID")).not.toBeInTheDocument());
  expect(screen.getByTitle("Sales Man ID: E01")).toBeInTheDocument();

  // Cancel keeps the line as it was.
  fireEvent.click(screen.getByTitle("Sales Man ID: E01"));
  expect(screen.getByPlaceholderText("Write or scan Sales Man ID")).toHaveValue("E01");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByPlaceholderText("Write or scan Sales Man ID")).not.toBeInTheDocument();
  expect(screen.getByTitle("Sales Man ID: E01")).toBeInTheDocument();
});

it("Quick Customer: opens with C, finds a customer by mobile number and selects them", async () => {
  const barcode = await renderPos();
  await scan(barcode, "C");
  expect(await screen.findByText("Quick Customer")).toBeInTheDocument();
  expect(screen.getByText("No matched customers")).toBeInTheDocument();
  const mobile = document.querySelector('input[name="mobileNo"]');
  fireEvent.change(mobile, { target: { name: "mobileNo", value: "9876543210" } });
  fireEvent.keyDown(mobile, { key: "Enter" });
  const resultRow = (await screen.findByText("33ABCDE1234F1Z5")).closest("tr");
  expect(within(resultRow).getByRole("radio")).toBeChecked();
  fireEvent.click(within(resultRow).getByRole("button", { name: "Select" }));
  await waitFor(() => expect(screen.queryByText("Quick Customer")).not.toBeInTheDocument());
  await waitFor(() => expect(barcode).toHaveFocus());
  expect(screen.getByDisplayValue("9876543210")).toBeInTheDocument();
  expect(screen.getAllByDisplayValue(/Meena/).length).toBeGreaterThan(0);
});

it("Quick Customer: Close and the X both close it without choosing anyone", async () => {
  const barcode = await renderPos();
  await scan(barcode, "C");
  await screen.findByText("Quick Customer");
  fireEvent.click(screen.getByRole("button", { name: "Close quick customer dialog" }));
  expect(screen.queryByText("Quick Customer")).not.toBeInTheDocument();
  await scan(barcode, "C");
  await screen.findByText("Quick Customer");
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByText("Quick Customer")).not.toBeInTheDocument();
});

it("Sale Discount: opens with D, applies a percentage to the selected lines", async () => {
  const barcode = await renderPos();
  await scan(barcode, "COFFEE");
  await screen.findByText("Coffee beans");
  await scan(barcode, "D");
  expect(await screen.findByText("Sale Discount")).toBeInTheDocument();
  const percent = screen.getByText("Discount %").parentElement.querySelector("input");
  expect(percent).toHaveFocus();
  fireEvent.change(percent, { target: { value: "10" } });
  const apply = screen.getByRole("button", { name: /^Apply \(/ });
  expect(apply).toHaveTextContent("Apply (10.00)");
  fireEvent.click(apply);
  await waitFor(() => expect(screen.queryByText("Sale Discount")).not.toBeInTheDocument());
  await scan(barcode, "D");
  await screen.findByText("Sale Discount");
  expect(screen.getByText("10.00 @ 10%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close discount dialog" }));
  expect(screen.queryByText("Sale Discount")).not.toBeInTheDocument();
});
