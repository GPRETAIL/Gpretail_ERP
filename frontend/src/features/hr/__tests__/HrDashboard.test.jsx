import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import HrDashboard from "@/features/hr/dashboard/HrDashboard";
import api from "@/shared/api/apiClient";
import { navItems } from "@/shared/layout/navItems";
import { DASHBOARD_PAGES } from "@/features/dashboard/utils/dashboardModuleTabs";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));
// The real grid measures the DOM; render the widgets straight through.
vi.mock("react-grid-layout", () => ({
  Responsive: ({ children }) => <div data-testid="grid">{children}</div>,
  useContainerWidth: () => ({ width: 1200, containerRef: { current: null }, mounted: true }),
}));

const DASHBOARD = {
  range: { from: "2026-11-01", to: "2026-11-25", today: "2026-11-25" }, scope: "store",
  summary: { headcount: 9, joiners: 1, exits: 0, upcoming_exits: 1, present_today: 6, attendance_pct: 75, on_leave_today: 1, approvals_waiting: 3,
    payroll: { month: "2026-10", status: "PAID", employees: 9, net: 210000, employer_cost: 230000 } },
  today: { total: 9, present: 5, half_day: 1, late: 2, absent: 1, not_marked: 0, leave: 1, week_off: 1, holiday: 0, on_duty: 0 },
  attendance_trend: [{ date: "2026-11-24", label: "24 Nov", present_pct: 88, absent: 1, leave: 0 }],
  by_department: [{ department: "Sales", count: 6 }, { department: "Stores", count: 3 }],
  approvals: { leave: 2, claim: 1 },
  leave: { this_week: [{ name: "Ravi", type: "Casual Leave", from: "2026-11-24", to: "2026-11-26", days: 3 }], taken_by_type: [{ type: "Casual Leave", days: 4 }] },
  payroll: { runs: [{ month: "2026-10", status: "PAID", employees: 9, gross: 250000, net: 210000, employer_cost: 230000 }], last_month_pending: null },
  people: { joiners: [{ id: 7, name: "Asha", designation: "Cashier", date: "2026-11-03" }], exits: [{ id: 8, name: "Devi", designation: null, date: "2026-11-28", status: "ACCEPTED", upcoming: true }],
    celebrations: [{ kind: "anniversary", name: "Lakshmi", designation: null, date: "2026-12-01", years: 6 }], holidays: [{ date: "2026-12-25", name: "Christmas" }] },
  action_required: [{ type: "leave", severity: "medium", link: "/hrms/leave-approvals", message: "2 leave requests waiting" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "manager" };
  api.get.mockImplementation(async (url) => ({ data: url === "/hrms/dashboard" ? { success: true, data: DASHBOARD } : { success: true, data: {} } }));
});

it("shows the HR widgets: headcount, today, approvals, leave, payroll, people events", async () => {
  render(<MemoryRouter><HrDashboard /></MemoryRouter>);
  expect(await screen.findByText("+1 joined · 1 leaving soon")).toBeInTheDocument();
  expect(screen.getByText("75% of those working today")).toBeInTheDocument();
  expect(screen.getByText("2 came in late")).toBeInTheDocument();
  expect(screen.getByText("Expense claims")).toBeInTheDocument();
  expect(screen.getByText("Ravi")).toBeInTheDocument();
  expect(screen.getByText("Leaving 28 Nov")).toBeInTheDocument();
  expect(screen.getByText("6 years with us")).toBeInTheDocument();
  expect(screen.getByText("Christmas")).toBeInTheDocument();
  expect(screen.getByText(/₹2.30 L/)).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/hrms/dashboard", expect.objectContaining({ params: expect.objectContaining({ date_from: expect.any(String) }) }));
  fireEvent.click(screen.getByText("2 leave requests waiting"));
  expect(navigate).toHaveBeenCalledWith("/hrms/leave-approvals");
});

it("leaves out pay when the server sends none", async () => {
  api.get.mockImplementation(async (url) => ({ data: url === "/hrms/dashboard"
    ? { success: true, data: { ...DASHBOARD, scope: "team", summary: { ...DASHBOARD.summary, payroll: null }, payroll: null } } : { success: true, data: {} } }));
  render(<MemoryRouter><HrDashboard /></MemoryRouter>);
  expect(await screen.findByText("Showing your team")).toBeInTheDocument();
  expect(screen.queryByText("Payroll cost")).not.toBeInTheDocument();
  expect(screen.queryByText("Payroll, last 6 months")).not.toBeInTheDocument();
});

it("adds an HR tab to the Dashboard and keeps every HR page in the HRMS menu", () => {
  expect(DASHBOARD_PAGES.find((tab) => tab.id === "hrms")).toMatchObject({ name: "HR", path: "/dashboard/hrms" });
  const hrms = navItems.find((item) => item.path === "/hrms");
  expect(hrms.subItems.map((item) => item.name)).toEqual(expect.arrayContaining(["Dashboard", "Attendance", "Attendance Register", "Punch Log", "Holidays",
    "Leave", "Leave Approvals", "Leave Applications", "Leave Balances", "Leave Setup", "Payroll", "Additional Pay", "Salary Structures", "Payroll Settings", "Payroll Reports", "My Payslips", "Staff App"]));
});
