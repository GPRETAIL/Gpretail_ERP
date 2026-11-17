import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { groupFinancePages } from "@/features/finance/home/utils/financeHomePages";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 1, role: "admin", store_id: 2 } } }) }));
vi.mock("@/features/dashboard/components/FinanceDashboardTabPane", () => ({ default: () => <div>finance dashboard</div> }));
vi.mock("@/features/auth/utils/accessControl", () => ({
  getVisibleNavItems: () => [{ path: "/finance", subItems: [
    { name: "Voucher Entry", path: "/finance/voucher-entry" },
    { name: "Petty Cash", path: "/finance/petty-cash" },
    { name: "Trial Balance", path: "/finance/trial-balance" },
  ] }],
}));
import FinanceHome from "@/features/finance/home/FinanceHome";

afterEach(cleanup);

it("groups only the Finance pages the user may open and tags the ones still being built", () => {
  const groups = groupFinancePages([
    { name: "Trial Balance", path: "/finance/trial-balance" },
    { name: "Petty Cash", path: "/finance/petty-cash" },
    { name: "New Page", path: "/finance/new-page" },
  ]);
  expect(groups.map((g) => g.title)).toEqual(["Money in and out", "Reports", "More"]);
  expect(groups[0].items[0]).toMatchObject({ name: "Petty Cash", soon: true });
  expect(groups[1].items[0]).toMatchObject({ name: "Trial Balance", soon: false });
});

it("shows cash, bank, today, GST and profit from the books, then the page tiles", async () => {
  mocks.get.mockResolvedValue({ data: { data: {
    date: "2026-11-17", cash: [{ id: 1, name: "Cash in Hand", balance: 5200 }], bank: [{ id: 2, name: "HDFC", balance: 10000 }, { id: 3, name: "SBI", balance: 2500 }],
    clearing: [], gst: { output: 900, input: 300, net_payable: 600 }, net_profit_month: 4200,
    totals: { cash: 5200, bank: 12500, clearing: 750, in_today: 3000, out_today: 1000, receivable: 800, payable: 6400 },
  } } });
  render(<MemoryRouter><FinanceHome /></MemoryRouter>);

  const cards = await screen.findByLabelText("Money today");
  expect(mocks.get).toHaveBeenCalledWith("/accounting/home", { params: {} });
  expect(within(cards).getByText("₹5,200.00")).toBeInTheDocument();
  expect(within(cards).getByText("₹12,500.00")).toBeInTheDocument();
  expect(within(cards).getByText("SBI")).toBeInTheDocument();
  expect(within(cards).getByText("+ ₹750.00 card / UPI not yet in bank")).toBeInTheDocument();
  expect(within(cards).getByText("₹2,000.00")).toBeInTheDocument();
  expect(within(cards).getByText("₹600.00")).toBeInTheDocument();
  expect(within(cards).getByText("₹4,200.00")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Petty Cash/ })).toHaveTextContent("Soon");
  expect(screen.getByRole("link", { name: "Voucher Entry" })).toHaveAttribute("href", "/finance/voucher-entry");
});
