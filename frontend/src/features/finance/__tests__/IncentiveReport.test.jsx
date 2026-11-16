import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { store_id: 1, role: "manager" } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import IncentiveReport from "@/features/finance/IncentiveReport";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const ROW = { employee_id: 5, employee_code: "E1", employee_name: "Ravi", section: "Sarees", bills: 3, qty: 4, net_sales: 4000,
  item_amount: 80, scheme_amount: 20, ageing_amount: 10, target_amount: 500, achievement_pct: 120, returns_amount: -10, total: 600, approved: false };
const LINES = [{ kind: "sale", date: "2026-10-12", bill_no: "261012-0001", product: "Shirt", qty: 2, net: 2000, item: 40, item_rule: "Shirts 2%", scheme: 20, ageing: 0, total: 60 }];

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.get.mockImplementation(async (_url, { params }) => ({ data: { data: { month: params.month, approved: false, rows: [ROW], ...(params.employee_id ? { lines: LINES } : {}) } } }));
  mocks.post.mockResolvedValue({ data: { message: "Month approved.", data: { month: "x", approved: true, approved_at: "2026-11-01T10:00:00Z", rows: [{ ...ROW, approved: true }] } } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(cleanup);

it("shows each salesperson's incentive, their bill lines, and approves the month", async () => {
  render(<MemoryRouter><TransferActivityProvider><IncentiveReport /></TransferActivityProvider></MemoryRouter>);
  expect(await screen.findByText("600.00")).toBeInTheDocument();
  expect(screen.getByText("120% of target")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Ravi" }));
  expect(await screen.findByText("Shirts 2%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  fireEvent.click(screen.getByRole("button", { name: "Approve month" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/incentives/approve", { month: expect.stringMatching(/^\d{4}-\d{2}$/) }));
  expect(await screen.findByText(/These amounts are fixed/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Approve month" })).toBeNull();
});
