import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffApp from "../StaffApp";
import StaffInstallPrompt from "../StaffInstallPrompt";
import StaffScreen, { STAFF_SHARED_ZOOM } from "../StaffScreen";
import usePullToRefresh from "../usePullToRefresh";
import { STAFF_SESSION_KEY, STAFF_TOKEN_KEY } from "@/shared/api/staffSession";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get, post } }));
vi.mock("@/mobile/screens/LeaveScreen", () => ({ default: () => <div>Leave screen</div> }));
vi.mock("@/mobile/screens/ClaimsScreen", () => ({ default: () => <div>Claims screen</div> }));
vi.mock("@/mobile/components/MyAttendanceCard", () => ({ default: () => <div>Check-in card</div> }));
vi.mock("@/features/notifications/utils/webPush", () => ({ pushDeviceState: vi.fn().mockResolvedValue({ supported: false }), enableWebPush: vi.fn(), disableWebPush: vi.fn() }));

const touch = (type, y) => fireEvent(window, Object.assign(new Event(type, { bubbles: true }), { touches: type === "touchend" ? [] : [{ clientY: y }] }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, "", "/hr");
});
afterEach(cleanup);

describe("pull to refresh", () => {
  it("refreshes after a long pull from the top, and ignores a short one", async () => {
    const onRefresh = vi.fn().mockResolvedValue();
    const { result } = renderHook(() => usePullToRefresh(onRefresh));
    act(() => { touch("touchstart", 0); touch("touchmove", 60); });
    expect(result.current.pull).toBe(30);
    expect(result.current.ready).toBe(false);
    await act(async () => { touch("touchend"); });
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => { touch("touchstart", 0); touch("touchmove", 200); });
    expect(result.current.ready).toBe(true);
    await act(async () => { touch("touchend"); });
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(result.current.refreshing).toBe(false);
  });

  it("does nothing when switched off, as while a sheet is open", async () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh(onRefresh, { enabled: false }));
    act(() => { touch("touchstart", 0); touch("touchmove", 300); });
    await act(async () => { touch("touchend"); });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});

describe("install prompt", () => {
  const setAgent = (agent) => Object.defineProperty(window.navigator, "userAgent", { value: agent, configurable: true });
  const standalone = (matches) => { window.matchMedia = vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }); };
  afterEach(() => { setAgent("Mozilla/5.0 (jsdom)"); delete window.matchMedia; });

  it("tells an iPhone user the two steps, and stays away for a week once dismissed", () => {
    setAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    standalone(false);
    const { unmount } = render(<StaffInstallPrompt />);
    expect(screen.getByText("Keep HRMS on your phone")).toBeInTheDocument();
    expect(screen.getByText("Add to Home Screen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByText("Keep HRMS on your phone")).not.toBeInTheDocument();
    unmount();
    render(<StaffInstallPrompt />);
    expect(screen.queryByText("Keep HRMS on your phone")).not.toBeInTheDocument();
  });

  it("offers one button where the browser allows installing, and uses the browser's own prompt", async () => {
    standalone(false);
    render(<StaffInstallPrompt />);
    expect(screen.queryByText("Keep HRMS on your phone")).not.toBeInTheDocument();
    const prompt = vi.fn();
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
    act(() => { window.dispatchEvent(event); });
    fireEvent.click(await screen.findByRole("button", { name: "Install the app" }));
    expect(prompt).toHaveBeenCalledOnce();
  });

  it("is not shown once the app is installed", () => {
    setAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    standalone(true);
    render(<StaffInstallPrompt />);
    expect(screen.queryByText("Keep HRMS on your phone")).not.toBeInTheDocument();
  });
});

it("shows the shared screens a little larger than the business app does", () => {
  render(<StaffScreen><p>Payslips</p></StaffScreen>);
  expect(STAFF_SHARED_ZOOM).toBeGreaterThan(1);
  const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join(" ");
  expect(rules).toContain(`zoom: ${STAFF_SHARED_ZOOM}`);
  expect(screen.getByText("Payslips")).toBeInTheDocument();
});

describe("signed in", () => {
  const signIn = () => {
    localStorage.setItem(STAFF_TOKEN_KEY, "tok");
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({ store: { id: 1, name: "Coffee 1" }, employee: { id: 5, name: "Senthil Kumar" }, user: { id: 2 }, must_change_pin: false }));
    get.mockImplementation(async (url) => ({ data: { data: url === "/staff-app/home" ? { employee: { name: "Senthil Kumar" }, leave: [], approvals: {}, my_pending: {} } : url === "/notifications/unread-count" ? { count: 0 } : [] } }));
  };

  it("opens the tab a home-screen shortcut names", async () => {
    signIn();
    window.history.replaceState({}, "", "/hr?tab=leave");
    render(<StaffApp />);
    expect(await screen.findByText("Leave screen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Leave" })).toBeInTheDocument();
  });

  it("opens Home for a tab it does not know, or one only approvers have", async () => {
    signIn();
    window.history.replaceState({}, "", "/hr?tab=approvals");
    render(<StaffApp />);
    expect(await screen.findByRole("heading", { name: /Hello, Senthil/ })).toBeInTheDocument();
  });

  it("says when there is no connection, and clears the bar when it returns", async () => {
    signIn();
    render(<StaffApp />);
    await screen.findByRole("heading", { name: /Hello, Senthil/ });
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument());
  });

  it("clears the saved data when the employee signs out", async () => {
    signIn();
    const postMessage = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", { value: { controller: { postMessage }, getRegistration: () => Promise.resolve(null), addEventListener: vi.fn() }, configurable: true });
    post.mockResolvedValue({});
    render(<StaffApp />);
    fireEvent.click(await screen.findByRole("button", { name: "Me" }));
    fireEvent.click(await screen.findByRole("button", { name: /Sign out/ }));
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: "VX_CLEAR_API_CACHE" }));
    delete navigator.serviceWorker;
  });
});
