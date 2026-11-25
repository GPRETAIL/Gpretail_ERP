import { Box, Typography } from "@mui/material";
import { CalendarCheck, CalendarDays, ClipboardList, Sparkles } from "lucide-react";
import { clock } from "./attendanceCalendar";

const greeting = (hour) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
const longDate = (date) => date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

function Stat({ icon: Icon, value, label }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, px: 1.25, py: 1, borderRadius: "16px", bgcolor: "rgba(255,255,255,0.16)", backdropFilter: "blur(4px)" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, opacity: 0.9 }}><Icon size={14} /><Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.1 }} noWrap>{label}</Typography></Box>
      <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25, mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}

/**
 * The top of Home: who this is, today's date, whether they have checked in, and three numbers worth a glance
 * (paid leave left, requests waiting, days to the next holiday). The check-in button itself is the card below.
 */
export default function HomeHero({ home, now = new Date() }) {
  const name = home?.employee?.name || "";
  const first = name.split(" ")[0];
  const attendance = home?.attendance;
  const checkedIn = Boolean(attendance?.check_in);
  const paidLeave = (home?.leave || []).filter((b) => b.is_paid).reduce((sum, b) => sum + Number(b.available ?? b.balance ?? 0), 0);
  const pending = home?.my_pending || {};
  const waiting = (pending.leave || 0) + (pending.requests || 0) + (pending.loans || 0) + (pending.claims || 0);
  const nextHoliday = (home?.holidays || [])[0];
  const daysToHoliday = nextHoliday ? Math.max(0, Math.round((new Date(`${nextHoliday.date}T00:00:00`) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)) : null;

  return (
    <Box component="section" aria-label="Today" sx={{ p: 2, borderRadius: "24px", color: "#fff", background: "linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #2dd4bf 130%)", boxShadow: "0 14px 30px -14px rgba(13,148,136,0.7)" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box aria-hidden="true" sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>{initials(name)}</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }} noWrap>{greeting(now.getHours())}, {first || "there"}</Typography>
          <Typography sx={{ fontSize: 13, opacity: 0.9 }}>{longDate(now)}</Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 1.5, display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.5, borderRadius: "999px", bgcolor: "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700 }}>
        <Box component="span" aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: checkedIn ? "#bbf7d0" : "#fde68a" }} />
        {checkedIn ? `Checked in at ${clock(attendance.check_in)}${attendance.check_out ? `, out at ${clock(attendance.check_out)}` : ""}` : "You have not checked in yet"}
      </Box>
      <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
        <Stat icon={CalendarCheck} value={Number(paidLeave.toFixed(1))} label="Leave left" />
        <Stat icon={ClipboardList} value={waiting} label="Waiting" />
        <Stat icon={nextHoliday ? CalendarDays : Sparkles} value={daysToHoliday === null ? "-" : daysToHoliday === 0 ? "Today" : `${daysToHoliday}d`} label={nextHoliday ? "Next holiday" : "Holiday"} />
      </Box>
    </Box>
  );
}
