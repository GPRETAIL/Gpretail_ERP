import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField } from "@mui/material";
import { Plus } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";

const today = () => new Date().toLocaleDateString("en-CA");
const blank = () => ({ category: "ANNOUNCEMENT", title: "", body: "", is_pinned: false, publish_on: today(), expires_on: "", department_id: "" });

/**
 * HR > Announcements: write notices and policies for the staff app. A notice goes to everyone in the store or one
 * department; the list shows how many have read it and, for a policy, agreed to it.
 */
export default function Announcements({ canManage }) {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/company-announcements");
      setRows(res.data?.data || []);
      setStaff(res.data?.staff || 0);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load announcements"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    let active = true;
    api.get("/hr-departments", { params: { limit: 200 } }).then((res) => {
      const list = res.data?.data;
      if (active) setDepartments(Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : []);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const save = async () => {
    setError("");
    const body = { ...editing, department_id: editing.department_id ? Number(editing.department_id) : null, expires_on: editing.expires_on || null };
    try {
      const res = editing.id ? await api.put(`/company-announcements/${editing.id}`, body) : await api.post("/company-announcements", body);
      toast.success(res.data?.message || "Saved");
      setEditing(null);
      setLoading(true);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not save. Check the form and try again."));
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Remove "${row.title}"? Staff will no longer see it.`)) return;
    try {
      await api.delete(`/company-announcements/${row.id}`);
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not remove it"));
    }
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: "announcements" });
  const columns = useMemo(() => [
    { key: "publish_on", label: "From", valueGetter: (row) => row.publish_on },
    { key: "title", label: "Title", valueGetter: (row) => row.title, render: (value, row) => <>{row.is_pinned ? "📌 " : ""}{value}</> },
    { key: "category", label: "Type", valueGetter: (row) => (row.category === "POLICY" ? "Policy" : "Announcement"), render: (value, row) => <Chip size="small" color={row.category === "POLICY" ? "primary" : "default"} label={value} /> },
    { key: "expires_on", label: "Until", valueGetter: (row) => row.expires_on || "No end date" },
    { key: "department_id", label: "For", valueGetter: (row) => (row.department_id ? departments.find((d) => d.id === row.department_id)?.name || "One department" : "Everyone") },
    { key: "read_count", label: "Read", valueGetter: (row) => `${row.read_count} of ${staff}` },
    { key: "agreed_count", label: "Agreed", valueGetter: (row) => (row.category === "POLICY" ? `${row.agreed_count} of ${staff}` : "-") },
  ], [departments, staff]);
  const set = (key) => (event) => setEditing((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ flex: 1, fontSize: 13, color: "text.secondary" }}>What you publish here appears in the HRMS app under Company, News.</Box>
        {canManage && <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={() => { setError(""); setEditing(blank()); }}>New announcement</Button>}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText="Nothing published yet."
          searchPlaceholder="Search announcements..."
          tablePreferenceKey="hr.announcements"
          exportFileName="announcements"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel={canManage ? "Actions" : undefined}
          renderActions={canManage ? (row) => (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" onClick={() => { setError(""); setEditing({ ...row, expires_on: row.expires_on || "", department_id: row.department_id ? String(row.department_id) : "" }); }}>Edit</Button>
              <Button size="small" color="error" onClick={() => remove(row)}>Remove</Button>
            </Stack>
          ) : undefined}
        />
      </SearchGridPanel>
      {editing && (
        <Dialog open onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>{editing.id ? "Edit" : "New"} {editing.category === "POLICY" ? "policy" : "announcement"}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
              <TextField select size="small" label="Type" value={editing.category} onChange={set("category")}
                helperText={editing.category === "POLICY" ? "Staff are asked to tap I have read and agree, and you see who did." : "A notice staff can read."}>
                <MenuItem value="ANNOUNCEMENT">Announcement</MenuItem>
                <MenuItem value="POLICY">Policy</MenuItem>
              </TextField>
              <TextField size="small" label="Title" value={editing.title} onChange={set("title")} autoFocus slotProps={{ htmlInput: { maxLength: 150 } }} />
              <TextField size="small" label="Notice" value={editing.body} onChange={set("body")} multiline minRows={5} slotProps={{ htmlInput: { maxLength: 10000 } }} />
              <Stack direction="row" spacing={1.5}>
                <TextField type="date" size="small" label="Show from" value={editing.publish_on} onChange={set("publish_on")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                <TextField type="date" size="small" label="Show until (optional)" value={editing.expires_on} onChange={set("expires_on")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              </Stack>
              <TextField select size="small" label="Who sees it" value={editing.department_id} onChange={set("department_id")} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                <MenuItem value="">Everyone in the store</MenuItem>
                {departments.map((department) => <MenuItem key={department.id} value={String(department.id)}>{department.name}</MenuItem>)}
              </TextField>
              <FormControlLabel control={<Switch checked={Boolean(editing.is_pinned)} onChange={(e) => setEditing((c) => ({ ...c, is_pinned: e.target.checked }))} />} label="Pin it to the top" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" disabled={!editing.title.trim() || !editing.body.trim()} onClick={save}>{editing.id ? "Save" : "Publish"}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
