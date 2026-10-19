import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationInboxPanel from "../NotificationInboxPanel";
const { get, post, put } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));
vi.mock("../../api/axios", () => ({ default: { get, post, put } }));
vi.mock("react-redux", () => ({
  useSelector: (fn) => fn({ auth: { user: { id: 1 } } }),
}));
vi.mock("../../utils/webPush", () => ({
  pushDeviceState: async () => ({ supported: false, registered: false }),
  enableWebPush: vi.fn(),
  disableWebPush: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation(async (path) => ({
    data:
      path === "/notifications"
        ? {
            data: [
              {
                id: 11,
                title: "Subscription updated",
                message: "Review your plan",
                category: "subscription",
                read_at: null,
              },
            ],
            pagination: { has_next: false },
          }
        : {
            data:
              path === "/notification-preferences"
                ? { marketing: false, quiet_start: 21, quiet_end: 8 }
                : { enabled: false },
          },
  }));
  post.mockResolvedValue({ data: { success: true } });
  put.mockResolvedValue({});
});
it("uses personal read receipts and explicit offer consent with the server pagination footer", async () => {
  render(<NotificationInboxPanel />);
  await screen.findByText("Subscription updated");
  expect(
    screen.getByRole("button", { name: "Next", exact: true }),
  ).toBeDisabled();
  expect(
    screen.getByRole("checkbox", { name: "Receive subscription offers" }),
  ).not.toBeChecked();
  fireEvent.click(
    screen.getByRole("button", { name: "Mark read", exact: true }),
  );
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith("/notifications/11/read"),
  );
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Receive subscription offers" }),
  );
  await waitFor(() =>
    expect(put).toHaveBeenCalledWith(
      "/notification-preferences",
      expect.objectContaining({ marketing: true }),
    ),
  );
});
