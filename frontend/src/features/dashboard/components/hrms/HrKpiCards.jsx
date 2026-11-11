import { TYPE } from "@/shared/theme/typeScale";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardCheck, IndianRupee, UserCheck, Users } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { formatCurrency, wholeNumber } from "@/features/dashboard/utils/dashboardFormatters";

// One widget per KPI so DashboardGrid can move and resize each card, like the other tabs.
const blurSx = (privacyMode) => (privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {});
const cardSx = (hoverColor) => ({
  display: "block", width: "100%", height: "100%", textAlign: "left", borderRadius: "10.5px", border: "1px solid",
  borderColor: "divider", bgcolor: "background.paper", p: 2, boxShadow: 1, cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease", "&:hover": { borderColor: hoverColor, boxShadow: 2 },
});

function KpiCard({ title, icon: Icon, color, value, note, path, loading, blur = false }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate(path)} sx={cardSx(`${color}.main`)}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: TYPE.small, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</Typography>
        <Box sx={{ color: `${color}.main`, display: "inline-flex" }}><Icon size={20} /></Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: `${color}.main`, fontVariantNumeric: "tabular-nums", ...(blur ? blurSx(true) : {}) }}>
        {loading ? <LoadingSkeleton /> : value}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: TYPE.small, color: "text.secondary", ...(blur ? blurSx(true) : {}) }}>{note}</Typography>
    </ButtonBase>
  );
}

export function HeadcountCard({ summary = {}, loading }) {
  const parts = [summary.joiners ? `+${summary.joiners} joined` : null, summary.exits ? `${summary.exits} left` : null,
    summary.upcoming_exits ? `${summary.upcoming_exits} leaving soon` : null].filter(Boolean);
  return <KpiCard title="Headcount" icon={Users} color="primary" path="/hrms/employee" loading={loading}
    value={wholeNumber(summary.headcount)} note={parts.join(" · ") || "Active employees"} />;
}

export function PresentTodayCard({ summary = {}, loading }) {
  return <KpiCard title="Present today" icon={UserCheck} color="success" path="/hrms/employee-in-out" loading={loading}
    value={wholeNumber(summary.present_today)} note={summary.attendance_pct == null ? "No working day today" : `${summary.attendance_pct}% of those working today`} />;
}

export function OnLeaveTodayCard({ summary = {}, loading }) {
  return <KpiCard title="On leave today" icon={CalendarDays} color="secondary" path="/hrms/leave-applications" loading={loading}
    value={wholeNumber(summary.on_leave_today)} note="Approved leave" />;
}

export function ApprovalsWaitingCard({ summary = {}, loading }) {
  return <KpiCard title="Waiting for approval" icon={ClipboardCheck} color="warning" path="/hrms/leave-approvals" loading={loading}
    value={wholeNumber(summary.approvals_waiting)} note="Leave, requests, overtime, claims and more" />;
}

export function PayrollCostCard({ summary = {}, loading, privacyMode }) {
  const run = summary.payroll;
  const month = run?.month ? new Date(`${run.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";
  return <KpiCard title="Payroll cost" icon={IndianRupee} color="info" path="/hrms/salary-management" loading={loading} blur={privacyMode}
    value={run ? formatCurrency(run.employer_cost) : "—"} note={run ? `${month} · net pay ${formatCurrency(run.net)}` : "No payroll yet"} />;
}
