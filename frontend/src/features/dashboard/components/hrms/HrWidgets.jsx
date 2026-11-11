import { TYPE } from "@/shared/theme/typeScale";
import { useNavigate } from "react-router-dom";
import { AlertOctagon, Building2, CalendarClock, CalendarHeart, ClipboardCheck, IndianRupee, LineChart, PartyPopper, PieChart, UserMinus, UserPlus } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency, severityTileSx } from "@/features/dashboard/utils/dashboardFormatters";

const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
const monthShort = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

function Panel({ icon: Icon, title, color = "primary.main", children, onOpen, loading = false }) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2, boxShadow: 1, overflow: "hidden" }}>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color, display: "inline-flex" }}><Icon size={16} /></Box>{title}
        </Typography>
        {onOpen && <ButtonBase onClick={onOpen} sx={{ fontSize: TYPE.small, fontWeight: 600, color: "primary.main", px: 0.5, borderRadius: 1 }}>Open</ButtonBase>}
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{loading ? <Empty>Loading…</Empty> : children}</Box>
    </Box>
  );
}

const Empty = ({ children }) => <Typography sx={{ fontSize: TYPE.small, color: "text.secondary", py: 1 }}>{children}</Typography>;

function Row({ left, sub, right }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: TYPE.label, fontWeight: 600, color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{left}</Typography>
        {sub && <Typography sx={{ fontSize: TYPE.small, color: "text.secondary" }}>{sub}</Typography>}
      </Box>
      <Typography sx={{ fontSize: TYPE.small, color: "text.secondary", flexShrink: 0, textAlign: "right" }}>{right}</Typography>
    </Stack>
  );
}

const SEVERITY = { high: "critical", medium: "warning", low: "info" };

export function HrActionRequired({ actionRequired = [], loading }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "warning.main", p: 2, overflow: "auto",
      bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08) }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "warning.main", display: "inline-flex" }}><AlertOctagon size={20} /></Box>
        <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Action required</Typography>
      </Stack>
      {loading ? <Empty>Loading…</Empty> : actionRequired.length === 0 ? <Empty>Nothing needs attention. Everything is up to date.</Empty> : (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
          {actionRequired.map((item) => (
            <ButtonBase key={item.type} onClick={() => navigate(item.link)}
              sx={{ display: "block", textAlign: "left", borderRadius: "8.75px", border: "1px solid", p: 1.5, fontSize: TYPE.label, fontWeight: 600, color: "text.primary", ...severityTileSx(SEVERITY[item.severity]) }}>
              {item.message}
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );
}

const TODAY_PARTS = [
  ["present", "Present", "success.main"], ["half_day", "Half day", "success.light"], ["on_duty", "On duty", "info.main"], ["leave", "On leave", "secondary.main"],
  ["absent", "Absent", "error.main"], ["not_marked", "Not in yet", "warning.main"], ["week_off", "Weekly off", "grey.500"], ["holiday", "Holiday", "grey.400"],
];

export function TodayAttendance({ today = {}, loading }) {
  const navigate = useNavigate();
  const total = today.total || 0;
  const parts = TODAY_PARTS.filter(([key]) => today[key] > 0);
  return (
    <Panel loading={loading} icon={PieChart} title="Today's attendance" color="success.main" onOpen={() => navigate("/hrms/employee-in-out")}>
      {total === 0 ? <Empty>No active employees.</Empty> : (
        <>
          <Box role="img" aria-label={parts.map(([key, label]) => `${label} ${today[key]}`).join(", ")} sx={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", bgcolor: "action.hover" }}>
            {parts.map(([key, label, color]) => <Box key={key} title={`${label}: ${today[key]}`} sx={{ width: `${(today[key] / total) * 100}%`, bgcolor: color }} />)}
          </Box>
          <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.75 }}>
            {TODAY_PARTS.map(([key, label, color]) => (
              <Stack key={key} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: TYPE.small, color: "text.secondary", flex: 1 }}>{label}</Typography>
                <Typography sx={{ fontSize: TYPE.label, fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>{today[key] || 0}</Typography>
              </Stack>
            ))}
          </Box>
          {today.late > 0 && <Typography sx={{ mt: 1, fontSize: TYPE.small, color: "warning.main", fontWeight: 600 }}>{today.late} came in late</Typography>}
        </>
      )}
    </Panel>
  );
}

export function AttendanceTrend({ trend = [], loading }) {
  const points = trend.filter((p) => p.present_pct !== null);
  return (
    <Panel loading={loading} icon={LineChart} title="Attendance trend (present %)" color="primary.main">
      {points.length === 0 ? <Empty>No attendance recorded in this period.</Empty> : (
        <Box sx={{ display: "grid", gap: 0.75, gridAutoFlow: "column", gridAutoColumns: "minmax(30px, 1fr)", overflowX: "auto", pt: 1, height: "calc(100% - 8px)" }}>
          {trend.map((p) => (
            <Stack key={p.date} spacing={0.5} sx={{ alignItems: "center", justifyContent: "flex-end", minHeight: 120 }}>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>{p.present_pct === null ? "" : Math.round(p.present_pct)}</Typography>
              <Box sx={{ flex: 1, width: "100%", maxWidth: 22, display: "flex", alignItems: "flex-end", borderRadius: 1, bgcolor: "action.hover" }}>
                <Box title={`${p.label}: ${p.present_pct ?? "-"}% present, ${p.absent} absent, ${p.leave} on leave`}
                  sx={{ width: "100%", height: `${p.present_pct ?? 0}%`, borderRadius: "3px 3px 0 0", bgcolor: (p.present_pct ?? 0) >= 90 ? "success.main" : (p.present_pct ?? 0) >= 75 ? "warning.main" : "error.main" }} />
              </Box>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary", whiteSpace: "nowrap" }}>{p.label}</Typography>
            </Stack>
          ))}
        </Box>
      )}
    </Panel>
  );
}

const APPROVAL_TYPES = {
  leave: ["Leave", "/hrms/leave-approvals"], attendance: ["Attendance corrections", "/hrms/request-approvals"], shift: ["Shift changes", "/hrms/request-approvals"],
  overtime: ["Overtime", "/hrms/ot-approvals"], claim: ["Expense claims", "/hrms/expense-claims"], loan: ["Advances and loans", "/hrms/loans"],
  resignation: ["Resignations", "/hrms/exits"], tax_proof: ["Tax proofs to verify", "/hrms/income-tax"],
};

export function ApprovalsByType({ approvals = {}, loading }) {
  const navigate = useNavigate();
  const rows = Object.entries(approvals).filter(([, n]) => n > 0);
  return (
    <Panel loading={loading} icon={ClipboardCheck} title="Waiting for approval" color="warning.main">
      {rows.length === 0 ? <Empty>Nothing waiting.</Empty> : rows.map(([type, count]) => (
        <ButtonBase key={type} onClick={() => navigate(APPROVAL_TYPES[type]?.[1] || "/hrms/dashboard")} sx={{ display: "block", width: "100%", textAlign: "left", borderRadius: 1 }}>
          <Row left={APPROVAL_TYPES[type]?.[0] || type} right={<Box component="b" sx={{ fontSize: TYPE.label, color: "warning.main" }}>{count}</Box>} />
        </ButtonBase>
      ))}
    </Panel>
  );
}

export function HeadcountByDepartment({ departments = [], loading }) {
  const max = Math.max(1, ...departments.map((d) => d.count));
  return (
    <Panel loading={loading} icon={Building2} title="Headcount by department">
      {departments.length === 0 ? <Empty>No active employees.</Empty> : departments.map((d) => (
        <Box key={d.department} sx={{ py: 0.5 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: TYPE.small }}>
            <Typography sx={{ fontSize: TYPE.small, color: "text.primary" }}>{d.department}</Typography>
            <Typography sx={{ fontSize: TYPE.small, fontWeight: 700, color: "text.primary" }}>{d.count}</Typography>
          </Stack>
          <Box sx={{ mt: 0.25, height: 6, borderRadius: 3, bgcolor: "action.hover" }}><Box sx={{ height: "100%", width: `${(d.count / max) * 100}%`, borderRadius: 3, bgcolor: "primary.main" }} /></Box>
        </Box>
      ))}
    </Panel>
  );
}

export function OnLeaveThisWeek({ leave = {}, loading }) {
  const navigate = useNavigate();
  const rows = leave.this_week || [];
  return (
    <Panel loading={loading} icon={CalendarClock} title="On leave this week" color="secondary.main" onOpen={() => navigate("/hrms/leave-applications")}>
      {rows.length === 0 ? <Empty>Nobody is on leave this week.</Empty> : rows.map((r, i) => (
        <Row key={i} left={r.name} sub={r.type} right={`${fmtDate(r.from)}${r.to !== r.from ? ` – ${fmtDate(r.to)}` : ""}`} />
      ))}
      {(leave.taken_by_type || []).length > 0 && (
        <Typography sx={{ mt: 1, fontSize: TYPE.small, color: "text.secondary" }}>
          Taken in this period: {leave.taken_by_type.map((t) => `${t.type} ${t.days}d`).join(" · ")}
        </Typography>
      )}
    </Panel>
  );
}

export function PayrollTrend({ payroll, privacyMode, loading }) {
  const navigate = useNavigate();
  const runs = payroll?.runs || [];
  const max = Math.max(1, ...runs.map((r) => r.employer_cost));
  return (
    <Panel loading={loading} icon={IndianRupee} title="Payroll, last 6 months" color="info.main" onOpen={() => navigate("/hrms/salary-management")}>
      {runs.length === 0 ? <Empty>No payroll yet.</Empty> : (
        <Box sx={{ display: "grid", gap: 1, gridAutoFlow: "column", gridAutoColumns: "minmax(44px, 1fr)", ...(privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {}) }}>
          {runs.map((r) => (
            <Stack key={r.month} spacing={0.5} sx={{ alignItems: "center" }}>
              <Stack direction="row" spacing={0.5} sx={{ height: 110, width: "100%", alignItems: "flex-end", justifyContent: "center", borderRadius: 1, bgcolor: "action.hover", p: 0.5 }}>
                <Box title={`Net pay ${formatCurrency(r.net)}`} sx={{ height: `${(r.net / max) * 100}%`, width: 10, borderRadius: "2px 2px 0 0", bgcolor: "info.main" }} />
                <Box title={`Cost to company ${formatCurrency(r.employer_cost)}`} sx={{ height: `${(r.employer_cost / max) * 100}%`, width: 10, borderRadius: "2px 2px 0 0", bgcolor: "primary.main" }} />
              </Stack>
              <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>{monthShort(r.month)}</Typography>
              {r.status === "DRAFT" && <Typography sx={{ fontSize: 10, color: "warning.main", fontWeight: 700 }}>Draft</Typography>}
            </Stack>
          ))}
        </Box>
      )}
      {runs.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mt: 1, fontSize: TYPE.small, color: "text.secondary" }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "info.main" }} /><span>Net pay</span></Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main" }} /><span>Cost to company</span></Stack>
        </Stack>
      )}
    </Panel>
  );
}

export function JoinersAndExits({ people = {}, loading }) {
  const joiners = people.joiners || [];
  const exits = people.exits || [];
  return (
    <Panel loading={loading} icon={UserPlus} title="Joiners and exits" color="success.main">
      {joiners.length === 0 && exits.length === 0 ? <Empty>No joiners or exits in this period.</Empty> : (
        <>
          {joiners.map((p) => <Row key={`j${p.id}`} left={<><Box component="span" sx={{ color: "success.main", mr: 0.75, display: "inline-flex", verticalAlign: "-2px" }}><UserPlus size={14} /></Box>{p.name}</>} sub={p.designation} right={`Joined ${fmtDate(p.date)}`} />)}
          {exits.map((p) => <Row key={`x${p.id}`} left={<><Box component="span" sx={{ color: "error.main", mr: 0.75, display: "inline-flex", verticalAlign: "-2px" }}><UserMinus size={14} /></Box>{p.name}</>} sub={p.designation} right={`${p.upcoming ? "Leaving" : "Left"} ${fmtDate(p.date)}`} />)}
        </>
      )}
    </Panel>
  );
}

export function Celebrations({ people = {}, loading }) {
  const rows = people.celebrations || [];
  return (
    <Panel loading={loading} icon={PartyPopper} title="Birthdays and work anniversaries" color="secondary.main">
      {rows.length === 0 ? <Empty>None in the next 30 days.</Empty> : rows.map((e, i) => (
        <Row key={i} left={e.name} sub={e.kind === "birthday" ? "Birthday" : `${e.years} year${e.years === 1 ? "" : "s"} with us`} right={fmtDate(e.date)} />
      ))}
    </Panel>
  );
}

export function UpcomingHolidays({ people = {}, loading }) {
  const navigate = useNavigate();
  const rows = people.holidays || [];
  return (
    <Panel loading={loading} icon={CalendarHeart} title="Upcoming holidays" color="error.main" onOpen={() => navigate("/hrms/holidays")}>
      {rows.length === 0 ? <Empty>No holidays added yet.</Empty> : rows.map((h) => (
        <Row key={h.date} left={h.name} right={new Date(`${h.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} />
      ))}
    </Panel>
  );
}
