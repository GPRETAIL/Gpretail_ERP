import { useState } from "react";
import { useSelector } from "react-redux";
import { Button, Stack } from "@mui/material";
import { Settings2 } from "lucide-react";
import UploadImportButton from "@/shared/components/UploadImportButton";
import HrPage from "../components/HrPage";
import AttendanceSettingsDialog from "./AttendanceSettingsDialog";
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

/** HRMS > Attendance: the day's attendance (punch, mark, bulk), spreadsheet import and attendance settings. */
export default function EmployeeInOut() {
  const authUser = useSelector((state) => state.auth.user);
  const canManage = HR_MANAGER_ROLES.includes(authUser?.role);
  const [date, setDate] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <HrPage title="Attendance" actions={canManage ? (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <UploadImportButton endpoint="/attendance/import" fieldConfig={IMPORT_CONFIG} onDone={() => setRefreshKey((k) => k + 1)} />
        <Button size="small" variant="outlined" startIcon={<Settings2 size={14} />} disabled={!authUser?.store_id} onClick={() => setSettingsOpen(true)}>Settings</Button>
      </Stack>
    ) : null}>
      <TodayBoard key={refreshKey} date={date} onDateChange={setDate} canManage={canManage} />
      {settingsOpen && <AttendanceSettingsDialog onClose={(saved) => { setSettingsOpen(false); if (saved) setRefreshKey((k) => k + 1); }} />}
    </HrPage>
  );
}
