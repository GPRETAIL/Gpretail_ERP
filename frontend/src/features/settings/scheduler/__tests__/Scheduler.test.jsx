import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { addRecipient, describeFrequency, recipientLabel, schedulePayload, emptySchedule } from "@/features/settings/scheduler/utils/scheduler";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: mocks }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import Scheduler from "@/features/settings/scheduler/Scheduler";

const OPTIONS = {
  reports: [
    { key: "daily_summary", label: "Daily Business Summary", module: "Dashboard", dated: true, layouts: [], allowed: true },
    { key: "summary.sale_payments", label: "Sale payments summary", module: "Sales", dated: true, layouts: [{ value: "mode", label: "Payment mode" }], allowed: true },
    { key: "finance.profit_loss", label: "Profit & Loss", module: "Finance", dated: true, layouts: [], allowed: false },
  ],
  periods: [{ value: "yesterday", label: "Yesterday" }, { value: "last_week", label: "Last week (Mon to Sun)" }],
  roles: ["manager", "accountant"], users: [{ id: 5, name: "Anu", email: "anu@example.test", role: "manager" }], groups: [{ id: 3, name: "Owners" }],
  email_ready: false, own_smtp: false,
};
const SCHEDULE = { id: 9, name: "Morning summary", report_key: "daily_summary", report_label: "Daily Business Summary", period: "yesterday", period_label: "Yesterday",
  frequency: "daily", send_time: "09:00", formats: ["xlsx", "pdf"], recipients: [{ type: "role", value: "manager" }, { type: "group", value: "3" }],
  is_active: true, next_run_at: "2026-11-18 09:00", last_status: "sent", params: null };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.get.mockImplementation(async (url) => ({ data: { data: url === "/report-schedules/options" ? OPTIONS : url === "/report-schedules" ? [SCHEDULE] : [] } }));
});
afterEach(cleanup);

it("helpers: payload, frequency text, recipient labels, no duplicate recipients", () => {
  const form = { ...emptySchedule(), name: " Weekly P&L ", report_key: "summary.sale_payments", layout: "mode", frequency: "weekly", day_of_week: 1, send_time: "08:00",
    recipients: [{ type: "email", value: "ca@example.test" }] };
  expect(schedulePayload(form)).toMatchObject({ name: "Weekly P&L", params: { layout: "mode" }, day_of_week: 1, day_of_month: null, recipients: [{ type: "email", value: "ca@example.test" }] });
  expect(describeFrequency(form)).toBe("Every Monday at 08:00");
  expect(describeFrequency({ frequency: "monthly", day_of_month: 31, send_time: "07:00" })).toBe("Monthly on day 31 at 07:00");
  expect(recipientLabel({ type: "group", value: "3" }, OPTIONS)).toBe("Group: Owners");
  expect(recipientLabel({ type: "role", value: "manager" }, OPTIONS)).toBe("All Managers");
  expect(addRecipient([{ type: "email", value: "a@x.in" }], { type: "email", value: "A@X.in" })).toHaveLength(1);
});

it("lists schedules, warns when email is not set up, and creates a schedule", async () => {
  mocks.post.mockResolvedValue({ data: { message: "Schedule saved.", data: {} } });
  render(<MemoryRouter><Scheduler /></MemoryRouter>);

  expect(await screen.findByText("Morning summary")).toBeInTheDocument();
  expect(screen.getByText("All Managers, Group: Owners")).toBeInTheDocument();
  expect(screen.getByText(/Email is not set up/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "New schedule" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/Schedule name/), { target: { value: "Owner morning" } });
  fireEvent.mouseDown(within(dialog).getByLabelText("Recipient type"));
  fireEvent.click(await screen.findByRole("option", { name: "Email address" }));
  fireEvent.change(within(dialog).getByLabelText("Email address"), { target: { value: "owner@example.test" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
  expect(within(dialog).getByText("owner@example.test")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save schedule" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/report-schedules", expect.objectContaining({
    name: "Owner morning", report_key: "daily_summary", period: "yesterday", frequency: "daily", send_time: "09:00", formats: ["xlsx", "pdf"],
    recipients: [{ type: "email", value: "owner@example.test" }],
  })));
});

it("only reports the user may open can be picked", async () => {
  render(<MemoryRouter><Scheduler /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "New schedule" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText(/Report/));
  expect(await screen.findByRole("option", { name: "Sale payments summary" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Profit & Loss" })).toBeNull();
});
