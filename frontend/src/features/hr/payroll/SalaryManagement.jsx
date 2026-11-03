import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, Tab, Tabs } from "@mui/material";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { HR_MANAGER_ROLES } from "../utils/hrStatus";
import AdditionalPay from "./AdditionalPay";
import PayrollReports from "./PayrollReports";
import PayrollRuns from "./PayrollRuns";
import PayrollSettings from "./PayrollSettings";
import SalaryStructures from "./SalaryStructures";

/** HRMS > Salary Management: monthly payroll, one-off pay, salary structures, settings and payroll reports. */
export default function SalaryManagement() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  // Admins and managers run payroll; accountants can look (the server checks this too).
  const canManage = HR_MANAGER_ROLES.includes(authUser?.role);
  const [tab, setTab] = useState("runs");

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/hrms")} title={<Breadcrumbs items={[{ label: "HRMS", onClick: () => navigate("/hrms") }, { label: "Salary Management" }]} />} />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, textTransform: "none" } }}>
        <Tab value="runs" label="Payroll" />
        <Tab value="additional" label="Additional pay" />
        <Tab value="structures" label="Structures" />
        <Tab value="settings" label="Settings" />
        <Tab value="reports" label="Reports" />
      </Tabs>
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {tab === "runs" && <PayrollRuns canManage={canManage} />}
        {tab === "additional" && <AdditionalPay canManage={canManage} />}
        {tab === "structures" && <SalaryStructures canManage={canManage} />}
        {tab === "settings" && <PayrollSettings canManage={canManage} />}
        {tab === "reports" && <PayrollReports />}
      </Box>
    </Box>
  );
}
