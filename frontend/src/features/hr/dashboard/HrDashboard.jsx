import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Box, ButtonBase, Chip, Paper, Stack, Typography } from "@mui/material";
import { CalendarCheck, CalendarDays, Clock, IndianRupee, UserCheck, Users, UserX } from "lucide-react";
import api from "@/shared/api/apiClient";
import HrPage from "../components/HrPage";
import { HR_MANAGER_ROLES, clockTime, duration } from "../utils/hrStatus";
import { monthLabel, rupees } from "../payroll/payslipPrint";

const APPROVERS = [...HR_MANAGER_ROLES, "supervisor", "accountant"];
const PAYROLL_VIEWERS = [...HR_MANAGER_ROLES, "accountant"];
const RUN_LABEL = { DRAFT: "Draft", SUBMITTED: "Submitted (not paid)", PAID: "Paid" };

function Stat({ icon: Icon, label, value, color, onClick }) {
  return (
    <ButtonBase onClick={onClick} sx={{ borderRadius: 2, textAlign: "left", display: "block" }}>
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, minWidth: 150, display: "flex", gap: 1.5, alignItems: "center" }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: `${color}.main`, color: "#fff" }}><Icon size={18} /></Box>
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
        </Box>
      </Paper>
    </ButtonBase>
  );
}

function ListCard({ title, empty, rows, render, onOpen }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minHeight: 160 }}>
      <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>{title}</Typography>
        {onOpen && <ButtonBase onClick={onOpen} sx={{ fontSize: 12, color: "primary.main", px: 0.5 }}>Open</ButtonBase>}
      </Stack>
      {rows.length === 0 ? <Typography variant="body2" color="text.secondary">{empty}</Typography>
        : rows.slice(0, 8).map((row, i) => <Box key={i} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.5, fontSize: 13, borderBottom: "1px solid", borderColor: "divider" }}>{render(row)}</Box>)}
      {rows.length > 8 && <Typography variant="caption" color="text.secondary">and {rows.length - 8} more</Typography>}
    </Paper>
  );
}

/** HRMS > Dashboard: today's attendance at a glance, leave waiting for approval, and the latest payroll. */
export default function HrDashboard() {
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.user?.role);
  const [today, setToday] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [pending, setPending] = useState([]);
  const [run, setRun] = useState(null);

  useEffect(() => {
    let active = true;
    const keep = (setter) => (value) => { if (active) setter(value); };
    api.get("/attendance/today").then((res) => keep(setToday)(res.data?.data || null)).catch(() => {});
    api.get("/employees/dashboard-summary").then((res) => keep(setHeadcount)(res.data?.data || null)).catch(() => {});
    if (APPROVERS.includes(role)) {
      api.get("/leave-applications", { params: { status: "PENDING", inbox: 1 } }).then((res) => keep(setPending)(res.data?.data || [])).catch(() => {});
    }
    if (PAYROLL_VIEWERS.includes(role)) {
      api.get("/payroll-runs").then((res) => keep(setRun)((res.data?.data || [])[0] || null)).catch(() => {});
    }
    return () => { active = false; };
  }, [role]);

  const s = today?.summary || {};
  const rows = today?.rows || [];
  const go = (path) => () => navigate(path);
  return (
    <HrPage title="Dashboard">
      <Box sx={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">Today · {today?.date || "…"}</Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
          <Stat icon={Users} label="Active employees" value={headcount?.activeEmployees ?? "-"} color="primary" onClick={go("/hrms/employee")} />
          <Stat icon={UserCheck} label="Present" value={s.present ?? "-"} color="success" onClick={go("/hrms/employee-in-out")} />
          <Stat icon={Clock} label="Late" value={s.late ?? "-"} color="warning" onClick={go("/hrms/employee-in-out")} />
          <Stat icon={UserX} label="Absent / not in" value={(s.absent ?? 0) + (s.not_marked ?? 0)} color="error" onClick={go("/hrms/employee-in-out")} />
          <Stat icon={CalendarDays} label="On leave" value={s.leave ?? "-"} color="secondary" onClick={go("/hrms/leave-applications")} />
          {APPROVERS.includes(role) && <Stat icon={CalendarCheck} label="Leave to approve" value={pending.length} color="info" onClick={go("/hrms/leave-approvals")} />}
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" }, gap: 1.5 }}>
          <ListCard title="Late today" empty="Nobody is late." rows={rows.filter((r) => r.late_minutes > 0)} onOpen={go("/hrms/employee-in-out")}
            render={(r) => <><span>{r.name}</span><span>{clockTime(r.check_in)} · <b>{duration(r.late_minutes)}</b> late</span></>} />
          <ListCard title="On leave today" empty="Nobody is on leave." rows={rows.filter((r) => r.status === "LEAVE")}
            render={(r) => <><span>{r.name}</span><span>{r.department || ""}</span></>} />
          {APPROVERS.includes(role) && (
            <ListCard title="Leave waiting for approval" empty="Nothing waiting." rows={pending} onOpen={go("/hrms/leave-approvals")}
              render={(r) => <><span>{r.employee_name}</span><span>{r.leave_type_code} · {r.from_date}{r.to_date !== r.from_date ? ` → ${r.to_date}` : ""}</span></>} />
          )}
          {PAYROLL_VIEWERS.includes(role) && (
            <Paper variant="outlined" sx={{ p: 1.5, minHeight: 160 }}>
              <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
                <IndianRupee size={16} />
                <Typography variant="subtitle2" sx={{ flex: 1, ml: 0.5 }}>Latest payroll</Typography>
                <ButtonBase onClick={go("/hrms/salary-management")} sx={{ fontSize: 12, color: "primary.main", px: 0.5 }}>Open</ButtonBase>
              </Stack>
              {!run ? <Typography variant="body2" color="text.secondary">No payroll yet.</Typography> : (
                <Stack spacing={0.5}>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{monthLabel(run.month)}</Typography>
                    <Chip size="small" color={run.status === "PAID" ? "success" : run.status === "SUBMITTED" ? "primary" : "default"} label={RUN_LABEL[run.status]} />
                  </Stack>
                  <Typography variant="body2">{run.employees} employees · Net pay ₹{rupees(run.net)}</Typography>
                  <Typography variant="body2" color="text.secondary">Cost to company ₹{rupees(run.employer_cost)}</Typography>
                </Stack>
              )}
            </Paper>
          )}
        </Box>
      </Box>
    </HrPage>
  );
}
