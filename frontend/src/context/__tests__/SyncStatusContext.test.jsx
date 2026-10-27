import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const { authState } = vi.hoisted(() => ({ authState: { auth: { user: { id: 1 } } } }));
vi.mock("react-redux", () => ({ useSelector: select => select(authState) }));
vi.mock("../../api/axios", () => ({ default: { get: (...args) => mockGet(...args) } }));

const mockSnapshot = vi.fn();
vi.mock("../../api/runtimeRouting", () => ({
  getRuntimeRoutingSnapshot: () => mockSnapshot(),
  RUNTIME_ROUTING_CHANGED_EVENT: "erp:runtime-routing-changed",
}));

import { SyncStatusProvider, useSyncStatus } from "../SyncStatusContext";

const CHANGED_EVENT = "erp:runtime-routing-changed";

const StatusProbe = () => {
  const status = useSyncStatus();
  return (
    <div>
      <span data-testid="target">{status.target}</span>
      <span data-testid="healthy">{String(status.healthy)}</span>
      <span data-testid="pending">{status.outboxPending}</span>
    </div>
  );
};

afterEach(() => {
  cleanup();
  mockGet.mockReset();
  mockSnapshot.mockReset();
  authState.auth.user = { id: 1 };
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SyncStatusContext", () => {
  it("does not poll while signed out", () => {
    authState.auth.user = null;
    render(<SyncStatusProvider><StatusProbe /></SyncStatusProvider>);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("does not overlap requests, and backs off when no local server is configured", async () => {
    vi.useFakeTimers();
    let complete;
    mockGet.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; })).mockResolvedValue({ data: { data: { enabled: false } } });
    mockSnapshot.mockReturnValue({ currentTarget: "cloud", localHealthy: false });
    render(<SyncStatusProvider><StatusProbe /></SyncStatusProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(mockGet).toHaveBeenCalledTimes(1);
    await act(async () => complete({ data: { data: { enabled: false } } }));
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(mockGet).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(240000); });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
  it("loads status from /local-server-config and the routing snapshot on mount", async () => {
    mockGet.mockResolvedValue({ data: { data: { enabled: true, outbox_pending: 3, outbox_failed: 0 } } });
    mockSnapshot.mockReturnValue({ currentTarget: "local", localHealthy: true });

    render(<SyncStatusProvider><StatusProbe /></SyncStatusProvider>);

    await waitFor(() => expect(screen.getByTestId("target")).toHaveTextContent("local"));
    expect(screen.getByTestId("healthy")).toHaveTextContent("true");
    expect(screen.getByTestId("pending")).toHaveTextContent("3");
  });

  it("does not restart sync polling when only the profile or counter changes", async () => {
    mockSnapshot.mockReturnValue({ currentTarget: "cloud", localHealthy: false });
    mockGet.mockResolvedValue({ data: { data: { enabled: false } } });
    const view = <SyncStatusProvider><StatusProbe /></SyncStatusProvider>;
    const { rerender } = render(view);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    authState.auth.user = { id: 1, name: "Updated", counter_id: 7 };
    rerender(<SyncStatusProvider><StatusProbe /></SyncStatusProvider>);
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("reflects a local<->cloud switch immediately off the routing-changed event, not waiting for the next poll", async () => {
    mockGet.mockResolvedValue({ data: { data: { enabled: true, outbox_pending: 3, outbox_failed: 0 } } });
    mockSnapshot.mockReturnValue({ currentTarget: "local", localHealthy: true });

    render(<SyncStatusProvider><StatusProbe /></SyncStatusProvider>);
    await waitFor(() => expect(screen.getByTestId("target")).toHaveTextContent("local"));

    // Simulates what a failed request's mid-flight cloud retry does in the real module --
    // switchTarget("cloud") inside runtimeRouting.js flips this before the next 20s poll would.
    mockSnapshot.mockReturnValue({ currentTarget: "cloud", localHealthy: false });
    act(() => {
      window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
    });

    expect(screen.getByTestId("target")).toHaveTextContent("cloud");
    expect(screen.getByTestId("healthy")).toHaveTextContent("false");
    // Untouched by the event -- only the next poll's /local-server-config response updates this.
    await waitFor(() => expect(screen.getByTestId("pending")).toHaveTextContent("3"));
  });
});
