import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post, put: mocks.put, delete: mocks.del } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { store_id: 1, role: "manager" } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import IncentiveConfiguration from "@/features/settings/incentives/IncentiveConfiguration";
import { ruleValueText } from "@/features/settings/incentives/utils/incentiveRules";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const RULES = [
  { id: 1, type: "item", name: "Shirts 2%", basis: "percent", value: 2, scope_type: "category", scope_ids: ["3"], scope_labels: ["Shirts"], employee_labels: [], department_labels: [], is_active: true },
  { id: 2, type: "target", name: "Monthly", target_type: "amount", slabs: [{ from: 80, to: 100, type: "percent", value: 1 }, { from: 100, to: null, type: "amount", value: 500 }], employee_labels: [], department_labels: [], is_active: true },
];
const OPTIONS = { sections: [], categories: [{ id: 3, name: "Shirts" }], brands: [], departments: [{ id: 9, name: "Sarees" }], employees: [{ id: 5, code: "E1", name: "Ravi" }] };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.get.mockImplementation(async (url) => ({ data: { data: url === "/incentives/rules" ? RULES : url === "/incentives/options" ? OPTIONS : [] } }));
  mocks.post.mockResolvedValue({ data: { data: { id: 3 } } });
  mocks.put.mockResolvedValue({ data: { data: [] } });
});
afterEach(cleanup);

const renderPage = () => render(<MemoryRouter><TransferActivityProvider><IncentiveConfiguration /></TransferActivityProvider></MemoryRouter>);

it("shows how each rule pays", () => {
  expect(ruleValueText({ type: "item", basis: "per_piece", value: 5 })).toBe("₹5 / piece");
  expect(ruleValueText({ type: "scheme", basis: "percent", value: 1.5 })).toBe("1.5%");
  expect(ruleValueText(RULES[1])).toBe("80%–100%: 1% · 100%+: ₹500");
});

it("lists item rules and saves a new one", async () => {
  renderPage();
  expect(await screen.findByText("Shirts 2%")).toBeInTheDocument();
  expect(screen.getByText("Category: Shirts")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "New item rule" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: "Store 1%" } });
  fireEvent.change(within(dialog).getByLabelText(/^Percent/), { target: { value: "1" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/incentives/rules", expect.objectContaining({
    type: "item", name: "Store 1%", basis: "percent", value: 1, scope_type: "all", slabs: null,
  })));
});

it("saves the month's targets for salespeople and sections", async () => {
  renderPage();
  await screen.findByText("Shirts 2%");
  fireEvent.click(screen.getByRole("tab", { name: /Targets/ }));
  expect(await screen.findByText("Monthly")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Sales target for Ravi (E1)"), { target: { value: "50000" } });
  fireEvent.change(screen.getByLabelText("Sales target for Sarees"), { target: { value: "200000" } });
  fireEvent.click(screen.getByRole("button", { name: "Save targets" }));

  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/incentives/targets", expect.objectContaining({
    targets: expect.arrayContaining([
      expect.objectContaining({ employee_id: 5, target_amount: 50000 }),
      expect.objectContaining({ department_id: 9, target_amount: 200000 }),
    ]),
  })));
});
