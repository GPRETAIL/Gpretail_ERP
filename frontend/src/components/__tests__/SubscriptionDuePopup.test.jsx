import { render, screen, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPost = vi.fn(() => Promise.resolve({ data: {} }));
vi.mock("../../api/axios", () => ({ default: { post: (...args) => mockPost(...args) } }));

const mockStatus = vi.fn();
vi.mock("../../hooks/useSubscriptionStatus", () => ({ default: () => mockStatus() }));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));

import SubscriptionDuePopup from "../SubscriptionDuePopup";

const HOUR_MS = 60 * 60 * 1000;
const VISIBLE_MS = 60 * 1000;
const LAST_SHOWN_KEY = "vx.subscriptionDue.lastShownAt";

/** Lets timers and the state updates they trigger settle together. */
const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

describe("SubscriptionDuePopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mockPost.mockClear();
    mockStatus.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a hand-pushed reminder immediately, even mid-cycle", () => {
    // The automatic nudge was shown one second ago, so its hourly gate is firmly closed. A pushed
    // notice must ignore that: the whole point of the Notify button is that the tenant sees it now.
    sessionStorage.setItem(LAST_SHOWN_KEY, String(Date.now() - 1000));
    mockStatus.mockReturnValue({
      dueSoon: false,
      onTrial: false,
      notices: [{ id: 7, subject: "Action needed", message: "Please renew your plan." }],
    });

    render(<SubscriptionDuePopup />);
    advance(0);

    expect(screen.getByText("Action needed")).toBeTruthy();
    expect(screen.getByText("Please renew your plan.")).toBeTruthy();
  });

  it("keeps the automatic nudge behind the hourly gate", () => {
    sessionStorage.setItem(LAST_SHOWN_KEY, String(Date.now() - 1000));
    mockStatus.mockReturnValue({ dueSoon: true, onTrial: false, soonestDaysLeft: 5, notices: [] });

    render(<SubscriptionDuePopup />);

    expect(screen.queryByText(/due in 5 days/i)).toBeNull();

    advance(HOUR_MS);
    expect(screen.getByText(/due in 5 days/i)).toBeTruthy();
  });

  it("hides again after one minute", () => {
    mockStatus.mockReturnValue({ dueSoon: true, onTrial: false, soonestDaysLeft: 3, notices: [] });

    render(<SubscriptionDuePopup />);
    // With no previous show the delay is 0, but a 0ms timeout still needs one tick to fire; fake
    // timers do not advance on their own. In a browser this is a single frame.
    advance(0);
    expect(screen.getByText(/due in 3 days/i)).toBeTruthy();

    advance(VISIBLE_MS);
    expect(screen.queryByText(/due in 3 days/i)).toBeNull();
  });

  it("re-shows an hour after it was shown, not an hour after mount", () => {
    // Mount 50 minutes into the cycle: the banner is due in 10 minutes. A setInterval anchored to
    // mount would fire at +60 from MOUNT -- ten minutes after that first show -- popping the banner
    // twice in quick succession.
    sessionStorage.setItem(LAST_SHOWN_KEY, String(Date.now() - 50 * 60 * 1000));
    mockStatus.mockReturnValue({ dueSoon: true, onTrial: false, soonestDaysLeft: 2, notices: [] });

    render(<SubscriptionDuePopup />);
    expect(screen.queryByText(/due in 2 days/i)).toBeNull();

    advance(10 * 60 * 1000);
    expect(screen.getByText(/due in 2 days/i)).toBeTruthy();

    advance(VISIBLE_MS);
    expect(screen.queryByText(/due in 2 days/i)).toBeNull();

    // 10 minutes later is where the mount-anchored interval used to fire. Nothing should happen.
    advance(10 * 60 * 1000);
    expect(screen.queryByText(/due in 2 days/i)).toBeNull();

    // A full hour after the show, it returns.
    advance(HOUR_MS - VISIBLE_MS - 10 * 60 * 1000);
    expect(screen.getByText(/due in 2 days/i)).toBeTruthy();
  });

  it("does not restart the cycle when polling returns the same notice in a new object", () => {
    const notice = { id: 9, subject: "Renew", message: "Renew soon." };
    mockStatus.mockReturnValue({ dueSoon: false, onTrial: false, notices: [notice] });

    const { rerender } = render(<SubscriptionDuePopup />);
    advance(0);
    expect(screen.getByText("Renew")).toBeTruthy();

    advance(VISIBLE_MS);
    expect(screen.queryByText("Renew")).toBeNull();

    // Same notice, fresh object identity — exactly what the 10-minute poll produces.
    mockStatus.mockReturnValue({
      dueSoon: false,
      onTrial: false,
      notices: [{ id: 9, subject: "Renew", message: "Renew soon." }],
    });
    rerender(<SubscriptionDuePopup />);

    expect(screen.queryByText("Renew")).toBeNull();
  });

  it("keeps a dismissed notice dismissed across a remount", async () => {
    mockStatus.mockReturnValue({
      dueSoon: false,
      onTrial: false,
      notices: [{ id: 11, subject: "Overdue", message: "Payment overdue." }],
    });

    const { unmount } = render(<SubscriptionDuePopup />);
    advance(0);
    expect(screen.getByText("Overdue")).toBeTruthy();

    await act(async () => {
      screen.getByLabelText("Dismiss").click();
    });
    expect(screen.queryByText("Overdue")).toBeNull();
    expect(mockPost).toHaveBeenCalledWith("/companies/subscription/notices/11/dismiss");

    // Navigating remounts the component. The server dismiss may not be reflected until the next
    // poll, so without local persistence the banner came straight back.
    unmount();
    render(<SubscriptionDuePopup />);
    advance(0);
    expect(screen.queryByText("Overdue")).toBeNull();
  });

  it("stays silent when there is nothing to warn about", () => {
    mockStatus.mockReturnValue({ dueSoon: false, onTrial: false, notices: [] });

    render(<SubscriptionDuePopup />);
    advance(HOUR_MS);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
