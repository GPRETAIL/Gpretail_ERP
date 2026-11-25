import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Megaphone, Pin, ScrollText } from "lucide-react";
import api from "@/shared/api/apiClient";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { STAFF_COLOR, STAFF_TEXT, card, errorText, primaryButton } from "../staffUi";

const niceDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Notices and policies from HR. Opening one marks it read; a policy also has "I have read and agree". */
export default function AnnouncementsSection({ onCounts }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/staff-company/announcements");
      setData(res.data?.data || { items: [], unread: 0, to_acknowledge: 0 });
      onCounts?.(res.data?.data);
    } catch {
      setError("Could not load the announcements. Pull down to try again.");
    }
  }, [onCounts]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const toggle = async (item) => {
    const opening = open !== item.id;
    setOpen(opening ? item.id : null);
    if (opening && !item.read) {
      try {
        await api.post(`/staff-company/announcements/${item.id}/read`);
        await load();
      } catch {
        // It stays unread; opening it again tries again.
      }
    }
  };
  const agree = async (item) => {
    setMessage("");
    try {
      const res = await api.post(`/staff-company/announcements/${item.id}/acknowledge`);
      setMessage(res.data?.message || "Your agreement is recorded.");
      await load();
    } catch (err) {
      setMessage(errorText(err, "Could not record your agreement. Try again."));
    }
  };

  if (error) return <Typography role="alert" sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.danger, textAlign: "center" }}>{error}</Typography>;
  if (!data) return <LoadingSkeleton variant="list" rows={4} label="Loading announcements" />;
  if (data.items.length === 0) return <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>Nothing from HR right now.</Typography></Box>;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {message && <Box role="status" sx={{ ...card, bgcolor: STAFF_COLOR.primarySoft, borderColor: STAFF_COLOR.primaryBorder, color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.label, fontWeight: 700 }}>{message}</Box>}
      {data.items.map((item) => {
        const isPolicy = item.category === "POLICY";
        const expanded = open === item.id;
        return (
          <Box key={item.id} sx={{ ...card, borderColor: item.read ? STAFF_COLOR.line : STAFF_COLOR.primaryBorder }}>
            <Box component="button" type="button" onClick={() => void toggle(item)} aria-expanded={expanded}
              sx={{ width: "100%", p: 0, border: 0, bgcolor: "transparent", textAlign: "left", fontFamily: "inherit", cursor: "pointer", display: "flex", gap: 1.25, alignItems: "flex-start", color: STAFF_COLOR.text }}>
              <Box sx={{ color: STAFF_COLOR.primary, mt: 0.25 }}>{isPolicy ? <ScrollText size={20} /> : <Megaphone size={20} />}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: item.read ? 600 : 800 }}>
                  {item.is_pinned && <Pin size={14} style={{ verticalAlign: "-1px", marginRight: 4 }} aria-label="Pinned" />}
                  {item.title}
                </Typography>
                <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }}>
                  {isPolicy ? "Policy" : "Announcement"} · {niceDate(item.publish_on)}{!item.read ? " · New" : ""}{isPolicy && !item.acknowledged ? " · Needs your agreement" : ""}
                </Typography>
              </Box>
            </Box>
            {expanded && (
              <Box sx={{ mt: 1.25 }}>
                <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.text, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.body}</Typography>
                {isPolicy && (item.acknowledged
                  ? <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.success, fontWeight: 700, mt: 1.25 }}>You have agreed to this policy.</Typography>
                  : <Box component="button" type="button" onClick={() => void agree(item)} sx={{ ...primaryButton, width: "100%", mt: 1.25 }}>I have read and agree</Box>)}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
