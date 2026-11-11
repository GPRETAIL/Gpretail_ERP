import { useState } from "react";
import { Stack, TextField } from "@mui/material";
import HrPage from "../components/HrPage";
import HrDashboardTabPane from "@/features/dashboard/components/HrDashboardTabPane";
import { DashboardLayoutProvider } from "@/features/dashboard/context/DashboardLayoutContext";

const ymd = (date) => date.toLocaleDateString("en-CA");

/** HRMS > Dashboard: the same widgets as the Dashboard's HR tab (one design, one saved layout). */
export default function HrDashboard() {
  const now = new Date();
  const [from, setFrom] = useState(() => ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(() => ymd(now));
  return (
    <HrPage title="Dashboard" actions={(
      <Stack direction="row" spacing={1}>
        <TextField type="date" size="small" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
    )}>
      <DashboardLayoutProvider>
        <HrDashboardTabPane active fromDate={from} toDate={to} privacyMode={false} />
      </DashboardLayoutProvider>
    </HrPage>
  );
}
