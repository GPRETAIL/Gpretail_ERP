import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import BillingDateBanner from "@/features/sales/pos/components/BillingDateBanner";

beforeEach(() => { mocks.get.mockReset(); mocks.post.mockReset(); });
afterEach(cleanup);

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
  expect(screen.queryByRole("button", { name: "Tomorrow" })).toBeNull();
});

it("manual: a supervisor switches the counter to tomorrow", async () => {
  mocks.get.mockResolvedValue({ data: { data: { mode: "manual", date: "2026-11-17", shifted: false, can_change: true } } });
  mocks.post.mockResolvedValue({ data: { message: "Billing date set to 18 Nov.", data: { mode: "manual", date: "2026-11-18", shifted: true, can_change: true, reason: "Billing date set to 18 Nov for this counter." } } });
  render(<BillingDateBanner />);
  fireEvent.click(await screen.findByRole("button", { name: "Tomorrow" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/pos-sales/billing-date", { date: "tomorrow" }));
  expect(await screen.findByText("Billing date set to 18 Nov for this counter.")).toBeInTheDocument();
});
