import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { Plus } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import HrPage from "../components/HrPage";
import { HR_MANAGER_ROLES, errorMessage } from "../utils/hrStatus";

const TYPES = { PROMOTION: "Promotion", TRANSFER: "Transfer (department / section)", SALARY_REVISION: "Salary revision", STORE_TRANSFER: "Move to another store" };
const STATUS = { SCHEDULED: ["Scheduled", "warning"], APPLIED: ["Applied", "success"], CANCELLED: ["Cancelled", "default"] };
const FIELD_LABELS = { designation_id: "Designation", department_id: "Department", section_id: "Section", floor_id: "Floor", working_location_id: "Location",
  gross_pay: "Gross Pay", salary_structure_id: "Salary Structure", store_id: "Store" };
const listOf = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);
const options = (rows) => rows.map((x) => ({ value: String(x.id), label: x.name || x.value || x.config_value || `#${x.id}` }));

/** Record a promotion, transfer, salary revision or move to another store, effective from a date. */
function MovementDialog({ employees, lists, stores, onClose }) {
  const [form, setForm] = useState({ employee_id: "", type: "PROMOTION", effective_date: new Date().toLocaleDateString("en-CA"), values: {}, note: "" });
  const [saving, setSaving] = useState(false);
  const setValue = (key) => (e) => setForm({ ...form, values: { ...form.values, [key]: e.target.value } });
  const select = (key, label, list) => (
    <TextField select size="small" label={label} value={form.values[key] || ""} onChange={setValue(key)}>
      <MenuItem value="">No change</MenuItem>
      {list.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );
  const pay = (
    <>
      <TextField type="number" size="small" label="New Gross Pay ₹" value={form.values.gross_pay || ""} onChange={setValue("gross_pay")} placeholder="No change" />
      {select("salary_structure_id", "Salary Structure", lists.structures)}
    </>
  );
  const save = async () => {
    setSaving(true);
    try {
      const values = Object.fromEntries(Object.entries(form.values).filter(([, v]) => v !== "" && v != null));
      const res = await api.post("/employee-movements", { ...form, employee_id: Number(form.employee_id), values, note: form.note || undefined });
      toast.success(res.data?.message || "Saved");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the change"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>New promotion or transfer</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField select size="small" label="Employee" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.name}{e.code ? ` (${e.code})` : ""}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Change" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, values: {} })}>
            {Object.entries(TYPES).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <TextField type="date" size="small" label="Effective from" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }} helperText="Today or earlier applies now; a later date is applied that night." />
          {form.type === "PROMOTION" && <>{select("designation_id", "New designation", lists.designations)}{pay}</>}
          {form.type === "TRANSFER" && <>{select("department_id", "Department", lists.departments)}{select("section_id", "Section", lists.sections)}
            {select("floor_id", "Floor", lists.floors)}{select("working_location_id", "Location", lists.locations)}</>}
          {form.type === "SALARY_REVISION" && pay}
          {form.type === "STORE_TRANSFER" && (
            <>
              {select("store_id", "Move to store", stores.map((s) => ({ value: String(s.id), label: s.name })))}
              <Alert severity="info" sx={{ py: 0 }}>The employee is copied into that store with their login and leave balances; this store keeps the old record marked Transferred. Set their department, shift and policy there.</Alert>
            </>
          )}
          <TextField size="small" label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving || !form.employee_id} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** HRMS > Promotions & Transfers: dated changes to an employee's designation, department, pay or store. */
export default function Movements() {
  const authUser = useSelector((state) => state.auth.user);
  const canManage = HR_MANAGER_ROLES.includes(authUser?.role);
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [lists, setLists] = useState({ designations: [], departments: [], sections: [], floors: [], locations: [], structures: [] });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/employee-movements");
      setData({ rows: res.data?.data || [], stores: (res.data?.stores || []).filter((s) => s.id !== authUser?.store_id) });
    } catch (err) {
      toast.error(errorMessage(err, "Could not load promotions and transfers"));
    }
  }, [authUser?.store_id]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!canManage) return undefined;
    let active = true;
    const get = (url) => api.get(url, { params: { limit: 500 } }).then((r) => listOf(r.data?.data ?? r.data)).catch(() => []);
    Promise.all([get("/employees"), get("/hr-designations"), get("/hr-departments"), get("/hr-sections"), get("/hr-floors"), get("/configurations/location"),
      api.get("/payroll/structures").then((r) => r.data?.data?.structures || []).catch(() => [])])
      .then(([emps, designations, departments, sections, floors, locations, structures]) => {
        if (!active) return;
        setEmployees(emps.filter((e) => e.is_active !== false));
        setLists({ designations: options(designations), departments: options(departments), sections: options(sections), floors: options(floors), locations: options(locations), structures: options(structures) });
      });
    return () => { active = false; };
  }, [canManage, authUser?.store_id]);

  const names = useMemo(() => {
    const map = {};
    Object.entries({ designation_id: lists.designations, department_id: lists.departments, section_id: lists.sections, floor_id: lists.floors,
      working_location_id: lists.locations, salary_structure_id: lists.structures }).forEach(([key, list]) => { map[key] = Object.fromEntries(list.map((o) => [o.value, o.label])); });
    map.store_id = Object.fromEntries((data?.stores || []).map((s) => [String(s.id), s.name]));
    return map;
  }, [lists, data?.stores]);
  const show = (key, value) => (value == null || value === "" ? "-" : names[key]?.[String(value)] || String(value));
  const cancel = async (row) => {
    try {
      await api.post(`/employee-movements/${row.id}/cancel`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not cancel"));
    }
  };

  const grid = useSearchGrid({ sourceRows: data?.rows || [], paginationMode: "client", scopeKey: "movements" });
  const columns = useMemo(() => [
    { key: "effective_date", label: "Effective", valueGetter: (r) => r.effective_date },
    { key: "employee", label: "Employee", valueGetter: (r) => r.employee?.name || "" },
    { key: "type", label: "Change", valueGetter: (r) => TYPES[r.type] || r.type },
    { key: "changes", label: "From → to", valueGetter: (r) => Object.entries(r.changes || {}).map(([k, c]) => `${FIELD_LABELS[k] || k}: ${show(k, c.from)} → ${show(k, c.to)}`).join("; ") },
    { key: "status", label: "Status", valueGetter: (r) => STATUS[r.status]?.[0], render: (v, r) => <Chip size="small" color={STATUS[r.status]?.[1]} label={v} /> },
    { key: "note", label: "Note", valueGetter: (r) => r.note || "" },
  ], [names]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HrPage title="Promotions & Transfers" actions={canManage ? <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={() => setAdding(true)}>New change</Button> : null}>
      <SearchGridPanel>
        <FilterableDataTable rows={grid.rows} columns={columns} loading={!data} emptyText="No promotions or transfers yet." searchPlaceholder="Search..."
          tablePreferenceKey="hr.movements" exportFileName="promotions_transfers" paginationMode="client" page={grid.page} limit={grid.limit}
          onPageChange={grid.setPage} onLimitChange={(v) => { grid.setLimit(v); grid.setPage(1); }}
          actionsLabel={canManage ? "Actions" : undefined}
          renderActions={canManage ? (row) => (row.status === "SCHEDULED" ? <Button size="small" color="inherit" onClick={() => cancel(row)}>Cancel</Button> : null) : undefined} />
      </SearchGridPanel>
      {adding && <MovementDialog employees={employees} lists={lists} stores={data?.stores || []} onClose={(saved) => { setAdding(false); if (saved) void load(); }} />}
    </HrPage>
  );
}
