import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MobileHeader from "./MobileHeader";
const { get, state } = vi.hoisted(() => ({ get: vi.fn(), state: { auth: { user: { id: 1 }, token: "session" } } }));
vi.mock("../../api/axios", () => ({ default: { get } }));
vi.mock("react-redux", () => ({ useSelector: select => select(state) }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); state.auth.user = { id: 1 }; get.mockResolvedValue({ data: { data: { count: 3 } } }); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("pauses hidden polling, keeps profile changes quiet and refreshes on notification updates", async () => {
  vi.useFakeTimers();
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const { rerender } = render(<MobileHeader title="Home" />);
  await act(async () => {});
  expect(get).toHaveBeenCalledTimes(1); expect(screen.getByText("3")).toBeVisible();
  state.auth.user = { id: 1, name: "Changed", counter_id: 7 }; rerender(<MobileHeader title="Home" />);
  await act(async () => {}); expect(get).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("hidden");
  await act(async () => vi.advanceTimersByTimeAsync(120000)); expect(get).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("visible");
  await act(async () => document.dispatchEvent(new Event("visibilitychange"))); expect(get).toHaveBeenCalledTimes(2);
  await act(async () => window.dispatchEvent(new Event("vx-notifications-updated"))); expect(get).toHaveBeenCalledTimes(3);
});
