import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { Copy, Plus } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";

const weekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" });

/** Employee In/Out > Holidays: the store's holiday list for a year (weekly offs are set on each employee). */
export default function Holidays({ canManage }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id?, date, name }

  const load = useCallback(async () => {
    try {
      const res = await api.get("/holidays", { params: { year } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load holidays"));
    } finally {
      setLoading(false);
    }
  }, [year]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async () => {
    try {
      const body = { date: editing.date, name: editing.name };
      const res = editing.id ? await api.put(`/holidays/${editing.id}`, body) : await api.post("/holidays", body);
      toast.success(res.data?.message || "Saved");
      setEditing(null);
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the holiday"));
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.name} (${row.date})?`)) return;
    try {
      await api.delete(`/holidays/${row.id}`);
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not remove the holiday"));
    }
  };
  const copyLastYear = async () => {
    try {
      const res = await api.post("/holidays/copy-year", { from: year - 1, to: year });
      toast.success(res.data?.message || "Copied");
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not copy holidays"));
    }
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: String(year) });
  const columns = useMemo(() => [
    { key: "date", label: "Date", valueGetter: (row) => row.date },
    { key: "day", label: "Day", valueGetter: (row) => weekday(row.date) },
    { key: "name", label: "Holiday", valueGetter: (row) => row.name },
  ], []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TextField type="number" size="small" label="Year" value={year} onChange={(e) => { setLoading(true); setYear(Number(e.target.value) || year); }} sx={{ width: 110 }} />
        <Box sx={{ flex: 1 }} />
        {canManage && <Button size="small" startIcon={<Copy size={14} />} onClick={copyLastYear}>Copy {year - 1}</Button>}
        {canManage && <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={() => setEditing({ date: `${year}-01-01`, name: "" })}>Add holiday</Button>}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText={`No holidays in ${year}.`}
          searchPlaceholder="Search holidays..."
          tablePreferenceKey="hr.holidays"
          exportFileName={`holidays_${year}`}
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel={canManage ? "Actions" : undefined}
          renderActions={canManage ? (row) => (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" onClick={() => setEditing({ id: row.id, date: row.date, name: row.name })}>Edit</Button>
              <Button size="small" color="error" onClick={() => remove(row)}>Remove</Button>
            </Stack>
          ) : undefined}
        />
      </SearchGridPanel>
      {editing && (
        <Dialog open onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>{editing.id ? "Edit holiday" : "Add holiday"}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <TextField type="date" size="small" label="Date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" label="Holiday name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" disabled={!editing.date || !editing.name.trim()} onClick={save}>Save</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
