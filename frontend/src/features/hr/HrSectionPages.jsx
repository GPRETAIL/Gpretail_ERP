import { useState } from "react";
import { useSelector } from "react-redux";
import { TextField } from "@mui/material";
import HrPage from "./components/HrPage";
import Holidays from "./attendance/Holidays";
import MonthlyRegister from "./attendance/MonthlyRegister";
import PunchLog from "./attendance/PunchLog";
import LeaveApplications from "./leave/LeaveApplications";
import LeaveBalances from "./leave/LeaveBalances";
import LeaveSetup from "./leave/LeaveSetup";
import AdditionalPay from "./payroll/AdditionalPay";
import PayrollReports from "./payroll/PayrollReports";
import PayrollSettings from "./payroll/PayrollSettings";
import SalaryStructures from "./payroll/SalaryStructures";
import { HR_MANAGER_ROLES } from "./utils/hrStatus";

// The HRMS sub-menu pages that each show one part of attendance, leave or payroll (one sidebar item each).

const useCanManage = () => HR_MANAGER_ROLES.includes(useSelector((state) => state.auth.user?.role));
const today = () => new Date().toISOString().slice(0, 10);

const YearField = ({ year, onChange }) => (
  <TextField type="number" size="small" label="Year" value={year} onChange={(e) => onChange(Number(e.target.value) || year)} sx={{ width: 100 }} />
);

export function AttendanceRegisterPage() {
  const [month, setMonth] = useState(today().slice(0, 7));
  return <HrPage title="Attendance Register"><MonthlyRegister month={month} onMonthChange={setMonth} /></HrPage>;
}

export function PunchLogPage() {
  const [range, setRange] = useState({ from: today(), to: today() });
  return <HrPage title="Punch Log"><PunchLog from={range.from} to={range.to} onRangeChange={setRange} /></HrPage>;
}

export function HolidaysPage() {
  return <HrPage title="Holidays"><Holidays canManage={useCanManage()} /></HrPage>;
}

export function LeaveApprovalsPage() {
  return <HrPage title="Leave Approvals"><LeaveApplications inbox /></HrPage>;
}

export function LeaveApplicationsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  return <HrPage title="Leave Applications" actions={<YearField year={year} onChange={setYear} />}><LeaveApplications year={year} /></HrPage>;
}

export function LeaveBalancesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  return <HrPage title="Leave Balances" actions={<YearField year={year} onChange={setYear} />}><LeaveBalances year={year} canManage={useCanManage()} /></HrPage>;
}

export function LeaveSetupPage() {
  return <HrPage title="Leave Setup"><LeaveSetup /></HrPage>;
}

export function AdditionalPayPage() {
  return <HrPage title="Additional Pay"><AdditionalPay canManage={useCanManage()} /></HrPage>;
}

export function SalaryStructuresPage() {
  return <HrPage title="Salary Structures"><SalaryStructures canManage={useCanManage()} /></HrPage>;
}

export function PayrollSettingsPage() {
  return <HrPage title="Payroll Settings"><PayrollSettings canManage={useCanManage()} /></HrPage>;
}

export function PayrollReportsPage() {
  return <HrPage title="Payroll Reports"><PayrollReports /></HrPage>;
}
