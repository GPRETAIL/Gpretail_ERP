import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import FooterClock from "@/shared/components/FooterClock";
import { formatClock } from "@/shared/utils/formatClock";

afterEach(() => vi.useRealTimers());

it("formats the time with AM/PM and the date as dd/mm/yyyy", () => {
  expect(formatClock(new Date(2026, 10, 12, 23, 3, 30))).toEqual({ time: "11:03:30", meridiem: "PM", date: "12/11/2026" });
  expect(formatClock(new Date(2026, 0, 5, 0, 7, 9))).toEqual({ time: "12:07:09", meridiem: "AM", date: "05/01/2026" });
});

it("shows the time over the date and keeps it running", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12, 23, 3, 30));
  render(<FooterClock />);
  const clock = screen.getByLabelText("Current date and time");
  expect(clock).toHaveTextContent("11:03:30PM12/11/2026");
  act(() => { vi.advanceTimersByTime(2000); });
  expect(clock).toHaveTextContent("11:03:32PM12/11/2026");
});
