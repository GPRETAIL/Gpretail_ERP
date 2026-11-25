import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { STAFF_COLOR, STAFF_TEXT, card, sectionTitle } from "./staffUi";

const day = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Under my leave: who in my team is away in the next two weeks (names and dates only). Hidden when nobody is, or it cannot load. */
export default function TeamOnLeaveCard() {
  const [people, setPeople] = useState(null);
  useEffect(() => {
    let active = true;
    api.get("/staff-app/team-on-leave")
      .then((res) => { if (active) setPeople(res.data?.data?.people || []); })
      .catch(() => { if (active) setPeople([]); });
    return () => { active = false; };
  }, []);
  if (!people?.length) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={sectionTitle}>Away in my team, next 2 weeks</Typography>
      <Box sx={{ ...card, p: 0 }}>
        {people.map((person, index) => (
          <Box key={`${person.employee_id}-${person.from}`} sx={{ display: "flex", justifyContent: "space-between", gap: 1, px: 1.75, py: 1.25, borderTop: index ? `1px solid ${STAFF_COLOR.line}` : 0 }}>
            <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.text, fontWeight: 600 }}>{person.name}</Typography>
            <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, whiteSpace: "nowrap" }}>
              {person.from === person.to ? day(person.from) : `${day(person.from)} to ${day(person.to)}`}{person.half_day ? " (half day)" : ""}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
