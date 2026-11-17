import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Pencil, Plus, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { BONUS_TYPES, bonusRulePayload, describeBonusRule, loyaltyApiError } from "../utils/loyaltyTypes";

const EMPTY = { name: "", type: "birthday", reward: "multiplier", multiplier: "2", points: "", min_bill: "", starts_on: "", ends_on: "", is_active: true };

function RuleDialog({ rule, onSaved, onClose }) {
  const [form, setForm] = useState(rule);
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = bonusRulePayload(form);
      if (form.id) await api.put(`/loyalty/bonus-rules/${form.id}`, body);
      else await api.post("/loyalty/bonus-rules", body);
      toast.success("Bonus rule saved.");
      onSaved();
    } catch (err) {
      toast.error(loyaltyApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="bonus-rule-title"
      slotProps={{ paper: { component: "form", "data-enter-ignore": "true", onSubmit: (e) => { e.preventDefault(); void save(); } } }}>
      <DialogTitle id="bonus-rule-title">{form.id ? "Edit bonus rule" : "New bonus rule"}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <TextField size="small" label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
          <TextField select size="small" label="When" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {BONUS_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Reward" value={form.reward} onChange={(e) => set("reward", e.target.value)}>
            <MenuItem value="multiplier">Multiply the bill&apos;s points</MenuItem>
            <MenuItem value="points">Fixed extra points</MenuItem>
          </TextField>
          {form.reward === "multiplier"
            ? <TextField size="small" type="number" label="Points × (2 = double)" value={form.multiplier} onChange={(e) => set("multiplier", e.target.value)} slotProps={{ htmlInput: { min: 1, step: 0.5 } }} />
            : <TextField size="small" type="number" label="Extra points" value={form.points} onChange={(e) => set("points", e.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} />}
          <TextField size="small" type="number" label={form.type === "min_bill" ? "Bill of at least (₹)" : "Only on bills of at least (₹, optional)"} value={form.min_bill}
            onChange={(e) => set("min_bill", e.target.value)} required={form.type === "min_bill"} />
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="date" label="From" value={form.starts_on} onChange={(e) => set("starts_on", e.target.value)} required={form.type === "date_range"} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
            <TextField size="small" type="date" label="To" value={form.ends_on} onChange={(e) => set("ends_on", e.target.value)} required={form.type === "date_range"} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
          </Stack>
          <FormControlLabel control={<Switch checked={Boolean(form.is_active)} onChange={(e) => set("is_active", e.target.checked)} />} label="Active" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving || !form.name.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** CRM > Loyalty > Bonuses: extra points for birthdays, anniversaries, first purchase, a date range or big bills. */
export default function LoyaltyBonusRules() {
  const [rules, setRules] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/loyalty/bonus-rules");
      setRules(res.data?.data || []);
    } catch {
      setRules([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const remove = async (rule) => {
    if (!window.confirm(`Remove the bonus rule "${rule.name}"? Points already given stay.`)) return;
    try {
      await api.delete(`/loyalty/bonus-rules/${rule.id}`);
      void load();
    } catch (err) {
      toast.error(loyaltyApiError(err));
    }
  };

  if (!rules) return null;
  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Each bonus is added as its own line in the customer&apos;s history, with the rule&apos;s name.</Typography>
        <Button variant="contained" size="small" startIcon={<Plus size={15} />} onClick={() => setEditing({ ...EMPTY })}>Add bonus</Button>
      </Stack>
      <Table size="small" aria-label="Bonus rules">
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Rule</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {rules.length === 0 && <TableRow><TableCell colSpan={4} sx={{ color: "text.secondary" }}>No bonus rules yet.</TableCell></TableRow>}
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>{rule.name}</TableCell>
              <TableCell>{describeBonusRule(rule)}</TableCell>
              <TableCell><Chip size="small" color={rule.is_active ? "success" : "default"} label={rule.is_active ? "Active" : "Off"} /></TableCell>
              <TableCell align="right">
                <Button size="small" startIcon={<Pencil size={13} />} aria-label={`Edit ${rule.name}`}
                  onClick={() => setEditing({ ...EMPTY, ...rule, reward: rule.points ? "points" : "multiplier", multiplier: rule.multiplier ? String(Number(rule.multiplier)) : "2",
                    points: rule.points ? String(rule.points) : "", min_bill: rule.min_bill ? String(Number(rule.min_bill)) : "", starts_on: rule.starts_on || "", ends_on: rule.ends_on || "" })}>Edit</Button>
                <Button size="small" color="error" startIcon={<Trash2 size={13} />} aria-label={`Remove ${rule.name}`} onClick={() => void remove(rule)}>Remove</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing && <RuleDialog rule={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </Box>
  );
}
