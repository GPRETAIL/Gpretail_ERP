import { useSelector } from "react-redux";
import HrPage from "../components/HrPage";
import { HR_MANAGER_ROLES } from "../utils/hrStatus";
import PayrollRuns from "./PayrollRuns";

/** HRMS > Payroll: prepare a month from attendance, review payslips, submit and mark paid. */
export default function SalaryManagement() {
  // Admins and managers run payroll; accountants can look (the server checks this too).
  const canManage = HR_MANAGER_ROLES.includes(useSelector((state) => state.auth.user?.role));
  return <HrPage title="Payroll"><PayrollRuns canManage={canManage} /></HrPage>;
}
