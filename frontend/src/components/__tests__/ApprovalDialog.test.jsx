import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("../../api/axios", () => ({ default: mocks }));
import ApprovalDialog from "../ApprovalDialog";
import { isApprovalRequired } from "../../utils/approvals";

const discount = { action: "pos_discount", details: { requested_percent: 8, your_limit_percent: 5, lines: [{ index: 0, product: "Latte Mug", reference_price: 100, unit_price: 92, discount_percent: 8 }] } };

describe("ApprovalDialog", () => {
  beforeEach(() => { mocks.post.mockReset(); mocks.get.mockReset(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("recognises the server's APPROVAL_REQUIRED response", () => {
    expect(isApprovalRequired({ response: { status: 428, data: { code: "APPROVAL_REQUIRED" } } })).toBe(true);
    expect(isApprovalRequired({ response: { status: 422, data: {} } })).toBe(false);
  });

  it("approves at the counter with a supervisor PIN and hands back the token", async () => {
    const onApproved = vi.fn();
    mocks.post.mockResolvedValue({ data: { data: { status: "approved", token: "tok-1" } } });
    render(<ApprovalDialog requirement={discount} onApproved={onApproved} onClose={vi.fn()} />);

    expect(screen.getByText(/Discount of 8% is above your limit of 5%/)).toBeInTheDocument();
    expect(screen.getByText(/Latte Mug/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Approver username"), { target: { value: "supervisor1" } });
    fireEvent.change(screen.getByLabelText("Approval PIN"), { target: { value: "43a21" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(onApproved).toHaveBeenCalledWith("tok-1", expect.anything()));
    expect(mocks.post).toHaveBeenCalledWith("/approvals/pin-approve", expect.objectContaining({
      action: "pos_discount", requested_percent: 8, reason_code: "damaged_item", approver: "supervisor1", pin: "4321",
    }));
  });

  it("sends a remote request, waits, and continues once a manager approves", async () => {
    vi.useFakeTimers();
    const onApproved = vi.fn();
    mocks.post.mockResolvedValue({ data: { data: { id: 77, status: "pending" } } });
    mocks.get.mockResolvedValueOnce({ data: { data: { id: 77, status: "pending" } } })
      .mockResolvedValueOnce({ data: { data: { id: 77, status: "approved", token: "tok-77" } } });
    render(<ApprovalDialog requirement={discount} onApproved={onApproved} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Send request" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send request" })); });
    expect(screen.getByText(/Request #77 is in the Approval Inbox/)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(onApproved).toHaveBeenCalledWith("tok-77", expect.anything());
  });

  it("shows a rejection instead of waiting forever", async () => {
    vi.useFakeTimers();
    mocks.post.mockResolvedValue({ data: { data: { id: 5, status: "pending" } } });
    mocks.get.mockResolvedValue({ data: { data: { id: 5, status: "rejected", decision_note: "Too high" } } });
    render(<ApprovalDialog requirement={discount} onApproved={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Send request" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send request" })); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText("Request rejected: Too high")).toBeInTheDocument();
  });
});
