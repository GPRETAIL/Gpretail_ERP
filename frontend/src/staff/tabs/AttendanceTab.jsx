import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/shared/api/apiClient";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { STAFF_COLOR, STAFF_TEXT, TOUCH, card, sectionTitle } from "../staffUi";
import { STATUS_META, WEEKDAYS, buildWeeks, clock, longDate, minutesText, monthTitle, shiftMonth } from "../attendanceCalendar";

const dayCount = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });

function DayDetail({ date }) {
  const [day, setDay] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    api.get("/staff-app/attendance-day", { params: { date } })
      .then((res) => { if (active) { setDay(res.data?.data || null); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [date]);

  const meta = STATUS_META[day?.status];
  return (
    <Box sx={card} aria-live="polite">
      <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>{longDate(date)}</Typography>
      {failed && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.danger, mt: 0.5 }}>Could not load this day. Try again.</Typography>}
      {!day && !failed && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mt: 0.5 }}>Loading...</Typography>}
      {day && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
            {meta && <Box sx={{ px: 1.25, py: 0.25, borderRadius: "999px", bgcolor: meta.color, color: "#fff", fontSize: STAFF_TEXT.small, fontWeight: 800 }}>{meta.label}</Box>}
            {day.holiday && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted }}>{day.holiday}</Typography>}
            {day.late_minutes > 0 && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.amber, fontWeight: 700 }}>Late {minutesText(day.late_minutes)}</Typography>}
            {day.worked_minutes > 0 && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted }}>Worked {minutesText(day.worked_minutes)}</Typography>}
          </Box>
          {day.shift?.start && <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, mt: 0.5 }}>Shift {day.shift.name}: {day.shift.start} to {day.shift.end}</Typography>}
          {day.punches.length === 0 ? (
            <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mt: 1 }}>No check-ins on this day.</Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1, p: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {day.punches.map((punch, index) => (
                <Box component="li" key={index} sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontSize: STAFF_TEXT.label, color: STAFF_COLOR.text }}>
                  <span><b>{punch.type === "IN" ? "In" : "Out"}</b> {clock(punch.at)}</span>
                  <span style={{ color: "var(--hr-muted)" }}>{punch.source === "SELF" ? "Phone" : punch.source === "MANAGER" ? "Manager" : "Machine"}{punch.distance_m != null ? ` · ${punch.distance_m} m from the store` : ""}</span>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

/** My attendance for a month: a calendar with a colour for each day, the month's counts, and the punches of the day I tap. */
export default function AttendanceTab() {
  const [month, setMonth] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(null);

  const load = useCallback(async (wanted) => {
    setData(null);
    setError("");
    try {
      const res = await api.get("/staff-app/attendance-month", { params: wanted ? { month: wanted } : {} });
      setData(res.data?.data || null);
      setMonth(res.data?.data?.month || wanted);
    } catch {
      setError("Could not load your attendance. Pull down to try again.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => load(null), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const weeks = useMemo(() => buildWeeks(data?.days), [data]);
  const currentMonth = data?.today?.slice(0, 7);
  const go = (by) => {
    setPicked(null);
    void load(shiftMonth(month, by));
  };
  const totals = data?.totals;
  const chips = totals ? [
    ["Present", dayCount(totals.present), STATUS_META.PRESENT.color], ["Absent", dayCount(totals.absent), STATUS_META.ABSENT.color],
    ["Late", dayCount(totals.late), STATUS_META.HALF_DAY.color], ["Leave", dayCount(totals.paid_leave + totals.unpaid_leave), STATUS_META.LEAVE.color],
  ] : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ ...card, p: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box component="button" type="button" onClick={() => go(-1)} disabled={!month} aria-label="Previous month" sx={{ width: TOUCH, height: TOUCH, border: 0, bgcolor: "transparent", color: STAFF_COLOR.text, cursor: "pointer" }}><ChevronLeft size={22} /></Box>
          <Typography component="h2" sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>{month ? monthTitle(month) : ""}</Typography>
          <Box component="button" type="button" onClick={() => go(1)} disabled={!month || month >= currentMonth} aria-label="Next month" sx={{ width: TOUCH, height: TOUCH, border: 0, bgcolor: "transparent", color: STAFF_COLOR.text, cursor: "pointer", "&:disabled": { opacity: 0.3, cursor: "default" } }}><ChevronRight size={22} /></Box>
        </Box>
        {error && <Typography role="alert" sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.danger, py: 2, textAlign: "center" }}>{error}</Typography>}
        {!data && !error && <LoadingSkeleton variant="list" rows={5} label="Loading attendance" />}
        {data && (
          <Box role="grid" aria-label={`Attendance, ${monthTitle(month)}`}>
            <Box role="row" sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", mb: 0.5 }}>
              {WEEKDAYS.map((name) => <Typography role="columnheader" key={name} sx={{ fontSize: STAFF_TEXT.small, fontWeight: 700, color: STAFF_COLOR.faint }}>{name}</Typography>)}
            </Box>
            {weeks.map((week, index) => (
              <Box role="row" key={index} sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {week.map((day, cell) => {
                  if (!day) return <Box role="gridcell" key={cell} />;
                  const meta = STATUS_META[day.status];
                  const isToday = day.date === data.today;
                  const selected = picked === day.date;
                  return (
                    <Box role="gridcell" key={day.date} component="button" type="button" onClick={() => setPicked(day.date)} aria-pressed={selected}
                      aria-label={`${longDate(day.date)}${meta ? `, ${meta.label}` : ""}`}
                      sx={{ minHeight: TOUCH + 4, border: 0, borderRadius: "12px", bgcolor: selected ? STAFF_COLOR.primarySoft : "transparent", outline: isToday ? `2px solid ${STAFF_COLOR.primary}` : "none", outlineOffset: "-2px", color: STAFF_COLOR.text, fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.25, p: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: isToday ? 800 : 600 }}>{Number(day.date.slice(8))}</span>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta ? meta.color : "transparent" }} />
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {data && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
          {chips.map(([label, value, color]) => (
            <Box key={label} sx={{ ...card, p: 1, textAlign: "center" }}>
              <Typography sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color }}>{value}</Typography>
              <Typography sx={{ fontSize: STAFF_TEXT.small, fontWeight: 700, color: STAFF_COLOR.muted }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {data && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, px: 0.5 }}>Payable days {dayCount(totals.payable_days)}{totals.lop_days > 0 ? ` · Loss of pay ${dayCount(totals.lop_days)}` : ""}{totals.worked_minutes > 0 ? ` · Worked ${minutesText(totals.worked_minutes)}` : ""}</Typography>}

      {picked ? <DayDetail date={picked} /> : data && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.faint, px: 0.5 }}>Tap a day to see its check-ins.</Typography>}

      <Box>
        <Typography sx={sectionTitle}>What the colours mean</Typography>
        <Box sx={{ ...card, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {["PRESENT", "HALF_DAY", "ABSENT", "LEAVE", "HOLIDAY", "WEEK_OFF"].map((key) => (
            <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: STAFF_TEXT.small, color: STAFF_COLOR.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_META[key].color }} />{STATUS_META[key].label}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
