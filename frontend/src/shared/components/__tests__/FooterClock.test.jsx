import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import FooterClock from "@/shared/components/FooterClock";

afterEach(() => vi.useRealTimers());

it("shows today's date and a time that keeps running", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12, 22, 43, 31));
  render(<FooterClock />);
  const clock = screen.getByLabelText("Current date and time");
  expect(clock).toHaveTextContent("12/11/2026");
  expect(clock.textContent).toMatch(/10:43:31\s?pm/i);
  act(() => { vi.advanceTimersByTime(2000); });
  expect(clock.textContent).toMatch(/10:43:33\s?pm/i);
});
