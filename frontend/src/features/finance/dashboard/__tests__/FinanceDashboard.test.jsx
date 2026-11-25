import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 1, role: "admin", store_id: 2 } } }) }));
vi.mock("@/features/dashboard/components/FinanceDashboardTabPane", () => ({ default: () => <div>payables and dues</div> }));
import FinanceDashboard from "@/features/finance/dashboard/FinanceDashboard";

afterEach(cleanup);

it("shows cash, bank, today, GST, dues and profit from the books above the payables and dues", async () => {
  mocks.get.mockResolvedValue({ data: { data: {
    date: "2026-11-17", cash: [{ id: 1, name: "Cash in Hand", balance: 5200 }], bank: [{ id: 2, name: "HDFC", balance: 10000 }, { id: 3, name: "SBI", balance: 2500 }],
    clearing: [], gst: { output: 900, input: 300, net_payable: 600 }, net_profit_month: 4200,
    totals: { cash: 5200, bank: 12500, clearing: 750, in_today: 3000, out_today: 1000, receivable: 800, payable: 6400 },
  } } });
  render(<MemoryRouter><FinanceDashboard /></MemoryRouter>);

  const cards = await screen.findByLabelText("Money today");
  expect(mocks.get).toHaveBeenCalledWith("/accounting/home", { params: {} });
  expect(within(cards).getByText("₹5,200.00")).toBeInTheDocument();
  expect(within(cards).getByText("₹12,500.00")).toBeInTheDocument();
  expect(within(cards).getByText("SBI")).toBeInTheDocument();
  expect(within(cards).getByText("+ ₹750.00 card / UPI not yet in bank")).toBeInTheDocument();
  expect(within(cards).getByText("₹2,000.00")).toBeInTheDocument();
  expect(within(cards).getByText("₹600.00")).toBeInTheDocument();
  expect(within(cards).getByText("₹4,200.00")).toBeInTheDocument();
  expect(within(cards).getByRole("link", { name: "Open Receivable" })).toHaveAttribute("href", "/finance/receivable");
  expect(within(cards).getByRole("link", { name: "Open Payable" })).toHaveAttribute("href", "/finance/payable");
  expect(within(cards).getByRole("link", { name: "Open Profit & Loss" })).toHaveAttribute("href", "/finance/p-l-account");
  expect(screen.getByText("payables and dues")).toBeInTheDocument();
});

it("says so when the books cannot be read, and the rest of the dashboard still shows", async () => {
  mocks.get.mockRejectedValue({ response: { data: { message: "Accounting is not set up for this store yet." } } });
  render(<MemoryRouter><FinanceDashboard /></MemoryRouter>);

  expect(await screen.findByText("Accounting is not set up for this store yet.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Money today")).not.toBeInTheDocument();
  expect(screen.getByText("payables and dues")).toBeInTheDocument();
});
