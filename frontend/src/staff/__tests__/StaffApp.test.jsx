import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isStaffAppPath, readStaffSession, STAFF_STORE_KEY, STAFF_TOKEN_KEY } from "@/shared/api/staffSession";
import { suggestPin } from "@/features/hr/staffApp/staffAppPin";
import StaffSignIn from "../StaffSignIn";
import ChangePin from "../ChangePin";
import ApprovalsTab from "../tabs/ApprovalsTab";
import HomeTab from "../tabs/HomeTab";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get, post } }));
vi.mock("@/mobile/components/MyAttendanceCard", () => ({ default: () => <div>Check-in card</div> }));

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

const typePin = (digits) => digits.split("").forEach((d) => fireEvent.click(screen.getByRole("button", { name: d })));

describe("staff session", () => {
  it("is only the /hr app, not the ERP's /hrms pages", () => {
    expect(isStaffAppPath("/hr")).toBe(true);
    expect(isStaffAppPath("/hr/leave")).toBe(true);
    expect(isStaffAppPath("/hrms/staff-app")).toBe(false);
    expect(isStaffAppPath("/app")).toBe(false);
  });

  it("suggests PINs the server accepts", () => {
    for (let i = 0; i < 50; i++) {
      const pin = suggestPin();
      expect(pin).toMatch(/^\d{6}$/);
      expect(new Set(pin).size).toBeGreaterThan(1);
      expect("0123456789012345".includes(pin) || "9876543210987654".includes(pin)).toBe(false);
    }
  });
});

describe("sign-in", () => {
  it("signs in with mobile number and a PIN typed on the keypad, keeping its own token", async () => {
    post.mockResolvedValue({ data: { data: { token: "staff-tok", must_change_pin: true, store: { id: 4, name: "Main" }, employee: { id: 9, name: "Senthil" }, user: { id: 2 } } } });
    const onSignedIn = vi.fn();
    render(<StaffSignIn onSignedIn={onSignedIn} />);
    fireEvent.change(screen.getByLabelText("Your mobile number"), { target: { value: "98765 43210" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const signIn = screen.getByRole("button", { name: "Sign in" });
    typePin("482");
    expect(signIn).toBeDisabled();
    typePin("6");
    fireEvent.click(signIn);
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledWith("/auth/staff-login", { phone: "98765 43210", pin: "4826" });
    expect(onSignedIn.mock.calls[0][1]).toBe("4826");
    expect(localStorage.getItem(STAFF_TOKEN_KEY)).toBe("staff-tok");
    expect(localStorage.getItem(STAFF_STORE_KEY)).toBe("4");
    expect(localStorage.getItem("token")).toBeNull();
    expect(readStaffSession()).toMatchObject({ must_change_pin: true, employee: { name: "Senthil" } });
  });

  it("asks which store when the number works in two stores, then signs in there", async () => {
    localStorage.setItem("vx_staff_phone", "9876543210");
    post.mockRejectedValueOnce({ response: { data: { error_code: "CHOOSE_STORE", data: { stores: [{ store_id: 4, name: "Main" }, { store_id: 7, name: "Branch" }] } } } })
      .mockResolvedValueOnce({ data: { data: { token: "t", store: { id: 7, name: "Branch" }, employee: { id: 1 }, user: { id: 1 } } } });
    render(<StaffSignIn onSignedIn={vi.fn()} />);
    typePin("4826");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.click(await screen.findByRole("button", { name: "Branch" }));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/auth/staff-login", { phone: "9876543210", pin: "4826", store_id: 7 }));
  });

  it("shows the server's refusal and clears the PIN", async () => {
    localStorage.setItem("vx_staff_phone", "9876543210");
    post.mockRejectedValue({ response: { status: 401, data: { message: "Phone number or PIN is wrong." } } });
    render(<StaffSignIn onSignedIn={vi.fn()} />);
    typePin("1357");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Phone number or PIN is wrong.");
    expect(screen.getByRole("status")).toHaveAccessibleName("0 digits entered");
  });
});

describe("choosing a PIN", () => {
  it("needs the new PIN twice and sends the one used to sign in as the current PIN", async () => {
    post.mockResolvedValue({ data: {} });
    const onDone = vi.fn();
    render(<ChangePin forced currentPin="4826" onDone={onDone} />);
    typePin("5927");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    typePin("5928");
    fireEvent.click(screen.getByRole("button", { name: "Save PIN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The two PINs are different.");
    expect(post).not.toHaveBeenCalled();
    typePin("5927");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    typePin("5927");
    fireEvent.click(screen.getByRole("button", { name: "Save PIN" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledWith("/auth/staff-pin", { current_pin: "4826", new_pin: "5927" });
  });
});

describe("approvals", () => {
  it("approves each type through its own HR endpoint", async () => {
    get.mockResolvedValue({ data: { data: [
      { type: "leave", id: 1, employee_name: "Asha", title: "Casual Leave · 2 days", date: "2026-11-10" },
      { type: "overtime", id: 2, employee_name: "Ravi", title: "Overtime · 1h 30m", date: "2026-11-09" },
      { type: "resignation", id: 3, employee_name: "Mani", title: "Resignation", date: "2026-11-08", last_day: "2026-12-08" },
      { type: "claim", id: 4, employee_name: "Devi", title: "Expense · TRAVEL", amount: 450, date: "2026-11-07" },
    ] } });
    post.mockResolvedValue({ data: { message: "Done" } });
    render(<ApprovalsTab />);
    expect(await screen.findByText("Asha")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Note for Asha"), { target: { value: "Enjoy" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Approve/ })[0]);
    await waitFor(() => expect(post).toHaveBeenCalledWith("/leave-applications/1/approve", { note: "Enjoy" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Approve/ })[1]);
    await waitFor(() => expect(post).toHaveBeenCalledWith("/overtime/decide", { ids: [2], action: "approve" }));
    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/separations/3/accept", { last_working_day: "2026-12-08" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Reject/ })[3]);
    await waitFor(() => expect(post).toHaveBeenCalledWith("/expense-claims/4/decide", { action: "reject" }));
    expect(screen.getByRole("button", { name: "Expenses · 1" })).toBeInTheDocument();
  });
});

describe("home", () => {
  it("shows what waits for a manager and opens the right tab from the quick links", () => {
    const go = vi.fn();
    render(<HomeTab go={go} home={{
      can_approve: true, approvals: { leave: 2, claim: 1 }, team: { size: 4, checked_in: 3 }, my_pending: { leave: 1 },
      leave: [{ leave_type_id: 1, name: "Casual Leave", is_paid: true, available: 9 }], pay: { latest: { month: "2026-10", net_pay: 18500 } }, money: { loan_balance: 2000 }, holidays: [{ date: "2026-11-14", name: "Festival" }],
    }} />);
    expect(screen.getByText("Needs your approval")).toBeInTheDocument();
    expect(screen.getByText("Leave · 2")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 in your team checked in today")).toBeInTheDocument();
    expect(screen.getByText("₹18,500")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "My tax" }));
    expect(go).toHaveBeenCalledWith("salary", "tax");
    fireEvent.click(screen.getByRole("button", { name: "Apply leave" }));
    expect(go).toHaveBeenCalledWith("leave");
  });
});
