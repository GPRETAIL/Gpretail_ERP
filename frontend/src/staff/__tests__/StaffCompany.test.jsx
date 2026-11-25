import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompanyTab from "../tabs/CompanyTab";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get, post } }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const news = (items) => ({ data: { data: { items, unread: items.filter((i) => !i.read).length, to_acknowledge: items.filter((i) => i.category === "POLICY" && !i.acknowledged).length } } });
const NOTICE = { id: 1, category: "ANNOUNCEMENT", title: "Diwali timings", body: "Open 9 to 9 all week.", is_pinned: true, publish_on: "2026-11-01", read: false, acknowledged: false };
const POLICY = { id: 2, category: "POLICY", title: "Dress code", body: "Neat and clean.", is_pinned: false, publish_on: "2026-10-01", read: true, acknowledged: false };

describe("news", () => {
  it("opening a notice marks it read and shows it; a policy can be agreed to", async () => {
    const onCounts = vi.fn();
    get.mockResolvedValue(news([NOTICE, POLICY]));
    post.mockResolvedValue({ data: { message: "Thank you. Your agreement is recorded." } });
    render(<CompanyTab onCounts={onCounts} />);

    expect(await screen.findByText(/Diwali timings/)).toBeInTheDocument();
    expect(screen.getByText(/· New$/)).toBeInTheDocument(); // only the unread notice is marked new
    expect(screen.getByText(/Needs your agreement/)).toBeInTheDocument();
    expect(onCounts).toHaveBeenCalledWith(expect.objectContaining({ unread: 1, to_acknowledge: 1 }));

    fireEvent.click(screen.getByRole("button", { name: /Diwali timings/ }));
    expect(await screen.findByText("Open 9 to 9 all week.")).toBeInTheDocument();
    await waitFor(() => expect(post).toHaveBeenCalledWith("/staff-company/announcements/1/read"));

    fireEvent.click(screen.getByRole("button", { name: /Dress code/ }));
    fireEvent.click(await screen.findByRole("button", { name: "I have read and agree" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/staff-company/announcements/2/acknowledge"));
    expect(await screen.findByText("Thank you. Your agreement is recorded.")).toBeInTheDocument();
  });

  it("says so when HR has published nothing", async () => {
    get.mockResolvedValue(news([]));
    render(<CompanyTab />);
    expect(await screen.findByText("Nothing from HR right now.")).toBeInTheDocument();
  });
});

describe("helpdesk", () => {
  const TICKET = { id: 5, category: "PAYROLL", category_label: "Salary and payslip", subject: "Missing travel allowance", message: "Not in October.", status: "IN_PROGRESS", created_at: "2026-11-20T10:00:00Z", last_reply_at: "2026-11-21T10:00:00Z" };

  it("asks HR a question, shows what is missing, then opens the thread", async () => {
    get.mockImplementation(async (url) => (url === "/staff-company/tickets" ? { data: { data: [], categories: { PAYROLL: "Salary and payslip", OTHER: "Something else" } } }
      : url === "/staff-company/tickets/5" ? { data: { data: { ...TICKET, replies: [{ id: 1, from: "HR", body: "We will add it.", at: "2026-11-21T10:00:00Z" }] } } } : news([])));
    post.mockRejectedValueOnce({ response: { data: { errors: { subject: ["Write a short title for your question."] } } } })
      .mockResolvedValueOnce({ data: { data: { ...TICKET, status: "OPEN", id: 5 } } });
    render(<CompanyTab />);
    fireEvent.click(screen.getByRole("tab", { name: "Help" }));
    expect(await screen.findByText("You have not asked HR anything yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ask HR a question/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Send to HR" }));
    expect(await screen.findByText("Write a short title for your question.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Missing travel allowance" } });
    fireEvent.change(screen.getByLabelText("Your question or problem"), { target: { value: "Not in October." } });
    fireEvent.click(screen.getByRole("button", { name: "Send to HR" }));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/staff-company/tickets", { category: "OTHER", subject: "Missing travel allowance", message: "Not in October." }));
    expect(await screen.findByText("We will add it.")).toBeInTheDocument();
    expect(screen.getByText("HR is on it")).toBeInTheDocument();
  });

  it("replies on a ticket", async () => {
    get.mockImplementation(async (url) => (url === "/staff-company/tickets" ? { data: { data: [TICKET], categories: {} } }
      : { data: { data: { ...TICKET, replies: [] } } }));
    post.mockResolvedValue({ data: { data: { ...TICKET, replies: [{ id: 2, from: "EMPLOYEE", body: "Thank you.", at: "2026-11-22T10:00:00Z" }] } } });
    render(<CompanyTab />);
    fireEvent.click(screen.getByRole("tab", { name: "Help" }));
    fireEvent.click(await screen.findByRole("button", { name: /Missing travel allowance/ }));
    fireEvent.change(await screen.findByLabelText("Your reply"), { target: { value: "Thank you." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/staff-company/tickets/5/reply", { body: "Thank you." }));
    expect(await screen.findByText("Thank you.")).toBeInTheDocument();
  });
});

describe("people and documents", () => {
  it("shows who has a birthday or anniversary, searches the directory, and offers a call link", async () => {
    get.mockImplementation(async (url, config) => (url === "/staff-company/celebrations"
      ? { data: { data: { today: "2026-11-26", items: [{ employee_id: 1, name: "Asha", type: "BIRTHDAY", date: "2026-11-26", years: null }, { employee_id: 2, name: "Ravi", type: "ANNIVERSARY", date: "2026-11-30", years: 3 }] } } }
      : url === "/staff-company/directory"
        ? { data: { data: (config.params?.q ? [{ id: 2, name: "Ravi Kumar", designation: "Cashier", department: "Sales", phone: "9876543210", email: "ravi@example.test" }] : [{ id: 1, name: "Asha Devi", designation: "Manager", department: "Sales", phone: "9000000000", email: null }, { id: 2, name: "Ravi Kumar", designation: "Cashier", department: "Sales", phone: "9876543210", email: "ravi@example.test" }]) } }
        : news([])));
    render(<CompanyTab />);
    fireEvent.click(screen.getByRole("tab", { name: "People" }));
    expect(await screen.findByText("Birthday")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("3 years with us")).toBeInTheDocument();
    expect(await screen.findByText("Asha Devi")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search name, code or mobile"), { target: { value: "Ravi" } });
    await waitFor(() => expect(screen.queryByText("Asha Devi")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Call Ravi Kumar" })).toHaveAttribute("href", "tel:9876543210");
    expect(screen.getByRole("link", { name: "Email Ravi Kumar" })).toHaveAttribute("href", "mailto:ravi@example.test");
  });

  it("lists my documents and downloads one with my sign-in", async () => {
    URL.createObjectURL = vi.fn(() => "blob:doc");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    get.mockImplementation(async (url) => (url === "/staff-company/documents"
      ? { data: { data: [{ id: 9, type: "OFFER_LETTER", type_label: "Offer letter", title: "Offer letter", size: 120000, mime: "application/pdf", added_on: "2026-10-01" }] } }
      : url.endsWith("/download") ? { data: new Blob(["pdf"]) } : news([])));
    render(<CompanyTab />);
    fireEvent.click(screen.getByRole("tab", { name: "Documents" }));
    expect(await screen.findByText(/Offer letter · 117 KB · 2026-10-01/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download Offer letter" }));
    await waitFor(() => expect(get).toHaveBeenCalledWith("/staff-company/documents/9/download", { responseType: "blob" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    click.mockRestore();
  });

  it("says when HR has added no documents", async () => {
    get.mockImplementation(async (url) => (url === "/staff-company/documents" ? { data: { data: [] } } : news([])));
    render(<CompanyTab />);
    fireEvent.click(screen.getByRole("tab", { name: "Documents" }));
    expect(await screen.findByText("HR has not added any documents for you yet.")).toBeInTheDocument();
  });
});
