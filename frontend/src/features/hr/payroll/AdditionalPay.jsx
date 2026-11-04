import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, MenuItem, Stack, TextField } from "@mui/material";
import { Plus } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";
import { rupees } from "./payslipPrint";

const WORKED_OUT = ["PF", "ESI", "PT", "OT", "INCENTIVE", "BATTA", "REIMBURSE", "ENCASH", "LOAN", "ADVANCE", "LEAVE_EXIT", "GRATUITY", "NOTICE", "TDS"];
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Salary Management > Additional pay: one-off earnings (bonus) or deductions (fine) for a month's payroll. */
export default function AdditionalPay({ canManage }) {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [components, setComponents] = useState([]);
  const [form, setForm] = useState({ employee_id: "", component_id: "", amount: "", note: "" });

  const load = useCallback(async () => {
    try {
      setRows((await api.get("/payroll/additional", { params: { month } })).data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load additional pay"));
    } finally {
      setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    let active = true;
    api.get("/employees", { params: { limit: 1000 } }).then((res) => { if (active) setEmployees(res.data?.data || []); }).catch(() => {});
    api.get("/payroll/structures").then((res) => {
      if (active) setComponents((res.data?.data?.components || []).filter((c) => c.is_active && !WORKED_OUT.includes(c.statutory)));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const add = async () => {
    try {
      await api.post("/payroll/additional", { ...form, employee_id: Number(form.employee_id), component_id: Number(form.component_id), amount: Number(form.amount), month });
      setForm({ ...form, amount: "", note: "" });
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not add"));
    }
  };
  const remove = async (row) => {
    try {
      await api.delete(`/payroll/additional/${row.id}`);
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not remove"));
    }
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: month });
  const columns = useMemo(() => [
    { key: "employee", label: "Employee", valueGetter: (row) => row.employee?.name || "" },
    { key: "component", label: "Pay head", valueGetter: (row) => row.component?.name || "" },
    { key: "type", label: "Type", valueGetter: (row) => (row.component?.type === "DEDUCTION" ? "Deduction" : "Earning") },
    { key: "amount", label: "Amount", valueGetter: (row) => Number(row.amount), render: (value) => rupees(value) },
    { key: "note", label: "Note", valueGetter: (row) => row.note || "" },
  ], []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <TextField type="month" size="small" label="Month" value={month} onChange={(e) => { if (e.target.value) { setLoading(true); setMonth(e.target.value); } }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        {canManage && (
          <>
            <TextField select size="small" label="Employee" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} sx={{ minWidth: 200 }}>
              {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Pay head" value={form.component_id} onChange={(e) => setForm({ ...form, component_id: e.target.value })} sx={{ minWidth: 170 }}>
              {components.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name} ({c.type === "DEDUCTION" ? "deduction" : "earning"})</MenuItem>)}
            </TextField>
            <TextField type="number" size="small" label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} sx={{ width: 120 }} />
            <TextField size="small" label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} sx={{ minWidth: 160 }} />
            <Button size="small" variant="contained" startIcon={<Plus size={14} />} disabled={!form.employee_id || !form.component_id || !(Number(form.amount) > 0)} onClick={add}>Add</Button>
          </>
        )}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText="No one-off pay this month. Recalculate the payroll after adding."
          searchPlaceholder="Search..."
          tablePreferenceKey="hr.payroll.additional"
          exportFileName={`additional_pay_${month}`}
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel={canManage ? "Actions" : undefined}
          renderActions={canManage ? (row) => <Button size="small" color="error" onClick={() => remove(row)}>Remove</Button> : undefined}
        />
      </SearchGridPanel>
    </Box>
  );
}
