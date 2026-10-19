import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlatformNotificationBanner from "../PlatformNotificationBanner";
const { get, post, state } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), state: { auth: { user: { id: 1, platform_company_code: "CMP-TEST" } } } }));
vi.mock("../../api/axios", () => ({ default: { get, post } }));
vi.mock("react-redux", () => ({ useSelector: select => select(state) }));
beforeEach(() => {
 vi.clearAllMocks(); state.auth.user = { id: 1, platform_company_code: "CMP-TEST" };
});
it("shows an Admin notice and removes it after a successful close acknowledgement", async () => {
 get.mockResolvedValueOnce({ data: { data: [{ id: 7, title: "Service update", message: "A scheduled update is available", priority: "normal" }] } }).mockResolvedValue({ data: { data: [] } });
 post.mockResolvedValue({}); render(<PlatformNotificationBanner />);
 await screen.findByText("Service update");
 expect(screen.getByRole("status")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: "Close notification: Service update" }));
 await waitFor(() => expect(post).toHaveBeenCalledWith("/notifications/7/read"));
 await waitFor(() => expect(screen.queryByText("Service update")).not.toBeInTheDocument());
});
it("retains the banner and offers a retry if dismissal cannot be saved", async () => {
 get.mockResolvedValue({ data: { data: [{ id: 8, title: "Notice", message: "Read this" }] } });
 post.mockRejectedValue(new Error("Offline")); render(<PlatformNotificationBanner />);
 fireEvent.click(await screen.findByRole("button", { name: "Close notification: Notice" }));
 expect(await screen.findByRole("alert")).toHaveTextContent("Could not close");
 expect(screen.getByText("Notice")).toBeInTheDocument();
});
it("does not request or expose notifications when signed out", async () => {
 state.auth.user = null; const { container }=render(<PlatformNotificationBanner />);
 await Promise.resolve(); expect(get).not.toHaveBeenCalled(); expect(container).toBeEmptyDOMElement();
});
