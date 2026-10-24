import { beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import HeaderNotifications from "../HeaderNotifications";

const { get, post, user } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), user: { id: 1 } }));
vi.mock("../../api/axios", () => ({ default: { get, post } }));
vi.mock("react-redux", () => ({ useSelector: fn => fn({ auth: { user } }) }));

const message = { id: 42, title: "Stock needs attention", message: "Review your stock levels.", link: "/warehouse/stock-item", read_at: null, created_at: "2026-10-24T09:00:00Z" };
beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation(async path => ({ data: { data: path.endsWith("unread-count") ? { count: 3 } : [message], pagination: { has_next: false } } }));
  post.mockResolvedValue({});
});

async function openPanel(props = {}) {
  render(<HeaderNotifications onNavigate={vi.fn()} onOpenInbox={vi.fn()} {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "Notifications, 3 unread" }));
  await screen.findByText(message.title);
}

it("loads unread messages from the server and opens the selected ERP action", async () => {
  const onNavigate = vi.fn();
  await openPanel({ onNavigate });
  fireEvent.click(screen.getByRole("tab", { name: /Unread/ }));
  await waitFor(() => expect(get).toHaveBeenCalledWith("/notifications", expect.objectContaining({ params: { unread: 1, category: "all", page: 1, limit: 12 } })));
  fireEvent.click(await screen.findByRole("button", { name: "View details" }));
  expect(onNavigate).toHaveBeenCalledWith("/warehouse/stock-item");
  expect(post).not.toHaveBeenCalled();
});

it("reports failed reads without reducing the unread badge and allows retry", async () => {
  await openPanel();
  post.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Mark read", exact: true }));
  expect(await screen.findByText("Could not mark notifications as read. Please try again.")).toBeVisible();
  expect(screen.getByLabelText("Notifications, 3 unread")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Mark read", exact: true }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText("Could not mark notifications as read. Please try again.")).not.toBeInTheDocument());
});

it("keeps the last known count offline and shows a retry instead of an empty inbox", async () => {
  await openPanel();
  get.mockRejectedValue(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Refresh notifications" }));
  expect(await screen.findByText("Unable to refresh notifications. Please retry.")).toBeVisible();
  expect(screen.getByLabelText("Notifications, 3 unread")).toBeInTheDocument();
  expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument();
  get.mockResolvedValue({ data: { data: [], pagination: { has_next: false } } });
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("No notifications yet")).toBeVisible();
});

it("disables repeat read-all submissions and refreshes the inbox after success", async () => {
  let complete;
  post.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await openPanel();
  const initialLoads = get.mock.calls.filter(([path]) => path === "/notifications").length;
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  expect(post).toHaveBeenCalledWith("/notifications/read-all");
  await act(async () => complete({}));
  await waitFor(() => expect(get.mock.calls.filter(([path]) => path === "/notifications").length).toBeGreaterThan(initialLoads));
});

it("opens preferences directly and never turns an untrusted notification URL into a link", async () => {
  get.mockImplementation(async path => ({ data: { data: path.endsWith("unread-count") ? { count: 3 } : [{ ...message, link: "//untrusted.example" }] } }));
  const onOpenInbox = vi.fn();
  await openPanel({ onOpenInbox });
  expect(screen.queryByRole("button", { name: "View details" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Notification preferences" }));
  expect(onOpenInbox).toHaveBeenCalledWith(true);
});
