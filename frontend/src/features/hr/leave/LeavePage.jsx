import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { HR_MANAGER_ROLES, LEAVE_STATUS, days, errorMessage } from "../utils/hrStatus";
import ApplyLeaveDialog from "./ApplyLeaveDialog";
import LeaveApplications from "./LeaveApplications";
import LeaveBalances from "./LeaveBalances";
import LeaveSetup from "./LeaveSetup";

/** Roles that approve leave (their team; HR roles everyone). */
const APPROVER_ROLES = [...HR_MANAGER_ROLES, "supervisor", "accountant"];

/** Leave > My leave: balance cards, apply, and the year's applications (withdraw while pending). */
function MyLeave({ year, data, onReload, employees, types }) {
  const [applying, setApplying] = useState(false);
  const grid = useSearchGrid({ sourceRows: data?.applications || [], paginationMode: "client", scopeKey: String(year) });
  const withdraw = async (row) => {
    try {
      await api.post(`/leave-applications/${row.id}/cancel`);
      toast.success("Leave withdrawn");
      onReload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not withdraw the leave"));
    }
  };
  const columns = useMemo(() => [
    { key: "leave_type", label: "Leave", valueGetter: (row) => row.leave_type_name || "" },
    { key: "from_date", label: "From", valueGetter: (row) => row.from_date },
    { key: "to_date", label: "To", valueGetter: (row) => row.to_date },
    { key: "days", label: "Days", valueGetter: (row) => row.days, render: (value, row) => `${days(value)}${row.half_day ? " (half)" : ""}` },
    { key: "reason", label: "Reason", valueGetter: (row) => row.reason || "" },
    { key: "status", label: "Status", valueGetter: (row) => LEAVE_STATUS[row.status]?.label, render: (value, row) => <Chip size="small" color={LEAVE_STATUS[row.status]?.color} label={value} /> },
    { key: "decision_note", label: "Note", valueGetter: (row) => row.decision_note || "" },
  ], []);

  if (data && !data.employee && !employees) {
    return <Alert severity="info">Your login is not linked to an employee yet. Ask HR to tick "Allow System" with your username on your employee record.</Alert>;
  }
  const balances = data?.balances || [];
  // HR without an employee record of their own still applies on someone's behalf: offer the store's leave types.
  const choices = balances.length ? balances : (types || []).filter((t) => t.is_active).map((t) => ({ leave_type_id: t.id, code: t.code, name: t.name, is_paid: t.is_paid, allow_half_day: t.allow_half_day, available: null }));
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5, alignItems: "stretch" }}>
        {balances.filter((b) => b.is_paid).map((b) => (
          <Paper key={b.leave_type_id} variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 150 }}>
            <Typography variant="caption" color="text.secondary">{b.name}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{days(b.available)}</Typography>
            <Typography variant="caption" color="text.secondary">of {days(b.allocated)} · used {days(b.used)}{b.pending ? ` · ${days(b.pending)} pending` : ""}</Typography>
          </Paper>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="small" startIcon={<Plus size={14} />} sx={{ alignSelf: "center" }} disabled={!choices.length} onClick={() => setApplying(true)}>Apply for leave</Button>
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={!data}
          emptyText={`No leave applied in ${year}.`}
          searchPlaceholder="Search my leave..."
          tablePreferenceKey="hr.leave.mine"
          exportFileName={`my_leave_${year}`}
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel="Actions"
          renderActions={(row) => (row.status === "PENDING" ? <Button size="small" color="inherit" onClick={() => withdraw(row)}>Withdraw</Button> : null)}
        />
      </SearchGridPanel>
      {applying && <ApplyLeaveDialog balances={choices} employees={employees} onClose={(saved) => { setApplying(false); if (saved) onReload(); }} />}
    </Box>
  );
}

/** HRMS > Leave: my leave, approvals for managers, and (HR) all applications, balances and setup. */
export default function LeavePage() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const canManage = HR_MANAGER_ROLES.includes(authUser?.role);
  const canApprove = APPROVER_ROLES.includes(authUser?.role);
  const [tab, setTab] = useState("mine");
  const [year, setYear] = useState(new Date().getFullYear());
  const [mine, setMine] = useState(null);
  const [employees, setEmployees] = useState(null);
  const [types, setTypes] = useState([]);
  const [version, setVersion] = useState(0);

  const loadMine = useCallback(async () => {
    try {
      const res = await api.get("/leave/mine", { params: { year } });
      setMine(res.data?.data || null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load your leave"));
    }
  }, [year]);
  useEffect(() => {
    const timer = setTimeout(loadMine, 0);
    return () => clearTimeout(timer);
  }, [loadMine, version]);
  useEffect(() => {
    if (!canManage) return undefined;
    let active = true;
    // HR applies on someone's behalf from the same dialog.
    api.get("/leave-types").then((res) => { if (active) setTypes(res.data?.data || []); }).catch(() => {});
    api.get("/employees", { params: { limit: 1000 } }).then((res) => {
      if (active) setEmployees((res.data?.data || []).filter((e) => e.is_active !== false).map((e) => ({ id: e.id, name: e.name, code: e.code })));
    }).catch(() => {});
    return () => { active = false; };
  }, [canManage, authUser?.store_id]);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/hrms")} title={<Breadcrumbs items={[{ label: "HRMS", onClick: () => navigate("/hrms") }, { label: "Leave" }]} />}
        actions={<TextField type="number" size="small" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} sx={{ width: 100 }} />} />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, py: 0.5, textTransform: "none" } }}>
        <Tab value="mine" label="My leave" />
        {canApprove && <Tab value="inbox" label="Approvals" />}
        {canApprove && <Tab value="all" label="All applications" />}
        {canApprove && <Tab value="balances" label="Balances" />}
        {canManage && <Tab value="setup" label="Setup" />}
      </Tabs>
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {tab === "mine" && <MyLeave year={year} data={mine} employees={canManage ? employees : null} types={types} onReload={() => setVersion((v) => v + 1)} />}
        {tab === "inbox" && <LeaveApplications inbox year={year} onChanged={() => setVersion((v) => v + 1)} />}
        {tab === "all" && <LeaveApplications year={year} onChanged={() => setVersion((v) => v + 1)} />}
        {tab === "balances" && <LeaveBalances year={year} canManage={canManage} />}
        {tab === "setup" && <LeaveSetup />}
      </Box>
    </Box>
  );
}
