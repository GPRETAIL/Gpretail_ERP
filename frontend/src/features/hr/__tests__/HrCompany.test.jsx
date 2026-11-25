import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Announcements from "@/features/hr/company/Announcements";
import Helpdesk from "@/features/hr/company/Helpdesk";
import EmployeeDocuments from "@/features/hr/company/EmployeeDocuments";
import api from "@/shared/api/apiClient";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 3, store_id: 2, role: "manager" } } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));

const wrap = (node) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("HR publishes a policy for one department and sees who has read and agreed", async () => {
  api.get.mockImplementation(async (url) => ({ data: url === "/company-announcements"
    ? { data: [{ id: 1, category: "POLICY", title: "Dress code", body: "Neat.", is_pinned: false, publish_on: "2026-11-01", expires_on: null, department_id: 4, read_count: 3, agreed_count: 2 }], staff: 5 }
    : { data: [{ id: 4, name: "Sales" }] } }));
  api.post.mockResolvedValue({ data: { message: "Policy published." } });
  wrap(<Announcements canManage />);

  expect(await screen.findByText("Dress code")).toBeInTheDocument();
  expect(screen.getByText("3 of 5")).toBeInTheDocument();
  expect(screen.getByText("2 of 5")).toBeInTheDocument();
  expect(await screen.findByText("Sales")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /New announcement/ }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Publish" })).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Shift change" } });
  fireEvent.change(within(dialog).getByLabelText("Notice"), { target: { value: "Shops open at 9." } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/company-announcements", expect.objectContaining({ category: "ANNOUNCEMENT", title: "Shift change", body: "Shops open at 9.", department_id: null, expires_on: null })));
});

it("a viewer without HR manage rights cannot add or remove", async () => {
  api.get.mockResolvedValue({ data: { data: [], staff: 0 } });
  wrap(<Announcements canManage={false} />);
  await screen.findByText("Nothing published yet.");
  expect(screen.queryByRole("button", { name: /New announcement/ })).not.toBeInTheDocument();
});

it("HR opens a ticket, replies, and closes it", async () => {
  const ticket = { id: 5, employee: "Senthil", code: "E5", category_label: "Salary and payslip", subject: "Missing travel allowance", message: "Not in October.", status: "OPEN", created_at: "2026-11-20T10:00:00Z", last_reply_at: "2026-11-20T10:00:00Z", replies: [] };
  api.get.mockImplementation(async (url) => ({ data: { data: url === "/helpdesk-tickets" ? [ticket] : ticket } }));
  api.post.mockResolvedValue({ data: { data: { ...ticket, status: "IN_PROGRESS", replies: [{ id: 1, from: "HR", body: "We will add it.", at: "2026-11-21T10:00:00Z" }] } } });
  api.put.mockResolvedValue({ data: { data: { ...ticket, status: "CLOSED", replies: [] } } });
  wrap(<Helpdesk canManage />);

  fireEvent.click(await screen.findByRole("button", { name: "Open" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Not in October.")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("Your reply"), { target: { value: "We will add it." } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send reply" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/helpdesk-tickets/5/reply", { body: "We will add it." }));
  expect(await within(dialog).findByText("We will add it.")).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: "Close ticket" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/helpdesk-tickets/5/status", { status: "CLOSED" }));
});

it("HR adds a document for an employee as a file upload, and the add button waits for everything", async () => {
  api.get.mockImplementation(async (url) => ({ data: url === "/employee-documents"
    ? { data: [], types: { OFFER_LETTER: "Offer letter", OTHER: "Other" } } : { data: [{ id: 5, name: "Senthil", code: "E5" }] } }));
  api.post.mockResolvedValue({ data: {} });
  wrap(<EmployeeDocuments canManage />);
  fireEvent.click(await screen.findByRole("button", { name: /Add document/ }));
  const dialog = await screen.findByRole("dialog");
  const add = within(dialog).getByRole("button", { name: "Add" });
  expect(add).toBeDisabled();

  fireEvent.mouseDown(within(dialog).getByLabelText("Employee"));
  fireEvent.click(await screen.findByRole("option", { name: "Senthil (E5)" }));
  fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Offer letter" } });
  fireEvent.change(within(dialog).getByLabelText("Document file"), { target: { files: [new File(["pdf"], "offer.pdf", { type: "application/pdf" })] } });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "Add" })).toBeEnabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

  await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/employee-documents");
  expect(body.get("employee_id")).toBe("5");
  expect(body.get("title")).toBe("Offer letter");
  expect(body.get("file")).toBeInstanceOf(File);
});
