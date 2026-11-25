import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import PosSales from "@/features/sales/pos/PosSales";
import api from "@/shared/api/apiClient";
import { lastScannedLineId, parseQuantityShortcut } from "@/features/sales/pos/utils/quantityShortcut";

const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

describe("quantity shortcut parsing", () => {
  it("reads 10*barcode, 10* and *10, and leaves everything else as an ordinary barcode", () => {
    expect(parseQuantityShortcut("10*SC00001")).toEqual({ kind: "scan", quantity: 10, barcode: "SC00001" });
    expect(parseQuantityShortcut(" 3 * 8901234 ")).toEqual({ kind: "scan", quantity: 3, barcode: "8901234" });
    expect(parseQuantityShortcut("10*")).toEqual({ kind: "next", quantity: 10 });
    expect(parseQuantityShortcut("*12")).toEqual({ kind: "last", quantity: 12 });
    expect(parseQuantityShortcut("*10+2")).toEqual({ kind: "row", quantity: 10, row: 2 });
    expect(parseQuantityShortcut("*10,2")).toEqual({ kind: "row", quantity: 10, row: 2 });
    expect(parseQuantityShortcut(" * 10 = 12 ")).toEqual({ kind: "row", quantity: 10, row: 12 });
    for (const text of ["SC00001", "", "10", "C", "D", "0", "*", "a*5", "1.5*SC1", "-2*SC1", "*abc", "123456*SC1", "*10+", "*10+a", "*10+1234", "10+2"]) expect(parseQuantityShortcut(text)).toBeNull();
    expect(parseQuantityShortcut("0*SC1")).toEqual({ kind: "scan", quantity: 0, barcode: "SC1" }); // refused later with a message
  });

  it("changes the line scanned last, else the bottom line", () => {
    const cart = [{ lineId: "a" }, { lineId: "b" }, { lineId: "c" }];
    expect(lastScannedLineId(cart, "b")).toBe("b");
    expect(lastScannedLineId(cart, "gone")).toBe("c");
    expect(lastScannedLineId([], "a")).toBeNull();
  });
});

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "1");
  mocks.print.mockReturnValue(new Promise(() => {}));
  api.get.mockImplementation(async url => ({ data: { data:
    url === "/sales-customization" ? { posPaymentDialogVisible: true, saleSaveAs: "paid_settled", printMode: "direct" } :
    url === "/companies/1" ? { name: "Coffee" } :
    url === "/pos-sales/next-bill-no" ? { billNo: "261024-0001" } :
    url === "/pos-sales/barcode-lookup" ? { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 20, selling_price: 100 } : []
  } }));
});

const type = async (box, text) => {
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: "Enter" });
  await waitFor(() => expect(box).toHaveValue(""));
};
// The Qty box above the bill is the only number field until a line is opened for editing; a line shows its quantity as text.
const qtyBox = () => screen.getAllByRole("spinbutton")[0];
const open = async () => {
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  // The stock list loads once after the page opens; scan only after it, or it replaces what the scan added.
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/stock-products"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  return screen.getByPlaceholderText("Scan / enter barcode");
};

it("10* before the barcode adds ten pieces in one go", async () => {
  const barcode = await open();
  await type(barcode, "10*COFFEE");
  expect((await screen.findAllByText(/1,000\.00/)).length).toBeGreaterThan(0); // 10 x 100
  expect(api.get).toHaveBeenCalledWith("/pos-sales/barcode-lookup", { params: { barcode: "COFFEE" } });
  expect(qtyBox()).toHaveValue(1);
});

it("10* on its own sets the next scan to ten, then the Qty box goes back to one", async () => {
  const barcode = await open();
  await type(barcode, "10*");
  expect(qtyBox()).toHaveValue(10);
  expect(barcode).toHaveFocus();

  await type(barcode, "COFFEE");
  expect((await screen.findAllByText(/1,000\.00/)).length).toBeGreaterThan(0);
  expect(qtyBox()).toHaveValue(1);
});

it("*7 changes the item scanned last, and keeps the stock rule of editing the quantity", async () => {
  const barcode = await open();
  await type(barcode, "COFFEE");
  await screen.findByText("Coffee beans");

  await type(barcode, "*7");
  expect((await screen.findAllByText(/700\.00/)).length).toBeGreaterThan(0); // 7 x 100

  await type(barcode, "*50"); // only 20 in stock
  expect(toast.error).toHaveBeenCalledWith("Available quantity for this is 20");
  expect(screen.getAllByText(/700\.00/).length).toBeGreaterThan(0);
});

it("says what is wrong instead of adding anything", async () => {
  const barcode = await open();
  await type(barcode, "*3");
  expect(toast.info).toHaveBeenCalledWith("Scan an item first, then set its quantity.");

  await type(barcode, "0*COFFEE");
  expect(toast.error).toHaveBeenCalledWith("Quantity must be at least 1.");

  await type(barcode, "25*COFFEE");
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Quantity exceeds stock. Available: 20 pcs"));
  expect(screen.queryByText("Coffee beans")).not.toBeInTheDocument(); // no line was added
});

it("*10+2, *10,2 and *10=2 change the item on that S.No, whichever was scanned last", async () => {
  const lookup = { COFFEE: { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 50, selling_price: 100 }, TEA: { id: 2, name: "Green tea", barcode: "TEA", stock_qty: 50, selling_price: 10 } };
  const base = api.get.getMockImplementation();
  api.get.mockImplementation(async (url, config) => (url === "/pos-sales/barcode-lookup" ? { data: { data: lookup[config.params.barcode] } } : base(url, config)));
  const barcode = await open();
  await type(barcode, "COFFEE");
  await type(barcode, "TEA"); // the last scanned is S.No 2
  await screen.findByText("Green tea");

  await type(barcode, "*5+1"); // S.No 1 is the coffee
  expect((await screen.findAllByText(/500\.00/)).length).toBeGreaterThan(0);
  await type(barcode, "*20,2"); // S.No 2 is the tea
  expect((await screen.findAllByText(/200\.00/)).length).toBeGreaterThan(0);
  await type(barcode, "*6=1");
  expect((await screen.findAllByText(/600\.00/)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/200\.00/).length).toBeGreaterThan(0); // the tea stayed as it was
});

it("says there is no item on an S.No that is not on the bill", async () => {
  const barcode = await open();
  await type(barcode, "COFFEE");
  await screen.findByText("Coffee beans");
  await type(barcode, "*5+3");
  expect(toast.error).toHaveBeenCalledWith("There is no item on S.No 3.");
});
