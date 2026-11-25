import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { Upload } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";

const sizeText = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const listOf = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);

/** HR > Documents: files HR keeps for an employee (offer letter, ID card, Form 16). The employee downloads theirs in the HRMS app. */
export default function EmployeeDocuments({ canManage }) {
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/employee-documents");
      setRows(res.data?.data || []);
      setTypes(res.data?.types || {});
    } catch (err) {
      toast.error(errorMessage(err, "Could not load the documents"));
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
    api.get("/employees", { params: { limit: 1000 } }).then((res) => { if (active) setEmployees(listOf(res.data?.data ?? res.data)); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const upload = async () => {
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      ["employee_id", "type", "title"].forEach((key) => body.append(key, form[key]));
      body.append("file", form.file);
      await api.post("/employee-documents", body, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document added");
      setForm(null);
      setLoading(true);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not add the document."));
    } finally {
      setSaving(false);
    }
  };
  const download = async (row) => {
    try {
      const res = await api.get(`/employee-documents/${row.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = row.title;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      toast.error(errorMessage(err, "Could not download the file"));
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Remove "${row.title}" for ${row.employee}? The file is deleted.`)) return;
    try {
      await api.delete(`/employee-documents/${row.id}`);
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not remove it"));
    }
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: "employee-documents" });
  const columns = useMemo(() => [
    { key: "added_on", label: "Added", valueGetter: (row) => row.added_on },
    { key: "employee", label: "Employee", valueGetter: (row) => `${row.employee || ""}${row.code ? ` (${row.code})` : ""}` },
    { key: "type_label", label: "Type", valueGetter: (row) => row.type_label },
    { key: "title", label: "Title", valueGetter: (row) => row.title },
    { key: "size", label: "Size", valueGetter: (row) => sizeText(row.size) },
  ], []);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ flex: 1, fontSize: 13, color: "text.secondary" }}>Each employee sees only their own documents, in the HRMS app under Company, Documents.</Box>
        {canManage && <Button size="small" variant="contained" startIcon={<Upload size={14} />} onClick={() => { setError(""); setForm({ employee_id: "", type: "OFFER_LETTER", title: "", file: null }); }}>Add document</Button>}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText="No documents added yet."
          searchPlaceholder="Search documents..."
          tablePreferenceKey="hr.employee-documents"
          exportFileName="employee_documents"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel="Actions"
          renderActions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" onClick={() => void download(row)}>Download</Button>
              {canManage && <Button size="small" color="error" onClick={() => void remove(row)}>Remove</Button>}
            </Stack>
          )}
        />
      </SearchGridPanel>
      {form && (
        <Dialog open onClose={() => !saving && setForm(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15 }}>Add a document</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
              <TextField select size="small" label="Employee" value={form.employee_id} onChange={set("employee_id")}>
                {employees.map((employee) => <MenuItem key={employee.id} value={String(employee.id)}>{employee.name}{employee.code ? ` (${employee.code})` : ""}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Type" value={form.type} onChange={set("type")}>
                {Object.entries(types).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Title" value={form.title} onChange={set("title")} slotProps={{ htmlInput: { maxLength: 150 } }} />
              <Button component="label" variant="outlined" size="small" startIcon={<Upload size={14} />}>
                {form.file ? form.file.name : "Choose a PDF, JPG or PNG (up to 5 MB)"}
                <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-label="Document file" onChange={(e) => setForm((current) => ({ ...current, file: e.target.files?.[0] || null }))} />
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            <Button variant="contained" disabled={saving || !form.employee_id || !form.title.trim() || !form.file} onClick={() => void upload()}>{saving ? "Adding" : "Add"}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
