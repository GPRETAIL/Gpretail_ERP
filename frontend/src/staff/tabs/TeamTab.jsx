import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { STAFF_COLOR, STAFF_TEXT, card } from "../staffUi";
import { STATUS_META, clock } from "../attendanceCalendar";

const TEAM_STATUS = {
  PRESENT: ["In", STATUS_META.PRESENT.color], HALF_DAY: ["Half day", STATUS_META.HALF_DAY.color], ABSENT: ["Absent", STATUS_META.ABSENT.color],
  LEAVE: ["On leave", STATUS_META.LEAVE.color], ON_LEAVE: ["On leave", STATUS_META.LEAVE.color], NOT_IN: ["Not in yet", "#6b7280"],
};

/** My team today (the people who report to me): who has checked in, who is on leave, who has not come yet. */
export default function TeamTab() {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get("/staff-app/team")
      .then((res) => { if (active) setMembers(res.data?.data?.members || []); })
      .catch(() => { if (active) setError("Could not load your team. Pull down to try again."); });
    return () => { active = false; };
  }, []);

  const count = (...keys) => (members || []).filter((m) => keys.includes(m.status)).length;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {error && <Typography role="alert" sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.danger, textAlign: "center" }}>{error}</Typography>}
      {!members && !error && <LoadingSkeleton variant="list" rows={5} label="Loading team" />}
      {members && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
          {[["In", count("PRESENT", "HALF_DAY"), STATUS_META.PRESENT.color], ["On leave", count("ON_LEAVE", "LEAVE"), STATUS_META.LEAVE.color], ["Not in", count("NOT_IN", "ABSENT"), "#6b7280"]].map(([label, value, color]) => (
            <Box key={label} sx={{ ...card, p: 1, textAlign: "center" }}>
              <Typography sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color }}>{value}</Typography>
              <Typography sx={{ fontSize: STAFF_TEXT.small, fontWeight: 700, color: STAFF_COLOR.muted }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {members?.length === 0 && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>Nobody reports to you yet.</Typography></Box>}
      {members?.length > 0 && (
        <Box sx={{ ...card, p: 0 }}>
          {members.map((member, index) => {
            const [label, color] = TEAM_STATUS[member.status] || [member.status, "#6b7280"];
            return (
              <Box key={member.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, borderTop: index ? `1px solid ${STAFF_COLOR.line}` : 0 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 700, color: STAFF_COLOR.text }} noWrap>{member.name}</Typography>
                  <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }} noWrap>{[member.designation, member.check_in ? `In ${clock(member.check_in)}` : "", member.check_out ? `Out ${clock(member.check_out)}` : ""].filter(Boolean).join(" · ")}</Typography>
                </Box>
                <Box sx={{ px: 1.25, py: 0.25, borderRadius: "999px", bgcolor: color, color: "#fff", fontSize: STAFF_TEXT.small, fontWeight: 800, whiteSpace: "nowrap" }}>{label}</Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
