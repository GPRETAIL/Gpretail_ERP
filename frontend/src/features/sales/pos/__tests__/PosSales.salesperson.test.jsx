import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import PosSales from "@/features/sales/pos/PosSales";
import api from "@/shared/api/apiClient";
import { assignSalesperson, findSalesperson, linesWithoutSalesperson } from "@/features/sales/pos/utils/posSalesperson";

const mocks = vi.hoisted(() => ({ print: vi.fn(), scan: true, user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const PEOPLE = [{ id: 5, code: "E1", name: "Ravi", sticker: "EMP-5" }, { id: 6, code: "E2", name: "Meena", sticker: "EMP-6" }];

describe("salesperson helpers", () => {
  it("finds a salesperson by sticker or code, and merges lines of the same item and salesperson", () => {
    expect(findSalesperson(PEOPLE, "emp-6").name).toBe("Meena");
    expect(findSalesperson(PEOPLE, "e1").name).toBe("Ravi");
    expect(findSalesperson(PEOPLE, "COFFEE")).toBeNull();
    const cart = [
      { lineId: "a", stockId: 1, qty: 1, price: 100, salesManId: 5 },
      { lineId: "b", stockId: 1, qty: 1, price: 100, salesManId: "" },
      { lineId: "c", stockId: 1, qty: 1, price: 100, salesManId: "" },
    ];
    expect(linesWithoutSalesperson(cart).map((line) => line.lineId)).toEqual(["b", "c"]);
    const merged = assignSalesperson(cart, "b", PEOPLE[0]);
    expect(merged.map((line) => [line.lineId, line.qty])).toEqual([["a", 2], ["c", 1]]);
    expect(assignSalesperson(merged, "c", PEOPLE[1]).find((line) => line.lineId === "c")).toMatchObject({ salesManId: 6, salesManName: "Meena", salesManCode: "E2" });
  });
});

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "1");
  mocks.scan = true;
  mocks.print.mockReturnValue(new Promise(() => {}));
  api.get.mockImplementation(async url => ({ data: { data:
    url === "/sales-customization" ? { posPaymentDialogVisible: true, saleSaveAs: "paid_settled", printMode: "direct", posSalespersonScan: mocks.scan } :
    url === "/companies/1" ? { name: "Coffee" } :
    url === "/pos-sales/next-bill-no" ? { billNo: "261024-0001" } :
    url === "/pos-sales/salespeople" ? PEOPLE :
    url === "/pos-sales/barcode-lookup" ? { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 20, selling_price: 100 } : []
  } }));
  api.post.mockResolvedValue({ data: { data: { id: 9, bill_no: "261024-0001", store_id: 1, grand_total: 300, paid_amount: 300, items: [] } } });
});

const scanProduct = async (barcode) => {
  fireEvent.change(barcode, { target: { value: "COFFEE" } });
  fireEvent.keyDown(barcode, { key: "Enter" });
  await waitFor(() => expect(barcode).toHaveValue(""));
};

it("moves to the Salesperson field after each item, back after the sticker, and needs one per item", async () => {
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  const salesperson = await screen.findByLabelText("Salesperson");
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/salespeople"));

  await scanProduct(barcode);
  await waitFor(() => expect(salesperson).toHaveFocus());
  expect(salesperson).toHaveAttribute("placeholder", "Scan salesperson for Coffee beans");

  // Pay is blocked while the item has no salesperson.
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  expect(toast.error).toHaveBeenCalledWith("Scan the salesperson for: Coffee beans");
  expect(screen.queryByRole("spinbutton", { name: "Cash received" })).toBeNull();

  // A product scanned into the Salesperson field is refused.
  fireEvent.change(salesperson, { target: { value: "COFFEE" } });
  fireEvent.keyDown(salesperson, { key: "Enter" });
  expect(toast.error).toHaveBeenCalledWith("COFFEE is not a salesperson's sticker. Scan the salesperson.");

  fireEvent.change(salesperson, { target: { value: "EMP-5" } });
  fireEvent.keyDown(salesperson, { key: "Enter" });
  await waitFor(() => expect(barcode).toHaveFocus());
  expect(await screen.findAllByText("Ravi")).not.toHaveLength(0);

  // Same item, another salesperson: its own line. Same item and salesperson again: merged.
  await scanProduct(barcode);
  await waitFor(() => expect(salesperson).toHaveFocus());
  fireEvent.change(salesperson, { target: { value: "EMP-6" } });
  fireEvent.keyDown(salesperson, { key: "Enter" });
  await scanProduct(barcode);
  // A fast scanner can send the sticker into the product box: it still credits the item.
  await waitFor(() => expect(salesperson).toHaveFocus());
  fireEvent.change(barcode, { target: { value: "EMP-5" } });
  fireEvent.keyDown(barcode, { key: "Enter" });
  await waitFor(() => expect(barcode).toHaveFocus());

  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  const cash = await screen.findByRole("spinbutton", { name: "Cash received" });
  fireEvent.change(cash, { target: { value: "300" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Print", exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/pos-sales", expect.anything(), expect.anything()));
  const items = api.post.mock.calls[0][1].items.map((item) => [item.salesManId, item.qty]);
  expect(items).toEqual([[5, 2], [6, 1]]);
});

it("without the switch there is no Salesperson field and items merge as before", async () => {
  mocks.scan = false;
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  const barcode = screen.getByPlaceholderText("Scan / enter barcode");
  await waitFor(() => expect(barcode).toHaveFocus());
  await scanProduct(barcode);
  await scanProduct(barcode);
  await waitFor(() => expect(barcode).toHaveFocus());
  expect(screen.queryByLabelText("Salesperson")).toBeNull();
  expect(api.get).not.toHaveBeenCalledWith("/pos-sales/salespeople");
  expect(screen.getAllByText("Coffee beans")).toHaveLength(1);
});
