import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import HrDashboard from "@/features/hr/dashboard/HrDashboard";
import api from "@/shared/api/apiClient";
import { navItems } from "@/shared/layout/navItems";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url) => ({ data: { data: {
    "/attendance/today": { date: "2026-11-04", summary: { present: 5, late: 1, absent: 1, not_marked: 2, leave: 1 },
      rows: [{ name: "Asha", status: "PRESENT", check_in: "10:20:00", late_minutes: 50 }, { name: "Ravi", status: "LEAVE", department: "Sales" }] },
    "/employees/dashboard-summary": { activeEmployees: 9 },
    "/leave-applications": [{ employee_name: "Meena", leave_type_code: "CL", from_date: "2026-11-20", to_date: "2026-11-20" }],
    "/payroll-runs": [{ month: "2026-10", status: "PAID", employees: 9, net: 210000, employer_cost: 230000 }],
  }[url] } }));
});

it("shows today's attendance, leave to approve and the latest payroll", async () => {
  render(<MemoryRouter><HrDashboard /></MemoryRouter>);
  expect(await screen.findByText("Leave to approve")).toBeInTheDocument();
  expect(await screen.findByText("9")).toBeInTheDocument(); // Active employees.
  expect(screen.getByText("3")).toBeInTheDocument(); // Absent 1 + not in yet 2.
  expect(await screen.findByText("Meena")).toBeInTheDocument();
  expect(screen.getByText("50m")).toBeInTheDocument(); // Asha's lateness.
  expect(await screen.findByText("October 2026")).toBeInTheDocument();
  expect(screen.getByText("Paid")).toBeInTheDocument();
});

it("lists every HR page as an HRMS sub-menu item", () => {
  const hrms = navItems.find((item) => item.path === "/hrms");
  expect(hrms.subItems.map((item) => item.name)).toEqual(expect.arrayContaining(["Dashboard", "Attendance", "Attendance Register", "Punch Log", "Holidays",
    "Leave", "Leave Approvals", "Leave Applications", "Leave Balances", "Leave Setup", "Payroll", "Additional Pay", "Salary Structures", "Payroll Settings", "Payroll Reports", "My Payslips"]));
});
