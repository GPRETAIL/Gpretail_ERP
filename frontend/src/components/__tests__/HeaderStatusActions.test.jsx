import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HeaderApprovalButton, HeaderRenewalNotice } from "../HeaderStatusActions";

const { status } = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock("../../hooks/useSubscriptionStatus", () => ({ default: status }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("hides the zero badge and shows pending approval counts", () => {
  const click = vi.fn();
  const { rerender } = render(<HeaderApprovalButton count={0} onClick={click} />);
  expect(screen.queryByText("0")).not.toBeInTheDocument();
  rerender(<HeaderApprovalButton count={4} onClick={click} />);
  expect(screen.getByText("4")).not.toHaveClass("MuiBadge-invisible");
  fireEvent.click(screen.getByRole("button", { name: "Approval Inbox: 4 pending" }));
  expect(click).toHaveBeenCalledOnce();
});

it.each([null, undefined, 30, 15, 8])("does not show the urgent header for %s days", days => {
  status.mockReturnValue({ soonestDaysLeft: days });
  render(<HeaderRenewalNotice />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it.each([[7, "Renew · 7d"], [1, "Renew · 1d"], [0, "Expires today"], [-1, "Expired · Renew"]])("shows the renewal action at %s days", (days, label) => {
  status.mockReturnValue({ soonestDaysLeft: days });
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  render(<HeaderRenewalNotice />);
  fireEvent.click(screen.getByText(label));
  expect(open).toHaveBeenCalledWith("https://company.gpsoftware.in/login", "_blank", "noopener,noreferrer");
});
