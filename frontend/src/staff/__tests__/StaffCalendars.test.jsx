import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AttendanceTab from "../tabs/AttendanceTab";
import HolidaysTab from "../tabs/HolidaysTab";
import TeamTab from "../tabs/TeamTab";
import TeamOnLeaveCard from "../TeamOnLeaveCard";
import { buildWeeks, clock, minutesText, shiftMonth } from "../attendanceCalendar";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get } }));

const october = () => Array.from({ length: 31 }, (_, i) => {
  const date = `2026-10-${String(i + 1).padStart(2, "0")}`;
  const status = { 1: "PRESENT", 2: "HOLIDAY", 3: "ABSENT", 5: "HALF_DAY", 10: "LEAVE", 11: "WEEK_OFF" }[i + 1] || null;
  return { date, status, holiday: i === 1 ? "Gandhi Jayanti" : null, check_in: status === "PRESENT" ? "09:31:00" : null, check_out: null, worked_minutes: status === "PRESENT" ? 539 : 0, late_minutes: 0 };
});
const monthPayload = (month, days) => ({ data: { data: { month, today: "2026-10-12", days, totals: { present: 1.5, absent: 1, late: 1, off: 2, paid_leave: 1, unpaid_leave: 0, payable_days: 9.5, lop_days: 1, worked_minutes: 779 } } } });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("calendar helpers", () => {
  it("lays a month out in weeks that start on Monday", () => {
    const weeks = buildWeeks(october());
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]); // 1 Oct 2026 is a Thursday
    expect(weeks[0][3].date).toBe("2026-10-01");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(buildWeeks([])).toEqual([]);
  });

  it("moves months across a year end, and writes times and durations plainly", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(minutesText(539)).toBe("8h 59m");
    expect(minutesText(120)).toBe("2h");
    expect(minutesText(45)).toBe("45m");
    expect(minutesText(0)).toBe("");
    expect(clock("09:31:00")).toBe("9:31 AM");
    expect(clock("00:05:00")).toBe("12:05 AM");
    expect(clock("18:30:00")).toBe("6:30 PM");
  });
});

describe("my attendance", () => {
  it("shows the month with a status on each day, the counts, and the punches of a tapped day", async () => {
    get.mockImplementation(async (url, config) => (url === "/staff-app/attendance-month"
      ? monthPayload("2026-10", october())
      : { data: { data: { date: config.params.date, status: "PRESENT", holiday: null, shift: { name: "Day", start: "09:30", end: "18:30" }, late_minutes: 1, worked_minutes: 539,
        punches: [{ type: "IN", at: "09:31:00", source: "SELF", distance_m: 42 }, { type: "OUT", at: "18:30:00", source: "SELF", distance_m: 10 }] } } }));
    render(<AttendanceTab />);

    expect(await screen.findByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: /Thursday, 1 October, Present/ })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: /2 October, Holiday/ })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: /3 October, Absent/ })).toBeInTheDocument();
    expect(screen.getByText(/Payable days 9.5 · Loss of pay 1 · Worked 12h 59m/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("gridcell", { name: /Thursday, 1 October/ }));
    expect(await screen.findByText(/9:31 AM/)).toBeInTheDocument();
    expect(screen.getByText(/42 m from the store/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/staff-app/attendance-day", { params: { date: "2026-10-01" } });
  });

  it("goes back a month, and will not go past the current one", async () => {
    get.mockImplementation(async (url, config) => monthPayload(config.params.month || "2026-10", october()));
    render(<AttendanceTab />);
    await screen.findByRole("heading", { name: "October 2026" });
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await waitFor(() => expect(get).toHaveBeenCalledWith("/staff-app/attendance-month", { params: { month: "2026-09" } }));
  });

  it("says so when it cannot load", async () => {
    get.mockRejectedValue(new Error("offline"));
    render(<AttendanceTab />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your attendance");
  });
});

describe("holidays, team and the team on leave", () => {
  it("lists the holidays by month and marks the next one", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-26T10:00:00"));
    const year = 2026;
    get.mockResolvedValue({ data: { data: [
      { id: 1, date: `${year}-01-26`, name: "Republic Day" },
      { id: 2, date: `${year}-12-25`, name: "Christmas" },
    ] } });
    render(<HolidaysTab />);
    expect(await screen.findByText("Republic Day")).toBeInTheDocument();
    expect(screen.getAllByText("Christmas")).toHaveLength(2); // in the list, and as the next holiday
    expect(screen.getByText("Next holiday")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/holidays", { params: { year } });
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));
    await waitFor(() => expect(get).toHaveBeenCalledWith("/holidays", { params: { year: year + 1 } }));
    vi.useRealTimers();
  });

  it("shows my team today with who is in, on leave or not in yet", async () => {
    get.mockResolvedValue({ data: { data: { members: [
      { id: 1, name: "Asha", designation: "Cashier", status: "PRESENT", check_in: "09:31:00", check_out: null },
      { id: 2, name: "Ravi", designation: "Cashier", status: "ON_LEAVE", check_in: null, check_out: null },
      { id: 3, name: "Meena", designation: "Packer", status: "NOT_IN", check_in: null, check_out: null },
    ] } } });
    render(<TeamTab />);
    const asha = (await screen.findByText("Asha")).closest("div").parentElement;
    expect(within(asha).getByText("In")).toBeInTheDocument();
    expect(screen.getAllByText("On leave").length).toBeGreaterThan(0);
    expect(screen.getByText("Not in yet")).toBeInTheDocument();
  });

  it("lists who is away in my team, and shows nothing when nobody is", async () => {
    get.mockResolvedValue({ data: { data: { people: [
      { employee_id: 4, name: "Peer Priya", from: "2026-12-01", to: "2026-12-02", half_day: false },
      { employee_id: 5, name: "Lead Lakshmi", from: "2026-12-05", to: "2026-12-05", half_day: true },
    ] } } });
    const { container, unmount } = render(<TeamOnLeaveCard />);
    expect(await screen.findByText("Peer Priya")).toBeInTheDocument();
    expect(screen.getByText("1 Dec to 2 Dec")).toBeInTheDocument();
    expect(screen.getByText("5 Dec (half day)")).toBeInTheDocument();
    unmount();

    get.mockResolvedValue({ data: { data: { people: [] } } });
    const empty = render(<TeamOnLeaveCard />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(empty.container).toBeEmptyDOMElement();
    expect(container).toBeDefined();
  });
});
