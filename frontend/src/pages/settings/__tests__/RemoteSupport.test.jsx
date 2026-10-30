import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RemoteSupport from "../RemoteSupport";
import SettingsScreen from "../../../mobile/screens/SettingsScreen";
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

  it("shows simple ID instructions without server configuration or the incorrect menu shortcut", async () => {
    render(<RemoteSupport />);
    expect(await screen.findByText("Open the Tool & Note Details")).toBeVisible();
    expect(screen.getByText(/Enter the Client ID and temporary Password shown in the tool/)).toBeVisible();
    expect(screen.queryByText("Use the Vynerix support server")).not.toBeInTheDocument();
    expect(screen.queryByText(/ID server:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/three dots/)).not.toBeInTheDocument();
  });

  it("offers Android instructions and sends the device type with the request", async () => {
    support.requestRemoteSupport.mockResolvedValue({ id: 9, status: "waiting" });
    render(<RemoteSupport />);
    fireEvent.mouseDown(screen.getByLabelText("Device needing support"));
    fireEvent.click(screen.getByRole("option", { name: "Android phone / tablet" }));
    expect(screen.getByRole("link", { name: "Get Android app (official)" })).toHaveAttribute("href", "https://github.com/rustdesk/rustdesk/releases/latest");
    expect(screen.queryByRole("button", { name: "Download (.exe)" })).not.toBeInTheDocument();
    expect(screen.getByText("Screen Capture", { exact: true })).toBeVisible();
    fireEvent.change(screen.getByLabelText(/Vynerix Client ID/), { target: { value: "123456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Request Remote Assistance" }));
    await waitFor(() => expect(support.requestRemoteSupport).toHaveBeenCalledWith(expect.objectContaining({ client_id: "123456789", system_os: "Android" })));
  });

  it("makes support available to mobile staff through the shared page", async () => {
    render(<SettingsScreen authUser={{ role: "cashier" }} />);
    fireEvent.click(screen.getByText("Remote Support", { exact: true }));
    expect(await screen.findByLabelText("Device needing support")).toBeVisible();
    expect(support.getActiveRemoteSupportSession).toHaveBeenCalled();
  });

  it("does not claim that accepting a ticket proves a remote desktop connection", async () => {
    support.getActiveRemoteSupportSession.mockResolvedValue({ id: 1, status: "connected", technician: { name: "Support Engineer" } });
    render(<RemoteSupport />);
    expect(await screen.findByText("Support Engineer Accepted Your Request")).toBeVisible();
    expect(screen.queryByText("Support Engineer Connected — Session Active")).not.toBeInTheDocument();
    expect(screen.getByText("ACCEPTED", { exact: true })).toBeVisible();
    expect(screen.queryByText("CONNECTED", { exact: true })).not.toBeInTheDocument();
  });
});
