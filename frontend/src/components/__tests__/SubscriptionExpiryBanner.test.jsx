import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockStatus = vi.fn();
vi.mock("../../hooks/useSubscriptionStatus", () => ({ default: () => mockStatus() }));
let mockRole = "admin";
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { role: mockRole } } }) }));

import SubscriptionExpiryBanner from "../SubscriptionExpiryBanner";

const store = (overrides) => ({ name: "Coffee 1", expired: false, days_left: 20, expiry_date: "2026-10-30T18:30:00Z", ...overrides });

describe("SubscriptionExpiryBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRole = "admin";
    mockStatus.mockReset();
  });
  afterEach(cleanup);

  it("shows a non-dismissible expired alert with Renew now for the tenant admin", () => {
    mockStatus.mockReturnValue({ stores: [store({ expired: true, days_left: -1 }), store({ name: "Coffee 2", expired: true, days_left: -1 })] });
    render(<SubscriptionExpiryBanner />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Subscription expired");
    expect(alert).toHaveTextContent("Coffee 1, Coffee 2");
    expect(alert).toHaveTextContent("blocked for these stores");
    expect(screen.getByRole("button", { name: "Renew now" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Hide renewal reminder for today")).not.toBeInTheDocument();
  });

  it("tells staff to contact their administrator instead of offering renewal", () => {
    mockRole = "cashier";
    mockStatus.mockReturnValue({ stores: [store({ expired: true, days_left: -2 })] });
    render(<SubscriptionExpiryBanner />);

    expect(screen.getByRole("alert")).toHaveTextContent("Contact your company administrator");
    expect(screen.queryByRole("button", { name: "Renew now" })).not.toBeInTheDocument();
  });

  it("warns about an upcoming expiry and can be hidden for the day", () => {
    mockStatus.mockReturnValue({ stores: [store({ days_left: 3 })] });
    const { rerender } = render(<SubscriptionExpiryBanner />);

    expect(screen.getByRole("status")).toHaveTextContent("Subscription expires in 3 days");
    fireEvent.click(screen.getByLabelText("Hide renewal reminder for today"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<SubscriptionExpiryBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing while every store is comfortably licensed", () => {
    mockStatus.mockReturnValue({ stores: [store({ days_left: 30 })] });
    const { container } = render(<SubscriptionExpiryBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
