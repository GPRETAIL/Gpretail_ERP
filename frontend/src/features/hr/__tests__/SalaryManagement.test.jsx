import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import SalaryManagement from "@/features/hr/payroll/SalaryManagement";
import MyPayslips from "@/features/hr/payroll/MyPayslips";
import { PayrollSettingsPage } from "@/features/hr/HrSectionPages";
import { payslipHtml, payslipWhatsAppUrl } from "@/features/hr/payroll/payslipPrint";
import api from "@/shared/api/apiClient";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("@/features/sales/pos/utils/posSalesUtils", () => ({ browserPrintHtml: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

const slip = {
  id: 41, month: "2026-10", month_label: "October 2026", days_in_month: 31, payable_days: 28, lop_days: 3, gross_fixed: 30000,
  earnings: [{ code: "BASIC", name: "Basic", amount: 13548.39 }, { code: "HRA", name: "House Rent Allowance", amount: 5419.35 }],
  deductions: [{ code: "PF", name: "Provident Fund", amount: 1626 }, { code: "PT", name: "Professional Tax", amount: 200 }],
  gross_earned: 27096.77, total_deductions: 1826, net_pay: 25271, employer_pf: 1626, employer_esi: 0, held: false,
  snapshot: { name: "Asha", code: "E1", designation: "Cashier", bank_account_no: "1234", bank_ifsc: "SBIN0001" }, store: { name: "Approvals Test Store", address: "Chennai" },
};
let runState;
beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "manager" };
  runState = null;
  vi.spyOn(window, "confirm").mockReturnValue(true);
  api.get.mockImplementation(async (url) => {
    if (url === "/payroll-runs") return { data: { data: runState ? [runState] : [] } };
    if (url.startsWith("/payroll-runs/")) return { data: { data: { ...runState, payslips: [slip] } } };
    if (url.startsWith("/payslips/") || url.startsWith("/my-payslips/")) return { data: { data: slip } };
    if (url === "/my-payslips") return { data: { data: { employee: { id: 1, name: "Asha" }, payslips: [{ id: 41, month: "2026-10", net_pay: 25271, gross_earned: 27096.77, status: "PAID", held: false }] } } };
    if (url === "/payroll/settings") return { data: { data: { settings: { pf: { enabled: true, employee_pct: 12, employer_pct: 12, cap_wages: true, wage_ceiling: 15000 }, esi: { enabled: true, employee_pct: 0.75, employer_pct: 3.25, gross_limit: 21000 }, pt: { state: "NONE", frequency: "monthly", months: [], slabs: [] }, ot: { multiplier: 1, hours_per_day: 8 }, batta: { per_day: 0 } },
      pt_presets: { NONE: { name: "No professional tax", frequency: "monthly", months: [], slabs: [] }, TN: { name: "Tamil Nadu", frequency: "half_yearly", months: [9, 3], slabs: [[0, 21000, 0, null], [21001, 30000, 180, null]] } } } } };
    return { data: { data: [] } };
  });
  api.post.mockImplementation(async (url) => {
    if (url === "/payroll-runs/prepare") runState = { id: 7, month: "2026-10", status: "DRAFT", employees: 1, gross: 27096.77, deductions: 1826, net: 25271, employer_cost: 28722.77 };
    if (url.endsWith("/submit")) runState = { ...runState, status: "SUBMITTED" };
    return { data: { message: "Done" } };
  });
  api.put.mockResolvedValue({ data: { message: "Saved" } });
});

const wrap = (node) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);

it("prepares a month, shows the payslip, and submits", async () => {
  wrap(<SalaryManagement />);
  fireEvent.change(await screen.findByLabelText("Month"), { target: { value: "2026-10" } });
  fireEvent.click(await screen.findByRole("button", { name: "Prepare October 2026" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/payroll-runs/prepare", { month: "2026-10" }));
  expect(await screen.findByText("25,271.00")).toBeInTheDocument();
  expect(screen.getByText("₹25,271.00")).toBeInTheDocument(); // Net pay card.

  fireEvent.click(screen.getByRole("button", { name: "View" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Provident Fund")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Print / PDF" }));
  expect(browserPrintHtml).toHaveBeenCalledWith(expect.stringContaining("Payslip for October 2026"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/payroll-runs/7/submit"));
  expect(await screen.findByRole("button", { name: "Mark paid" })).toBeInTheDocument();
});

it("fills professional tax slabs from the store's state and saves them", async () => {
  wrap(<PayrollSettingsPage />);
  fireEvent.mouseDown(await screen.findByLabelText("Store's state"));
  fireEvent.click(await screen.findByRole("option", { name: "Tamil Nadu" }));
  expect(screen.getAllByLabelText("Tax ₹")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/payroll/settings", expect.objectContaining({
    pt: { state: "TN", frequency: "half_yearly", months: [9, 3], slabs: [[0, 21000, 0, null], [21001, 30000, 180, null]] },
  })));
});

it("lists my payslips and opens one", async () => {
  mockUser.current = { id: 9, store_id: 2, role: "cashier" };
  wrap(<MyPayslips />);
  expect(await screen.findByText("October 2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View" }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/my-payslips/41"));
  expect(await within(await screen.findByRole("dialog")).findByText("Net pay")).toBeInTheDocument();
});

it("prints and shares the payslip with its numbers", () => {
  const html = payslipHtml(slip);
  expect(html).toContain("Approvals Test Store");
  expect(html).toContain("25,271.00");
  expect(html).toContain("Provident Fund");
  const text = decodeURIComponent(payslipWhatsAppUrl(slip, "98765 43210").split("text=")[1]);
  expect(payslipWhatsAppUrl(slip, "98765 43210")).toMatch(/^https:\/\/wa\.me\/919876543210\?/);
  expect(text).toContain("Net pay: ₹25,271.00");
  expect(text).toContain("Payable days: 28 of 31");
});
