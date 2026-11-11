import { useMemo, useState } from "react";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import { Copy, KeyRound, Smartphone } from "lucide-react";
import { toast } from "react-toastify";
import HrPage from "../components/HrPage";
import { FilterChips, HrTable } from "../components/HrWidgets";
import { post, useHrManager, useLoader } from "../utils/hrApi";
import { TYPE } from "@/shared/theme/typeScale";
import PinDialog from "./PinDialog";
import { staffAppUrl } from "./staffAppPin";

const when = (value) => (value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");

/** HRMS > Staff App: which employees can use the employee app (/hr), their first PIN, and signing them out. */
export default function StaffAppSetup() {
  const hr = useHrManager();
  const [filter, setFilter] = useState("");
  const [rows, load] = useLoader("/staff-app-setup");
  const [dialog, setDialog] = useState(null);
  const licensed = rows === null || rows.length === 0 || rows.some((r) => r.store_licensed);
  const shown = useMemo(() => (rows || []).filter((r) => filter === "" || (filter === "on" ? r.app_access : !r.app_access)), [rows, filter]);
  const columns = useMemo(() => [
    { key: "name", label: "Employee", valueGetter: (r) => `${r.name}${r.code ? ` (${r.code})` : ""}` },
    { key: "designation", label: "Designation", valueGetter: (r) => r.designation || "" },
    { key: "phone", label: "Mobile", valueGetter: (r) => r.phone || "", render: (v, r) => (r.phone_ok ? v : <Typography component="span" sx={{ fontSize: TYPE.label, color: "error.main" }}>{v || "Missing"}</Typography>) },
    { key: "app_access", label: "Staff app", valueGetter: (r) => (r.app_access ? "On" : "Off"), render: (v, r) => (
      <Chip size="small" label={r.app_access ? (r.must_change_pin ? "On · first PIN" : "On") : "Off"} color={r.app_access ? "success" : "default"} variant={r.app_access ? "filled" : "outlined"} />
    ) },
    { key: "last_login_at", label: "Last signed in", valueGetter: (r) => when(r.last_login_at) },
    { key: "erp_login", label: "ERP login", valueGetter: (r) => r.erp_login || "" },
  ], []);

  return (
    <HrPage title="Staff App" actions={(
      <Button size="small" variant="outlined" startIcon={<Copy size={14} />} onClick={() => navigator.clipboard?.writeText(staffAppUrl()).then(() => toast.success("Link copied"), () => {})}>
        Copy app link
      </Button>
    )}>
      <Stack spacing={1} sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: TYPE.body, color: "text.secondary" }}>
          <Smartphone size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Employees open <b>{staffAppUrl()}</b> on their phone, sign in with their mobile number and PIN, and can add it to the home screen.
          They see only their own attendance, leave, salary, expenses and requests; managers also approve their team.
        </Typography>
        {!licensed && <Alert severity="warning" sx={{ fontSize: TYPE.label }}>This store's subscription does not include mobile, so staff cannot sign in yet. Ask your company administrator to add it.</Alert>}
      </Stack>
      <FilterChips value={filter} onChange={setFilter} options={[["", "All"], ["on", "On"], ["off", "Off"]]} />
      <HrTable rows={rows === null ? null : shown} columns={columns} empty="No active employees." prefKey="hr.staff-app" file="staff-app" scope={filter}
        actions={hr ? (row) => (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<KeyRound size={13} />} disabled={!row.phone_ok} title={row.phone_ok ? "" : "Add a 10-digit mobile number (Contact No) first"}
              onClick={() => setDialog(row)}>{row.app_access ? "Reset PIN" : "Switch on"}</Button>
            {row.app_access && <Button size="small" color="inherit" onClick={() => post(`/staff-app-setup/${row.id}/sign-out`, {}, load)}>Sign out</Button>}
            {row.app_access && <Button size="small" color="error" onClick={() => post(`/staff-app-setup/${row.id}/disable`, {}, load)}>Switch off</Button>}
          </Stack>
        ) : undefined} />
      {dialog && <PinDialog employee={dialog} onClose={() => setDialog(null)} onSaved={load} />}
    </HrPage>
  );
}
