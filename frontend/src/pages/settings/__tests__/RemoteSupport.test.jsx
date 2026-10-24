import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RemoteSupport from "../RemoteSupport";
import * as support from "../../../api/remoteSupportApi";

vi.mock("../../../api/remoteSupportApi", () => ({
  requestRemoteSupport: vi.fn(), getActiveRemoteSupportSession: vi.fn(),
  cancelRemoteSupportSession: vi.fn(), getRemoteSupportSessions: vi.fn(), endRemoteSupportSession: vi.fn(),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe("Remote support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    support.getActiveRemoteSupportSession.mockResolvedValue(null);
    support.getRemoteSupportSessions.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it("shows a retry action when the support service is unavailable", async () => {
    support.getActiveRemoteSupportSession.mockRejectedValueOnce(new Error("Offline"));
    render(<RemoteSupport />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(support.getActiveRemoteSupportSession).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument());
  });

  it("loads only the returned history and explains how to stop remote access", async () => {
    support.getRemoteSupportSessions.mockResolvedValue({ data: { data: [{ id: 1, created_at: "2026-10-24T06:00:00Z", status: "ended", category: "printing", client_id: "123456789", duration_formatted: "2 mins", issue_description: "Printer setup" }], total: 1 } });
    render(<RemoteSupport />);
    expect(await screen.findByText("Printer setup")).toBeVisible();
    expect(screen.getByText(/Close the client to stop screen access/)).toBeVisible();
    expect(screen.queryByText("Support Engineers Online")).not.toBeInTheDocument();
  });
});
