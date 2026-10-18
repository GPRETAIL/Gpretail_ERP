import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import AppLockScreen from "./AppLockScreen";

vi.mock("../hooks/useHaptics", () => ({ default: () => ({ vibrate: vi.fn() }) }));
afterEach(cleanup);

it.each([false, true])("unlocks only on successful biometric verification (%s)", async verified => {
  const unlockWithoutPin = vi.fn();
  const verify = vi.fn().mockResolvedValue(verified);
  render(<AppLockScreen appLock={{ unlockWithoutPin, lockoutUntil: null }} biometrics={{ isEnabled: true, verify }} />);
  await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(unlockWithoutPin).toHaveBeenCalledTimes(verified ? 1 : 0));
});

it("does not unlock when a pending biometric request finishes after unmount", async () => {
  let finish;
  const unlockWithoutPin = vi.fn();
  const verify = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = render(<AppLockScreen appLock={{ unlockWithoutPin, lockoutUntil: null }} biometrics={{ isEnabled: true, verify }} />);
  await waitFor(() => expect(verify).toHaveBeenCalled());
  unmount();
  finish(true);
  await Promise.resolve();
  expect(unlockWithoutPin).not.toHaveBeenCalled();
});
