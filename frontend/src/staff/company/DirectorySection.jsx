import { useEffect, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import { Cake, Mail, PartyPopper, Phone } from "lucide-react";
import api from "@/shared/api/apiClient";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { STAFF_COLOR, STAFF_TEXT, TOUCH, card, sectionTitle } from "../staffUi";

const day = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Birthdays and work anniversaries in the next two weeks (day and month only), then the colleague directory with search. */
export default function DirectorySection() {
  const [term, setTerm] = useState("");
  const [people, setPeople] = useState(null);
  const [celebrations, setCelebrations] = useState({ today: "", items: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/staff-company/celebrations").then((res) => { if (active) setCelebrations({ today: res.data?.data?.today || "", items: res.data?.data?.items || [] }); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api.get("/staff-company/directory", { params: term.trim() ? { q: term.trim() } : {} })
        .then((res) => { if (active) { setPeople(res.data?.data || []); setError(""); } })
        .catch(() => { if (active) setError("Could not load the directory. Try again."); });
    }, term ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [term]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {celebrations.items.length > 0 && (
        <Box>
          <Typography sx={sectionTitle}>Coming up</Typography>
          <Box sx={{ ...card, p: 0 }}>
            {celebrations.items.map((item, index) => (
              <Box key={`${item.employee_id}-${item.type}`} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, borderTop: index ? `1px solid ${STAFF_COLOR.line}` : 0 }}>
                <Box sx={{ color: STAFF_COLOR.primary }}>{item.type === "BIRTHDAY" ? <Cake size={20} /> : <PartyPopper size={20} />}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 700, color: STAFF_COLOR.text }} noWrap>{item.name}</Typography>
                  <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }}>{item.type === "BIRTHDAY" ? "Birthday" : `${item.years} year${item.years === 1 ? "" : "s"} with us`}</Typography>
                </Box>
                <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, whiteSpace: "nowrap" }}>{item.date === celebrations.today ? "Today" : day(item.date)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      <TextField type="search" label="Search name, code or mobile" value={term} onChange={(e) => setTerm(e.target.value)} />
      {error && <Typography role="alert" sx={{ color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.label, textAlign: "center" }}>{error}</Typography>}
      {!people && !error && <LoadingSkeleton variant="list" rows={5} label="Loading directory" />}
      {people?.length === 0 && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>Nobody matches that.</Typography></Box>}
      {(people || []).map((person) => (
        <Box key={person.id} sx={{ ...card, display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 700, color: STAFF_COLOR.text }} noWrap>{person.name}</Typography>
            <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }} noWrap>{[person.designation, person.department].filter(Boolean).join(" · ") || person.code}</Typography>
          </Box>
          {person.phone && <Box component="a" href={`tel:${person.phone}`} aria-label={`Call ${person.name}`} sx={{ width: TOUCH, height: TOUCH, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: `1px solid ${STAFF_COLOR.line}`, color: STAFF_COLOR.primaryDark }}><Phone size={18} /></Box>}
          {person.email && <Box component="a" href={`mailto:${person.email}`} aria-label={`Email ${person.name}`} sx={{ width: TOUCH, height: TOUCH, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: `1px solid ${STAFF_COLOR.line}`, color: STAFF_COLOR.primaryDark }}><Mail size={18} /></Box>}
        </Box>
      ))}
    </Box>
  );
}
