import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { Exits, FinalSettlements, MyResignation } from "@/features/hr/exits/Exits";
import MyResignationCard from "@/mobile/components/MyResignationCard";
import api from "@/shared/api/apiClient";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("@/features/sales/pos/utils/posSalesUtils", () => ({ browserPrintHtml: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

const resignation = { id: 7, employee_id: 1, employee_name: "Asha", employee_code: "E1", type: "RESIGNATION", applied_on: "2026-11-01", requested_last_day: "2026-11-10",
  last_working_day: null, notice_days: 30, notice_short_days: 0, notice_waived: false, status: "REQUESTED", reason: "Moving" };
const relieved = { ...resignation, id: 8, status: "RELIEVED", last_working_day: "2026-10-15", employee: { joining_date: "2021-03-01T00:00:00.000000Z", designation: { name: "Cashier" } } };
const fnf = {
  id: 31, separation_id: 8, employee_name: "Asha", type: "RESIGNATION", joining_date: "2021-03-01", last_working_day: "2026-10-15", status: "DRAFT",
  earnings: [{ code: "BASIC", name: "Basic", amount: 7500 }, { code: "LEAVE_EXIT", name: "Leave Encashment on Exit", amount: 10000 }, { code: "GRATUITY", name: "Gratuity", amount: 53653.85 }],
  deductions: [{ code: "NOTICE", name: "Notice Pay Recovery", amount: 16000 }], gross: 71153.85, total_deductions: 16000, net: 55154, adjustments: [],
  summary: { service: "5 year(s) 7 month(s)", payable_days: 15, days_in_month: 31, day_rate: 1000, gratuity_years: 6, gratuity_wage: 15500, gratuity_amount: 53653.85,
    notice_days: 30, notice_short_days: 16, notice_waived: false, loan_left: 0, leave: [{ leave_type_id: 3, name: "Earned Leave", available: 10, days: 10 }] },
  store: { name: "Main" },
};
const wrap = (node) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "manager" };
  api.get.mockImplementation(async (url, config) => ({ data: {
    "/separations/mine": { data: { employee: { id: 1, name: "Asha" }, notice_days: 30, separations: [] } },
    "/separations": { data: config?.params?.status === "RELIEVED" ? [relieved] : [resignation], meta: { today: "2026-11-04", store: { name: "Main", address: "MG Road" } } },
    "/final-settlements": { data: { settlements: [], waiting: [{ separation_id: 8, employee_name: "Asha", type: "RESIGNATION", last_working_day: "2026-10-15", status: "RELIEVED" }] } },
    "/employees": { data: [{ id: 1, name: "Asha", code: "E1" }] },
  }[url] || { data: [] } }));
  api.post.mockImplementation(async (url) => ({ data: { message: "Done", data: url.startsWith("/final-settlements") ? fnf : {} } }));
});

it("sends a resignation with the day the employee wants to leave", async () => {
  wrap(<MyResignation />);
  expect(await screen.findByText(/Your notice period is 30 day\(s\)/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Resign" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("I would like to leave on"), { target: { value: "2026-11-30" } });
  fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Moving" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send resignation" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/separations/resign", { requested_last_day: "2026-11-30", reason: "Moving" }));
});

it("accepts a resignation early and waives the notice shortfall", async () => {
  wrap(<Exits />);
  expect(await screen.findByText("Moving")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/9 day\(s\) served, 21 short/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByLabelText("Waive the notice shortfall"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/separations/7/accept", { last_working_day: "2026-11-10", notice_days: 30, notice_waived: true, note: undefined }));
});

it("records the exit interview and prints the relieving letter", async () => {
  wrap(<Exits />);
  fireEvent.click(await screen.findByRole("button", { name: "Relieved" }));
  fireEvent.click(await screen.findByRole("button", { name: "Relieving" }));
  expect(browserPrintHtml).toHaveBeenCalledWith(expect.stringContaining("relieved from your duties as Cashier at Main at the close of working hours on 15 October 2026"));
  fireEvent.click(screen.getByRole("button", { name: "Experience" }));
  expect(browserPrintHtml).toHaveBeenLastCalledWith(expect.stringContaining("from 1 March 2021 to 15 October 2026"));
  fireEvent.click(screen.getByRole("button", { name: "Interview" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("Pay"));
  fireEvent.click(await screen.findByRole("option", { name: "2" }));
  fireEvent.click(within(dialog).getByLabelText("Would come back to work here"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/separations/8/interview", expect.objectContaining({ reason_category: "BETTER_PAY", ratings: { pay: 2 }, would_rejoin: true })));
});

it("prepares a settlement, pays fewer leave days and submits it", async () => {
  wrap(<FinalSettlements />);
  fireEvent.click(await screen.findByRole("button", { name: "Prepare" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("₹55,154.00")).toBeInTheDocument();
  expect(within(dialog).getByText(/₹15,500.00 Basic × 15\/26 × 6 year\(s\)/)).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("Earned Leave (10 left)"), { target: { value: "5" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Recalculate" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/final-settlements/prepare", { separation_id: 8, encash_days: { 3: 5 }, adjustments: [] }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/final-settlements/31/submit", {}));
  fireEvent.click(within(dialog).getByRole("button", { name: "Print / PDF" }));
  expect(browserPrintHtml).toHaveBeenCalledWith(expect.stringContaining("Full and final settlement"));
});

it("resigns from the phone", async () => {
  render(<MyResignationCard />);
  fireEvent.click(await screen.findByRole("button", { name: "Resign" }));
  fireEvent.click(screen.getByRole("button", { name: "Send resignation" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/separations/resign", expect.objectContaining({ requested_last_day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })));
  expect(await screen.findByText("Resignation sent to your manager.")).toBeInTheDocument();
});
