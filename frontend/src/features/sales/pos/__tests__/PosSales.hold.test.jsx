import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "react-toastify";
import PosSales from "@/features/sales/pos/PosSales";
import api from "@/shared/api/apiClient";
import { MAX_HELD_BILLS, addHeldBill, heldAtText, heldBillLabel, heldBillsKey, loadHeldBills, makeHeldBill, removeHeldBill, saveHeldBills, waitedText } from "@/features/sales/pos/utils/heldBills";

const mocks = vi.hoisted(() => ({ print: vi.fn(), user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: mocks.print }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

describe("held bills storage", () => {
  const key = heldBillsKey(1, 7);
  const snapshot = (n) => ({ cart: Array.from({ length: n }, (_, i) => ({ lineId: `l${i}` })) });

  it("keeps a bill per store and user, newest first, and drops what is older than a day", () => {
    localStorage.clear();
    expect(key).toBe("vx:pos-held:1:7");
    const now = Date.now();
    const old = makeHeldBill({ snapshot: snapshot(1), label: "Old", amount: 10, now: now - 25 * 3600 * 1000 });
    const first = makeHeldBill({ snapshot: snapshot(2), label: "First", amount: 20.456, now: now - 60000 });
    const second = makeHeldBill({ snapshot: snapshot(3), label: "Second", amount: 30, now });
    expect(first).toMatchObject({ label: "First", items: 2, amount: 20.46 });
    expect(saveHeldBills(key, [old, first, second])).toBe(true);
    expect(loadHeldBills(key, now).map((bill) => bill.label)).toEqual(["Second", "First"]);
    expect(loadHeldBills(heldBillsKey(1, 8), now)).toEqual([]);
    expect(removeHeldBill([first, second], first.id)).toEqual([second]);
  });

  it("holds at most twenty (the oldest goes), and survives a corrupt or blocked store", () => {
    let list = [];
    for (let i = 0; i < MAX_HELD_BILLS + 3; i += 1) list = addHeldBill(list, makeHeldBill({ snapshot: snapshot(1), label: `B${i}`, amount: 1, now: 1000 + i }));
    expect(list).toHaveLength(MAX_HELD_BILLS);
    expect(list[0].label).toBe(`B${MAX_HELD_BILLS + 2}`);
    localStorage.setItem(key, "not json");
    expect(loadHeldBills(key)).toEqual([]);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    expect(saveHeldBills(key, list)).toBe(false);
    spy.mockRestore();
  });

  it("names a bill by customer, then mobile, then walk-in, and says how long it has waited", () => {
    expect(heldBillLabel("Meena", "9")).toBe("Meena");
    expect(heldBillLabel("", " 98765 ")).toBe("98765");
    expect(heldBillLabel("", "")).toBe("Walk-in customer");
    expect(waitedText(1000, 1000 + 20000)).toBe("just now");
    expect(waitedText(1000, 1000 + 5 * 60000)).toBe("5 min ago");
    expect(waitedText(1000, 1000 + 130 * 60000)).toBe("2 h ago");
    expect(heldAtText(new Date(2026, 10, 26, 0, 31).getTime())).toMatch(/^26 Nov,? 12:31\s?(am|AM)$/);
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
const open = async () => {
  render(<MemoryRouter><PosSales /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/stock-products"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  return screen.getByPlaceholderText("Scan / enter barcode");
};
const heldBills = () => JSON.parse(localStorage.getItem("vx:pos-held:1:1"));

it("Hold sets the bill aside, clears the screen, and Resume brings it back", async () => {
  const barcode = await open();
  expect(screen.getByRole("button", { name: /^Hold$/ })).toBeDisabled(); // nothing to hold yet
  await type(barcode, "3*COFFEE");
  await screen.findByText("Coffee beans");

  fireEvent.click(screen.getByRole("button", { name: /^Hold$/ }));
  await waitFor(() => expect(screen.queryByText("Coffee beans")).not.toBeInTheDocument());
  expect(toast.success).toHaveBeenCalledWith("Bill on hold for Walk-in customer. Start the next customer.");
  expect(screen.getByRole("button", { name: /Held \(1\)/ })).toBeInTheDocument();
  expect(heldBills()[0]).toMatchObject({ label: "Walk-in customer", items: 1, amount: 300 });

  fireEvent.click(screen.getByRole("button", { name: /Held \(1\)/ }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/1 item · ₹300\.00/)).toBeInTheDocument();
  expect(within(dialog).getByText(/held \d{1,2} [A-Z][a-z]{2},? .*\(just now\)/)).toBeInTheDocument(); // the day and time, then how long ago
  fireEvent.click(within(dialog).getByRole("button", { name: "Resume" }));

  expect(await screen.findByText("Coffee beans")).toBeInTheDocument();
  expect((await screen.findAllByText(/300\.00/)).length).toBeGreaterThan(0);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: /Held \(0\)/ })).toBeInTheDocument();
  expect(heldBills()).toEqual([]);
});

it("H in the barcode box holds, and resuming while another bill is open sets that one aside first", async () => {
  const lookup = { COFFEE: { id: 1, name: "Coffee beans", barcode: "COFFEE", stock_qty: 50, selling_price: 100 }, TEA: { id: 2, name: "Green tea", barcode: "TEA", stock_qty: 50, selling_price: 10 } };
  const base = api.get.getMockImplementation();
  api.get.mockImplementation(async (url, config) => (url === "/pos-sales/barcode-lookup" ? { data: { data: lookup[config.params.barcode] } } : base(url, config)));
  const barcode = await open();
  await type(barcode, "COFFEE");
  await screen.findByText("Coffee beans");
  await type(barcode, "h");
  await waitFor(() => expect(screen.queryByText("Coffee beans")).not.toBeInTheDocument());

  await type(barcode, "TEA");
  await screen.findByText("Green tea");
  await type(barcode, "R");
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Resume" }));

  expect(await screen.findByText("Coffee beans")).toBeInTheDocument();
  expect(screen.queryByText("Green tea")).not.toBeInTheDocument();
  expect(heldBills()).toHaveLength(1);
  expect(heldBills()[0]).toMatchObject({ items: 1, amount: 10 }); // the tea bill is the one on hold now
});

it("Held bills can be deleted, and an empty list says how to hold one", async () => {
  const barcode = await open();
  await type(barcode, "COFFEE");
  await screen.findByText("Coffee beans");
  await type(barcode, "H");
  fireEvent.click(await screen.findByRole("button", { name: /Held \(1\)/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: /Delete held bill/ }));
  expect(await within(dialog).findByText(/No bills are on hold/)).toBeInTheDocument();
  expect(heldBills()).toEqual([]);
});

it("will not hold an empty bill", async () => {
  const barcode = await open();
  await type(barcode, "H");
  expect(toast.info).toHaveBeenCalledWith("There is nothing to hold. Add an item first.");
  expect(localStorage.getItem("vx:pos-held:1:1")).toBeNull();
});
