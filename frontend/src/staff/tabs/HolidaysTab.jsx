import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/shared/api/apiClient";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { STAFF_COLOR, STAFF_TEXT, TOUCH, card, sectionTitle } from "../staffUi";

const weekday = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
const monthName = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { month: "long" });

/** The holidays of a year, by month, with the next one marked. */
export default function HolidaysTab() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-CA");

  const load = useCallback(async (wanted) => {
    setRows(null);
    setError("");
    try {
      const res = await api.get("/holidays", { params: { year: wanted } });
      setRows(res.data?.data || []);
    } catch {
      setError("Could not load the holidays. Pull down to try again.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => load(year), 0);
    return () => clearTimeout(timer);
  }, [load, year]);

  const months = useMemo(() => {
    const groups = new Map();
    (rows || []).forEach((row) => {
      const key = row.date.slice(0, 7);
      groups.set(key, [...(groups.get(key) || []), row]);
    });
    return [...groups.entries()];
  }, [rows]);
  const next = (rows || []).find((row) => row.date >= today);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ ...card, p: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box component="button" type="button" onClick={() => setYear((y) => y - 1)} aria-label="Previous year" sx={{ width: TOUCH, height: TOUCH, border: 0, bgcolor: "transparent", color: STAFF_COLOR.text, cursor: "pointer" }}><ChevronLeft size={22} /></Box>
        <Typography component="h2" sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>{year}</Typography>
        <Box component="button" type="button" onClick={() => setYear((y) => y + 1)} aria-label="Next year" sx={{ width: TOUCH, height: TOUCH, border: 0, bgcolor: "transparent", color: STAFF_COLOR.text, cursor: "pointer" }}><ChevronRight size={22} /></Box>
      </Box>
      {error && <Typography role="alert" sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.danger, textAlign: "center" }}>{error}</Typography>}
      {!rows && !error && <LoadingSkeleton variant="list" rows={5} label="Loading holidays" />}
      {rows && next && year === new Date().getFullYear() && (
        <Box sx={{ ...card, bgcolor: STAFF_COLOR.primarySoft, borderColor: STAFF_COLOR.primaryBorder }}>
          <Typography sx={{ fontSize: STAFF_TEXT.small, fontWeight: 800, color: STAFF_COLOR.primaryDark, textTransform: "uppercase", letterSpacing: "0.05em" }}>Next holiday</Typography>
          <Typography sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color: STAFF_COLOR.text }}>{next.name}</Typography>
          <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted }}>{weekday(next.date)} {monthName(next.date)}</Typography>
        </Box>
      )}
      {rows?.length === 0 && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>No holidays are listed for {year}.</Typography></Box>}
      {months.map(([key, list]) => (
        <Box key={key}>
          <Typography sx={sectionTitle}>{monthName(`${key}-01`)}</Typography>
          <Box sx={{ ...card, p: 0 }}>
            {list.map((row, index) => (
              <Box key={row.id || row.date} sx={{ display: "flex", justifyContent: "space-between", gap: 1, px: 1.75, py: 1.25, borderTop: index ? `1px solid ${STAFF_COLOR.line}` : 0, opacity: row.date < today ? 0.6 : 1 }}>
                <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.text, fontWeight: 600 }}>{row.name}</Typography>
                <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, whiteSpace: "nowrap" }}>{weekday(row.date)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
