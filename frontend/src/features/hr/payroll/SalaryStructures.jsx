import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { errorMessage } from "../utils/hrStatus";

const CALCS = [["PERCENT_OF_GROSS", "% of gross"], ["PERCENT_OF_BASIC", "% of Basic"], ["FIXED", "Fixed ₹"], ["BALANCE", "The balance"]];

/** Salary Management > Structures: how each salary structure splits an employee's gross into pay heads. */
export default function SalaryStructures({ canManage }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [lines, setLines] = useState([]);
  const [newName, setNewName] = useState("");
  const [head, setHead] = useState({ code: "", name: "", type: "EARNING" });

  const load = useCallback(async (keep) => {
    try {
      const res = (await api.get("/payroll/structures")).data?.data || { components: [], structures: [] };
      setData(res);
      const pick = res.structures.find((s) => s.id === keep) || res.structures[0] || null;
      setSelected(pick?.id ?? null);
      setLines((pick?.lines || []).map((l) => ({ component_id: String(l.component_id), calc: l.calc, value: String(l.value) })));
    } catch (err) {
      toast.error(errorMessage(err, "Could not load salary structures"));
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => load(null), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const choose = (id) => {
    setSelected(id);
    setLines((data.structures.find((s) => s.id === id)?.lines || []).map((l) => ({ component_id: String(l.component_id), calc: l.calc, value: String(l.value) })));
  };
  const save = async () => {
    try {
      await api.put(`/payroll/structures/${selected}`, { lines: lines.map((l) => ({ component_id: Number(l.component_id), calc: l.calc, value: Number(l.value) || 0 })) });
      toast.success("Salary structure saved");
      await load(selected);
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the structure"));
    }
  };
  const addStructure = async () => {
    try {
      const res = await api.post("/payroll/structures", { name: newName, lines: [] });
      setNewName("");
      await load(res.data?.data?.id);
    } catch (err) {
      toast.error(errorMessage(err, "Could not add the structure"));
    }
  };
  const addHead = async () => {
    try {
      await api.post("/payroll/components", { ...head, code: head.code.toUpperCase(), is_active: true });
      setHead({ code: "", name: "", type: "EARNING" });
      await load(selected);
    } catch (err) {
      toast.error(errorMessage(err, "Could not add the pay head"));
    }
  };

  if (!data) return <Typography variant="body2">Loading…</Typography>;
  const earnings = data.components.filter((c) => c.type === "EARNING" && c.is_active && !["OT", "INCENTIVE", "BATTA"].includes(c.statutory));
  const setLine = (i, key, value) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, [key]: value } : l)));
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 1.5, alignItems: "start", overflow: "auto" }}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1, mb: 1.5 }}>
          <TextField select size="small" label="Salary structure" value={selected ?? ""} onChange={(e) => choose(Number(e.target.value))} sx={{ minWidth: 220 }}>
            {data.structures.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          {canManage && <><TextField size="small" label="New structure" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Button size="small" startIcon={<Plus size={14} />} disabled={!newName.trim()} onClick={addStructure}>Add</Button></>}
        </Stack>
        {lines.map((line, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
            <TextField select size="small" label="Pay head" value={line.component_id} onChange={(e) => setLine(i, "component_id", e.target.value)} sx={{ flex: 2 }} disabled={!canManage}>
              {earnings.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Worked out as" value={line.calc} onChange={(e) => setLine(i, "calc", e.target.value)} sx={{ flex: 1.5 }} disabled={!canManage}>
              {CALCS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField type="number" size="small" label="Value" value={line.calc === "BALANCE" ? "" : line.value} onChange={(e) => setLine(i, "value", e.target.value)} disabled={!canManage || line.calc === "BALANCE"} sx={{ flex: 1 }} />
            {canManage && <IconButton size="small" aria-label="Remove line" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}><Trash2 size={15} /></IconButton>}
          </Stack>
        ))}
        {canManage && (
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<Plus size={14} />} onClick={() => setLines((prev) => [...prev, { component_id: String(earnings[0]?.id || ""), calc: "FIXED", value: "0" }])}>Add line</Button>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="contained" disabled={!selected} onClick={save}>Save structure</Button>
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Lines are worked out in order on the gross earned for the month; one line takes the balance. Choose an employee's structure on their record (Salary Structure). OT, sales incentive and batta are added automatically.
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Pay heads</Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", rowGap: 0.75, mb: 1.5 }}>
          {data.components.map((c) => <Chip key={c.id} size="small" variant="outlined" color={c.type === "DEDUCTION" ? "error" : "success"} label={`${c.code} · ${c.name}`} />)}
        </Stack>
        {canManage && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Code" value={head.code} onChange={(e) => setHead({ ...head, code: e.target.value })} sx={{ width: 100 }} />
              <TextField size="small" label="Name" value={head.name} onChange={(e) => setHead({ ...head, name: e.target.value })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField select size="small" label="Type" value={head.type} onChange={(e) => setHead({ ...head, type: e.target.value })} fullWidth>
                <MenuItem value="EARNING">Earning</MenuItem><MenuItem value="DEDUCTION">Deduction</MenuItem>
              </TextField>
              <Button size="small" variant="outlined" disabled={!head.code.trim() || !head.name.trim()} onClick={addHead}>Add</Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
