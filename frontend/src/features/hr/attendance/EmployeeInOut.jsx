import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, Button, Stack, Tab, Tabs } from "@mui/material";
import { Settings2 } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import UploadImportButton from "@/shared/components/UploadImportButton";
import AttendanceSettingsDialog from "./AttendanceSettingsDialog";
import Holidays from "./Holidays";
import MonthlyRegister from "./MonthlyRegister";
import PunchLog from "./PunchLog";
import TodayBoard from "./TodayBoard";
import { HR_MANAGER_ROLES } from "../utils/hrStatus";

const IMPORT_CONFIG = {
  aliases: {
    employeecode: "employee_code", code: "employee_code", empcode: "employee_code",
    date: "date", checkin: "check_in", intime: "check_in", in: "check_in",
    checkout: "check_out", outtime: "check_out", out: "check_out", status: "status",
  },
  required: ["employee_code", "date"],
  timeFields: ["check_in", "check_out"],
  sampleHeaders: ["employee_code", "date", "check_in", "check_out", "status"],
  sampleFileName: "attendance_import_sample.xlsx",
};

const monthOf = (date) => (date || new Date().toISOString()).slice(0, 7);

/** HRMS > Employee In/Out: today's attendance, the monthly register, the punch log and the holiday list. */
export default function EmployeeInOut() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const canManage = HR_MANAGER_ROLES.includes(authUser?.role);
  const [tab, setTab] = useState("today");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(monthOf());
  const [range, setRange] = useState(() => { const today = new Date().toISOString().slice(0, 10); return { from: today, to: today }; });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/hrms")} title={<Breadcrumbs items={[{ label: "HRMS", onClick: () => navigate("/hrms") }, { label: "Employee In/Out" }]} />}
        actions={canManage ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <UploadImportButton endpoint="/attendance/import" fieldConfig={IMPORT_CONFIG} onDone={() => setRefreshKey((k) => k + 1)} />
            <Button size="small" variant="outlined" startIcon={<Settings2 size={14} />} disabled={!authUser?.store_id} onClick={() => setSettingsOpen(true)}>Settings</Button>
          </Stack>
        ) : null} />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, textTransform: "none" } }}>
        <Tab value="today" label="Day board" />
        <Tab value="monthly" label="Monthly register" />
        <Tab value="punches" label="Punch log" />
        <Tab value="holidays" label="Holidays" />
      </Tabs>
      <Box key={refreshKey} sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {tab === "today" && <TodayBoard date={date} onDateChange={setDate} canManage={canManage} />}
        {tab === "monthly" && <MonthlyRegister month={month} onMonthChange={setMonth} />}
        {tab === "punches" && <PunchLog from={range.from} to={range.to} onRangeChange={setRange} />}
        {tab === "holidays" && <Holidays canManage={canManage} />}
      </Box>
      {settingsOpen && <AttendanceSettingsDialog onClose={(saved) => { setSettingsOpen(false); if (saved) setRefreshKey((k) => k + 1); }} />}
    </Box>
  );
}
