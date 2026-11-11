import { TYPE } from "@/shared/theme/typeScale";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "@/shared/utils/emptyValues.js";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import useModuleDashboardSummary from "@/features/dashboard/hooks/useModuleDashboardSummary";
import { canAccessPath } from "@/features/auth/utils/accessControl";
import DashboardGrid from "./DashboardGrid";
import { ApprovalsWaitingCard, HeadcountCard, OnLeaveTodayCard, PayrollCostCard, PresentTodayCard } from "./hrms/HrKpiCards";
import {
  ApprovalsByType, AttendanceTrend, Celebrations, HeadcountByDepartment, HrActionRequired, JoinersAndExits, OnLeaveThisWeek, PayrollTrend,
  TodayAttendance, UpcomingHolidays,
} from "./hrms/HrWidgets";

const QUICK_ACTIONS = [
  { label: "Attendance", path: "/hrms/employee-in-out", bg: "success.main", hoverBg: "success.dark" },
  { label: "Leave approvals", path: "/hrms/leave-approvals", bg: "primary.main", hoverBg: "primary.dark" },
  { label: "Request approvals", path: "/hrms/request-approvals", bg: "#4f46e5", hoverBg: "#4338ca" },
  { label: "Payroll", path: "/hrms/salary-management", bg: "#0891b2", hoverBg: "#0e7490" },
  { label: "+ Employee", path: "/hrms/employee", bg: "#9333ea", hoverBg: "#7e22ce" },
  { label: "HRMS App", path: "/hrms/staff-app", bg: "#0d9488", hoverBg: "#0f766e" },
];

/**
 * Dashboard > HR (also HRMS > Dashboard): workforce, today's attendance, approvals, leave, payroll,
 * joiners and exits, and people events. HR roles see the store, a manager their team (the server decides),
 * and pay figures only reach users with payroll access.
 */
export default function HrDashboardTabPane({ active, fromDate, toDate, privacyMode, tabKey = "hrms" }) {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const { data, loading, error, reload } = useModuleDashboardSummary("/hrms/dashboard", {
    active, errorMessage: "Failed to load HR data.", params: { ...(fromDate ? { date_from: fromDate } : {}), ...(toDate ? { date_to: toDate } : {}) },
  });

  const summary = data?.summary || EMPTY_OBJECT;
  const today = data?.today || EMPTY_OBJECT;
  const trend = data?.attendance_trend || EMPTY_ARRAY;
  const departments = data?.by_department || EMPTY_ARRAY;
  const approvals = data?.approvals || EMPTY_OBJECT;
  const leave = data?.leave || EMPTY_OBJECT;
  const payroll = data?.payroll || null;
  const people = data?.people || EMPTY_OBJECT;
  const actionRequired = data?.action_required || EMPTY_ARRAY;
  const showPay = Boolean(payroll);
  const firstLoad = loading && !data;

  const widgets = useMemo(() => {
    const kpiWidth = showPay ? 12 / 5 : 3;
    const kpis = [
      ["kpi-headcount", "Headcount", HeadcountCard],
      ["kpi-present", "Present today", PresentTodayCard],
      ["kpi-on-leave", "On leave today", OnLeaveTodayCard],
      ["kpi-approvals", "Waiting for approval", ApprovalsWaitingCard],
      ...(showPay ? [["kpi-payroll", "Payroll cost", PayrollCostCard]] : []),
    ].map(([key, title, component], i) => ({
      key, title, component, props: { summary, loading, privacyMode },
      defaultLayout: { x: Math.round(i * kpiWidth), y: 0, w: Math.round((i + 1) * kpiWidth) - Math.round(i * kpiWidth), h: 2, minW: 2, minH: 2 },
    }));
    return [
      ...kpis,
      { key: "action-required", title: "Action required", component: HrActionRequired, props: { actionRequired, loading: firstLoad }, defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 } },
      { key: "today", title: "Today's attendance", component: TodayAttendance, props: { today, loading: firstLoad }, defaultLayout: { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 } },
      { key: "trend", title: "Attendance trend", component: AttendanceTrend, props: { trend, loading: firstLoad }, defaultLayout: { x: 4, y: 4, w: 8, h: 4, minW: 4, minH: 3 } },
      { key: "approvals", title: "Waiting for approval", component: ApprovalsByType, props: { approvals, loading: firstLoad }, defaultLayout: { x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 } },
      { key: "on-leave", title: "On leave this week", component: OnLeaveThisWeek, props: { leave, loading: firstLoad }, defaultLayout: { x: 4, y: 8, w: 4, h: 4, minW: 3, minH: 3 } },
      { key: "departments", title: "Headcount by department", component: HeadcountByDepartment, props: { departments, loading: firstLoad }, defaultLayout: { x: 8, y: 8, w: 4, h: 4, minW: 3, minH: 3 } },
      ...(showPay ? [{ key: "payroll", title: "Payroll trend", component: PayrollTrend, props: { payroll, privacyMode, loading: firstLoad }, defaultLayout: { x: 0, y: 12, w: 6, h: 4, minW: 4, minH: 3 } }] : []),
      { key: "joiners-exits", title: "Joiners and exits", component: JoinersAndExits, props: { people, loading: firstLoad }, defaultLayout: { x: showPay ? 6 : 0, y: 12, w: showPay ? 6 : 4, h: 4, minW: 3, minH: 3 } },
      { key: "celebrations", title: "Birthdays and anniversaries", component: Celebrations, props: { people, loading: firstLoad }, defaultLayout: { x: showPay ? 0 : 4, y: 16, w: showPay ? 6 : 4, h: 4, minW: 3, minH: 3 } },
      { key: "holidays", title: "Upcoming holidays", component: UpcomingHolidays, props: { people, loading: firstLoad }, defaultLayout: { x: showPay ? 6 : 8, y: 16, w: showPay ? 6 : 4, h: 4, minW: 3, minH: 3 } },
    ];
  }, [showPay, firstLoad, summary, loading, privacyMode, actionRequired, today, trend, approvals, leave, departments, payroll, people]);

  const actions = QUICK_ACTIONS.filter((action) => canAccessPath(action.path, authUser));

  if (error) {
    return (
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: "10.5px", border: "1px solid", borderColor: "error.main", p: 2,
        bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08) }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "error.main", display: "inline-flex" }}><AlertTriangle size={20} /></Box>
          <Typography sx={{ fontSize: 14, color: "error.dark" }}>{error}</Typography>
        </Stack>
        <Button size="small" variant="contained" color="error" onClick={() => reload()}>Retry</Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", borderBottom: 1, borderColor: "divider", pb: 1.5, rowGap: 1 }}>
        <Typography sx={{ fontSize: TYPE.small, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>Quick Actions:</Typography>
        {actions.map((action) => (
          <Button key={action.label} variant="contained" size="small" onClick={() => navigate(action.path)}
            sx={{ borderRadius: "5.25px", fontSize: 12, fontWeight: 500, boxShadow: 1, bgcolor: action.bg, "&:hover": { bgcolor: action.hoverBg } }}>
            {action.label}
          </Button>
        ))}
        {data?.scope && data.scope !== "store" && (
          <Typography sx={{ ml: "auto", fontSize: TYPE.small, color: "text.secondary" }}>{data.scope === "team" ? "Showing your team" : "Showing your own record"}</Typography>
        )}
      </Stack>
      <DashboardGrid tabKey={tabKey} widgets={widgets} />
    </Stack>
  );
}
