import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { KeyRound, LogOut } from "lucide-react";
import api from "@/shared/api/apiClient";
import MyRequestsCard from "@/mobile/components/MyRequestsCard";
import ChangePin from "../ChangePin";
import { STAFF_COLOR, STAFF_TEXT, card, sectionTitle, secondaryButton } from "../staffUi";

const ROWS = [["code", "Employee code"], ["designation", "Designation"], ["department", "Department"], ["reports_to", "Reports to"], ["joining_date", "Joined"],
  ["phone", "Mobile"], ["email", "Email"], ["date_of_birth", "Date of birth"], ["blood_group", "Blood group"], ["bank_account", "Salary account"], ["pan", "PAN"]];

/** Me: my details, attendance and shift requests, resigning, PIN and signing out. */
export default function MeTab({ onSignOut }) {
  const [profile, setProfile] = useState(null);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api.get("/staff-app/profile").then((res) => { if (active) setProfile(res.data?.data || {}); }).catch(() => { if (active) setProfile({}); });
    return () => { active = false; };
  }, []);

  if (changing) return <ChangePin onDone={() => { setChanging(false); setMessage("Your PIN is changed."); }} onCancel={() => setChanging(false)} />;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {message && <Box role="status" sx={{ ...card, bgcolor: STAFF_COLOR.primarySoft, borderColor: "#99f6e4", color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.label, fontWeight: 700 }}>{message}</Box>}
      <Box sx={card}>
        <Typography sx={{ fontSize: STAFF_TEXT.heading, fontWeight: 800, color: STAFF_COLOR.text }}>{profile?.name || "…"}</Typography>
        <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted }}>{profile?.store?.name}</Typography>
        <Box component="dl" sx={{ m: 0, mt: 1.5, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.75 }}>
          {ROWS.filter(([key]) => profile?.[key]).map(([key, label]) => (
            <Box key={key} sx={{ display: "contents" }}>
              <Typography component="dt" sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.faint }}>{label}</Typography>
              <Typography component="dd" sx={{ m: 0, fontSize: STAFF_TEXT.label, color: STAFF_COLOR.text, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>{profile[key]}</Typography>
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, mt: 1.25 }}>Something wrong here? Ask HR to correct your record.</Typography>
      </Box>

      <Box>
        <Typography sx={sectionTitle}>Attendance and shift requests</Typography>
        <MyRequestsCard />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box component="button" type="button" onClick={() => setChanging(true)} sx={{ ...secondaryButton, justifyContent: "flex-start" }}><KeyRound size={18} /> Change my PIN</Box>
        <Box component="button" type="button" onClick={onSignOut} sx={{ ...secondaryButton, justifyContent: "flex-start", color: STAFF_COLOR.danger }}><LogOut size={18} /> Sign out</Box>
      </Box>
    </Box>
  );
}
