import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 1, role: "admin" } } }) }));
vi.mock("@/features/auth/utils/accessControl", () => ({ canAccessPath: () => true }));
import BillingDateBanner from "@/features/sales/pos/components/BillingDateBanner";
import FooterBillingDate from "@/shared/components/FooterBillingDate";
import { BILLING_DATE_EVENT } from "@/features/sales/pos/utils/billingDate";

beforeEach(() => { mocks.get.mockReset(); mocks.post.mockReset(); });
afterEach(cleanup);

const MANUAL = { mode: "manual", date: "2026-11-17", today: "2026-11-17", max_date: "2026-11-24", shifted: false, can_change: true };

it("shows nothing while bills go on today", async () => {
  mocks.get.mockResolvedValue({ data: { data: { mode: "auto", date: "2026-11-17", shifted: false, can_change: false } } });
  const { container } = render(<BillingDateBanner />);
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/pos-sales/billing-date"));
  expect(container).toBeEmptyDOMElement();
});

it("warns when the counter's day is closed and bills go on tomorrow", async () => {
  mocks.get.mockResolvedValue({ data: { data: { mode: "auto", date: "2026-11-18", shifted: true, can_change: false, reason: "Day closed for 17 Nov: new bills are dated 18 Nov." } } });
  render(<BillingDateBanner />);
  expect(await screen.findByText("Day closed for 17 Nov: new bills are dated 18 Nov.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Billing date to set")).toBeNull();
});

it("manual: an allowed user picks a date up to a week ahead, and the footer shows it at once", async () => {
  mocks.get.mockResolvedValue({ data: { data: MANUAL } });
  mocks.post.mockResolvedValue({ data: { message: "Billing date set to 21 Nov.", data: { ...MANUAL, date: "2026-11-21", shifted: true, reason: "Billing date set to 21 Nov for this counter." } } });
  render(<><BillingDateBanner /><FooterBillingDate /></>);

  const field = await screen.findByLabelText("Billing date to set");
  expect(field).toHaveAttribute("min", "2026-11-17");
  expect(field).toHaveAttribute("max", "2026-11-24");
  expect(screen.queryByText(/^Billing date /)).toBeNull(); // Footer: nothing while bills go on today.
  fireEvent.change(field, { target: { value: "2026-11-21" } });
  fireEvent.click(screen.getByRole("button", { name: "Set date" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/pos-sales/billing-date", { date: "2026-11-21" }));
  expect(await screen.findByText("Billing date set to 21 Nov for this counter.")).toBeInTheDocument();
  expect(await screen.findByText("Billing date 21 Nov")).toBeInTheDocument(); // Footer.
  expect(screen.getByRole("button", { name: "Back to today" })).toBeInTheDocument();
});

it("footer: follows a change announced elsewhere (another POS tab or screen)", async () => {
  mocks.get.mockResolvedValue({ data: { data: { ...MANUAL, can_change: false } } });
  render(<FooterBillingDate />);
  await waitFor(() => expect(mocks.get).toHaveBeenCalled());
  act(() => { window.dispatchEvent(new CustomEvent(BILLING_DATE_EVENT, { detail: { ...MANUAL, date: "2026-11-18", shifted: true } })); });
  expect(await screen.findByText("Billing date 18 Nov")).toBeInTheDocument();
});
