import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import CashClosing from "@/features/sales/settlement/CashClosing";
import CashOpening from "@/features/sales/settlement/CashOpening";
import CashClosingDialog from "@/features/sales/settlement/CashClosingDialog";
import api from "@/shared/api/apiClient";
import { toast } from "react-toastify";

// Sales > Cash Opening / Cash Closing and POS Old's Close: a counter's drawer from the counted float to the
// counted closing. Expected = opening + cash sales − cash refunds − counter expenses; difference = counted − expected.

const mocks = vi.hoisted(() => ({ user: { id: 1, name: "Manager", company_id: 1, store_id: 1, counter_id: 5 } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: (selector) => selector({ auth: { user: mocks.user } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

const kavya = { id: 9, name: "Kavya", employee_code: "E1" };
let openSession = 7;

beforeEach(() => {
  vi.clearAllMocks();
  openSession = 7;
  api.get.mockImplementation(async (url) => ({ data: { data:
    url === "/cash-closings/meta" ? { counters: [{ id: 5, name: "Till One" }], receivedByEmployees: [kavya], cashiers: [kavya], openCounterIds: [5] } :
    url === "/cash-openings/meta" ? { locations: [], counters: [{ id: 5, name: "Till One" }, { id: 6, name: "Till Two" }], paidByEmployees: [kavya], cashiers: [kavya], openCounterIds: [5] } :
    url === "/cash-closings/next-bill-no" ? { billNo: 3 } :
    url === "/cash-closings/opening-amount" ? (openSession
      ? { sessionId: openSession, openingAmount: 1500, cashSales: 140, cashRefunds: 30, expectedBeforeExpenses: 1610 }
      : { sessionId: null, openingAmount: 0, cashSales: 0, cashRefunds: 0, expectedBeforeExpenses: 0 }) : []
  } }));
  api.post.mockResolvedValue({ data: { data: { bill_no: 3 } } });
});

const pick = async (label, option) => {
  fireEvent.mouseDown(within(screen.getByText(label, { selector: "label" }).parentElement).getByRole("combobox"));
  fireEvent.click(await screen.findByRole("option", { name: option }));
};
const valueOf = (label) => screen.getByLabelText(label).value;
const count = (note, value) => fireEvent.change(screen.getByLabelText(`Count of ₹${note}`), { target: { value } });

it("Cash Closing: shows opening, cash sales, refunds and expected cash, and saves the counted drawer", async () => {
  render(<MemoryRouter><CashClosing /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/cash-closings/meta", expect.anything()));
  await pick("Counter", "Till One");
  await waitFor(() => expect(valueOf("Opening")).toBe("₹1,500.00"));
  expect(valueOf("Cash Sales")).toBe("₹140.00");
  expect(valueOf("Cash Refunds")).toBe("₹30.00");
  expect(valueOf("Closing Bill No")).toBe("3");
  await pick("Received By", "Kavya (E1)");
  await pick("Cashier", "Kavya (E1)");
  fireEvent.change(screen.getByLabelText("Counter Expenses"), { target: { value: "10" } });
  count(500, "3"); count(50, "1"); count(20, "2");
  expect(valueOf("Expected Cash")).toBe("₹1,600.00");
  expect(valueOf("Counted Cash")).toBe("₹1,590.00");
  expect(valueOf("Difference")).toBe("₹-10.00");
  expect(screen.getByText(/= ₹-10\.00 short/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/cash-closings", expect.objectContaining({
    counterId: "5", receivedByEmployeeId: "9", cashierEmployeeId: "9", counterExpenses: 10, count_500: 3, count_50: 1, count_20: 2, count_100: 0,
  })));
  expect(toast.success).toHaveBeenCalledWith("Cash closing saved (Bill #3)");
});

it("Cash Closing: a counter that isn't open says so and won't save", async () => {
  openSession = null;
  render(<MemoryRouter><CashClosing /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/cash-closings/meta", expect.anything()));
  await pick("Counter", "Till One");
  expect(await screen.findByText(/This counter is not open/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(toast.error).toHaveBeenCalledWith("This counter is not open. Open it in Cash Opening first.");
  expect(api.post).not.toHaveBeenCalled();
});

it("Cash Opening: an open counter can't be picked, and opening sends the counted float", async () => {
  render(<MemoryRouter><CashOpening /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/cash-openings/meta", expect.anything()));
  fireEvent.mouseDown(within(screen.getByText("Counter", { selector: "label" }).parentElement).getByRole("combobox"));
  expect(await screen.findByRole("option", { name: "Till One (open)" })).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(screen.getByRole("option", { name: "Till Two" }));
  await pick("Paid By", "Kavya (E1)");
  await pick("Cashier", "Kavya (E1)");
  const fiveHundred = screen.getAllByRole("spinbutton")[1];
  fireEvent.change(fiveHundred, { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: /^Save/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/cash-openings", expect.objectContaining({
    counterId: "6", paidByEmployeeId: "9", cashierEmployeeId: "9", count_500: 2,
  })));
});

it("POS Old Close: the dialog starts on the till's counter and uses the same closing", async () => {
  const onClose = vi.fn();
  render(<CashClosingDialog open onClose={onClose} defaultCounterId={5} />);
  expect(screen.getByText("Cash Closing")).toBeInTheDocument();
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/cash-closings/opening-amount", expect.objectContaining({ params: { counterId: "5" } })));
  await waitFor(() => expect(valueOf("Opening")).toBe("₹1,500.00"));
  await pick("Received By", "Kavya (E1)");
  await pick("Cashier", "Kavya (E1)");
  count(500, "3");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/cash-closings", expect.objectContaining({ counterId: "5", count_500: 3 })));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

it("Cash Closing: a store without employees can close without picking people", async () => {
  const base = api.get.getMockImplementation();
  api.get.mockImplementation(async (url, config) => (url === "/cash-closings/meta"
    ? { data: { data: { counters: [{ id: 5, name: "Till One" }], receivedByEmployees: [], cashiers: [], openCounterIds: [5] } } }
    : base(url, config)));
  render(<MemoryRouter><CashClosing /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/cash-closings/meta", expect.anything()));
  await pick("Counter", "Till One");
  await waitFor(() => expect(valueOf("Opening")).toBe("₹1,500.00"));
  count(500, "3");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/cash-closings", expect.objectContaining({ counterId: "5", receivedByEmployeeId: "", cashierEmployeeId: "" })));
});
