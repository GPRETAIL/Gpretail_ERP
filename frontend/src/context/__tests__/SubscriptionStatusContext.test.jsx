import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SubscriptionStatusProvider } from "../SubscriptionStatusContext";
import useSubscriptionStatus from "../../hooks/useSubscriptionStatus";

const { get, state } = vi.hoisted(() => ({ get: vi.fn(), state: { auth: { user: { id: 1 } } } }));
vi.mock("../../api/axios", () => ({ default: { get } }));
vi.mock("react-redux", () => ({ useSelector: select => select(state) }));

function Consumer({ label }) { const status = useSubscriptionStatus(); return <div>{label}: {status?.status || "loading"}</div>; }
const Consumers = () => <SubscriptionStatusProvider><Consumer label="footer" /><Consumer label="reminder" /></SubscriptionStatusProvider>;
beforeEach(() => { vi.clearAllMocks(); state.auth.user = { id: 1 }; get.mockResolvedValue({ data: { data: { status: "ACTIVE" } } }); });
afterEach(() => { vi.restoreAllMocks(); });

it("shares one result between footer and reminder and coalesces focus events", async () => {
  let now = 100000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  render(<Consumers />);
  await screen.findByText("footer: ACTIVE");
  expect(screen.getByText("reminder: ACTIVE")).toBeVisible();
  expect(get).toHaveBeenCalledTimes(1);
  act(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  expect(get).toHaveBeenCalledTimes(1);
  now += 61000;
  act(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
});

it("keeps the last confirmed status during a failed background refresh", async () => {
  let now = 100000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  render(<Consumers />);
  await screen.findByText("footer: ACTIVE");
  get.mockRejectedValue(new Error("offline")); now += 61000;
  act(() => window.dispatchEvent(new Event("focus")));
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  expect(screen.getByText("footer: ACTIVE")).toBeVisible();
});

it("does not request subscription data while signed out", () => {
  state.auth.user = null;
  render(<Consumers />);
  expect(get).not.toHaveBeenCalled();
});
